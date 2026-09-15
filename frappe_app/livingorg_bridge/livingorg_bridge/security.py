from __future__ import annotations

import frappe
from frappe import _


PRIVILEGED_ROLES = {"System Manager", "OS Admin", "OS Manager"}
RUN_START_ROLES = PRIVILEGED_ROLES | {"OS Architect", "OS Publisher"}


def current_user() -> str:
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Necesitas iniciar sesión."), frappe.PermissionError)
    return user


def roles_for(user: str | None = None) -> set[str]:
    return set(frappe.get_roles(user or current_user()))


def has_any_role(required: set[str], user: str | None = None) -> bool:
    return bool(roles_for(user) & set(required))


def assert_role(required: set[str], action_label: str = "realizar esta acción") -> None:
    user = current_user()
    if not has_any_role(set(required), user):
        frappe.throw(_("No tienes un rol autorizado para {0}.").format(action_label), frappe.PermissionError)


def assert_can_start_run(process_doc) -> None:
    user = current_user()
    assert_role(RUN_START_ROLES, "iniciar ejecuciones de procesos")
    if not frappe.has_permission("OS Process", "read", doc=process_doc, user=user):
        frappe.throw(_("No tienes acceso a este proceso."), frappe.PermissionError)


def assert_step_access(step_run, *, write: bool = True) -> None:
    user = current_user()
    roles = roles_for(user)
    if roles & PRIVILEGED_ROLES:
        return
    if step_run.actor_user and step_run.actor_user == user:
        return
    if step_run.actor_role and step_run.actor_role in roles:
        return
    if step_run.actor_agent and "OS AI Supervisor" in roles:
        return
    action = _("modificar") if write else _("consultar")
    frappe.throw(_("No puedes {0} este paso porque no está asignado a tu usuario/rol.").format(action), frappe.PermissionError)


def assert_action_role(action) -> None:
    if action.required_role and action.required_role not in roles_for():
        frappe.throw(
            _("La acción '{0}' requiere el rol {1}.").format(action.action_label or action.action_key, action.required_role),
            frappe.PermissionError,
        )


def assert_approval_access(approval) -> None:
    user = current_user()
    roles = roles_for(user)
    if roles & PRIVILEGED_ROLES:
        return
    if approval.requested_to and approval.requested_to == user:
        return
    if approval.requested_role and approval.requested_role in roles:
        return
    frappe.throw(_("Esta aprobación no está asignada a tu usuario/rol."), frappe.PermissionError)


def assert_doc_permission(doctype: str, permission_type: str, *, name: str | None = None) -> None:
    user = current_user()
    if name:
        doc = frappe.get_doc(doctype, name)
        if not frappe.has_permission(doctype, permission_type, doc=doc, user=user):
            frappe.throw(
                _("No tienes permiso {0} sobre {1} {2}.").format(permission_type, doctype, name),
                frappe.PermissionError,
            )
    elif not frappe.has_permission(doctype, permission_type, user=user):
        frappe.throw(
            _("No tienes permiso {0} sobre {1}.").format(permission_type, doctype),
            frappe.PermissionError,
        )
