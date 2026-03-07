#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <path> <title> <layout>"
  echo "Example: $0 _foundations/languages/python/object-model/reference-binding.md \"파이썬의 참조와 바인딩\" doc"
  exit 1
fi

FILE_PATH="$1"
TITLE="$2"
LAYOUT="${3:-doc}"

TODAY="$(TZ=Asia/Seoul date +%F)"
PERMALINK="/$(echo "$FILE_PATH" \
  | sed 's#^_foundations/#foundations/#' \
  | sed 's#^_engineering/#engineering/#' \
  | sed 's#^_ai_systems/#ai-systems/#' \
  | sed 's#^_research/#research/#' \
  | sed 's#^_projects/#projects/#' \
  | sed 's#/index\.md$#/#' \
  | sed 's#\.md$#/#')"

mkdir -p "$(dirname "$FILE_PATH")"

cat > "$FILE_PATH" <<EOT
---
title: "$TITLE"
permalink: $PERMALINK
layout: $LAYOUT
created_at: $TODAY
updated_at: $TODAY
sort_date: $TODAY
---

## 1. 왜 이 주제를 공부했는가

## 2. 핵심 개념

## 3. 중요한 포인트

## 4. 실무 관점
EOT

echo "created: $FILE_PATH"
