from __future__ import annotations

import importlib
import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import get_url_to_form, now_datetime

from livingorg_bridge.security import (
    PRIVILEGED_ROLES,
    RUN_START_ROLES,
    assert_role,
    assert_step_access,
    current_user,
    roles_for,
)

MAPPER_REGISTRY = {
    ("Quotation", "Sales Order"): "erpnext.selling.doctype.quotation.mapper.make_sales_order",
    ("Sales Order", "Delivery Note"): "erpnext.selling.doctype.sales_order.mapper.make_delivery_note",
    ("Sales Order", "Sales Invoice"): "erpnext.selling.doctype.sales_order.mapper.make_sales_invoice",
    ("Delivery Note", "Sales Invoice"): "erpnext.stock.doctype.delivery_note.mapper.make_sales_invoice",
    ("Purchase Order", "Purchase Receipt"): "erpnext.buying.doctype.purchase_order.mapper.make_purchase_receipt",
    ("Purchase Order", "Purchase Invoice"): "erpnext.buying.doctype.purchase_order.mapper.make_purchase_invoice",
    ("Purchase Receipt", "Purchase Invoice"): "erpnext.stock.doctype.purchase_receipt.mapper.make_purchase_invoice",
}

BLOCKED_INPUT_FIELDS = {
    "name", "owner", "creation", "modified", "modified_by", "docstatus", "idx",
    "parent", "parentfield", "parenttype", "doctype", "amended_from",
    "_user_tags", "_comments", "_assign", "_liked_by", "_seen",
}


def _json_object(value: str | dict | None, label: str) -> dict[str, Any]:
    if value in (None, ""):
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        frappe.throw(_("{0} debe ser JSON válido.").format(label))
    if not isinstance(parsed, dict):
        frappe.throw(_("{0} debe ser un objeto JSON.").format(label))
    return parsed


def _serialize_action(action) -> dict[str, Any]:
    return {
        "action_key": action.action_key,
        "step_key": action.step_key,
        "action_label": action.action_label,
        "system": action.system,
        "action_type": action.action_type,
        "source_doctype": action.source_doctype,
        "target_doctype": action.target_doctype,
        "required_role": action.required_role,
        "completion_rule": action.completion_rule,
        "is_required": int(action.is_required or 0),
        "submit_after_create": int(action.submit_after_create or 0),
        "field_mapping_json": action.field_mapping_json or "",
        "defaults_json": action.defaults_json or "",
        "description": action.description or "",
        "sort_order": int(action.sort_order or 0),
    }


def _step_actions(process, step_key: str) -> list[dict[str, Any]]:
    rows = [_serialize_action(a) for a in (process.get("actions") or []) if a.step_key == step_key]
    rows.sort(key=lambda row: (row.get("sort_order", 0), row.get("action_label") or ""))
    return rows


def _primary_source(run, step_run, action, source_doctype=None, source_name=None):
    doctype = source_doctype or step_run.source_doctype or run.trigger_ref_doctype or action.source_doctype
    name = source_name or step_run.source_name or run.trigger_ref_name
    if action.source_doctype and doctype and doctype != action.source_doctype:
        frappe.throw(_("Esta acción requiere Source DocType {0}.").format(action.source_doctype))
    if doctype and name and not frappe.db.exists(doctype, name):
        frappe.throw(_("No existe {0} {1}.").format(doctype, name))
    return doctype, name


def _safe_apply_values(doc, values: dict[str, Any]) -> None:
    meta = frappe.get_meta(doc.doctype)
    for fieldname, value in values.items():
        if fieldname in BLOCKED_INPUT_FIELDS:
            frappe.throw(_("No se permite establecer el campo {0}.").format(fieldname))
        field = meta.get_field(fieldname)
        if not field:
            frappe.throw(_("El campo {0} no existe en {1}.").format(fieldname, doc.doctype))
        if field.read_only or field.fieldtype in {"Section Break", "Column Break", "Tab Break", "HTML", "Button"}:
            frappe.throw(_("El campo {0} no es editable desde LivingOrg.").format(fieldname))
        doc.set(fieldname, value)


def _apply_source_mapping(target, source, mapping: dict[str, Any]) -> None:
    for source_field, target_field in mapping.items():
        if not isinstance(source_field, str) or not isinstance(target_field, str):
            frappe.throw(_("Field Mapping JSON debe mapear nombres de campo de texto."))
        if source_field in BLOCKED_INPUT_FIELDS or target_field in BLOCKED_INPUT_FIELDS:
            frappe.throw(_("El mapping contiene campos reservados."))
        if not source.meta.get_field(source_field):
            frappe.throw(_("El campo origen {0} no existe en {1}.").format(source_field, source.doctype))
        _safe_apply_values(target, {target_field: source.get(source_field)})


