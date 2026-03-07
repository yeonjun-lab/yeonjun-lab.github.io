---
title: "Experiments"
permalink: /projects/experiments/
section: projects
topic: experiments
---

## Experiments

실험 기록 글 목록입니다.

{% assign docs = site.projects | where_exp: "item", "item.url contains '/projects/experiments/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
