#!/usr/bin/env python3
"""Entrypoint explícito para sincronización API-first de LivingOrg OS.

Reutiliza el deployment canónico sin exigir livingorg_bridge. Este comando instala
schema + roles + permisos canónicos + assets + Web Page exclusivamente vía REST.
No instala módulos Python ni hooks de Frappe.
"""
from __future__ import annotations

import argparse
import sys

from scripts import deploy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("install", "update"), default="update")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    forwarded = [sys.argv[0], "--mode", args.mode]
    if args.dry_run:
        forwarded.append("--dry-run")
    old_argv = sys.argv
    try:
        sys.argv = forwarded
        result = deploy.main()
    finally:
        sys.argv = old_argv

    if result == 0 and not args.dry_run:
        print(
            "INFO: API deployment sincronizó schema/portal. "
            "Ejecuta scripts/verify.py para conocer el estado del runtime operativo."
        )
    return result


if __name__ == "__main__":
    raise SystemExit(main())
