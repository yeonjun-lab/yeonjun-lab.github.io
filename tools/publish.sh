#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <commit-message>"
  exit 1
fi

MSG="$1"

echo "[1/6] strict validation..."
python3 tools/validate_docs_strict.py

echo "[2/6] build..."
bundle exec jekyll build

echo "[3/6] git add..."
git add .

if git diff --cached --quiet; then
  echo "[4/6] no staged changes to commit"
  exit 0
fi

echo "[4/6] git commit..."
git commit -m "$MSG"

echo "[5/6] git push..."
git push

echo "[6/6] publish completed."
