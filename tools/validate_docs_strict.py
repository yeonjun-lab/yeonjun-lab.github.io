#!/usr/bin/env python3
import subprocess
import sys

result = subprocess.run(
    ["python3", "tools/validate_docs.py"],
    capture_output=True,
    text=True
)

print(result.stdout, end="")
print(result.stderr, end="", file=sys.stderr)

if "Warnings:" in result.stdout:
    sys.exit(1)

sys.exit(result.returncode)