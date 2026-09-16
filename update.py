#!/usr/bin/env python3
"""DEPRECATED entrypoint compatible. Usa scripts/deploy.py para nuevas automatizaciones."""
from scripts.deploy import main

if __name__ == "__main__":
    raise SystemExit(main())
