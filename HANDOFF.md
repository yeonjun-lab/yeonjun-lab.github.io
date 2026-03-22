# HANDOFF

## Project
Yeonjun Archive

## Project Type
GitHub Pages + Jekyll 기반 문서형 기술 아카이브

## What This Project Is
이 프로젝트는 단순 블로그가 아니라, 기술 학습 기록을 구조적으로 축적하고 다시 탐색 가능한 지식 시스템으로 운영하기 위한 개인 아카이브다.

## Current Architecture
Collections:
- foundations
- engineering
- ai_systems
- research
- projects

Main top-level pages:
- Home
- About
- Writing Guide
- Archive
- Search
- Tags
- Topics
- Foundations
- Engineering
- AI Systems
- Research
- Projects

## Main Features Already Built
- Home dashboard
- Section hubs
- Category hubs
- Sidebar navigation
- Breadcrumb
- TOC
- Previous / Next
- Related Documents
- Search
- Tags
- Topics
- Latest Updates
- Latest by Section
- Writing Guide
- 404 page
- Footer custom
- Automated doc creation / touch / validation / publish

## Main Operation Commands
- make new
- make touch
- make validate
- make validate-strict
- make quality
- make prepublish
- make publish

## Quality System
문서 메타 검증 + 템플릿별 본문 구조 검사까지 구현되어 있다.

현재 운영 기준:
- concept 문서는 정의/핵심 개념 뒤에 "어디서부터 ... 갈리는가" 성격의 경계 설명을 넣는다
- deep-dive 문서는 언어 규칙 / 구현 / 시스템 / ABI 경계를 분리해서 쓴다
- 마지막은 단순 요약보다 판단 체크리스트로 닫는다
- C, 시스템, 런타임, 성능 문서는 "설명 가능"보다 "보장 범위와 경계가 분명한 설명"을 우선한다
- 시리즈 문서는 `prev_url` / `next_url`와 본문 `다음에 볼 것`이 같은 읽기 흐름을 가리키게 유지한다

doc_type:
- concept
- deep-dive
- troubleshooting
- project-log
- research-note

## Conversation Policy
이 프로젝트는 채팅을 역할별로 분리해서 운영한다.

### This Chat
현재 채팅은 기술 아카이브 운영 전용이다.
- 구조 설계
- 운영 문서 갱신
- 템플릿/검증/배포 체계 수정
- handoff 문서 유지

### Other Chats
실제 문서 작성은 카테고리별 별도 채팅에서 진행한다.
- Foundations > DB
- Foundations > Languages > Python
- Foundations > Languages > JavaScript
- Engineering > Frontend > ReactJs
- Engineering > Backend
- AI Systems
- Research
- Projects

## Current Status
구조/운영/탐색 기능은 거의 완성되었고, 실제 핵심 문서 보강도 이미 진행 중이다.

현재 특히 중요한 상태:
- `languages/c`는 `topic_slug/doc_type/doc` permalink 구조로 재정리 완료
- `new_doc.sh`, validation, operations 문서가 이 구조를 반영하도록 수정 완료
- C 시리즈는 memory-model, memory-safety, system-interface, build-and-linking, pointer-model, dynamic-memory 축을 중심으로 정밀도 기준 보강 진행 중
- 운영 문서와 템플릿도 같은 기준에 맞춰 계속 갱신 중
- `_includes/doc-pagination.html`은 `prev_url` / `next_url` 우선, 기존 그룹 정렬은 fallback으로 동작
- `languages/c`는 실제 학습 순서 기준으로 `prev_url` / `next_url`와 `다음에 볼 것`을 맞춘 상태

## Highest Priority Next Work
정밀도 기준에 맞춘 실제 문서 축적과 비어 있는 concept 축 확장

### First recommended clusters
1. Foundations > Languages > C > memory-safety / performance-model / system-interface / binary-layout concept 축 보강
2. Foundations > DB > Oracle > Optimizer
3. Foundations > Languages > Python > Object Model
4. Engineering > Frontend > ReactJs > Fiber

## First Recommended Documents
- DBMS 옵티마이저란 무엇인가
- Cardinality Estimate란 무엇인가
- Query Transformation이란 무엇인가
- Python의 가변 객체와 불변 객체
- 참조와 바인딩은 무엇이 다른가
- React Fiber를 왜 알아야 하는가
- React Fiber 작업 단위는 어떻게 구성되는가

## How to Continue in Another Chat
운영 채팅이 아닌 새 채팅에서는 아래 형태로 시작한다.

"Yeonjun Archive 프로젝트의 HANDOFF.md, CURRENT_STATUS.md, PROJECT_CONTEXT.md, Writing Guide를 기준으로 현재 구조를 인지하고, 이 채팅에서는 Foundations > DB > Oracle > Optimizer 문서 작성만 이어서 진행해줘."

또는

"Yeonjun Archive 프로젝트의 운영 문서를 기준으로 현재 아카이브 구조를 인지하고, 이 채팅에서는 Foundations > Languages > Python > Object Model 문서 작성만 이어서 진행해줘."

또는 C 시리즈 연장 시:

"Yeonjun Archive 프로젝트의 HANDOFF.md, CURRENT_STATUS.md, PROJECT_CONTEXT.md, Writing Guide를 기준으로 현재 정밀도 기준을 인지하고, 이 채팅에서는 Foundations > Languages > C 문서 보강만 이어서 진행해줘."

## Practical Recommendation
다음 채팅에서는 기능 추가보다 아래 중 하나부터 시작하는 것이 좋다.

- C 비어 있는 concept 축 2~4문서 작성
- Oracle Optimizer 3문서 실제 작성
- Python Object Model 2문서 실제 작성
- React Fiber 2문서 실제 작성
