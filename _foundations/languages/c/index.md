---
layout: category-hub
nav_group: /foundations/languages/
title: "C"
permalink: /foundations/languages/c/
section: foundations
subcategory: languages
language: c
hub_mode: topic-cards
description: C 언어 핵심 주제
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## C

C 언어 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/c/'" %}
{% for doc in docs %}
{% unless doc.url == page.url%}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endunless %}
{% endfor %}
