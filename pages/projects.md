---
title: "Projects"
permalink: /projects/
---

## Projects

개인 프로젝트, 실험 기록, 구현 로그를 정리하는 아카이브입니다.

{% for item in site.data.navigation.projects %}
- [{{ item.name }}]({{ item.url | relative_url }})
{% endfor %}
