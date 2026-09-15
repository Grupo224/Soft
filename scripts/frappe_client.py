"""Cliente REST pequeño y reutilizable para Frappe/ERPNext.

Objetivos: sesión HTTP reutilizable, timeouts, reintentos acotados, errores
comprensibles y cero exposición de credenciales en logs.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote

import requests

from .config import Settings


RETRYABLE_STATUS = {429, 502, 503, 504}
SUCCESS_STATUS = {200, 201, 202, 204}


@dataclass
class FrappeRequestError(RuntimeError):
    method: str
    path: str
    status_code: int | None
    message: str

    def __str__(self) -> str:
        status = self.status_code if self.status_code is not None else "NETWORK"
        return f"{self.method} {self.path} -> {status}: {self.message}"


class FrappeClient:
    def __init__(self, settings: Settings, retries: int = 4) -> None:
        self.settings = settings
        self.retries = max(1, retries)
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": settings.authorization,
                "Accept": "application/json",
                "User-Agent": "LivingOrg-Deployment/1.0",
            }
        )

    def _message_from_response(self, response: requests.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            text = (response.text or "").strip()
            return text[:500] or "Respuesta no JSON del servidor."

        if isinstance(payload, dict):
            if payload.get("_server_messages"):
                try:
                    messages = json.loads(payload["_server_messages"])
                    if messages:
                        first = json.loads(messages[0])
                        if isinstance(first, dict) and first.get("message"):
                            return str(first["message"])
                except (TypeError, ValueError, json.JSONDecodeError):
                    pass
            for key in ("message", "exc_type", "exception"):
                if payload.get(key):
                    return str(payload[key])[:500]
        return f"HTTP {response.status_code}"

    def request(
        self,
        method: str,
        path: str,
        *,
        allow_404: bool = False,
        expected: Iterable[int] = SUCCESS_STATUS,
        **kwargs: Any,
    ) -> requests.Response:
        method = method.upper()
        if not path.startswith("/"):
            path = "/" + path
        url = self.settings.base_url + path
        expected_set = set(expected)
        last_error: Exception | None = None

        for attempt in range(1, self.retries + 1):
            try:
                response = self.session.request(
                    method,
                    url,
                    timeout=kwargs.pop("timeout", self.settings.timeout_seconds),
                    **kwargs,
                )
            except requests.RequestException as exc:
                last_error = exc
                if attempt == self.retries:
                    break
                time.sleep(min(2 ** (attempt - 1), 8))
                continue

            if allow_404 and response.status_code == 404:
                return response
            if response.status_code in expected_set:
                # Frappe puede incluir una excepción en un payload HTTP 200.
                try:
                    payload = response.json() if response.content else {}
                except ValueError:
                    payload = {}
                if isinstance(payload, dict) and (payload.get("exc") or payload.get("exception")):
                    raise FrappeRequestError(
                        method, path, response.status_code, self._message_from_response(response)
                    )
                return response

            if response.status_code in RETRYABLE_STATUS and attempt < self.retries:
                retry_after = response.headers.get("Retry-After")
                try:
                    delay = min(float(retry_after), 15) if retry_after else min(2 ** (attempt - 1), 8)
                except ValueError:
                    delay = min(2 ** (attempt - 1), 8)
                time.sleep(delay)
                continue

            raise FrappeRequestError(
                method, path, response.status_code, self._message_from_response(response)
            )

        raise FrappeRequestError(
            method,
            path,
            None,
            f"No fue posible conectar tras {self.retries} intentos: {last_error}",
        )

    @staticmethod
    def resource_path(doctype: str, name: str | None = None) -> str:
        path = "/api/resource/" + quote(doctype, safe="")
        if name:
            path += "/" + quote(name, safe="")
        return path

    def exists(self, doctype: str, name: str) -> bool:
        response = self.request("GET", self.resource_path(doctype, name), allow_404=True)
        return response.status_code == 200

    def get(self, doctype: str, name: str) -> dict[str, Any] | None:
        response = self.request("GET", self.resource_path(doctype, name), allow_404=True)
        if response.status_code == 404:
            return None
        return response.json().get("data")

    def list(self, doctype: str, *, fields: list[str] | None = None,
             filters: list[Any] | dict[str, Any] | None = None,
             limit: int = 200) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "fields": json.dumps(fields or ["name"]),
            "limit_page_length": str(limit),
        }
        if filters is not None:
            params["filters"] = json.dumps(filters)
        response = self.request("GET", self.resource_path(doctype), params=params)
        return response.json().get("data", [])

    def create(self, doctype: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.request("POST", self.resource_path(doctype), json=payload)
        return response.json().get("data", {})

    def update(self, doctype: str, name: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.request("PUT", self.resource_path(doctype, name), json=payload)
        return response.json().get("data", {})

    def delete(self, doctype: str, name: str, *, allow_missing: bool = True) -> None:
        self.request(
            "DELETE",
            self.resource_path(doctype, name),
            allow_404=allow_missing,
        )

    def upload_file(self, local_path: Path, remote_name: str | None = None,
                    *, is_private: bool = False) -> str:
        with local_path.open("rb") as handle:
            response = self.request(
                "POST",
                "/api/method/upload_file",
                files={"file": (remote_name or local_path.name, handle, "application/octet-stream")},
                data={"is_private": "1" if is_private else "0", "folder": "Home"},
                timeout=max(self.settings.timeout_seconds, 120),
            )
        return response.json().get("message", {}).get("file_url", "")

    def get_count(self, doctype: str) -> int:
        response = self.request(
            "POST", "/api/method/frappe.client.get_count", json={"doctype": doctype}
        )
        return int(response.json().get("message", 0) or 0)
