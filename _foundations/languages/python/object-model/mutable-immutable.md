---
nav_group: /foundations/languages/python/object-model/
title: "파이썬의 가변 객체와 불변 객체"
permalink: /foundations/languages/python/object-model/mutable-immutable/
section: foundations
subcategory: languages
topic: python-object-model
tags: [python, mutable, immutable, object-model]
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## 1. 왜 이 주제를 공부했는가

Python에서 복사, 참조, 함수 인자 전달, 리스트 내부 변경을 이해하려면 가변 객체와 불변 객체 구분이 필수다.

## 2. 핵심 개념

- 불변 객체: int, str, tuple
- 가변 객체: list, dict, set

## 3. 중요한 포인트

같은 대입문처럼 보여도 실제로는 객체를 새로 만들 수도 있고, 기존 객체를 수정할 수도 있다.

## 4. 실무 관점

얕은 복사와 깊은 복사를 잘못 이해하면 버그가 생긴다.
