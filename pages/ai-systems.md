---
title: "AI Systems"
permalink: /ai-systems/
---

## AI Systems

AIOS, ACOS, 감정 인식, 실시간 추론 시스템 관련 아카이브입니다.

{% for item in site.data.navigation.ai_systems %}
- [{{ item.name }}]({{ item.url | relative_url }})
{% endfor %}
