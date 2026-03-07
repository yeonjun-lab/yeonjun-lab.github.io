#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <file1> [file2 ...]"
  exit 1
fi

TODAY="$(TZ=Asia/Seoul date +%F)"

python - "$TODAY" "$@" <<'PY'
from pathlib import Path
import re
import sys

today = sys.argv[1]
files = sys.argv[2:]

for f in files:
    p = Path(f)
    text = p.read_text()

    if "updated_at:" in text:
        text = re.sub(r"^updated_at:\s*.*$", f"updated_at: {today}", text, flags=re.M)
    else:
        text = text.replace("---\n", f"---\nupdated_at: {today}\n", 1)

    if "sort_date:" in text:
        text = re.sub(r"^sort_date:\s*.*$", f"sort_date: {today}", text, flags=re.M)
    else:
        text = text.replace("---\n", f"---\nsort_date: {today}\n", 1)

    if "created_at:" not in text:
        text = text.replace("---\n", f"---\ncreated_at: {today}\n", 1)

    p.write_text(text)
    print(f"updated: {p}")
PY