def _load_mapper(dotted_path: str):
    module_name, function_name = dotted_path.rsplit(".", 1)
    module = importlib.import_module(module_name)
    return getattr(module, function_name)


def _find_action(process, step_key: str, action_key: str):
    for action in process.get("actions") or []:
        if action.step_key == step_key and action.action_key == action_key:
            return action
    frappe.throw(_("La acción {0} no pertenece a este paso.").format(action_key))


def _record_link(run, step_run, process, action, doctype: str, name: str, role: str = "Result", primary: bool = True):
    target = frappe.get_doc(doctype, name)
    target.check_permission("read")
    existing = frappe.db.exists(
        "OS Document Link",
        {
            "step_run": step_run.name,
            "action_key": action.action_key,
            "reference_doctype": doctype,
            "reference_name": name,
            "link_role": role,
        },
    )
    if existing:
        return frappe.get_doc("OS Document Link", existing)
    link = frappe.get_doc(
        {
            "doctype": "OS Document Link",
            "run": run.name,
            "step_run": step_run.name,
            "process_ref": process.name,
            "step_key": step_run.step_key,
            "action_key": action.action_key,
            "link_role": role,
            "reference_doctype": doctype,
            "reference_name": name,
            "label": action.action_label,
            "is_primary": 1 if primary else 0,
            "document_status_snapshot": str(getattr(target, "docstatus", 0)),
        }
    )
    link.insert(ignore_permissions=True)
    return link


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


def _target_ready(run_name: str, process, target_step_key: str) -> bool:
    incoming = [edge for edge in (process.get("edges") or []) if edge.target_step_key == target_step_key]
    if not incoming:
        return True
    for edge in incoming:
        relation = (edge.relation_type or "NEXT").upper()
        if relation in {"TRUE", "FALSE", "ERROR", "TIMEOUT"}:
            continue
        source_status = frappe.db.get_value("OS Step Run", {"run": run_name, "step_key": edge.source_step_key}, "status")
        if source_status not in {"Completed", "Skipped"}:
            return False
    return True


def _activate_next_steps(run, process, completed_step, outcome: str | None = None) -> list[str]:
    outgoing = [e for e in (process.get("edges") or []) if e.source_step_key == completed_step.step_key]
    if outcome:
        wanted = outcome.upper()
        outgoing = [e for e in outgoing if (e.relation_type or "NEXT").upper() in {wanted, "NEXT", "HANDOFF"}]
    else:
        conditional = [e for e in outgoing if (e.relation_type or "NEXT").upper() in {"TRUE", "FALSE", "ERROR", "TIMEOUT"}]
        if conditional:
            frappe.throw(_("Este paso tiene salidas condicionales. Indica outcome (TRUE/FALSE/ERROR/TIMEOUT)."))
        outgoing = [e for e in outgoing if (e.relation_type or "NEXT").upper() in {"NEXT", "HANDOFF"}]
    activated = []
    for edge in outgoing:
        target_name = frappe.db.get_value("OS Step Run", {"run": run.name, "step_key": edge.target_step_key}, "name")
        if not target_name or not _target_ready(run.name, process, edge.target_step_key):
            continue
        target_doc = frappe.get_doc("OS Step Run", target_name)
        if target_doc.status == "Blocked":
            target_doc.status = "Queued"
            target_doc.save(ignore_permissions=True)
            activated.append(target_doc.name)
    return activated


def _auto_advance_terminal_system_steps(run, process) -> None:
    for _ in range(20):
        queued = frappe.get_all(
            "OS Step Run",
            filters={"run": run.name, "status": "Queued", "step_type_snapshot": ["in", ["START", "END"]]},
            fields=["name", "step_key"], order_by="queued_at asc",
        )
        progressed = False
        for row in queued:
            if _step_actions(process, row.step_key):
                continue
            step = frappe.get_doc("OS Step Run", row.name)
            step.status = "Completed"
            step.started_at = step.started_at or now_datetime()
            step.completed_at = now_datetime()
            step.save(ignore_permissions=True)
            _activate_next_steps(run, process, step, outcome=None)
            progressed = True
        if not progressed:
            return


