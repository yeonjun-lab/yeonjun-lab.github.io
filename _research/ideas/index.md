---
nav_group: /research/
title: "Ideas"
permalink: /research/ideas/
section: research
topic: ideas
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## Ideas

아이디어 및 개념 정리 글 목록입니다.

{% assign docs = site.research | where_exp: "item", "item.url contains '/research/ideas/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
