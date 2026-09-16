"""Configuración segura para los scripts de despliegue de LivingOrg OS.

No contiene valores de producción. Las credenciales se leen exclusivamente de
variables de entorno para evitar volver a publicar secretos en Git.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


class ConfigurationError(RuntimeError):
    """Configuración faltante o insegura."""


@dataclass(frozen=True)
class Settings:
    base_url: str
    api_key: str
    api_secret: str
    repo_root: Path
    timeout_seconds: int = 90

    @property
    def authorization(self) -> str:
        return f"token {self.api_key}:{self.api_secret}"


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigurationError(
            f"Falta la variable de entorno {name}. Consulta .env.example y DEPLOYMENT.md."
        )
    return value


def _validate_base_url(value: str) -> str:
    value = value.rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ConfigurationError("FRAPPE_BASE_URL debe ser una URL http(s) válida.")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ConfigurationError(
            "FRAPPE_BASE_URL debe usar HTTPS fuera de desarrollo local."
        )
    return value


def load_settings() -> Settings:
    """Carga configuración sin imprimir ni registrar secretos."""
    repo_root = Path(
        os.environ.get("LIVINGORG_REPO_ROOT", Path(__file__).resolve().parents[1])
    ).expanduser().resolve()
    if not repo_root.exists():
        raise ConfigurationError(f"LIVINGORG_REPO_ROOT no existe: {repo_root}")

    try:
        timeout = int(os.environ.get("FRAPPE_TIMEOUT_SECONDS", "90"))
    except ValueError as exc:
        raise ConfigurationError("FRAPPE_TIMEOUT_SECONDS debe ser un entero.") from exc
    if timeout < 5 or timeout > 600:
        raise ConfigurationError("FRAPPE_TIMEOUT_SECONDS debe estar entre 5 y 600.")

    return Settings(
        base_url=_validate_base_url(_require_env("FRAPPE_BASE_URL")),
        api_key=_require_env("FRAPPE_API_KEY"),
        api_secret=_require_env("FRAPPE_API_SECRET"),
        repo_root=repo_root,
        timeout_seconds=timeout,
    )