def _refresh_run_status(run) -> None:
    rows = frappe.get_all("OS Step Run", filters={"run": run.name}, fields=["step_key", "status", "queued_at"])
    statuses = [row.status for row in rows]
    open_statuses = {"Blocked", "Queued", "Running", "Waiting", "Approved"}
    if statuses and not any(status in open_statuses for status in statuses):
        if any(status == "Failed" for status in statuses):
            run.status = "Failed"
        elif all(status in {"Completed", "Skipped"} for status in statuses):
            run.status = "Completed"
        else:
            run.status = "Cancelled"
        run.completed_at = now_datetime()
        run.current_step_key = ""
    else:
        priority = {"Running": 0, "Waiting": 1, "Approved": 2, "Queued": 3, "Blocked": 4}
        active = sorted(
            [row for row in rows if row.status in open_statuses],
            key=lambda row: (priority.get(row.status, 9), str(row.queued_at or "")),
        )
        if active:
            run.current_step_key = active[0].step_key
        run.status = "Running" if any(status == "Running" for status in statuses) else "Waiting"
    run.save(ignore_permissions=True)


def _ensure_pending_approval(step, run, process):
    approved = frappe.db.exists("OS Approval", {"step_run": step.name, "status": "Approved"})
    if approved:
        return None
    pending = frappe.db.exists("OS Approval", {"step_run": step.name, "status": "Pending"})
    if pending:
        return frappe.get_doc("OS Approval", pending)
    requested_role = step.approval_role_snapshot or None
    requested_to = None if requested_role else (process.owner_user or None)
    approval = frappe.get_doc(
        {
            "doctype": "OS Approval", "run": run.name, "step_run": step.name,
            "process_ref": process.name, "requested_to": requested_to,
            "requested_role": requested_role, "status": "Pending",
            "requested_at": now_datetime(), "risk_level": process.risk_level,
            "context_snapshot": json.dumps(
                {"step_key": step.step_key, "step_title": step.step_title_snapshot, "reference_doctype": step.reference_doctype, "reference_name": step.reference_name},
                ensure_ascii=False,
            ),
        }
    )
    approval.insert(ignore_permissions=True)
    return approval


@frappe.whitelist(methods=["POST"])
def start_run(process_name: str, mode: str = "Live", source_doctype: str | None = None, source_name: str | None = None):
    user = current_user()
    process = frappe.get_doc("OS Process", process_name)
    process.check_permission("read")
    mode = (mode or "Live").title()
    if mode not in {"Test", "Live"}:
        frappe.throw(_("Run Mode debe ser Test o Live."))
    if mode == "Live":
        assert_role(PRIVILEGED_ROLES, "iniciar ejecuciones Live")
    else:
        assert_role(RUN_START_ROLES, "iniciar ejecuciones de prueba")
    if process.status == "Retired":
        frappe.throw(_("No se pueden iniciar runs de un proceso retirado."))
    if mode == "Live" and process.status != "Active":
        frappe.throw(_("Los runs Live sólo pueden iniciar desde procesos Active."))
    if source_doctype and source_name:
        source = frappe.get_doc(source_doctype, source_name)
        source.check_permission("read")

    steps = list(process.get("steps") or [])
    if not steps:
        frappe.throw(_("El proceso no tiene pasos."))
    incoming = {step.step_key: 0 for step in steps}
    for edge in process.get("edges") or []:
        if edge.target_step_key in incoming:
            incoming[edge.target_step_key] += 1
    initial_keys = {step.step_key for step in steps if step.step_type == "START" or incoming.get(step.step_key, 0) == 0}

    run = frappe.get_doc(
        {
            "doctype": "OS Run",
            "run_code": f"{process.process_code or process.name}-{frappe.generate_hash(length=8).upper()}",
            "process_ref": process.name, "process_version": process.version_label,
            "company": process.company, "initiated_by": user, "trigger_type": "Manual",
            "trigger_ref_doctype": source_doctype, "trigger_ref_name": source_name,
            "status": "Queued", "started_at": now_datetime(),
            "current_step_key": next(iter(initial_keys), steps[0].step_key),
            "run_mode": mode,
            "context_json": json.dumps({"source_doctype": source_doctype, "source_name": source_name}, ensure_ascii=False),
        }
    )
    # La creación de Runs sólo ocurre por este endpoint después de validar rol y proceso.
    # No se concede Create directo sobre OS Run a roles de operación.
    run.insert(ignore_permissions=True)

    created = []
    for step in steps:
        actions = _step_actions(process, step.step_key)
        step_run = frappe.get_doc(
            {
                "doctype": "OS Step Run", "run": run.name, "step_key": step.step_key,
                "step_title_snapshot": step.step_title, "step_type_snapshot": step.step_type,
                "execution_type_snapshot": step.execution_type,
                "process_version_snapshot": process.version_label,
                "instructions_snapshot": step.instructions or "", "sop_snapshot": process.sop or "",
                "prompt_snapshot": step.prompt or "", "policy_snapshot": process.policy or "",
                "actor_user": step.actor_user, "actor_role": step.actor_role,
                "actor_agent": step.actor_agent or step.agent,
                "approval_role_snapshot": step.approval_role,
                "status": "Queued" if step.step_key in initial_keys else "Blocked",
                "queued_at": now_datetime(), "attempt_no": 1,
                "evidence_required": 1 if step.evidence_policy else 0,
                "approval_required": int(step.requires_approval or 0),
                "action_status": "Ready" if actions else "Not Required",
                "action_snapshot_json": json.dumps(actions, ensure_ascii=False),
                "source_doctype": source_doctype, "source_name": source_name,
            }
        )
        step_run.insert(ignore_permissions=True)
        created.append(step_run.name)

    run.status = "Running"
    run.save(ignore_permissions=True)
    _auto_advance_terminal_system_steps(run, process)
    _refresh_run_status(run)
    return {"run": run.name, "run_code": run.run_code, "step_runs": created, "mode": mode, "status": run.status}


