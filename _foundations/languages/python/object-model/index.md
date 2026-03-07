---
title: "Object Model"
permalink: /foundations/languages/python/object-model/
section: foundations
subcategory: languages
topic: python-object-model
---

## Python > Object Model

Python 객체 모델 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/python/object-model/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
