---
title: "Execution Plan"
permalink: /foundations/db/oracle/execution-plan/
section: foundations
subcategory: db
topic: oracle-execution-plan
---

## Oracle > Execution Plan

실행계획 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/db/oracle/execution-plan/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
