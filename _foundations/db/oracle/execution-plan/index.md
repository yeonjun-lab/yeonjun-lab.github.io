---
layout: category-hub
nav_group: /foundations/db/oracle/
title: "Execution Plan"
permalink: /foundations/db/oracle/execution-plan/
section: foundations
subcategory: db
topic: oracle-execution-plan
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## Oracle > Execution Plan

실행계획 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/db/oracle/execution-plan/'" %}
{% for doc in docs %}
{% unless doc.url == page.url%}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endunless %}
{% endfor %}
