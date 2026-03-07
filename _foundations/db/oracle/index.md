---
title: "Oracle"
permalink: /foundations/db/oracle/
section: foundations
subcategory: db
topic: oracle
---

## Oracle

Oracle 관련 글 목록입니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/db/oracle/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
