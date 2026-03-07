---
title: "Python"
permalink: /foundations/languages/python/
section: foundations
subcategory: languages
topic: python
---

## Python

Python 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/python/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
