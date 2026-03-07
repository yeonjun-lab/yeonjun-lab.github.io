---
title: "Operating Systems"
permalink: /foundations/cs/operating-systems/
section: foundations
subcategory: cs
topic: operating-systems
---

## Operating Systems

운영체제 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/cs/operating-systems/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
