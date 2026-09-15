from __future__ import annotations

import json

import frappe
from frappe import _

from livingorg_bridge.security import assert_approval_access, assert_step_access


ALLOWED_STEP_TRANSITIONS = {
    "Blocked": {"Queued", "Skipped", "Cancelled"},
    "Queued": {"Running", "Skipped", "Cancelled"},
    "Running": {"Waiting", "Completed", "Failed", "Cancelled"},
    "Waiting": {"Approved", "Completed", "Failed", "Cancelled"},
    "Approved": {"Completed", "Failed", "Cancelled"},
    "Failed": {"Queued", "Cancelled"},
    "Completed": set(),
    "Skipped": set(),
    "Cancelled": set(),
}


def _parse_json_object(raw, label: str) -> dict:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        value = json.loads(raw)
    except (TypeError, ValueError) as exc:
        frappe.throw(_("{0} debe contener JSON válido.").format(label))
        raise exc
    if not isinstance(value, dict):
        frappe.throw(_("{0} debe ser un objeto JSON.").format(label))
    return value


def _required_actions_satisfied(step_run) -> bool:
    try:
        actions = json.loads(step_run.action_snapshot_json or "[]")
    except (TypeError, ValueError):
        actions = []
    for action in actions:
        if not action.get("is_required"):
            continue
        rule = action.get("completion_rule") or "Document Linked"
        if rule == "Manual":
            continue
        link_name = frappe.db.exists(
            "OS Document Link",
            {"step_run": step_run.name, "action_key": action.get("action_key"), "link_role": "Result"},
        )
        if not link_name:
            return False
        if rule == "Document Submitted":
            link = frappe.get_doc("OS Document Link", link_name)
            if frappe.db.get_value(link.reference_doctype, link.reference_name, "docstatus") != 1:
                return False
    return True


def validate_process(doc, method=None) -> None:
    steps = list(doc.get("steps") or [])
    actions = list(doc.get("actions") or [])
    step_keys = {row.step_key for row in steps if row.step_key}
    seen_actions: set[str] = set()

    for action in actions:
        if not action.action_key:
            frappe.throw(_("Cada acción de sistema necesita Action Key."))
        if action.action_key in seen_actions:
            frappe.throw(_("Action Key duplicada: {0}").format(action.action_key))
        seen_actions.add(action.action_key)
        if action.step_key not in step_keys:
            frappe.throw(_("La acción {0} apunta a un step_key inexistente: {1}").format(action.action_key, action.step_key))
        if action.system not in {"ERPNext", "External"}:
            frappe.throw(_("System no soportado en la acción {0}.").format(action.action_key))
        if action.source_doctype and not frappe.db.exists("DocType", action.source_doctype):
            frappe.throw(_("Source DocType inexistente: {0}").format(action.source_doctype))
        if action.target_doctype and not frappe.db.exists("DocType", action.target_doctype):
            frappe.throw(_("Target DocType inexistente: {0}").format(action.target_doctype))
        if action.action_type in {"CREATE_DOCUMENT", "CREATE_FROM_SOURCE", "UPDATE_DOCUMENT", "SUBMIT_DOCUMENT", "LINK_DOCUMENT", "OPEN_DOCUMENT"} and not action.target_doctype:
            frappe.throw(_("La acción {0} requiere Target DocType.").format(action.action_label or action.action_key))
        if action.action_type == "CREATE_FROM_SOURCE" and not action.source_doctype:
            frappe.throw(_("CREATE_FROM_SOURCE requiere Source DocType."))
        _parse_json_object(action.field_mapping_json, "Field Mapping JSON")
        _parse_json_object(action.defaults_json, "Defaults JSON")


def validate_step_run(doc, method=None) -> None:
    if doc.is_new():
        return
    before = doc.get_doc_before_save()
    if not before:
        return

    changed_runtime = any(
        doc.get(field) != before.get(field)
        for field in (
            "status", "input_json", "output_json", "error_code", "error_message",
            "reference_doctype", "reference_name", "source_doctype", "source_name",
        )
    )
    if changed_runtime and not getattr(frappe.flags, "livingorg_approval_transition", False):
        assert_step_access(doc, write=True)

    if doc.status != before.status:
        allowed = ALLOWED_STEP_TRANSITIONS.get(before.status, set())
        if doc.status not in allowed:
            frappe.throw(_("Transición de Step Run no válida: {0} → {1}").format(before.status, doc.status))

    if doc.status == "Completed":
        if not _required_actions_satisfied(doc):
            frappe.throw(_("Falta ejecutar o vincular una acción de sistema requerida."))
        if doc.evidence_required and not frappe.db.exists("OS Evidence", {"step_run": doc.name}):
            frappe.throw(_("Este paso requiere evidencia antes de completarse."))
        if doc.approval_required and not frappe.db.exists("OS Approval", {"step_run": doc.name, "status": "Approved"}):
            frappe.throw(_("Este paso requiere una aprobación válida antes de completarse."))


def validate_approval(doc, method=None) -> None:
    if doc.is_new():
        return
    before = doc.get_doc_before_save()
    if not before or doc.status == before.status:
        return
    if doc.status in {"Approved", "Rejected"}:
        assert_approval_access(doc)
        if not doc.decided_by:
            doc.decided_by = frappe.session.user
        if not doc.decided_at:
            doc.decided_at = frappe.utils.now_datetime()
