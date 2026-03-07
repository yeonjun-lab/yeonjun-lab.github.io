---
title: "Languages"
permalink: /foundations/languages/
section: foundations
subcategory: languages
---

## Languages

언어 자체의 원리와 실행 모델을 정리합니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
