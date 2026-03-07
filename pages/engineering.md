---
title: "Engineering"
permalink: /engineering/
---

## Engineering

실제 시스템 구현과 프레임워크, 아키텍처를 정리하는 아카이브입니다.

{% for item in site.data.navigation.engineering %}
- [{{ item.name }}]({{ item.url | relative_url }})
  {% if item.children %}
  {% for child in item.children %}
  - [{{ child.name }}]({{ child.url | relative_url }})
  {% endfor %}
  {% endif %}
{% endfor %}
