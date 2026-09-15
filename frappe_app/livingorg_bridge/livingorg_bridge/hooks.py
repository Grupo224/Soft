app_name = "livingorg_bridge"
app_title = "LivingOrg Bridge"
app_publisher = "Grupo Altoplano"
app_description = "Server-side runtime, permissions and ERPNext document actions for LivingOrg OS."
app_email = ""
app_license = "UNLICENSED"

required_apps = ["erpnext"]

# Reglas críticas que no deben depender del navegador.
doc_events = {
    "OS Process": {
        "validate": "livingorg_bridge.governance.validate_process",
    },
    "OS Step Run": {
        "validate": "livingorg_bridge.governance.validate_step_run",
    },
    "OS Approval": {
        "validate": "livingorg_bridge.events.validate_approval",
    },
    "OS Evidence": {
        "validate": "livingorg_bridge.governance.validate_evidence",
    },
}

# Aislamiento documental para operadores/aprobadores. Admin/Manager/Auditor/Viewer
# conservan el alcance de lectura definido por Role Permission Manager y User Permissions.
permission_query_conditions = {
    "OS Step Run": "livingorg_bridge.permissions.step_run_query",
    "OS Approval": "livingorg_bridge.permissions.approval_query",
    "OS Document Link": "livingorg_bridge.permissions.document_link_query",
    "OS Evidence": "livingorg_bridge.evidence_permissions.evidence_query",
}

has_permission = {
    "OS Step Run": "livingorg_bridge.permissions.step_run_has_permission",
    "OS Approval": "livingorg_bridge.permissions.approval_has_permission",
    "OS Document Link": "livingorg_bridge.permissions.document_link_has_permission",
    "OS Evidence": "livingorg_bridge.evidence_permissions.evidence_has_permission",
}
