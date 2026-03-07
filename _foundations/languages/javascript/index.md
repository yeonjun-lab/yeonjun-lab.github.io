---
layout: category-hub
nav_group: /foundations/languages/
title: "JavaScript"
permalink: /foundations/languages/javascript/
section: foundations
subcategory: languages
topic: javascript
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## JavaScript

JavaScript 언어 자체의 원리를 정리합니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/javascript/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
