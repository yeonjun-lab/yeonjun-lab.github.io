---
title: "Emotion AI"
permalink: /ai-systems/emotion-ai/
section: ai_systems
topic: emotion-ai
---

## Emotion AI

감정 인식 및 감정 모델링 관련 글 목록입니다.

{% assign docs = site.ai_systems | where_exp: "item", "item.url contains '/ai-systems/emotion-ai/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
