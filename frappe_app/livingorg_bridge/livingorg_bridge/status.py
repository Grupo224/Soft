from __future__ import annotations

import frappe


@frappe.whitelist(methods=["GET"])
def capabilities():
    return {
        "app": "livingorg_bridge",
        "version": "1.0.1",
        "operational_actions": True,
        "server_side_transitions": True,
        "document_links": True,
        "evidence_scope": True,
        "process_governance": True,
        "erpnext_mappers": True,
        "installed_apps": [app for app in frappe.get_installed_apps() if app in {"frappe", "erpnext", "livingorg_bridge"}],
    }


@frappe.whitelist(methods=["GET"])
def current_roles():
    """Roles efectivos de la sesión Website para resolver tareas asignadas por Role."""
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Authentication required", frappe.PermissionError)
    return [role for role in frappe.get_roles(user) if role not in {"All", "Guest"}]
