---
title: "Foundations"
permalink: /foundations/
---

## Foundations

기술의 기반 원리를 정리하는 아카이브입니다.

{% for item in site.data.navigation.foundations %}
- [{{ item.name }}]({{ item.url | relative_url }})
  {% if item.children %}
  {% for child in item.children %}
  - [{{ child.name }}]({{ child.url | relative_url }})
  {% endfor %}
  {% endif %}
{% endfor %}
