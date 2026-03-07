#!/usr/bin/env bash
set -euo pipefail

echo "[1/2] strict validation..."
python3 tools/validate_docs_strict.py

echo "[2/2] build..."
bundle exec jekyll build

echo "Prepublish check completed."
