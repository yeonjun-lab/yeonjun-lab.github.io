#!/usr/bin/env python3
from pathlib import Path
import re
import shutil

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

def set_value(lines, key, value):
    pattern = re.compile(rf"^{re.escape(key)}:\s*.*$")
    updated = False
    out = []

    for line in lines:
        if pattern.match(line):
            out.append(f"{key}: {value}")
            updated = True
        else:
            out.append(line)

    if not updated:
        insert_after = {
            "language": "subcategory:",
            "topic_slug": "topic:",
            "permalink": "title:",
        }.get(key)

        inserted = False
        if insert_after:
            new_out = []
            for line in out:
                new_out.append(line)
                if line.startswith(insert_after):
                    new_out.append(f"{key}: {value}")
                    inserted = True
            out = new_out

        if not inserted:
            out.append(f"{key}: {value}")

    return out

def derive_topic_slug(topic: str):
    if not topic:
        return None
    if "-" in topic:
        return topic.split("-", 1)[1].strip()
    return topic.strip()

def derive_language(path: Path):
    parts = path.parts
    # _foundations/languages/c/...
    if len(parts) >= 3 and parts[0] == "_foundations" and parts[1] == "languages":
        return parts[2]
    return None

def normalize_permalink_path(path_str: str):
    return "/" + path_str.strip("/").replace("\\", "/") + "/"

changed = []

for root in ROOTS:
    for p in Path(root).rglob("*.md"):
        if p.name == "index.md":
            continue

        text = p.read_text(encoding="utf-8")
        extracted = extract_front_matter(text)
        if extracted is None:
            continue

        fm, body = extracted
        layout = get_value(fm, "layout")
        subcategory = get_value(fm, "subcategory")
        topic = get_value(fm, "topic")
        topic_slug = get_value(fm, "topic_slug")
        language = get_value(fm, "language")
        nav_group = get_value(fm, "nav_group")

        if layout != "doc":
            continue
        if subcategory != "languages":
            continue
        if not nav_group:
            continue

        effective_topic_slug = topic_slug or derive_topic_slug(topic)
        effective_language = language or derive_language(p)

        if not effective_topic_slug or not effective_language:
            continue

        current_parent = p.parent.name
        already_in_topic_dir = current_parent == effective_topic_slug

        lines = fm.splitlines()

        # front matter 보강
        if not topic_slug:
            lines = set_value(lines, "topic_slug", effective_topic_slug)

        if not language:
            lines = set_value(lines, "language", effective_language)

        # 새 물리 경로
        target_dir = p.parent / effective_topic_slug if not already_in_topic_dir else p.parent
        if not already_in_topic_dir:
            target_dir = p.parent / effective_topic_slug

            # 기존 위치가 _foundations/languages/c/ 아래면 그 아래 topic_slug 폴더로 이동
            if p.parent.name == effective_language:
                target_dir = p.parent / effective_topic_slug
            else:
                # 혹시 다른 중간 폴더 구조가 있어도 language 바로 아래로 정규화
                parts = p.parts
                if len(parts) >= 4 and parts[0] == "_foundations" and parts[1] == "languages":
                    base_dir = Path(parts[0]) / parts[1] / effective_language
                    target_dir = base_dir / effective_topic_slug

        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / p.name

        # 새 permalink
        doc_slug = p.stem
        new_permalink = normalize_permalink_path(
            f"{nav_group}{effective_topic_slug}/{doc_slug}"
        )
        lines = set_value(lines, "permalink", new_permalink)

        new_text = "---\n" + "\n".join(lines) + "\n---\n" + body

        # 파일 이동 + 쓰기
        if target_path != p:
            target_path.write_text(new_text, encoding="utf-8")
            p.unlink()
        else:
            p.write_text(new_text, encoding="utf-8")

        changed.append(
            (
                str(p),
                str(target_path),
                effective_topic_slug,
                effective_language,
                new_permalink,
            )
        )

print(f"updated {len(changed)} files")
for old_path, new_path, topic_slug_value, language_value, permalink in changed:
    print(f"- {old_path} -> {new_path}")
    print(f"  topic_slug={topic_slug_value}, language={language_value}")
    print(f"  permalink={permalink}")