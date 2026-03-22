---
layout: category-hub
nav_group: /foundations/languages/
title: "C"
permalink: /foundations/languages/c/
section: foundations
subcategory: languages
language: c
hub_mode: topic-cards
description: 메인 학습선과 심화 트랙으로 정리한 C 언어 핵심 주제
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## C

이 허브는 C 문서를 두 흐름으로 정리한다.

- 메인 학습선: 메모리 모델, 포인터, 구조체, 동적 메모리, 메모리 안전성, 빌드/링크, 시스템 인터페이스, 성능, 바이너리 레이아웃까지 이어지는 기본 코스
- 심화 트랙: `volatile`, 동시성, `race condition`, `reentrant/thread-safe`, `errno`, 반환값 중심 에러 처리처럼 레거시 C와 시스템 프로그래밍 맥락을 깊게 다루는 보조 코스

아래 목록에서 원하는 섹션으로 바로 들어갈 수 있다.

{% assign docs = site.foundations | where_exp: "item", "item.url contains '/foundations/languages/c/'" %}
{% for doc in docs %}
{% unless doc.url == page.url%}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endunless %}
{% endfor %}
