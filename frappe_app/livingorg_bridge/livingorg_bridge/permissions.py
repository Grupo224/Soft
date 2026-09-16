from __future__ import annotations

import frappe

from livingorg_bridge.security import PRIVILEGED_ROLES, roles_for


# Todos estos roles ya pasan por Role Permission Manager. Aquí sólo se restringe
# el alcance del operador/aprobador; nunca se usa este hook para conceder permisos.
READ_ALL_ROLES = PRIVILEGED_ROLES | {
    "OS Architect", "OS Publisher", "OS AI Supervisor", "OS Auditor", "OS Viewer"
}


def _q(value: str) -> str:
    return frappe.db.escape(value)


def _role_sql(field: str, roles: set[str]) -> str:
    if not roles:
        return "0=1"
    quoted = ",".join(_q(role) for role in sorted(roles))
    return f"{field} in ({quoted})"


def step_run_query(user: str | None = None) -> str | None:
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles:
        return "1=0"
    return (
        f"(`tabOS Step Run`.actor_user={_q(user)} OR "
        + _role_sql("`tabOS Step Run`.actor_role", roles)
        + ")"
    )


def approval_query(user: str | None = None) -> str | None:
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles:
        return "1=0"
    return (
        f"(`tabOS Approval`.requested_to={_q(user)} OR "
        + _role_sql("`tabOS Approval`.requested_role", roles)
        + ")"
    )


def document_link_query(user: str | None = None) -> str | None:
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles:
        return "1=0"
    step_condition = (
        f"(sr.actor_user={_q(user)} OR " + _role_sql("sr.actor_role", roles) + ")"
    )
    return (
        "EXISTS (SELECT 1 FROM `tabOS Step Run` sr "
        "WHERE sr.name=`tabOS Document Link`.step_run AND " + step_condition + ")"
    )


def step_run_has_permission(doc, user: str | None = None, permission_type: str | None = None):
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles:
        return False
    if doc.actor_user == user or (doc.actor_role and doc.actor_role in roles):
        return None
    return False


def approval_has_permission(doc, user: str | None = None, permission_type: str | None = None):
    user = user or frappe.session.user
    roles = roles_for(user)
    if roles & READ_ALL_ROLES:
        return None
    if "OS Operator" not in roles:
        return False
    if doc.requested_to == user or (doc.requested_role and doc.requested_role in roles):
        return None
    return False


def document_link_has_permission(doc, user: str | None = None, permission_type: str | None = None):
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
