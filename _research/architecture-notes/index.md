---
title: "Architecture Notes"
permalink: /research/architecture-notes/
section: research
topic: architecture-notes
---

## Architecture Notes

구조 설계 관련 글 목록입니다.

{% assign docs = site.research | where_exp: "item", "item.url contains '/research/architecture-notes/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
