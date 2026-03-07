---
title: "Optimizer"
permalink: /foundations/db/oracle/optimizer/
section: foundations
subcategory: db
topic: oracle-optimizer
---

## Oracle > Optimizer

옵티마이저 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/db/oracle/optimizer/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
