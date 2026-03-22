# CURRENT_STATUS

## Current State
Yeonjun Archive 프로젝트는 GitHub Pages + Jekyll 기반 문서형 기술 아카이브 구조가 설계 및 구현된 상태다.

현재 단계는 "기능 기반 골격 완성 후, 실제 핵심 문서를 카테고리별 별도 채팅에서 지속 작성/보강 중" 상태다.

## Completed

### Architecture
- Collections 기반 구조 완료
- 1depth / 2depth / 3depth 정보 구조 설계 완료
- Foundations / Engineering / AI Systems / Research / Projects 구조 반영 완료

### Navigation
- Home dashboard 완료
- Section hub pages 완료
- Category hub pages 완료
- Breadcrumb 완료
- Sidebar navigation 완료
- TOC 완료
- Previous / Next 완료
- `prev_url` / `next_url` 우선 pagination 완료
- Related Documents 완료

### Discovery
- Search 완료
- Tags 페이지 완료
- Topics 페이지 완료
- Latest Updates 완료
- Latest by Section 완료

### Documentation
- Writing Guide 완료
- About 최신화 완료
- README 최신화 완료
- 운영 문서 최신화 완료
- 정밀도 기준 추가 완료

### Automation
- new_doc.sh 완료
- touch_doc.sh 완료
- doc_commit.sh 완료
- publish.sh 완료
- prepublish.sh 완료
- Makefile 운영 타깃 완료

### Quality
- front matter validation 완료
- strict validation 완료
- 템플릿별 본문 구조 검사 완료
- permalink 중복 검사 완료
- 품질 점검 흐름 정리 완료
- C/시스템 문서용 정밀도 기준 정리 완료

### Current Content Upgrade Track
- `languages/c` 폴더 구조를 `topic_slug/doc_type/doc` 규칙으로 재정리 완료
- `languages/c` permalink를 `.../<topic_slug>/<doc_type>/<doc-slug>/` 규칙으로 수정 완료
- `tools/new_doc.sh`, `tools/validate_docs.py`, `tools/migrate_topic_slug.py`가 새 규칙을 반영하도록 수정 완료
- C 시리즈의 concept / deep-dive 문서를 "경계 설명 + 판단 체크리스트" 기준으로 순차 보강 중
- C 시리즈 65개 문서에 `prev_url` / `next_url` 기반 읽기 흐름 반영 완료
- `다음에 볼 것` 섹션이 있는 C 문서는 pagination 순서와 동기화 완료

### Finish / UX
- 404 페이지 완료
- footer custom 완료

## Current File / Feature Highlights

### Key Layouts
- _layouts/default.html
- _layouts/home.html
- _layouts/section-hub.html
- _layouts/category-hub.html
- _layouts/doc.html

### Key Includes
- _includes/sidebar-nav.html
- _includes/doc-pagination.html
- _includes/related-docs.html
- _includes/footer-custom.html

### Key Data Files
- _data/navigation.yml
- _data/navigation_names.yml
- _data/sidebar.yml

### Key JS
- assets/js/search.js
- assets/js/tags.js
- assets/js/topics.js
- assets/js/toc.js

### Key Operation Tools
- tools/new_doc.sh
- tools/touch_doc.sh
- tools/doc_commit.sh
- tools/prepublish.sh
- tools/publish.sh
- tools/validate_docs.py
- tools/validate_docs_strict.py

## Current Content Readiness
구조와 운영 시스템은 거의 완성되었고, 일부 핵심 시리즈는 실제 밀도 보강이 상당히 진행되었다.

즉:
- 플랫폼 / 구조 / 자동화는 준비됨
- 실제 문서 축적과 기존 문서 정밀도 보강이 병행 중

## Current Conversation Policy
현재 채팅은 기술 아카이브의 운영 전용 채팅으로 유지한다.

현재 채팅의 역할:
- 구조 관리
- 운영 문서 최신화
- 템플릿/검증/배포 관리
- handoff 상태 유지

실제 문서 작성은 카테고리별 별도 채팅에서 진행한다.

## Recommended Category-Specific Chats

### Foundations Content Chats
- Foundations > DB
- Foundations > Languages > Python
- Foundations > Languages > JavaScript
- Foundations > CS

### Engineering Content Chats
- Engineering > Frontend > ReactJs
- Engineering > Backend

### Other Content Chats
- AI Systems
- Research
- Projects

## Recommended Next Priority

### Priority 1
C 시리즈에서 비어 있는 concept 축 보강

### Priority 2
카테고리별 채팅에서 실제 핵심 문서 지속 작성

### Priority 3
기존 시리즈를 정밀도 기준에 맞춰 순차 보강
- Foundations > Languages > C
- Foundations > DB > Oracle > Optimizer
- Foundations > Languages > Python
- Engineering > Frontend > ReactJs > Fiber

## First Recommended Documents

### Oracle / Optimizer
- DBMS 옵티마이저란 무엇인가
- Cardinality Estimate란 무엇인가
- Query Transformation이란 무엇인가
- View Merge란 무엇인가
- Predicate Pushdown이란 무엇인가
- ANSI JOIN과 Oracle JOIN의 성능 차이
- E-Rows와 A-Rows 해석
- Buffers / Reads / Cost 해석

### Python / Object Model
- Python의 가변 객체와 불변 객체
- 참조와 바인딩은 무엇이 다른가
- 얕은 복사와 깊은 복사의 차이
- tuple 안의 mutable object는 왜 변경 가능한가

### React / Fiber
- React Fiber를 왜 알아야 하는가
- Fiber 작업 단위는 어떻게 구성되는가
- React 스케줄링과 렌더링은 어떻게 연결되는가

### Research / AI Systems
- Emotion-Aware Scheduler Concept
- AIOS와 ACOS를 운영체제 관점에서 다시 보는 이유

## Current Recommendation for Next Chat
다른 채팅에서 이어갈 때는 운영 변경보다 실제 문서 작성부터 시작하는 것이 좋다.

가장 추천하는 시작점:
1. Foundations > Languages > C 채팅 생성
2. Foundations > DB > Oracle > Optimizer 채팅 생성
3. Foundations > Languages > Python 채팅 생성
4. Engineering > Frontend > ReactJs > Fiber 채팅 생성
