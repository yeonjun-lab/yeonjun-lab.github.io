---
layout: page
title: "Writing Guide"
permalink: /writing-guide/
---

이 페이지는 기술 아카이브 문서를 일관된 기준으로 작성하고 운영하기 위한 기준 문서입니다.

이 아카이브는 단순 블로그가 아니라 다음을 목표로 합니다.

- 학습한 내용을 구조적으로 축적
- 다시 사용할 수 있는 지식 자산화
- 기술 탐색, 검색, 시리즈화가 가능한 문서형 구조 유지
- 장기적으로 AI Systems / Research / Projects까지 연결

---

## 1. 전체 구조

### Foundations
기술의 기반 원리, 언어 자체의 구조, CS, DB 원리를 다룹니다.

예:
- Python의 객체 모델
- Oracle 옵티마이저
- 운영체제의 프로세스와 스레드

### Engineering
실제 구현 계층과 프레임워크, 서버/클라이언트 구조를 다룹니다.

예:
- React Fiber
- Spring Bean Lifecycle
- NextJs SSR
- Node.js 서버 구조

### AI Systems
AIOS, ACOS, 감정 인식, 실시간 추론 시스템 등 AI 시스템 설계를 다룹니다.

### Research
논문 아이디어, 구조 설계 초안, 이론 확장, 개념 실험을 다룹니다.

### Projects
개인 프로젝트, 구현 로그, 실험 기록을 다룹니다.

---

## 2. 분류 기준

### section
문서가 속한 최상위 영역입니다.

허용 값:
- foundations
- engineering
- ai_systems
- research
- projects

### subcategory
문서가 속한 중간 분류입니다.

예:
- languages
- cs
- db
- frontend
- backend

### topic
같은 시리즈 또는 같은 학습 축 문서를 묶는 기준입니다.

좋은 예:
- oracle-optimizer
- python-object-model
- reactjs-fiber
- emotion-ai-modeling

### tags
문서를 가로로 연결하는 세부 키워드입니다.

좋은 예:
- oracle
- optimizer
- cardinality
- python
- binding
- react
- fiber

원칙:
- topic은 시리즈 축
- tags는 교차 탐색 축

---

## 3. 템플릿 종류

### concept
기본 개념 정리, 정의, 입문 설명

적합한 예:
- 옵티마이저란 무엇인가
- 클로저란 무엇인가

권장 구조:
- 왜 이 주제를 공부했는가
- 정의
- 핵심 개념
- 예시
- 실무 관점

정밀도 기준:
- 용어 정의와 보장 범위를 분리해서 쓴다
- 언어 규칙 / 구현체 동작 / 운영체제 / 실무 관례를 섞지 않는다
- 흔한 오해를 먼저 드러내고 왜 틀리는지 설명한다
- "무엇이 가능한가"보다 "어디까지 보장되는가"를 우선한다
- 마지막에는 판단 체크리스트를 남긴다

### deep-dive
내부 구조, 동작 원리, 처리 흐름을 깊게 분석

적합한 예:
- React Fiber Scheduling
- Oracle Query Transformation 내부 구조

권장 구조:
- 왜 이 주제를 깊게 봐야 하는가
- 전체 구조
- 내부 동작 원리
- 실행 흐름 또는 처리 순서
- 성능 / 최적화 관점

정밀도 기준:
- 언어 스펙 / ABI / 컴파일러 / 런타임 / 운영체제 계층을 구분한다
- 예제는 단순 예시보다 반례 비교 구조를 우선한다
- 내부 동작을 설명할 때 전제 조건과 깨지는 조건을 함께 적는다
- 최적화, 안정성, 디버깅 관점까지 연결해 실무 판단으로 닫는다

### troubleshooting
오류, 예외, 성능 문제 해결 기록

적합한 예:
- Bean Creation Exception 해결
- 인덱스를 타지 않는 SQL 원인 분석

권장 구조:
- 문제 상황
- 증상
- 실제 원인
- 해결 방법
- 재발 방지 방법

### project-log
구현 진행 상황, 변경 사항, 다음 작업 정리

적합한 예:
- GitHub Pages 구조 개편 기록
- 사이드바 네비게이션 추가 로그

권장 구조:
- 작업 목표
- 현재 상태
- 이번에 구현한 내용
- 변경 사항
- 다음 작업

### research-note
아이디어, 구조 설계, 개념 제안

적합한 예:
- Emotion-Aware Scheduler Concept
- Humanized OS 구조 초안

권장 구조:
- 문제의식
- 핵심 아이디어
- 기존 접근의 한계
- 제안 구조
- 열린 문제
- 다음 확장

---

## 4. 메타 작성 규칙

필수 메타:
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

권장 메타:
- topic
- tags

### 날짜 메타 규칙
- created_at: 최초 작성일
- updated_at: 마지막 수정일
- sort_date: 목록 정렬 기준