@frappe.whitelist(methods=["POST"])
def start_step(step_run_name: str):
    step = frappe.get_doc("OS Step Run", step_run_name)
    assert_step_access(step, write=True)
    if step.status != "Queued":
        frappe.throw(_("Sólo un paso Queued puede iniciarse."))
    step.status = "Running"
    step.started_at = step.started_at or now_datetime()
    step.save()
    run = frappe.get_doc("OS Run", step.run)
    run.status = "Running"
    run.current_step_key = step.step_key
    run.save(ignore_permissions=True)
    return {"name": step.name, "status": step.status}


@frappe.whitelist(methods=["POST"])
def complete_step(step_run_name: str, comment: str = "", outcome: str | None = None):
    step = frappe.get_doc("OS Step Run", step_run_name)
    assert_step_access(step, write=True)
    if step.status not in {"Running", "Waiting", "Approved"}:
        frappe.throw(_("El paso debe estar Running, Waiting o Approved para completarse."))
    if not _required_actions_satisfied(step):
        frappe.throw(_("Falta ejecutar o vincular una acción de sistema requerida."))
    if step.evidence_required and not frappe.db.exists("OS Evidence", {"step_run": step.name}):
        frappe.throw(_("Este paso requiere evidencia antes de completarse."))

    run = frappe.get_doc("OS Run", step.run)
    process = frappe.get_doc("OS Process", run.process_ref)
    if step.approval_required and not frappe.db.exists("OS Approval", {"step_run": step.name, "status": "Approved"}):
        approval = _ensure_pending_approval(step, run, process)
        if step.status != "Waiting":
            step.status = "Waiting"
            step.output_json = json.dumps({"comment": comment or ""}, ensure_ascii=False)
            step.save()
        _refresh_run_status(run)
        return {"step_run": step.name, "status": step.status, "approval_pending": True, "approval": approval.name if approval else None, "run_status": run.status}

    step.output_json = json.dumps({"comment": comment or ""}, ensure_ascii=False)
    step.status = "Completed"
    step.completed_at = now_datetime()
    step.save()
    activated = _activate_next_steps(run, process, step, outcome=outcome)
    _auto_advance_terminal_system_steps(run, process)
    _refresh_run_status(run)
    return {"step_run": step.name, "status": step.status, "activated": activated, "run_status": run.status, "approval_pending": False}


