---
title: "Papers"
permalink: /research/papers/
section: research
topic: papers
---

## Papers

논문 정리 글 목록입니다.

{% assign docs = site.research | where_exp: "item", "item.url contains '/research/papers/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
