---
title: "Backend"
permalink: /engineering/backend/
section: engineering
subcategory: backend
---

## Backend

서버, 프레임워크, API, 아키텍처를 정리합니다.

{% assign docs = site.engineering | where_exp: "item", "item.url contains '/engineering/backend/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