@frappe.whitelist(methods=["POST"])
def execute_action(step_run_name: str, action_key: str, source_doctype: str | None = None, source_name: str | None = None, target_name: str | None = None, values_json: str | dict | None = None):
    step = frappe.get_doc("OS Step Run", step_run_name)
    assert_step_access(step, write=True)
    run = frappe.get_doc("OS Run", step.run)
    process = frappe.get_doc("OS Process", run.process_ref)
    action = _find_action(process, step.step_key, action_key)
    if action.system != "ERPNext":
        frappe.throw(_("Esta versión sólo ejecuta acciones ERPNext desde el servidor."))
    if action.required_role and action.required_role not in roles_for():
        frappe.throw(_("Esta acción requiere el rol {0}.").format(action.required_role), frappe.PermissionError)

    action_type = action.action_type
    target_doctype = action.target_doctype
    values = _json_object(values_json, "values_json")
    defaults = _json_object(action.defaults_json, "Defaults JSON")
    mapping = _json_object(action.field_mapping_json, "Field Mapping JSON")
    src_doctype, src_name = _primary_source(run, step, action, source_doctype, source_name)
    result_doc = None

    if action_type == "CREATE_FROM_SOURCE":
        if not src_doctype or not src_name:
            frappe.throw(_("CREATE_FROM_SOURCE necesita un documento origen."))
        source = frappe.get_doc(src_doctype, src_name)
        source.check_permission("read")
        mapper_path = MAPPER_REGISTRY.get((src_doctype, target_doctype))
        if mapper_path:
            result_doc = _load_mapper(mapper_path)(src_name)
        else:
            result_doc = frappe.new_doc(target_doctype)
            _apply_source_mapping(result_doc, source, mapping)
        _safe_apply_values(result_doc, defaults)
        _safe_apply_values(result_doc, values)
        result_doc.insert()
        if action.submit_after_create:
            result_doc.check_permission("submit")
            result_doc.submit()
    elif action_type == "CREATE_DOCUMENT":
        result_doc = frappe.new_doc(target_doctype)
        if src_doctype and src_name and mapping:
            source = frappe.get_doc(src_doctype, src_name)
            source.check_permission("read")
            _apply_source_mapping(result_doc, source, mapping)
        _safe_apply_values(result_doc, defaults)
        _safe_apply_values(result_doc, values)
        result_doc.insert()
        if action.submit_after_create:
            result_doc.check_permission("submit")
            result_doc.submit()
    elif action_type == "UPDATE_DOCUMENT":
        if not target_name:
            frappe.throw(_("UPDATE_DOCUMENT requiere target_name."))
        result_doc = frappe.get_doc(target_doctype, target_name)
        result_doc.check_permission("write")
        _safe_apply_values(result_doc, values)
        result_doc.save()
    elif action_type == "SUBMIT_DOCUMENT":
        if not target_name:
            frappe.throw(_("SUBMIT_DOCUMENT requiere target_name."))
        result_doc = frappe.get_doc(target_doctype, target_name)
        result_doc.check_permission("submit")
        if result_doc.docstatus != 0:
            frappe.throw(_("Sólo puede enviarse un documento en borrador."))
        result_doc.submit()
    elif action_type in {"LINK_DOCUMENT", "OPEN_DOCUMENT"}:
        if not target_name:
            frappe.throw(_("{0} requiere target_name.").format(action_type))
        result_doc = frappe.get_doc(target_doctype, target_name)
        result_doc.check_permission("read")
    else:
        frappe.throw(_("Action Type no soportado: {0}").format(action_type))

    if not result_doc or not result_doc.name:
        frappe.throw(_("La acción no produjo un documento válido."))
    if src_doctype and src_name:
        source_action = type("SourceAction", (), {"action_key": action.action_key, "action_label": action.action_label})()
        _record_link(run, step, process, source_action, src_doctype, src_name, role="Source", primary=False)
    link = _record_link(run, step, process, action, result_doc.doctype, result_doc.name, role="Result", primary=True)

    step.reference_doctype = result_doc.doctype
    step.reference_name = result_doc.name
    step.last_action_at = now_datetime()
    step.action_status = "Executed"
    if src_doctype and src_name:
        step.source_doctype = src_doctype
        step.source_name = src_name
    step.save(ignore_permissions=True)
    return {"doctype": result_doc.doctype, "name": result_doc.name, "docstatus": int(result_doc.docstatus or 0), "route": get_url_to_form(result_doc.doctype, result_doc.name), "document_link": link.name, "action_key": action.action_key}


@frappe.whitelist(methods=["GET"])
def get_step_actions(step_run_name: str):
    step = frappe.get_doc("OS Step Run", step_run_name)
    assert_step_access(step, write=False)
    try:
        actions = json.loads(step.action_snapshot_json or "[]")
    except (TypeError, ValueError):
        actions = []
    links = frappe.get_all(
        "OS Document Link",
        filters={"step_run": step.name},
        fields=["name", "action_key", "link_role", "reference_doctype", "reference_name", "label", "document_status_snapshot"],
        order_by="creation asc",
    )
    for link in links:
        link["route"] = get_url_to_form(link.reference_doctype, link.reference_name)
    return {"actions": actions, "links": links, "source_doctype": step.source_doctype, "source_name": step.source_name}
