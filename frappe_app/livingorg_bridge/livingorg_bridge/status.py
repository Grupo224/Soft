from __future__ import annotations

import frappe


@frappe.whitelist(methods=["GET"])
def capabilities():
    return {
        "app": "livingorg_bridge",
        "version": "1.0.0",
        "operational_actions": True,
        "server_side_transitions": True,
        "document_links": True,
        "erpnext_mappers": True,
        "installed_apps": [app for app in frappe.get_installed_apps() if app in {"frappe", "erpnext", "livingorg_bridge"}],
    }
