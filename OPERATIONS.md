# OPERATIONS

## Purpose
이 문서는 Yeonjun Archive 프로젝트의 실제 운영 절차를 정리한 문서다.

## Conversation Operating Rule
채팅은 아래처럼 역할을 분리해서 운영한다.

### Archive Operations Chat
현재 채팅은 기술 아카이브 운영 전용이다.

다루는 범위:
- 구조 설계
- 운영 문서 갱신
- 템플릿 수정
- 검증 규칙 수정
- 배포 흐름 수정
- handoff 문서 갱신

### Category-Specific Content Chats
실제 문서 작성과 주제 심화는 별도 채팅에서 진행한다.

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
- 운영 변경은 현재 채팅
- 콘텐츠 작성은 카테고리별 채팅

## Core Rules

### 1. 날짜 규칙
- created_at: 최초 작성일
- updated_at: 마지막 수정일
- sort_date: 정렬 기준

원칙:
- 화면에는 날짜를 노출하지 않는다
- 목록 정렬에는 sort_date를 사용한다
- 문서를 수정한 뒤에는 touch로 updated_at / sort_date를 갱신한다

### 2. topic 규칙
topic은 같은 시리즈 / 같은 학습 축 문서를 묶는 기준이다.

좋은 예:
- oracle-optimizer
- python-object-model
- reactjs-fiber

### 2-1. topic_slug 규칙
topic_slug는 URL 세그먼트다.

예:
- topic: c-binary-layout
- topic_slug: binary-layout

languages 문서는 topic과 topic_slug를 함께 사용한다.

### 3. tags 규칙
tags는 문서를 가로로 연결하는 키워드다.

좋은 예:
- oracle
- optimizer
- cardinality
- python
- object-model
- react
- fiber

피해야 할 예:
- study
- memo
- test
- misc

### 4. doc_type 규칙
- concept
- deep-dive
- troubleshooting
- project-log
- research-note

### 5. languages permalink 규칙
permalink = nav_group + topic_slug + "/" + doc_type + "/" + doc_slug + "/"

예:
- nav_group: /foundations/languages/c/
- topic_slug: binary-layout
- doc_type: deep-dive
- permalink: /foundations/languages/c/binary-layout/deep-dive/mixed-version-round-trip-테스트는-왜-필요한가/

## Main Commands

### 의존성 설치
make init

### 로컬 실행
make serve

### 빌드
make build

### 일반 검증
make validate

### 엄격 검증
make validate-strict

### 검증 + 빌드
make check

### 엄격 검증 + 빌드
make quality

### 배포 전 점검
make prepublish

### 실제 배포
make publish MSG="commit message"

## Document Creation

### 기본 문서 생성
make new DOC_PATH=_foundations/db/oracle/optimizer/ TITLE="View Merge Basics"

### 템플릿 지정 생성
make new DOC_PATH=_engineering/frontend/reactjs/fiber/ TITLE="Fiber Scheduling Internals" TEMPLATE=deep-dive

### languages 문서 생성
make new DOC_PATH=_foundations/languages/c/ TITLE="mixed-version round-trip 테스트는 왜 필요한가" TOPIC=c-binary-layout TOPIC_SLUG=binary-layout TEMPLATE=deep-dive

### 템플릿 종류
- concept
- deep-dive
- troubleshooting
- project-log
- research-note

## Document Update

### 수정일 갱신
make touch FILE=_foundations/db/oracle/optimizer/view-merge-basics.md

문서 수정 후 반드시 touch를 실행한다.

## Commit / Publish

### 문서 하나 수정 후 커밋
make commit FILE=_foundations/db/oracle/optimizer/view-merge-basics.md MSG="Refine view merge basics"

### 배포 전 점검
make prepublish

### 실제 배포
make publish MSG="Add optimizer documents"

## Recommended Workflow

### 운영 채팅에서 할 일
1. 구조 변경
2. 운영 문서 갱신
3. 템플릿/검증/배포 규칙 변경
4. handoff 문서 갱신
5. validate / build / publish

### 카테고리 채팅에서 할 일
1. 문서 위치 결정
2. 템플릿 결정
3. 문서 생성
4. 내용 작성
5. touch 실행
6. validate 실행
7. 필요 시 quality 실행
8. commit / publish

## Validation Rules

### Error
- 필수 front matter 누락
- invalid doc_type
- duplicate permalink
- malformed front matter
- languages 문서에서 topic 누락
- languages 문서에서 topic_slug 누락
- nav_group 형식 오류

