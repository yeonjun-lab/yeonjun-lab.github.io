---
nav_group: /research/
title: "Architecture Notes"
permalink: /research/architecture-notes/
section: research
topic: architecture-notes
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## Architecture Notes

구조 설계 관련 글 목록입니다.

{% assign docs = site.research | where_exp: "item", "item.url contains '/research/architecture-notes/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
