#!/usr/bin/env python3
"""Elimina registros OS_* con doble confirmación; no elimina DocTypes."""
from __future__ import annotations

import argparse
import os
import sys

from scripts.config import ConfigurationError, load_settings
from scripts.frappe_client import FrappeClient, FrappeRequestError

NON_CHILD = [
    "OS Agent", "OS Approval", "OS Evidence", "OS Integration", "OS KPI Definition",
    "OS Knowledge Source", "OS Org Node", "OS Org Relation", "OS Policy", "OS Process",
    "OS Prompt", "OS Role Card", "OS Run", "OS SOP", "OS Skill", "OS Step Run",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-destroy", action="store_true")
    args = parser.parse_args()
    try:
        if not args.confirm_destroy or os.environ.get("LIVINGORG_ALLOW_DESTRUCTIVE") != "1":
            raise ConfigurationError(
                "Limpieza bloqueada. Usa --confirm-destroy y LIVINGORG_ALLOW_DESTRUCTIVE=1."
            )
        settings = load_settings()
        client = FrappeClient(settings)
        total = 0
        for doctype in NON_CHILD:
            rows = client.list(doctype, fields=["name"], limit=500)
            for row in rows:
                client.delete(doctype, row["name"], allow_missing=True)
                total += 1
            if rows:
                print(f"{doctype}: {len(rows)} borrados")
        print(f"Total registros borrados: {total}")
        return 0
    except (ConfigurationError, FrappeRequestError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
