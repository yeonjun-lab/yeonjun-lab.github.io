#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <path> <title> <topic> <topic-slug> [template]"
  echo "Example: $0 _foundations/languages/c/ \"mixed-version round-trip 테스트는 왜 필요한가\" c-binary-layout binary-layout deep-dive"
  exit 1
fi

FILE_PATH="$1"
TITLE="$2"
TOPIC="$3"
TOPIC_SLUG="$4"
TEMPLATE_NAME="${5:-concept}"
LAYOUT="doc"

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

normalize_dir() {
  local path="$1"
  if [[ "$path" != */ ]]; then
    path="${path}/"
  fi
  echo "$path"
}

ensure_topic_dir() {
  local path="$1"
  local topic_slug="$2"

  case "$path" in
    _foundations/languages/*)
      local trimmed="${path%/}"
      local rest="${trimmed#_foundations/languages/}"
      local language="${rest%%/*}"
      local remainder=""

      if [[ "$rest" == */* ]]; then
        remainder="${rest#*/}"
      fi

      if [[ -z "$language" ]]; then
        echo "$path"
        return
      fi

      if [[ -z "$remainder" ]]; then
        echo "_foundations/languages/${language}/${topic_slug}/"
        return
      fi

      if [[ "$remainder" == "$topic_slug" || "$remainder" == "$topic_slug/"* ]]; then
        echo "${trimmed}/"
        return
      fi

      echo "_foundations/languages/${language}/${topic_slug}/"
      ;;
    *)
      echo "$path"
      ;;
  esac
}

infer_nav_group_dir() {
  local path="$1"
  case "$path" in
    _foundations/languages/*)
      local trimmed="${path%/}"
      local rest="${trimmed#_foundations/languages/}"
      local language="${rest%%/*}"
      if [[ -n "$language" ]]; then
        echo "_foundations/languages/${language}/"
        return
      fi
      ;;
  esac
  echo "$path"
}

to_nav_group() {
  local path="$1"
  echo "/$(echo "$path" \
    | sed 's#^_foundations/#foundations/#' \
    | sed 's#^_engineering/#engineering/#' \
    | sed 's#^_ai_systems/#ai-systems/#' \
    | sed 's#^_research/#research/#' \
    | sed 's#^_projects/#projects/#' \
    | sed 's#/$##')/"
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

infer_language() {
  local path="$1"
  case "$path" in
    _foundations/languages/*)
      echo "$path" | sed 's#^_foundations/languages/##' | cut -d/ -f1
      ;;
    *)
      echo ""
      ;;
  esac
}

FILE_PATH="$(normalize_dir "$FILE_PATH")"
FILE_PATH="$(ensure_topic_dir "$FILE_PATH" "$TOPIC_SLUG")"
SLUG="$(slugify "$TITLE")"
FILE_PATH="${FILE_PATH}${SLUG}.md"

NAV_GROUP_DIR="$(infer_nav_group_dir "$(dirname "$FILE_PATH")")"
NAV_GROUP="$(to_nav_group "$NAV_GROUP_DIR")"
SECTION="$(infer_section "$FILE_PATH")"
SUBCATEGORY="$(infer_subcategory "$FILE_PATH")"
LANGUAGE="$(infer_language "$FILE_PATH")"
PERMALINK="${NAV_GROUP}${TOPIC_SLUG}/${SLUG}/"

TEMPLATE_FILE="templates/${TEMPLATE_NAME}.md"
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template not found: $TEMPLATE_FILE"
  exit 1
fi

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
doc_type: $TEMPLATE_NAME
topic: $TOPIC
topic_slug: $TOPIC_SLUG
EOT

if [ -n "$LANGUAGE" ]; then
  echo "language: $LANGUAGE" >> "$FILE_PATH"
fi

cat >> "$FILE_PATH" <<'EOT'
tags: []
---

EOT

cat "$TEMPLATE_FILE" >> "$FILE_PATH"

echo "created: $FILE_PATH"
