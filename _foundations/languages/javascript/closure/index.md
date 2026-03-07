---
title: "Closure"
permalink: /foundations/languages/javascript/closure/
section: foundations
subcategory: languages
topic: javascript-closure
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## JavaScript > Closure

클로저 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/javascript/closure/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
