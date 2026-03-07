---
title: "Research"
permalink: /research/
---

## Research

논문 아이디어, 개념 확장, 구조 설계를 정리하는 아카이브입니다.

{% for item in site.data.navigation.research %}
- [{{ item.name }}]({{ item.url | relative_url }})
{% endfor %}
