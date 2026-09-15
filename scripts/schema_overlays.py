from __future__ import annotations

from typing import Any

FIELD_OVERLAYS: dict[str, list[dict[str, Any]]] = {
    "OS Process": [
        {"fieldname":"actions","label":"System Actions","fieldtype":"Table","options":"OS Process Action","description":"Acciones estructuradas por step_key para vincular el proceso con DocTypes y documentos reales."}
    ],
    "OS Run": [
        {"fieldname":"run_mode","label":"Run Mode","fieldtype":"Select","options":"Test\nLive","default":"Live","in_list_view":1},
        {"fieldname":"context_json","label":"Runtime Context JSON","fieldtype":"Code","options":"JSON","description":"Contexto no secreto del run."}
    ],
    "OS Step Run": [
        {"fieldname":"step_type_snapshot","label":"Step Type Snapshot","fieldtype":"Data"},
        {"fieldname":"actor_role","label":"Actor Role","fieldtype":"Link","options":"Role"},
        {"fieldname":"approval_role_snapshot","label":"Approval Role Snapshot","fieldtype":"Link","options":"Role"},
        {"fieldname":"action_status","label":"System Action Status","fieldtype":"Select","options":"Not Required\nReady\nExecuted\nFailed\nSkipped","default":"Not Required","in_list_view":1},
        {"fieldname":"action_snapshot_json","label":"System Actions Snapshot JSON","fieldtype":"Code","options":"JSON","description":"Acciones congeladas al iniciar el Run."},
        {"fieldname":"source_doctype","label":"Primary Source DocType","fieldtype":"Link","options":"DocType"},
        {"fieldname":"source_name","label":"Primary Source Name","fieldtype":"Dynamic Link","options":"source_doctype"},
        {"fieldname":"reference_doctype","label":"Primary Result DocType","fieldtype":"Link","options":"DocType"},
        {"fieldname":"reference_name","label":"Primary Result Name","fieldtype":"Dynamic Link","options":"reference_doctype"},
        {"fieldname":"last_action_at","label":"Last System Action At","fieldtype":"Datetime","read_only":1}
    ]
}

FIELD_PATCHES: dict[str, dict[str, dict[str, Any]]] = {
    "OS Step Run": {"status": {"options":"Blocked\nQueued\nRunning\nWaiting\nApproved\nCompleted\nFailed\nSkipped\nCancelled"}}
}

def apply_schema_overlays(spec: dict[str, Any]) -> dict[str, Any]:
    name = str(spec.get("name") or "")
    fields = spec.setdefault("fields", [])
    by_name = {str(field.get("fieldname")): field for field in fields if field.get("fieldname")}
    for fieldname, patch in FIELD_PATCHES.get(name, {}).items():
        if fieldname in by_name:
            by_name[fieldname].update(patch)
    for field in FIELD_OVERLAYS.get(name, []):
        fieldname = str(field.get("fieldname") or "")
        if not fieldname:
            continue
        if fieldname in by_name:
            by_name[fieldname].update(field)
        else:
            fields.append(dict(field))
            by_name[fieldname] = fields[-1]
    return spec
