---
doc_type: deep-dive
title: "React Fiber를 왜 알아야 하는가"
permalink: /engineering/frontend/reactjs/fiber/why-react-fiber-matters/
section: engineering
subcategory: frontend
topic: reactjs-fiber
tags: [react, fiber, scheduler, rendering]
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
nav_group: /engineering/frontend/reactjs/fiber/
layout: doc
---

## 1. 왜 이 주제를 깊게 봐야 하는가

React를 단순히 컴포넌트 라이브러리로만 이해하면, 렌더링 지연, 상태 업데이트 전파, 우선순위 처리, concurrent rendering 같은 중요한 동작을 정확히 설명하기 어렵다.

Fiber는 React가 업데이트 작업을 더 잘게 나누고, 필요하면 중단하고, 우선순위를 조정하고, 다시 이어서 처리하기 위해 도입한 내부 구조다.

## 2. 전체 구조

Fiber는 React 내부에서 각 컴포넌트 작업을 표현하는 노드 단위 구조다.

기존 스택 기반 재귀 렌더링과 달리, Fiber는 작업을 분할할 수 있게 하여 렌더링을 더 유연하게 만든다.

## 3. 내부 동작 원리

React는 상태 변경이 발생하면 관련 업데이트를 Fiber 트리에 반영할 작업으로 만든다.

이 과정에서 각 Fiber 노드는:
- 어떤 컴포넌트인지
- 어떤 props와 state를 가지는지
- 어떤 작업이 필요한지

같은 정보를 들고 작업 단위처럼 동작한다.

## 4. 실행 흐름 또는 처리 순서

대략적인 흐름은 다음과 같다.

- 상태 변경 발생
- 업데이트가 Fiber 작업으로 변환
- 스케줄러가 우선순위를 고려
- 렌더 단계에서 새 트리 계산
- 커밋 단계에서 실제 DOM 반영

즉, Fiber는 계산 단계와 반영 단계를 더 세밀하게 다룰 수 있게 해준다.

## 5. 성능 / 최적화 관점

Fiber를 이해하면 다음이 보인다.

- 어떤 업데이트가 왜 늦어지는가
- 어떤 상태 변경이 렌더링 비용을 키우는가
- concurrent rendering이 왜 가능한가
- transition 계열 API가 왜 필요한가

## 6. 실무 관점

실무에서는 Fiber 자체를 직접 다루지는 않지만,
렌더링 최적화, 메모이제이션, 상태 분리, 업데이트 우선순위 이해에 직접 연결된다.

즉, Fiber를 이해하면 React 최적화 전략을 더 정확히 선택할 수 있다.
