#!/usr/bin/env python3
from pathlib import Path
import re

ROOTS = ["_foundations", "_engineering", "_ai_systems", "_research", "_projects"]

def extract_front_matter(text: str):
    if not text.startswith("---\n"):
        return None
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        return None
    return parts[1], parts[2]

def get_value(fm: str, key: str):
    m = re.search(rf"^{re.escape(key)}:\s*(.+)$", fm, flags=re.M)
    return m.group(1).strip() if m else None

def titleize(slug: str):
    return " ".join(part.capitalize() for part in slug.split("-"))

def hub_dir_for(section: str, subcategory: str, language: str, topic_slug: str):
    if section == "foundations" and subcategory == "languages":
        return Path(f"_{section}/{subcategory}/{language}/{topic_slug}")
    return None

topics = {}

for root in ROOTS:
    for p in Path(root).rglob("*.md"):
        if p.name == "index.md":
            continue

        text = p.read_text(encoding="utf-8")
        extracted = extract_front_matter(text)
        if extracted is None:
            continue

        fm, _ = extracted

        layout = get_value(fm, "layout")
        section = get_value(fm, "section")
        subcategory = get_value(fm, "subcategory")
        language = get_value(fm, "language")
        topic = get_value(fm, "topic")
        topic_slug = get_value(fm, "topic_slug")
        topic_title = get_value(fm, "topic_title")
        topic_description = get_value(fm, "topic_description")

        if layout != "doc":
            continue
        if subcategory != "languages":
            continue
        if not section or not language or not topic or not topic_slug:
            continue

        key = (section, subcategory, language, topic, topic_slug)

        if key not in topics:
            topics[key] = {
                "topic_title": topic_title,
                "topic_description": topic_description,
            }

for (section, subcategory, language, topic, topic_slug), meta in sorted(topics.items()):
    hub_dir = hub_dir_for(section, subcategory, language, topic_slug)
    if hub_dir is None:
        continue

    hub_dir.mkdir(parents=True, exist_ok=True)
    hub_file = hub_dir / "index.md"

    title = meta["topic_title"] or titleize(topic_slug)
    description = meta["topic_description"] or f"{title} 관련 문서 모음"

    content = f"""---
layout: category-hub
title: {title}
permalink: /{section}/{subcategory}/{language}/{topic_slug}/
section: {section}
subcategory: {subcategory}
language: {language}
topic: {topic}
topic_slug: {topic_slug}
hub_mode: doc-list
description: {description}
---
"""

    if hub_file.exists():
        continue

    hub_file.write_text(content, encoding="utf-8")
    print(f"created: {hub_file}")