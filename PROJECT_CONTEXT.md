# PROJECT_CONTEXT

## Project Name
Yeonjun Archive

## Project Type
GitHub Pages + Jekyll 기반 문서형 기술 아카이브

## Project Goal
이 프로젝트는 단순 블로그가 아니라, 학습한 내용을 구조적으로 축적하고 다시 탐색 가능한 지식 자산으로 만들기 위한 개인 기술 아카이브다.

장기적으로 다음을 목표로 한다.

- 기술 학습 기록의 구조화
- 언어 / 시스템 / DB / 프레임워크 / AI 시스템 지식 축적
- AI Systems / Research / Projects까지 연결되는 장기 기술 베이스 구축
- 재사용 가능한 지식 시스템 운영

## Main Sections
- Foundations
- Engineering
- AI Systems
- Research
- Projects

## Information Architecture

### Foundations
기술의 기반 원리
- Languages
- CS
- DB

### Engineering
실제 구현 계층
- Frontend
- Backend

### AI Systems
- AIOS
- ACOS
- Emotion AI
- Realtime Inference

### Research
- Papers
- Ideas
- Architecture Notes

### Projects
- Personal
- Experiments
- Implementation Logs

## Content Model

### Core Metadata
모든 문서형 페이지(layout: doc)는 아래 메타를 사용한다.

- title
- permalink
- layout
- section
- subcategory
- created_at
- updated_at
- sort_date
- nav_group
- doc_type

권장:
- topic
- tags

### doc_type
- concept
- deep-dive
- troubleshooting
- project-log
- research-note

### languages 문서 구조
`_foundations/languages/*` 하위 문서는 가능하면 아래 구조를 따른다.

- `languages/<language>/<topic_slug>/index.md`
- `languages/<language>/<topic_slug>/<doc_type>/<doc>.md`

permalink 규칙:
- `/foundations/languages/<language>/<topic_slug>/<doc_type>/<doc-slug>/`

특히 `languages/c`는 이 규칙으로 재정리되어 있다.

### topic
같은 시리즈 / 같은 학습 축 문서를 묶는 기준

예:
- oracle-optimizer
- python-object-model
- reactjs-fiber

### tags
문서를 가로로 연결하는 세부 키워드

예:
- oracle
- optimizer
- cardinality
- python
- binding
- react
- fiber

## Main Navigation Features
이 아카이브는 아래 탐색 기능을 제공한다.

- Home dashboard
- Section hub pages
- 2depth / 3depth category hubs
- Breadcrumb
- Sidebar navigation
- TOC (On this page)
- Previous / Next pagination
- Related Documents
- Search
- Tags
- Topics
- Latest Updates
- Latest by Section

## Page Roles

### Home
전체 대시보드
- 핵심 섹션 카드
- Latest Updates
- Latest by Section

### Section Hub
해당 영역 개요 + 하위 진입 + 최신 문서

### Category Hub
2depth / 3depth 진입과 문서 목록

### Doc Page
실제 문서 페이지
- breadcrumb
- sidebar
- meta
- toc
- related docs
- previous / next

## Conversation Architecture
이 프로젝트는 채팅도 역할별로 분리해서 운영한다.

### Archive Operations Chat
현재 채팅은 기술 아카이브의 운영 전용 채팅이다.

이 채팅에서는 다음만 다룬다.
- 구조 설계
- 운영 문서 갱신
- 템플릿/검증/배포 체계 수정
- 아카이브 정보 구조 조정
- handoff 문서 갱신

### Category-Specific Content Chats
실제 문서 작성과 개별 주제 심화는 카테고리별 별도 채팅에서 진행한다.

예:
- Foundations > DB 채팅
- Foundations > Languages > Python 채팅
- Foundations > Languages > JavaScript 채팅
- Engineering > Frontend > ReactJs 채팅
- Engineering > Backend 채팅
- AI Systems 채팅
- Research 채팅
- Projects 채팅

원칙:
- 현재 채팅은 운영 본부 역할
- 개별 채팅은 실제 콘텐츠 작성 역할

## Design Principles
- 블로그보다 문서형 아카이브에 가깝게 운영
- 상단 메뉴는 1depth 중심
- 깊은 탐색은 허브/사이드바/토픽/태그로 해결
- 날짜는 정렬에만 사용하고 화면에는 노출하지 않음
- 검색 가능성과 시리즈 구조를 함께 유지

## Writing Principles
- 한 문서에 한 주제
- 정의 / 원리 / 실무 관점 분리
- 같은 시리즈는 topic 일관성 유지
- tags는 탐색 가능한 기술 키워드만 사용
- 문서 수정 후 sort_date 갱신

추가 정밀도 원칙:
- 용어 정의와 보장 범위를 분리
- 언어 규칙 / 구현체 / 시스템 계층을 혼동하지 않음
- 흔한 오해와 반례를 통해 설명을 교정
- 문서 마지막을 실무 판단 체크리스트로 닫음
- concept 문서에는 "어디서부터 ... 갈리는가" 성격의 경계 설명을 넣음
- deep-dive 문서에는 필요한 경우 ABI / 런타임 / allocator / 로더 계층까지 분리함
- 저장공간 / 객체 / 값 / 표현 / 해석 / ownership 같은 층위를 섞지 않음
- 시리즈 문서는 front matter의 `prev_url` / `next_url`와 본문 `다음에 볼 것`을 같은 읽기 흐름으로 유지함

## Current High-Priority Content Track
현재는 C 시리즈를 중심으로 실제 문서 보강이 진행 중이다.

진행 중인 상태:
- `memory-model`, `memory-safety`, `system-interface`, `build-and-linking`, `pointer-model`, `dynamic-memory` 축 문서 보강 진행
- 기존 문서는 경계 설명 + 판단 체크리스트 기준으로 순차 수정 중
- 비어 있는 `concept` 축은 `memory-safety`, `system-interface`, `performance-model`, `binary-layout` 순으로 채우는 중
- `languages/c`는 문서별 `prev_url` / `next_url`를 넣어 실제 학습 순서 기반 pagination을 사용 중
- `다음에 볼 것` 섹션이 있는 문서는 pagination 흐름과 동일하게 유지하는 운영 규칙을 사용 중

## Long-Term Direction
이 프로젝트는 앞으로 다음 기술축을 중심으로 성장한다.

- Oracle
- MySql
- PostgreSql
- R
- C
- C++
- Python
- JavaScript
- ReactJs
- NextJs
- LLM / DeepLearning
- CUDA
- AIOS / ACOS
- Emotion AI / Personalized Emotion Modeling
- Research Notes / Architecture Expansion