원칙:
- 화면에는 날짜를 노출하지 않는다
- 정렬에는 sort_date를 사용한다
- 문서 수정 후에는 touch를 통해 updated_at / sort_date를 갱신한다

---

## 5. 문서 제목 규칙

좋은 제목:
- DBMS 옵티마이저란 무엇인가
- React Fiber를 왜 알아야 하는가
- Python의 가변 객체와 불변 객체

피해야 할 제목:
- 정리
- 공부
- test
- 개념
- 메모

원칙:
- 제목만 보고 문서 주제를 알 수 있어야 한다.

---

## 6. 문서 작성 원칙

### 원칙 1
한 문서에는 한 주제만 다룬다.

### 원칙 2
정의, 원리, 실무 관점을 구분해서 쓴다.

### 원칙 3
헷갈린 점을 숨기지 않는다.

### 원칙 4
같은 시리즈 문서는 topic을 일관되게 유지한다.

### 원칙 5
tags는 탐색 가능한 기술 키워드만 넣는다.

### 원칙 6
문서를 수정한 뒤에는 sort_date를 반드시 갱신한다.

### 원칙 7
코드 블록은 반드시 fenced code block과 언어명을 함께 사용한다.

좋은 예:

```md
```c
int main(void) {
  return 0;
}
```
```

나쁜 예:
- 들여쓰기만 사용한 코드 블록
- 언어명 없는 ``` fenced block

이유:
- 현재 사이트는 `Rouge`를 사용한다.
- 언어명이 없으면 대부분 `language-plaintext`로 렌더링된다.
- 이 경우 토큰별 색상 하이라이트가 생성되지 않는다.

### 원칙 8
오해하기 쉬운 직관과 실제 보장 범위를 분리해서 쓴다.

예:
- "보통 이렇게 동작한다"와 "언어가 이렇게 보장한다"를 구분
- "이 구현에서는 가능하다"와 "항상 안전하다"를 구분
- "디버그 빌드에서는 된다"와 "정의된 동작이다"를 구분

### 원칙 9
문서 마지막은 요약이 아니라 판단 체크리스트로 닫는다.

예:
- 언제 이 모델로 생각하면 되는가
- 언제 이 직관이 깨지는가
- 실무에서 무엇을 확인해야 하는가

---

## 7. 품질 점검 기준

문서 작성 후 아래를 확인합니다.

- 제목이 충분히 구체적인가
- section / subcategory / topic이 맞는가
- tags가 비어 있지 않은가
- 템플릿 선택이 맞는가
- 템플릿 구조가 실제 본문에도 반영되었는가
- 실무 관점 또는 적용 관점이 있는가
- 다음에 이어질 문서 축(topic)이 명확한가
- 코드 블록에 언어명이 붙어 있는가
- 보장 범위와 구현 세부가 섞이지 않았는가
- 흔한 오해 또는 반례를 최소 1회 이상 다뤘는가
- 마지막에 판단 체크리스트가 있는가

---

## 8. 사이트 탐색 구조

이 아카이브는 아래 방식으로 탐색합니다.

- Sidebar: 구조 기반 탐색
- TOC: 현재 문서 내부 탐색
- Previous / Next: 순차 탐색
- Related Documents: 유사 문서 탐색
- Search: 전체 검색
- Tags: 키워드 축 탐색
- Topics: 시리즈 축 탐색
- Latest Updates: 최근 수정 문서 탐색

---

## 9. 운영 명령어

### 새 문서 생성
make new DOC_PATH=_foundations/db/oracle/optimizer/ TITLE="View Merge Basics"

### 템플릿 지정 생성
make new DOC_PATH=_engineering/frontend/reactjs/fiber/ TITLE="Fiber Scheduling Internals" TEMPLATE=deep-dive

### 수정일 갱신
make touch FILE=_foundations/db/oracle/optimizer/view-merge-basics.md

### 검증
make validate

### 엄격 검증 + 빌드
make quality

### 배포 전 점검
make prepublish

### 실제 배포
make publish MSG="Add new optimizer and fiber documents"

---

## 10. 추천 운영 흐름

1. 문서 위치 결정
2. 템플릿 결정
3. 제목 결정
4. 문서 생성
5. 내용 작성
6. touch로 날짜 갱신
7. validate 실행
8. quality 또는 prepublish 실행
9. publish

---

## 11. 최종 원칙

이 아카이브의 목적은 단순히 글을 쌓는 것이 아니라,
지식의 구조를 보존하고 다시 탐색 가능하게 만드는 것입니다.

따라서 모든 문서는 다음을 만족해야 합니다.

- 어디에 속하는지 명확해야 한다
- 무엇과 연결되는지 명확해야 한다
- 왜 중요한지 설명할 수 있어야 한다
- 다음 학습으로 이어질 수 있어야 한다
