#!/usr/bin/env python3
"""Siembra datos demo atractivos para las capturas: organigrama + proceso con pasos/conexiones."""
import requests, time, json

B = "https://demo.altoplano.mx"
KEY = None; SECRET = None
for line in open("/home/ubuntu/.openclaw/workspace/Soft_repo/reinstall.py"):
    if line.startswith('KEY = '):
        KEY = "71c1c78729def83"
    elif line.startswith('SECRET = '):
        SECRET = "156794563fa0b28"
HDR = {"Authorization": f"token {KEY}:{SECRET}"}
J = {**HDR, "Content-Type": "application/json"}

def post(dt, data):
    for _ in range(5):
        r = requests.post(f"{B}/api/resource/{dt}", headers=J, data=json.dumps(data), timeout=60)
        if r.status_code in (200, 201):
            return r.json().get("data", {}).get("name")
        time.sleep(2)
    print("FAIL", dt, data.get("title") or data.get("node_type") or data.get("process_title"), getattr(r, "status_code", "?"))
    return None

# --- Organigrama ---
nodes = {}
nodes["empresa"] = post("OS Org Node", {"node_type": "Company", "title": "Grupo Altoplano", "is_active": 1})
nodes["ventas"] = post("OS Org Node", {"node_type": "Department", "title": "Ventas", "is_active": 1})
nodes["marketing"] = post("OS Org Node", {"node_type": "Department", "title": "Marketing", "is_active": 1})
nodes["ops"] = post("OS Org Node", {"node_type": "Department", "title": "Operaciones", "is_active": 1})
nodes["gerente"] = post("OS Org Node", {"node_type": "Designation", "title": "Gerente Comercial", "is_active": 1})
nodes["ejecutivo"] = post("OS Org Node", {"node_type": "Employee", "title": "Ana Reyes", "is_active": 1})
nodes["agente"] = post("OS Org Node", {"node_type": "Agent", "title": "IA de Calificación", "is_active": 1})

def rel(f, t, rt="REPORTS_TO"):
    post("OS Org Relation", {"from_node": nodes[f], "to_node": nodes[t], "relation_type": rt})

rel("ventas", "empresa"); rel("marketing", "empresa"); rel("ops", "empresa")
rel("gerente", "ventas"); rel("ejecutivo", "gerente")
rel("agente", "ejecutivo", "EXECUTES")
print("Organigrama sembrado:", len(nodes), "nodos")

# --- Proceso con pasos y conexiones ---
steps = [
    {"step_key": "start", "step_title": "Nuevo prospecto", "step_type": "START", "execution_type": "SYS", "actor_kind": "System"},
    {"step_key": "calif", "step_title": "Calificar con IA", "step_type": "AI", "execution_type": "AI", "actor_kind": "Agent"},
    {"step_key": "contacto", "step_title": "Primer contacto", "step_type": "HUMAN", "execution_type": "H", "actor_kind": "User"},
    {"step_key": "demo", "step_title": "Demo de producto", "step_type": "HUMAN", "execution_type": "H", "actor_kind": "User"},
    {"step_key": "cierre", "step_title": "Cierre y firma", "step_type": "APPROVAL", "execution_type": "H", "actor_kind": "Role"},
    {"step_key": "end", "step_title": "Cliente onboarded", "step_type": "END", "execution_type": "SYS", "actor_kind": "System"},
]
edges = [
    {"edge_key": "e1", "source_step_key": "start", "target_step_key": "calif", "relation_type": "NEXT"},
    {"edge_key": "e2", "source_step_key": "calif", "target_step_key": "contacto", "relation_type": "NEXT"},
    {"edge_key": "e3", "source_step_key": "contacto", "target_step_key": "demo", "relation_type": "NEXT"},
    {"edge_key": "e4", "source_step_key": "demo", "target_step_key": "cierre", "relation_type": "NEXT"},
    {"edge_key": "e5", "source_step_key": "cierre", "target_step_key": "end", "relation_type": "NEXT"},
]
proc = post("OS Process", {
    "process_title": "Prospección a Cierre",
    "process_code": "SALES-001",
    "purpose": "Convertir prospectos en clientes: calificación con IA, demo y cierre con aprobación.",
    "status": "Active",
    "trigger_type": "Manual",
    "risk_level": "Medium",
    "max_autonomy": "L2",
    "version_label": "v1.0",
    "steps": steps,
    "edges": edges,
})
print("Proceso sembrado:", proc)

# --- SOP ---
sop = post("OS SOP", {
    "sop_title": "Proceso de Ventas",
    "sop_code": "SOP-SALES-001",
    "status": "Approved",
    "objective": "Estandarizar la conversión de prospectos a clientes.",
    "scope": "Equipo comercial",
    "steps": [
        {"sequence": 1, "step_title": "Calificar prospecto", "execution_type": "IA"},
        {"sequence": 2, "step_title": "Agendar demo", "execution_type": "Humano"},
        {"sequence": 3, "step_title": "Cierre y firma", "execution_type": "Híbrido"},
    ],
})
print("SOP sembrado:", sop)
print("=== SIEMBRA COMPLETA ===")
