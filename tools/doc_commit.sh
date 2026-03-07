#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <file> <commit-message>"
  exit 1
fi

FILE="$1"
MESSAGE="$2"

./tools/touch_doc.sh "$FILE"
git commit -m "$MESSAGE"
