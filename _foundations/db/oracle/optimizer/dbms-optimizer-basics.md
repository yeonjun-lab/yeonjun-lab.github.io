---
title: "DBMS 옵티마이저란 무엇인가"
permalink: /foundations/db/oracle/optimizer/dbms-optimizer-basics/
section: foundations
subcategory: db
topic: oracle-optimizer
tags: [optimizer, execution-plan, oracle, mysql]
created_at: 2026-03-07
updated_at: 2026-03-07
sort_date: 2026-03-07
---

## 1. 왜 중요한가

SQL의 성능은 단순히 문법이 아니라, DBMS가 그 SQL을 어떤 실행계획으로 바꾸는가에 의해 크게 달라진다.  
그 중심에 있는 것이 옵티마이저다.

## 2. 옵티마이저란

옵티마이저는 SQL을 실행하기 전에 가능한 여러 실행 방법을 검토하고, 그중 비용이 가장 낮다고 판단한 계획을 선택하는 구성 요소다.

## 3. 옵티마이저가 보는 것

- 테이블 통계 정보
- 인덱스 유무
- 조인 순서
- 접근 경로
- 필터 조건
- 예상 카디널리티

## 4. 예시

SELECT *
FROM emp e
JOIN dept d
  ON e.deptno = d.deptno
WHERE e.job = 'ANALYST';

이 SQL은 단순해 보이지만, 실제로는 다음과 같은 판단이 들어간다.

- emp를 먼저 볼지 dept를 먼저 볼지
- emp에서 인덱스를 사용할지
- 조인을 nested loop로 할지 hash join으로 할지

## 5. 중요한 이유

개발자는 SQL만 작성하지만, DBMS는 그 SQL을 내부적으로 해석하고 다시 구조화해서 실행한다.

즉, SQL 결과가 같다고 해서 실행 비용도 같은 것은 아니다.

## 6. 실무 관점

실무에서는 다음 질문을 할 수 있어야 한다.

- 왜 이 SQL은 느린가
- 왜 인덱스를 안 탔는가
- 왜 예상 행 수와 실제 행 수가 다른가
- 왜 같은 결과인데 실행계획이 달라지는가

## 7. 다음에 볼 것

- Cardinality Estimate
- Query Transformation
- DBMS_XPLAN.DISPLAY_CURSOR
