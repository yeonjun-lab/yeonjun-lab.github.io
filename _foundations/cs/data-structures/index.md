---
nav_group: /foundations/cs/
title: "Data Structures"
permalink: /foundations/cs/data-structures/
section: foundations
subcategory: cs
topic: data-structures
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## Data Structures

자료구조 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/cs/data-structures/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
