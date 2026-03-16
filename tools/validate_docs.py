#!/usr/bin/env python3
from pathlib import Path
import re
import sys
from collections import defaultdict

ROOTS = ["_foundations", "_engineering", "_ai_systems", "_research", "_projects"]
REQUIRED = ["title", "permalink", "layout", "created_at", "updated_at", "sort_date", "nav_group"]
DOC_TYPES = {"concept", "deep-dive", "troubleshooting", "project-log", "research-note"}

errors = []
warnings = []
permalink_map = defaultdict(list)

STRUCTURE_RULES = {
    "concept": {
        "required_any": [
            ["정의"],
            ["핵심 개념"],
            ["실무 관점"]
        ],
        "min_matches": 2,
    },
    "deep-dive": {
        "required_any": [
            ["전체 구조"],
            ["내부 동작 원리"],
            ["실행 흐름", "처리 순서"],
            ["성능", "최적화 관점"]
        ],
        "min_matches": 3,
    },
    "troubleshooting": {
        "required_any": [
            ["문제 상황"],
            ["실제 원인"],
            ["해결 방법"]
        ],
        "min_matches": 3,
    },
    "project-log": {
        "required_any": [
            ["작업 목표"],
            ["이번에 구현한 내용"],
            ["다음 작업"]
        ],
        "min_matches": 3,
    },
    "research-note": {
        "required_any": [
            ["문제의식"],
            ["핵심 아이디어"],
            ["제안 구조"],
            ["열린 문제", "다음 확장"]
        ],
        "min_matches": 3,
    },
}

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

def parse_tags(fm: str):
    m = re.search(r"^tags:\s*\[(.*)\]\s*$", fm, flags=re.M)
    if not m:
        return None
    raw = m.group(1).strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]

def extract_headings(body: str):
    headings = []
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("## "):
            headings.append(stripped[3:].strip())
        elif stripped.startswith("### "):
            headings.append(stripped[4:].strip())
    return headings

def heading_matches(headings, keywords_group):
    for h in headings:
        for kw in keywords_group:
            if kw in h:
                return True
    return False

for root in ROOTS:
    for p in Path(root).rglob("*.md"):
        text = p.read_text(encoding="utf-8")
        extracted = extract_front_matter(text)

        if extracted is None:
            errors.append(f"{p}: missing or malformed front matter")
            continue

        fm, body = extracted

        layout = get_value(fm, "layout")
        title = get_value(fm, "title")
        permalink = get_value(fm, "permalink")
        created_at = get_value(fm, "created_at")
        updated_at = get_value(fm, "updated_at")
        sort_date = get_value(fm, "sort_date")
        nav_group = get_value(fm, "nav_group")
        section = get_value(fm, "section")
        subcategory = get_value(fm, "subcategory")
        topic = get_value(fm, "topic")
        topic_slug = get_value(fm, "topic_slug")
        language = get_value(fm, "language")
        doc_type = get_value(fm, "doc_type")
        tags = parse_tags(fm)

        for key in REQUIRED:
            if not re.search(rf"^{re.escape(key)}:\s*.+$", fm, flags=re.M):
                errors.append(f"{p}: missing {key}")

        if permalink:
            permalink_map[permalink].append(str(p))

        if layout == "doc":
            for key in ["section", "subcategory", "doc_type"]:
                if not re.search(rf"^{re.escape(key)}:\s*.+$", fm, flags=re.M):
                    errors.append(f"{p}: missing {key} for doc layout")

            if title and len(title.strip()) < 5:
                warnings.append(f"{p}: title looks too short")

            if doc_type and doc_type not in DOC_TYPES:
                errors.append(f"{p}: invalid doc_type '{doc_type}'")

            if doc_type == "research-note" and not str(p).startswith("_research/"):
                warnings.append(f"{p}: research-note should usually live under _research/")
            if doc_type == "project-log" and not str(p).startswith("_projects/"):
                warnings.append(f"{p}: project-log should usually live under _projects/")

            if subcategory == "languages":
                if topic is None or topic == "":
                    errors.append(f"{p}: topic is required for languages docs")
                if topic_slug is None or topic_slug == "":
                    errors.append(f"{p}: topic_slug is required for languages docs")
                if language is None or language == "":
                    warnings.append(f"{p}: language is recommended for languages docs")
            else:
                if topic is None or topic == "":
                    warnings.append(f"{p}: topic is empty")

            if tags is None:
                warnings.append(f"{p}: tags field missing")
            elif len(tags) == 0:
                warnings.append(f"{p}: tags are empty")

            if created_at and updated_at and sort_date:
                if sort_date < created_at:
                    warnings.append(f"{p}: sort_date is earlier than created_at")
                if updated_at < created_at:
                    warnings.append(f"{p}: updated_at is earlier than created_at")

            if nav_group and not nav_group.endswith("/"):
                errors.append(f"{p}: nav_group must end with '/'")

            if subcategory == "languages" and permalink and nav_group and topic_slug and doc_type:
                expected_prefix = f"{nav_group}{topic_slug}/{doc_type}/"
                if not permalink.startswith(expected_prefix):
                    warnings.append(
                        f"{p}: permalink '{permalink}' should start with '{expected_prefix}'"
                    )

            headings = extract_headings(body)

            if len(headings) < 2:
                warnings.append(f"{p}: very few headings found in body")

            if doc_type in STRUCTURE_RULES:
                rules = STRUCTURE_RULES[doc_type]
                matches = 0
                missing_groups = []

                for group in rules["required_any"]:
                    if heading_matches(headings, group):
                        matches += 1
                    else:
                        missing_groups.append("/".join(group))

                if matches < rules["min_matches"]:
                    warnings.append(
                        f"{p}: structure weak for doc_type '{doc_type}' "
                        f"(matched {matches}/{len(rules['required_any'])}, missing: {', '.join(missing_groups)})"
                    )

            body_text = re.sub(r"\s+", " ", body).strip()
            if len(body_text) < 200:
                warnings.append(f"{p}: body looks too short")

            if doc_type == "deep-dive" and len(body_text) < 500:
                warnings.append(f"{p}: deep-dive body looks too short")
            if doc_type == "research-note" and len(body_text) < 400:
                warnings.append(f"{p}: research-note body looks too short")

        else:
            if doc_type:
                warnings.append(f"{p}: non-doc layout should not usually have doc_type")

for permalink, files in permalink_map.items():
    if len(files) > 1:
        errors.append(f"duplicate permalink '{permalink}': {', '.join(files)}")

if errors:
    print("Validation failed with errors:")
    for err in errors:
        print(" -", err)

if warnings:
    print("\nWarnings:")
    for warn in warnings:
        print(" -", warn)

if errors:
    sys.exit(1)

print("\nValidation passed.")
sys.exit(0)
