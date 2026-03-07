---
title: "Closure"
permalink: /foundations/languages/javascript/closure/
section: foundations
subcategory: languages
topic: javascript-closure
---

## JavaScript > Closure

클로저 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/javascript/closure/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
