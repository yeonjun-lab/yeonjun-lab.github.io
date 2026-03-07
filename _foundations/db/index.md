---
title: "DB"
permalink: /foundations/db/
section: foundations
subcategory: db
---

## DB

데이터베이스 원리, 옵티마이저, 실행계획, 인덱스를 정리합니다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/db/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
