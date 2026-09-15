from __future__ import annotations

import frappe

from livingorg_bridge.permissions import READ_ALL_ROLES, _q, _role_sql
from livingorg_bridge.security import roles_for


def evidence_query(user: str | None = None) -> str | None:
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles:
        return "1=0"
    step_condition = f"(sr.actor_user={_q(user)} OR {_role_sql('sr.actor_role', roles)})"
    return (
        "EXISTS (SELECT 1 FROM `tabOS Step Run` sr "
        "WHERE sr.name=`tabOS Evidence`.step_run AND " + step_condition + ")"
    )


def evidence_has_permission(doc, user: str | None = None, permission_type: str | None = None):
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles or not doc.step_run:
        return False
    step = frappe.get_doc("OS Step Run", doc.step_run)
    if step.actor_user == user or (step.actor_role and step.actor_role in roles):
        return None
    return False