### Warning
- title 너무 짧음
- topic 비어 있음
- tags 없음 또는 비어 있음
- nav_group 불일치
- sort_date 이상값
- 템플릿 구조 약함
- body가 너무 짧음

## Template Quality Rules

### concept
권장 핵심:
- 정의
- 핵심 개념
- 실무 관점
- 다음에 볼 것

추가 기준:
- 정의와 보장 범위를 분리
- "어디서부터 ... 갈리는가"처럼 직관이 깨지는 경계 섹션을 넣는다
- 흔한 오해 또는 잘못된 직관을 명시
- 마지막에 판단 체크리스트를 둔다
- `prev_url` / `next_url`가 있으면 본문 `다음에 볼 것`도 같은 흐름으로 맞춘다
- 예시는 정상 예시 하나보다 비교 예시 둘이 더 좋다

### deep-dive
권장 핵심:
- 전체 구조
- 내부 동작 원리
- 실행 흐름 또는 처리 순서
- 성능 / 최적화 관점
- 필요 시 다음에 볼 것 또는 더 깊게 볼 포인트

추가 기준:
- 언어 / 구현 / 시스템 계층을 분리
- 필요한 경우 ABI / 런타임 / allocator / 로더 계층까지 더 쪼개서 쓴다
- 반례 또는 깨지는 조건 포함
- "어디서부터 ... 갈리는가"로 보장 범위와 경계 붕괴 지점을 설명한다
- 마지막에는 판단 체크리스트를 둔다
- 디버깅 또는 실무 판단 기준까지 연결
- 시리즈 문서라면 `prev_url` / `next_url`와 본문 읽기 흐름이 충돌하지 않게 유지한다

### troubleshooting
권장 핵심:
- 문제 상황
- 실제 원인
- 해결 방법

추가 기준:
- 증상과 실제 원인을 분리
- 왜 이 증상이 저 원인으로 이어지는지 경계 설명을 넣는다
- 재발 방지 기준을 체크리스트로 남긴다

### project-log
권장 핵심:
- 작업 목표
- 이번에 구현한 내용
- 다음 작업

추가 기준:
- 변경 사실과 변경 이유를 분리
- 관찰 결과와 해석을 구분
- 다음 작업은 우선순위와 판단 기준이 보이게 쓴다

### research-note
권장 핵심:
- 문제의식
- 핵심 아이디어
- 제안 구조
- 열린 문제 또는 다음 확장

추가 기준:
- 문제의식과 실제 가정을 분리
- 어떤 부분이 제안이고 어떤 부분이 아직 검증 전인지 명시
- 열린 문제는 막연한 아이디어가 아니라 검증 대상 목록으로 쓴다

## Precision Writing Rule

앞으로 특히 C, 시스템, 런타임, 성능 관련 문서는
"설명 가능" 수준이 아니라 "보장 범위와 경계가 분명한 설명"을 목표로 한다.

원칙:
- 용어 정의와 보장 범위를 분리해서 쓴다
- 언어 스펙과 구현체 동작을 섞지 않는다
- 흔한 오해를 먼저 드러내고 반례로 교정한다
- 예제는 정상 예시 하나보다 비교 예시 둘이 더 낫다
- 문서 끝은 요약보다 판단 체크리스트로 닫는다
- 문서 중간에는 "겉보기에는 같지만 실제로는 다른 것"을 분리하는 경계 문단을 넣는다
- 저장공간 / 객체 / 값 / 표현 / 해석 / ownership 같은 층위가 섞이지 않게 쓴다

## Recommended Quality Habit
배포 전에는 항상 아래를 권장한다.

- make validate
- make quality
- make prepublish

## Important Practical Rule
현재 프로젝트는 구조와 운영 시스템이 거의 완성되어 있으므로,
앞으로는 운영 채팅에서는 구조를 유지하고, 카테고리별 채팅에서는 실제 문서를 지속적으로 축적하는 방식으로 간다.

## Pagination Rule

시리즈 문서의 순차 탐색은 이제 `sort_date` 자동 계산만 믿지 않는다.

원칙:
- 문서 하단 pagination은 front matter의 `prev_url` / `next_url`를 우선 사용한다
- `prev_url` / `next_url`가 없는 경우에만 기존 자동 fallback을 사용한다
- 본문 `## 다음에 볼 것` 섹션이 있다면 같은 읽기 흐름을 가리켜야 한다
- topic 내부 문서 정렬이나 시리즈 재배치가 바뀌면 `prev_url` / `next_url`와 `다음에 볼 것`을 함께 수정한다
- 특히 `languages/c`처럼 학습 순서가 중요한 시리즈는 topic 단위가 아니라 실제 읽기 순서 기준으로 연결한다
