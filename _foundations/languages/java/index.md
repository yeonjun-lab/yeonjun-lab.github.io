---
nav_group: /foundations/languages/
title: "Java"
permalink: /foundations/languages/java/
section: foundations
subcategory: languages
topic: java
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## Java

Java 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/java/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
