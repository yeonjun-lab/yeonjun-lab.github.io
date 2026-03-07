#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOTS = ["_foundations", "_engineering", "_ai_systems", "_research", "_projects"]
REQUIRED = ["title", "permalink", "layout", "created_at", "updated_at", "sort_date", "nav_group"]

errors = []

for root in ROOTS:
    for p in Path(root).rglob("*.md"):
        text = p.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            errors.append(f"{p}: missing front matter start")
            continue

        parts = text.split("---\n", 2)
        if len(parts) < 3:
            errors.append(f"{p}: malformed front matter")
            continue

        fm = parts[1]

        for key in REQUIRED:
            if not re.search(rf"^{re.escape(key)}:\s*.+$", fm, flags=re.M):
                errors.append(f"{p}: missing {key}")

        if re.search(r"^layout:\s*doc$", fm, flags=re.M):
            for key in ["section", "subcategory"]:
                if not re.search(rf"^{re.escape(key)}:\s*.+$", fm, flags=re.M):
                    errors.append(f"{p}: missing {key} for doc layout")

if errors:
    print("Validation failed:")
    for err in errors:
        print(" -", err)
    sys.exit(1)

print("All documents look valid.")
