---
title: "Personal"
permalink: /projects/personal/
section: projects
topic: personal
---

## Personal Projects

개인 프로젝트 글 목록입니다.

{% assign docs = site.projects | where_exp: "item", "item.url contains '/projects/personal/'" %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
