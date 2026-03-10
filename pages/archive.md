---
layout: page
title: "Archive"
permalink: /archive/
---

### Foundations
{% assign docs = site.foundations | sort: "sort_date" | reverse %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}

### Engineering
{% assign docs = site.engineering | sort: "sort_date" | reverse %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}

### AI Systems
{% assign docs = site.ai_systems | sort: "sort_date" | reverse %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}

### Research
{% assign docs = site.research | sort: "sort_date" | reverse %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}

### Projects
{% assign docs = site.projects | sort: "sort_date" | reverse %}
{% for doc in docs %}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor %}
