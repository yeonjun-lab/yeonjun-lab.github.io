#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <path> <title> [layout]"
  echo "Example: $0 _foundations/db/oracle/optimizer/cardinality-estimate-basics.md \"Cardinality Estimate 기초\""
  exit 1
fi

FILE_PATH="$1"
TITLE="$2"
LAYOUT="${3:-doc}"

TODAY="$(TZ=Asia/Seoul date +%F)"

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9가-힣[:space:]-]/ /g' \
    | sed 's/[[:space:]]\+/-/g' \
    | sed 's/--\+/-/g' \
    | sed 's/^-//' \
    | sed 's/-$//'
}

to_permalink() {
  local path="$1"
  echo "/$(echo "$path" \
    | sed 's#^_foundations/#foundations/#' \
    | sed 's#^_engineering/#engineering/#' \
    | sed 's#^_ai_systems/#ai-systems/#' \
    | sed 's#^_research/#research/#' \
    | sed 's#^_projects/#projects/#' \
    | sed 's#/index\.md$#/#' \
    | sed 's#\.md$#/#')"
}

infer_section() {
  case "$1" in
    _foundations/*) echo "foundations" ;;
    _engineering/*) echo "engineering" ;;
    _ai_systems/*) echo "ai_systems" ;;
    _research/*) echo "research" ;;
    _projects/*) echo "projects" ;;
    *) echo "" ;;
  esac
}

infer_subcategory() {
  local path="$1"
  case "$path" in
    _foundations/languages/*) echo "languages" ;;
    _foundations/cs/*) echo "cs" ;;
    _foundations/db/*) echo "db" ;;
    _engineering/frontend/*) echo "frontend" ;;
    _engineering/backend/*) echo "backend" ;;
    *) echo "" ;;
  esac
}

infer_topic() {
  local path="$1"
  local rel
  rel="$(echo "$path" \
    | sed 's#^_foundations/##' \
    | sed 's#^_engineering/##' \
    | sed 's#^_ai_systems/##' \
    | sed 's#^_research/##' \
    | sed 's#^_projects/##' \
    | sed 's#/[^/]*\.md$##')"

  local depth
  depth="$(echo "$rel" | awk -F/ '{print NF}')"

  if [ "$depth" -ge 3 ]; then
    echo "$rel" | awk -F/ '{print $(NF)}'
  else
    echo ""
  fi
}

# If path ends with /, auto-generate filename from title.
if [[ "$FILE_PATH" == */ ]]; then
  SLUG="$(slugify "$TITLE")"
  FILE_PATH="${FILE_PATH}${SLUG}.md"
fi

PERMALINK="$(to_permalink "$FILE_PATH")"
NAV_GROUP="$(dirname "$PERMALINK")/"
NAV_GROUP="$(echo "$NAV_GROUP" | sed 's#///*#/#g')"

SECTION="$(infer_section "$FILE_PATH")"
SUBCATEGORY="$(infer_subcategory "$FILE_PATH")"
TOPIC="$(infer_topic "$FILE_PATH")"

mkdir -p "$(dirname "$FILE_PATH")"

cat > "$FILE_PATH" <<EOT
---
title: "$TITLE"
permalink: $PERMALINK
layout: $LAYOUT
section: $SECTION
subcategory: $SUBCATEGORY
created_at: $TODAY
updated_at: $TODAY
sort_date: $TODAY
nav_group: $NAV_GROUP
EOT

if [ -n "$TOPIC" ]; then
  echo "topic: $TOPIC" >> "$FILE_PATH"
fi

cat >> "$FILE_PATH" <<'EOT'
tags: []
---

## 1. 왜 이 주제를 공부했는가

## 2. 핵심 개념

## 3. 중요한 포인트

## 4. 실무 관점
EOT

echo "created: $FILE_PATH"
