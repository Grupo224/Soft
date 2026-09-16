from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from livingorg_bridge.security import assert_approval_access, current_user


@frappe.whitelist(methods=["POST"])
def decide(approval_name: str, decision: str, comment: str = ""):
    approval = frappe.get_doc("OS Approval", approval_name)
    assert_approval_access(approval)
    if approval.status != "Pending":
        frappe.throw(_("Esta aprobación ya fue decidida."))

    decision = (decision or "").title()
    if decision not in {"Approved", "Rejected"}:
        frappe.throw(_("La decisión debe ser Approved o Rejected."))

    approval.status = decision
    approval.decided_by = current_user()
    approval.decided_at = now_datetime()
    approval.decision_comment = comment or ""
    approval.save(ignore_permissions=True)

    if approval.step_run:
        step = frappe.get_doc("OS Step Run", approval.step_run)
        frappe.flags.livingorg_approval_transition = True
        try:
            if decision == "Approved" and step.status == "Waiting":
                step.status = "Approved"
                step.save(ignore_permissions=True)
            elif decision == "Rejected" and step.status in {"Waiting", "Approved"}:
                step.status = "Failed"
                step.error_code = "APPROVAL_REJECTED"
                step.error_message = comment or _("Aprobación rechazada")
                step.save(ignore_permissions=True)
        finally:
            frappe.flags.livingorg_approval_transition = False

    return {
        "approval": approval.name,
        "status": approval.status,
        "step_run": approval.step_run,
    }
