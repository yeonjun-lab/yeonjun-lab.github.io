---
title: "CS"
permalink: /foundations/cs/
section: foundations
subcategory: cs
---

## CS

운영체제, 네트워크, 자료구조, 알고리즘을 정리합니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/cs/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
