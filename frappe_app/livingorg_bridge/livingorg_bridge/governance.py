from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from livingorg_bridge import events
from livingorg_bridge.security import assert_step_access, roles_for


PUBLISH_ROLES = {"System Manager", "OS Admin", "OS Publisher"}
SYSTEM_KEYS = {
    "name", "owner", "creation", "modified", "modified_by", "docstatus", "idx",
    "parent", "parentfield", "parenttype", "doctype", "published_on",
}

# Organigrama Vivo 2.0. REPORTS_TO se almacena child -> parent.
# Esta matriz evita relaciones organizacionalmente absurdas en servidor sin
# migrar ni borrar relaciones históricas existentes durante el upgrade.
ORG_ALLOWED_PARENTS = {
    "Company": set(),
    "Department": {"Company", "Department"},
    "Designation": {"Department", "Designation"},
    "Employee": {"Designation"},
    "Agent": {"Designation"},
    "Custom": {"Custom"},
}


def _scrub(value: Any):
    if isinstance(value, dict):
        return {
            key: _scrub(item)
            for key, item in value.items()
            if key not in SYSTEM_KEYS and not str(key).startswith("_")
        }
    if isinstance(value, (list, tuple)):
        return [_scrub(item) for item in value]
    return value


def _definition_changed(before, doc) -> bool:
    left = json.dumps(_scrub(before.as_dict()), sort_keys=True, default=str, ensure_ascii=False)
    right = json.dumps(_scrub(doc.as_dict()), sort_keys=True, default=str, ensure_ascii=False)
    return left != right


def validate_org_relation(doc, method=None) -> None:
    """Valida nuevas/alteradas relaciones jerárquicas de Organigrama Vivo 2.0.

    Relaciones históricas no se reescriben. Si una relación previa fuera del
    modelo 2.0 permanece sin editar, el upgrade no la elimina ni la corrige a
    escondidas; la UI la reporta como advertencia para revisión humana.
    """
    if not doc.from_node or not doc.to_node:
        return
    if doc.from_node == doc.to_node:
        frappe.throw(_("Un elemento del organigrama no puede depender de sí mismo."))
    if doc.relation_type != "REPORTS_TO":
        return

    child = frappe.get_doc("OS Org Node", doc.from_node)
    parent = frappe.get_doc("OS Org Node", doc.to_node)
    allowed = ORG_ALLOWED_PARENTS.get(child.node_type, set())
    if parent.node_type not in allowed:
        frappe.throw(
            _("Jerarquía no válida: {0} no puede depender de {1}.").format(
                child.node_type, parent.node_type
            )
        )

    # Un elemento sólo puede tener un padre jerárquico vigente.
    existing = frappe.get_all(
        "OS Org Relation",
        filters={"from_node": doc.from_node, "relation_type": "REPORTS_TO"},
        fields=["name", "to_node"],
        limit_page_length=100,
    )
    for rel in existing:
        if rel.name != doc.name:
            frappe.throw(_("Este elemento ya tiene un padre jerárquico. Reasígnalo en lugar de crear una segunda relación."))

    # Defensa en profundidad: evita ciclos aunque un cliente API omita la UI.
    rows = frappe.get_all(
        "OS Org Relation",
        filters={"relation_type": "REPORTS_TO"},
        fields=["name", "from_node", "to_node"],
        limit_page_length=5000,
    )
    parent_of = {}
    for rel in rows:
        if rel.name == doc.name:
            continue
        parent_of.setdefault(rel.from_node, rel.to_node)
    parent_of[doc.from_node] = doc.to_node

    cur = doc.to_node
    visited = set()
    while cur:
        if cur == doc.from_node:
            frappe.throw(_("La relación crearía un ciclo jerárquico."))
        if cur in visited:
            break
        visited.add(cur)
        cur = parent_of.get(cur)


