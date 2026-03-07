---
title: "Data Structures"
permalink: /foundations/cs/data-structures/
section: foundations
subcategory: cs
topic: data-structures
---

## Data Structures

자료구조 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/cs/data-structures/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
