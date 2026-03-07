---
title: "R"
permalink: /foundations/languages/r/
section: foundations
subcategory: languages
topic: r
---

## R

R 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/r/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
