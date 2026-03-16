# Yeonjun Archive

김연준의 기술 학습 아카이브입니다.

이 저장소는 단순 블로그가 아니라, 학습한 내용을 구조적으로 축적하고
다시 탐색 가능한 지식 자산으로 만들기 위한 문서형 기술 아카이브입니다.

## Main Sections

- Foundations
- Engineering
- AI Systems
- Research
- Projects

## Explore

- Search
- Tags
- Topics
- Archive
- Writing Guide

## Structure

이 아카이브는 다음 탐색 구조를 가집니다.

- Sidebar: 구조 기반 탐색
- TOC: 문서 내부 탐색
- Previous / Next: 순차 탐색
- Related Documents: 유사 문서 탐색
- Search: 전체 검색
- Tags: 키워드 축 탐색
- Topics: 시리즈 축 탐색
- Latest Updates: 최근 수정 문서 탐색

순차 탐색 규칙:
- 문서 하단 Previous / Next는 front matter의 `prev_url` / `next_url`를 우선 사용합니다.
- 본문 `다음에 볼 것`이 있는 시리즈 문서는 같은 읽기 흐름을 가리키도록 유지합니다.

## Writing and Operations

문서 작성과 운영 기준은 다음 페이지를 참고합니다.

- `/writing-guide/`
- `OPERATIONS.md`
- `HANDOFF.md`
- `CURRENT_STATUS.md`

현재 작성 기준의 핵심:
- concept 문서는 정의 후 "어디서부터 ... 갈리는가"로 직관과 실제 경계를 분리합니다.
- deep-dive 문서는 언어 규칙 / 구현 / 시스템 / ABI 경계를 명시적으로 분리합니다.
- 문서 끝은 요약만이 아니라 판단 체크리스트로 닫습니다.
- 특히 C, 시스템, 런타임, 성능 문서는 "설명 가능"보다 "보장 범위와 경계가 분명한 설명"을 목표로 합니다.

주요 운영 명령:

- `make new`
- `make touch`
- `make validate`
- `make quality`
- `make prepublish`
- `make publish`

## Goal

기록의 목적은 단순 메모가 아니라,
다시 사용할 수 있는 지식 시스템을 만드는 것입니다.
