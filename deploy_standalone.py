#!/usr/bin/env python3
"""DEPRECATED entrypoint compatible para despliegue standalone.

Conservado para no romper automatizaciones existentes. La implementación canónica
vive en scripts/deploy.py.
"""
import sys
from scripts.deploy import main

if __name__ == "__main__":
    if "--mode" not in sys.argv:
        sys.argv[1:1] = ["--mode", "standalone"]
    raise SystemExit(main())
