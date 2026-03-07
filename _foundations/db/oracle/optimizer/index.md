---
layout: category-hub
nav_group: /foundations/db/oracle/
title: "Optimizer"
permalink: /foundations/db/oracle/optimizer/
section: foundations
subcategory: db
topic: oracle-optimizer
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## Oracle > Optimizer

옵티마이저 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/db/oracle/optimizer/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
