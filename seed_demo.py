#!/usr/bin/env python3
"""Siembra datos demo usando configuración por variables de entorno.

Idempotencia práctica: crea datos únicamente si no existe el código/título clave.
"""
from __future__ import annotations

import sys

from scripts.config import ConfigurationError, load_settings
from scripts.frappe_client import FrappeClient, FrappeRequestError


def first_by(client: FrappeClient, doctype: str, field: str, value: str):
    rows = client.list(doctype, fields=["name"], filters=[[field, "=", value]], limit=1)
    return rows[0]["name"] if rows else None


def ensure(client: FrappeClient, doctype: str, field: str, value: str, payload: dict):
    existing = first_by(client, doctype, field, value)
    if existing:
        return existing
    return client.create(doctype, payload).get("name")


def main() -> int:
    try:
        client = FrappeClient(load_settings())
        nodes = {}
        node_defs = {
            "empresa": ("Grupo Altoplano", "Company"),
            "ventas": ("Ventas", "Department"),
            "marketing": ("Marketing", "Department"),
            "ops": ("Operaciones", "Department"),
            "gerente": ("Gerente Comercial", "Designation"),
            "ejecutivo": ("Ana Reyes", "Employee"),
            "agente": ("IA de Calificación", "Agent"),
        }
        for key, (title, node_type) in node_defs.items():
            nodes[key] = ensure(client, "OS Org Node", "title", title, {
                "node_type": node_type, "title": title, "is_active": 1,
            })

        relations = [
            ("ventas", "empresa", "REPORTS_TO"), ("marketing", "empresa", "REPORTS_TO"),
            ("ops", "empresa", "REPORTS_TO"), ("gerente", "ventas", "REPORTS_TO"),
            ("ejecutivo", "gerente", "REPORTS_TO"), ("agente", "ejecutivo", "EXECUTES"),
        ]
        for source, target, relation_type in relations:
            existing = client.list("OS Org Relation", fields=["name"], filters=[
                ["from_node", "=", nodes[source]], ["to_node", "=", nodes[target]],
                ["relation_type", "=", relation_type],
            ], limit=1)
            if not existing:
                client.create("OS Org Relation", {
                    "from_node": nodes[source], "to_node": nodes[target], "relation_type": relation_type,
                })

        steps = [
            {"step_key":"start","step_title":"Nuevo prospecto","step_type":"START","execution_type":"SYS","actor_kind":"System"},
            {"step_key":"calif","step_title":"Calificar con IA","step_type":"AI","execution_type":"AI","actor_kind":"Agent"},
            {"step_key":"contacto","step_title":"Primer contacto","step_type":"HUMAN","execution_type":"H","actor_kind":"User"},
            {"step_key":"demo","step_title":"Demo de producto","step_type":"HUMAN","execution_type":"H","actor_kind":"User"},
            {"step_key":"cierre","step_title":"Cierre y firma","step_type":"APPROVAL","execution_type":"H","actor_kind":"Role"},
            {"step_key":"end","step_title":"Cliente onboarded","step_type":"END","execution_type":"SYS","actor_kind":"System"},
        ]
        edges = [
            {"edge_key":"e1","source_step_key":"start","target_step_key":"calif","relation_type":"NEXT"},
            {"edge_key":"e2","source_step_key":"calif","target_step_key":"contacto","relation_type":"NEXT"},
            {"edge_key":"e3","source_step_key":"contacto","target_step_key":"demo","relation_type":"NEXT"},
            {"edge_key":"e4","source_step_key":"demo","target_step_key":"cierre","relation_type":"NEXT"},
            {"edge_key":"e5","source_step_key":"cierre","target_step_key":"end","relation_type":"NEXT"},
        ]
        ensure(client, "OS Process", "process_code", "SALES-001", {
            "process_title":"Prospección a Cierre", "process_code":"SALES-001",
            "purpose":"Convertir prospectos en clientes: calificación con IA, demo y cierre con aprobación.",
            "status":"Active", "trigger_type":"Manual", "risk_level":"Medium",
            "max_autonomy":"L2", "version_label":"v1.0", "steps":steps, "edges":edges,
        })
        ensure(client, "OS SOP", "sop_code", "SOP-SALES-001", {
            "sop_title":"Proceso de Ventas", "sop_code":"SOP-SALES-001", "status":"Approved",
            "objective":"Estandarizar la conversión de prospectos a clientes.", "scope":"Equipo comercial",
            "steps":[
                {"sequence":1,"step_title":"Calificar prospecto","execution_type":"IA"},
                {"sequence":2,"step_title":"Agendar demo","execution_type":"Humano"},
                {"sequence":3,"step_title":"Cierre y firma","execution_type":"Híbrido"},
            ],
        })
        print("OK: datos demo presentes sin duplicar registros clave.")
        return 0
    except (ConfigurationError, FrappeRequestError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