def validate_process(doc, method=None) -> None:
    """Valida configuración + gobierno de publicación sin tocar core ERPNext."""
    events.validate_process(doc, method)

    # Draft sigue siendo flexible. Pilot/Active deben ser ejecutables por una persona,
    # rol, agente o sistema claramente identificado.
    if doc.status in {"Pilot", "Active"}:
        for step in list(doc.get("steps") or []):
            if step.step_type in {"START", "END"} or step.execution_type == "SYS" or step.actor_kind == "System":
                continue
            if step.actor_kind == "User" and not step.actor_user:
                frappe.throw(_("El paso {0} requiere Actor User antes de Pilot/Active.").format(step.step_title or step.step_key))
            if step.actor_kind == "Role" and not step.actor_role:
                frappe.throw(_("El paso {0} requiere Actor Role antes de Pilot/Active.").format(step.step_title or step.step_key))
            if step.actor_kind == "Agent" and not (step.actor_agent or step.agent):
                frappe.throw(_("El paso {0} requiere un agente antes de Pilot/Active.").format(step.step_title or step.step_key))
            if not step.actor_kind and not (step.actor_user or step.actor_role or step.actor_agent or step.agent):
                frappe.throw(_("El paso {0} necesita responsable antes de Pilot/Active.").format(step.step_title or step.step_key))
            if step.requires_approval and not step.approval_role:
                frappe.throw(_("El paso {0} requiere Approval Role antes de Pilot/Active.").format(step.step_title or step.step_key))

    if doc.is_new():
        if doc.status in {"Active", "Retired"} and not (roles_for() & PUBLISH_ROLES):
            frappe.throw(_("Sólo OS Publisher/Admin puede crear un proceso directamente en {0}.").format(doc.status), frappe.PermissionError)
        return

    before = doc.get_doc_before_save()
    if not before:
        return

    if doc.status != before.status and doc.status in {"Active", "Retired"} and not (roles_for() & PUBLISH_ROLES):
        frappe.throw(_("Sólo OS Publisher/Admin puede publicar o retirar procesos."), frappe.PermissionError)

    # Una versión Active es inmutable: primero vuelve a Draft/Pilot y después edita.
    # Esto evita que Runs históricos apunten a una definición que cambió silenciosamente.
    if before.status == "Active" and doc.status == "Active" and _definition_changed(before, doc):
        frappe.throw(_("Un proceso Active no se edita en caliente. Cámbialo a Draft/Pilot, crea la nueva versión y vuelve a publicarlo."))


def validate_step_run(doc, method=None) -> None:
    """State machine con excepción exclusivamente para transiciones internas del motor."""
    if doc.is_new():
        return
    before = doc.get_doc_before_save()
    if not before:
        return

    internal = bool(getattr(doc.flags, "ignore_permissions", False)) or bool(
        getattr(frappe.flags, "livingorg_approval_transition", False)
    )
    changed_runtime = any(
        doc.get(field) != before.get(field)
        for field in (
            "status", "input_json", "output_json", "error_code", "error_message",
            "reference_doctype", "reference_name", "source_doctype", "source_name",
        )
    )
    if changed_runtime and not internal:
        assert_step_access(doc, write=True)

    if doc.status != before.status:
        allowed = events.ALLOWED_STEP_TRANSITIONS.get(before.status, set())
        auto_terminal = (
            internal
            and before.status == "Queued"
            and doc.status == "Completed"
            and doc.step_type_snapshot in {"START", "END"}
        )
        if doc.status not in allowed and not auto_terminal:
            frappe.throw(_("Transición de Step Run no válida: {0} → {1}").format(before.status, doc.status))

    if doc.status == "Completed":
        if not events._required_actions_satisfied(doc):
            frappe.throw(_("Falta ejecutar o vincular una acción de sistema requerida."))
        if doc.evidence_required and not frappe.db.exists("OS Evidence", {"step_run": doc.name}):
            frappe.throw(_("Este paso requiere evidencia antes de completarse."))
        if doc.approval_required and not frappe.db.exists("OS Approval", {"step_run": doc.name, "status": "Approved"}):
            frappe.throw(_("Este paso requiere una aprobación válida antes de completarse."))


def validate_evidence(doc, method=None) -> None:
    """La evidencia sólo puede pertenecer a un Step Run visible/escribible por el actor."""
    if not doc.step_run:
        frappe.throw(_("OS Evidence requiere Step Run."))
    step = frappe.get_doc("OS Step Run", doc.step_run)
    assert_step_access(step, write=True)
    if doc.run and doc.run != step.run:
        frappe.throw(_("Run y Step Run de la evidencia no coinciden."))
    if not doc.run:
        doc.run = step.run

    if doc.reference_doctype and doc.reference_name:
        target = frappe.get_doc(doc.reference_doctype, doc.reference_name)
        target.check_permission("read")

    if doc.is_new():
        return
    before = doc.get_doc_before_save()
    if not before:
        return
    if before.verification_status == "Verified" and not (roles_for() & {"System Manager", "OS Admin", "OS Manager"}):
        if _definition_changed(before, doc):
            frappe.throw(_("Una evidencia verificada sólo puede modificarse por Manager/Admin."), frappe.PermissionError)
    if doc.verification_status != before.verification_status and doc.verification_status in {"Verified", "Rejected"}:
        if not (roles_for() & {"System Manager", "OS Admin", "OS Manager"}):
            frappe.throw(_("Sólo Manager/Admin puede verificar o rechazar evidencia."), frappe.PermissionError)
        doc.verified_by = frappe.session.user
        doc.verified_at = frappe.utils.now_datetime()
