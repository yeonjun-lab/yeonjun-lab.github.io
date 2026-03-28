---
title: include guard와 once는 어떻게 이해해야 하는가
permalink: /foundations/languages/c/preprocessor/deep-dive/include-guard와-once는-어떻게-이해해야-하는가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-17
updated_at: 2026-03-17
sort_date: 2026-03-17
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-preprocessor
topic_slug: preprocessor
language: c
tags: [c, preprocessor, include-guard, pragma-once, header, translation-unit, build-system, portability]
prev_url: /foundations/languages/c/preprocessor/deep-dive/조건부-컴파일은-언제-유용하고-언제-코드베이스를-망치는가/
next_url: /foundations/languages/c/system-interface/deep-dive/파일-디스크립터는-왜-중요한가/
---

## 1. 왜 이 주제를 깊게 봐야 하는가

C 헤더를 처음 배울 때 include guard는 대개 아주 간단하게 소개된다.
```c
    #ifndef MY_HEADER_H
    #define MY_HEADER_H

    /* declarations */

    #endif
```
그리고 이어서 흔히 이렇게 배운다.

- 헤더 중복 포함을 막는 장치다
- 또는 `#pragma once`를 써도 된다
- 둘 중 아무거나 쓰면 된다

이 설명은 틀리지는 않지만, 실무에는 턱없이 부족하다.

왜냐하면 include guard와 `#pragma once`는 단순 문법 취향이 아니라, **헤더가 번역 단위 안에서 어떤 존재 방식으로 펼쳐져야 하는가**를 제어하는 장치이기 때문이다. 이 차이를 얕게 이해하면 다음과 같은 문제를 가볍게 보게 된다.

- 왜 헤더는 여러 파일에서 반복 포함되는데도 같은 선언이 문제 없을 수 있는가
- 왜 어떤 헤더는 자기 자신을 직접 include하지 않아도 간접 순환 포함에서 무너지는가
- 왜 “중복 포함 방지”와 “의존 관계 정리”는 같은 문제가 아닌가
- 왜 `#pragma once`는 편리해 보여도 보장 층위가 다를 수 있는가
- 왜 include guard가 있다고 해서 나쁜 헤더 구조가 갑자기 좋아지는 것은 아닌가

이 주제를 깊게 봐야 하는 이유는 세 가지다.

첫째, include guard는 헤더 설계의 가장 기초적인 안전장치지만, 동시에 **헤더 구조 문제를 숨기는 얇은 완충재**이기도 하다.  
guard가 있다고 순환 의존, 과도한 include, 불필요한 전방 선언 부재, ABI 노출 문제까지 해결되는 것은 아니다. 즉, guard는 필요조건일 수 있지만 충분조건은 아니다.

둘째, `#pragma once`와 include guard는 겉보기 목적은 비슷해도 성격이 다르다.  
하나는 표준 전처리 조건식 패턴이고, 다른 하나는 구현체가 제공하는 비표준 지시문이다. 실무에서는 둘이 대부분 비슷하게 동작할 수 있지만, “왜 비슷하게 보이는가”와 “정확히 무엇을 믿을 수 있는가”는 분리해야 한다.

셋째, 헤더는 C 코드베이스에서 가장 넓게 퍼지는 인터페이스 층이다.  
헤더 하나의 설계 실수는 단일 `.c` 파일의 버그보다 더 넓게 전파된다. 따라서 include guard 문제는 단순 전처리기 기교가 아니라 **인터페이스 배포 품질과 빌드 안정성 문제**다.

이 문서의 핵심 목표는 include guard를 “중복 포함 방지 문법”으로만 설명하는 데 있지 않다.  
핵심은 다음을 분리하는 것이다.

- include guard가 실제로 막는 것은 무엇인가
- 막지 못하는 것은 무엇인가
- `#pragma once`는 어떤 층위의 도구인가
- 왜 헤더 중복 포함과 순환 의존은 같은 문제가 아닌가
- 실무에서 어떤 기준으로 include guard와 `#pragma once`를 선택하고 문서화해야 하는가

즉, 이 문서는 include guard를 “헤더마다 자동으로 붙이는 관례”로 설명하지 않는다.  
그 대신 **번역 단위 안에서 헤더가 한 번만 본문을 노출하도록 만드는 전처리 경계**로 설명한다.

---

## 2. 전체 구조

이 주제를 정확히 이해하려면 먼저 문제를 다섯 층위로 나눠야 한다.

### 2.1 번역 단위 층위

헤더는 파일 시스템 객체이기 전에 번역 단위 안으로 펼쳐지는 소스 조각이다.  
즉, include guard가 제어하는 것은 “파일이 디스크에 몇 번 존재하는가”가 아니라, **하나의 번역 단위 안에서 동일 헤더 내용이 몇 번 확장될 수 있는가**다.

### 2.2 전처리기 층위

include guard는 `#ifndef / #define / #endif` 조합으로 동작하는 순수 전처리기 패턴이다.  
`#pragma once`는 구현체가 “이 파일은 한 번만 포함하라”고 해석하는 비표준 지시문이다. 즉, 둘은 같은 층위에서 비슷한 목적을 달성하지만 보장 방식이 다르다.

### 2.3 헤더 설계 층위

guard는 헤더 본문이 여러 번 펼쳐지는 것을 막지만, 어떤 선언을 넣어야 하는지, 무엇을 forward declaration으로 충분히 대체할 수 있는지, 어떤 include를 줄여야 하는지까지 결정해 주지는 않는다.

즉, guard는 구조를 대신 설계하지 않는다.

### 2.4 빌드 / 구현체 층위

현대 컴파일러는 include guard 패턴과 `#pragma once`를 효율적으로 처리할 수 있다.  
하지만 성능 최적화가 가능하다는 사실과 언어 차원의 보장이 있다는 사실은 다르다. 즉, “대부분 잘 된다”와 “무엇을 계약으로 삼아도 되는가”를 분리해야 한다.

### 2.5 실무 운영 층위

실무에서는 다음을 함께 고민해야 한다.

- 모든 헤더에 일관된 guard naming 규칙을 둘 것인가
- `#pragma once`를 허용할 것인가
- public header와 private header의 정책을 다르게 둘 것인가
- generated header, symlink, network filesystem, vendored code에서 어떤 정책이 더 안정적인가

즉, include guard 문제는 전처리 문법이면서 동시에 코드베이스 운영 규약 문제다.

---

## 3. 내부 동작 원리

### 3.1 include guard가 막는 것은 “같은 헤더 본문의 중복 전개”다

가장 먼저 분명히 해야 할 점은 이것이다.

include guard는 “같은 파일을 두 번 여는 것”을 막는 도구가 아니다.  
정확히는 **같은 헤더 본문이 하나의 번역 단위 안에서 다시 활성화되는 것**을 막는다.

예를 들어:
```c
    /* a.h */
    #ifndef A_H
    #define A_H

    struct A {
        int x;
    };

    #endif

    /* main.c */
    #include "a.h"
    #include "a.h"
```
전처리 흐름을 생각해 보면 첫 번째 포함 시 `A_H`는 아직 정의되지 않았으므로 본문이 들어온다.  
그 뒤 `A_H`가 정의된다. 두 번째 포함에서는 조건이 거짓이므로 본문이 건너뛰어진다.

즉, include guard의 본질은 다음과 같다.

- 헤더마다 “이 본문을 이미 활성화했는가”를 나타내는 매크로를 둔다
- 같은 번역 단위 안에서 그 본문이 두 번째로 다시 펼쳐지는 것을 막는다

왜 이 직관이 중요한가?

많은 사람이 guard를 “파일 시스템 차원의 중복 방지”처럼 이해한다.  
하지만 실제로는 전처리기 상태, 즉 **현재 번역 단위 안의 매크로 정의 상태**에 의해 동작한다.

### 3.2 간접 중복 포함에서 guard가 진짜 역할을 한다

단순히 같은 헤더를 두 번 직접 include하는 경우는 드물다.  
실무에서 더 중요한 것은 간접 중복 포함이다.

예:
```c
    /* x.h */
    #ifndef X_H
    #define X_H
    #include "common.h"
    #endif

    /* y.h */
    #ifndef Y_H
    #define Y_H
    #include "common.h"
    #endif

    /* main.c */
    #include "x.h"
    #include "y.h"
```
여기서 `common.h`에 guard가 없다면, `x.h`를 통해 한 번, `y.h`를 통해 또 한 번 펼쳐질 수 있다.  
`common.h`가 타입 정의, enum, static inline 함수, 매크로, 선언 등을 담고 있다면 중복 정의 문제가 생길 수 있다.

즉, include guard가 진짜 필요한 이유는 직접 중복보다 **include graph 안의 간접 중복을 안전하게 흡수하기 위해서**다.

### 3.3 include guard는 순환 의존 자체를 해결하지 않는다

이 지점은 매우 자주 오해된다.

많은 초보자는 guard가 있으면 순환 include도 안전하다고 생각한다.

예:
```c
    /* a.h */
    #ifndef A_H
    #define A_H
    #include "b.h"
    struct A { struct B *b; };
    #endif

    /* b.h */
    #ifndef B_H
    #define B_H
    #include "a.h"
    struct B { struct A *a; };
    #endif
```
guard 덕분에 무한 include 루프는 멈출 수 있다.  
하지만 이것이 곧 구조적으로 좋은 헤더라는 뜻은 아니다.

왜 이 직관이 틀리는가?

- guard는 무한 반복 전개를 막을 수 있다
- 하지만 어떤 선언이 아직 보이지 않는 시점에 다른 선언이 필요할 수 있다
- 즉, 순환 관계에서 필요한 것은 종종 guard가 아니라 forward declaration과 의존 구조 정리다

예를 들어 포인터만 필요하다면 다음이 더 낫다.
```c
    /* a.h */
    #ifndef A_H
    #define A_H
    struct B;
    struct A { struct B *b; };
    #endif

    /* b.h */
    #ifndef B_H
    #define B_H
    struct A;
    struct B { struct A *a; };
    #endif
```
즉, include guard는 순환 포함을 무한 루프로 만들지 않게 할 수는 있지만,  
**의존 구조를 건강하게 만드는 도구는 아니다**.

### 3.4 include guard가 있다고 해서 나쁜 헤더가 좋은 헤더가 되지는 않는다

이것도 매우 중요하다.

헤더가 다음 문제를 가진다고 하자.

- 필요 없는 다른 헤더를 과도하게 include
- public header에 private dependency 노출
- 전방 선언으로 충분한데 전체 정의를 끌어옴
- 플랫폼별 헤더를 직접 퍼뜨림
- 순환 의존을 낳음

여기에 include guard를 붙여도 본질은 바뀌지 않는다.  
다만 중복 전개 시의 폭발만 완충할 뿐이다.

즉, guard는 안전장치이지 구조 개선 장치는 아니다.

왜 이 점이 중요한가?

실무에서 include guard는 너무 기본이라, 붙어 있으면 “헤더는 잘 관리되고 있다”는 착시를 준다.  
하지만 실제 헤더 품질은 guard 유무보다 다음에 더 크게 달려 있다.

- include graph가 건강한가
- 필요한 선언만 노출하는가
- forward declaration을 적절히 쓰는가
- 공용 인터페이스가 안정적인가

### 3.5 `#pragma once`는 목적은 비슷하지만 보장 경로가 다르다

`#pragma once`는 보통 이렇게 보인다.
```c
    #pragma once

    struct item {
        int x;
    };
```
겉보기 효과는 include guard와 비슷하다.  
해당 헤더를 번역 단위 안에서 한 번만 포함하도록 구현체가 처리한다.

하지만 중요한 차이는 다음이다.

- include guard는 표준 전처리 조건문 패턴이다
- `#pragma once`는 구현체가 이해하는 비표준 pragma다

이 말은 곧바로 “쓰면 안 된다”는 뜻은 아니다.  
현대적인 주요 컴파일러들이 대부분 지원하고, 실제로 잘 동작하는 경우가 많다.  
하지만 실무적으로는 다음을 분리해야 한다.

- 현실적으로 얼마나 잘 지원되는가
- 코드베이스 정책으로 무엇을 계약으로 삼을 것인가

즉, `#pragma once`는 편리함의 문제이면서 동시에 **구현체 의존성 관리 문제**다.

### 3.6 `#pragma once`는 파일 동일성 판별에 구현체 판단이 개입될 수 있다

include guard는 전처리기 매크로 값만 보면 된다.  
반면 `#pragma once`는 보통 “이 파일을 이미 본 같은 헤더로 볼 것인가”라는 구현체 판단을 포함한다.

실무적으로는 대부분 문제 없이 동작할 수 있지만, 다음 환경에서는 더 신중해야 한다.

- symlink가 많은 빌드 트리
- 같은 내용을 다른 경로로 노출하는 생성 헤더
- 네트워크 파일시스템
- 복제/캐시 도구가 파일 identity를 다르게 보이게 만드는 환경
- vendored third-party header layout이 복잡한 경우

즉, `#pragma once`의 문제는 “대부분 되느냐”보다 **파일 동일성 판단을 구현체 최적화에 맡긴다**는 점에 있다.

이 차이는 많은 프로젝트에서 큰 문제가 되지 않을 수 있다.  
하지만 “왜 큰 문제가 아닐 수 있는가”와 “언제 문제가 될 수 있는가”는 알고 있어야 한다.

### 3.7 include guard는 헤더 내부의 매크로 이름과도 충돌할 수 있으므로 naming discipline이 필요하다

include guard는 결국 매크로다.  
즉, 다음처럼 이름을 잡으면 충돌 위험이 있다.
```c
    #ifndef CONFIG_H
    #define CONFIG_H
```
이름이 너무 흔하면 다른 헤더나 빌드 플래그와 충돌할 수 있다.  
그러면 예상치 못하게 본문이 스킵될 수 있다.

즉, include guard는 단순 문법이 아니라 **전처리기 전역 이름 공간의 일부**다.  
그래서 보통 프로젝트 경로와 파일 경로를 반영한 더 긴 이름을 쓴다.

예:
```c
    #ifndef YEONJUN_LAB_FOUNDATIONS_C_PREPROCESSOR_MY_HEADER_H
    #define YEONJUN_LAB_FOUNDATIONS_C_PREPROCESSOR_MY_HEADER_H
```
이름이 길어 보여도, 목적은 미적 취향이 아니라 충돌 가능성 축소다.

---

## 4. 핵심 구성 요소

### 4.1 guard macro

include guard의 핵심 구성 요소다.

- 헤더 본문이 이미 활성화되었는지 나타내는 매크로
- 번역 단위 안에서 동일 헤더 본문의 중복 전개를 차단
- 전처리기 이름 공간을 사용하므로 naming discipline 필요

즉, guard macro는 단순 라벨이 아니라 헤더 활성화 상태를 나타내는 토큰이다.

### 4.2 header body

실제로 한 번만 노출되어야 하는 본문이다.

- 타입 선언
- 함수 프로토타입
- extern 선언
- static inline 함수
- 매크로 정의
- enum / typedef

guard가 보호하는 대상은 파일 전체가 아니라 실질적으로 이 본문이다.

### 4.3 include graph

헤더 문제를 이해할 때는 파일 하나가 아니라 include graph를 봐야 한다.

- 직접 include
- 간접 include
- 순환 include
- 공용 헤더를 통한 재노출
- 플랫폼별 헤더 분기

include guard의 의미도 이 graph 안에서 드러난다.

### 4.4 file identity vs macro state

include guard와 `#pragma once`를 구분하는 핵심이다.

- include guard: 매크로 상태 기반
- `#pragma once`: 구현체의 파일 동일성 판단 기반

즉, 목적은 비슷하지만 판단 기준이 다르다.

### 4.5 header hygiene

좋은 헤더는 guard만 있는 헤더가 아니다.

- 필요한 선언만 담고
- 과도한 include를 줄이고
- forward declaration을 적절히 사용하고
- 공용/사설 경계를 명확히 하는 것

즉, include guard는 header hygiene의 일부일 뿐 전체가 아니다.

---

## 5. 실행 흐름 또는 처리 순서

### 5.1 직접 중복 포함
```c
    /* t.h */
    #ifndef T_H
    #define T_H
    struct T { int x; };
    #endif

    /* main.c */
    #include "t.h"
    #include "t.h"
```
첫 번째 include에서 `T_H`가 정의되고, 두 번째 include에서는 본문이 스킵된다.  
이것이 가장 단순한 동작이다.

### 5.2 간접 중복 포함
```c
    /* a.h */
    #ifndef A_H
    #define A_H
    #include "common.h"
    #endif

    /* b.h */
    #ifndef B_H
    #define B_H
    #include "common.h"
    #endif

    /* main.c */
    #include "a.h"
    #include "b.h"
```
`common.h`에 guard가 있으면 한 번만 본문이 펼쳐진다.  
실무적으로는 이 패턴이 더 중요하다.

### 5.3 순환 포함과 guard의 한계
```c
    /* a.h */
    #ifndef A_H
    #define A_H
    #include "b.h"
    struct A { struct B *b; };
    #endif

    /* b.h */
    #ifndef B_H
    #define B_H
    #include "a.h"
    struct B { struct A *a; };
    #endif
```
guard는 무한 반복 전개를 막을 수 있다.  
하지만 forward declaration으로 더 잘 풀 수 있는 의존 구조 문제를 자동으로 해결하지는 않는다.

즉, “guard가 있으니 괜찮다”는 결론은 섣부르다.

### 5.4 `#pragma once`의 간결한 형태
```c
    #pragma once

    struct item {
        int x;
    };
```
읽기에는 간결하다.  
하지만 이 간결함은 “파일 동일성 판단을 구현체에 맡긴다”는 가정 위에 선다.

즉, 간단해 보인다고 해서 보장 층위까지 같아지는 것은 아니다.

### 5.5 guard naming 충돌의 위험
```c
    #ifndef CONFIG_H
    #define CONFIG_H
```
이런 이름은 너무 흔하다.  
빌드 시스템이나 다른 서드파티 헤더가 같은 이름을 쓰면 본문이 의도치 않게 생략될 수 있다.

더 안전한 방향:

    #ifndef YEONJUN_ARCHIVE_CONFIG_CONFIG_H
    #define YEONJUN_ARCHIVE_CONFIG_CONFIG_H

즉, guard 이름은 길어 보여도 목적은 충돌 회피다.

---

## 6. 성능 / 최적화 관점

### 6.1 include guard와 `#pragma once`를 성능 문제로만 보면 핵심을 놓친다

실무에서 종종 이런 말이 나온다.

- `#pragma once`가 더 빠르다
- include guard는 구식이다
- 컴파일 속도 때문에 `#pragma once`가 낫다

이 말은 일부 구현 환경에서는 관찰적으로 맞을 수 있다.  
하지만 이 주제의 핵심을 성능으로만 보면 중요한 것을 놓친다.

진짜 핵심은 다음이다.

- 무엇이 표준 패턴인가
- 무엇이 구현체 판단에 기대는가
- 헤더 설계가 건전한가
- include graph가 과도하지 않은가

즉, 성능보다 먼저 봐야 할 것은 **헤더 의미론과 코드베이스 정책**이다.

### 6.2 실제 빌드 속도 문제는 guard 종류보다 include 구조에서 더 크게 온다

컴파일 시간이 느릴 때 원인이 진짜 다음 중 어디에 있는지 봐야 한다.

- 불필요한 대형 헤더 포함
- 공용 헤더에서 과도한 transitive include
- 플랫폼별 헤더 중복 노출
- 템플릿처럼 거대한 매크로/inline 본문 확산
- 생성 헤더의 과도한 churn

즉, include guard와 `#pragma once`의 미세 차이보다 **헤더 구조 자체**가 비용을 더 크게 좌우하는 경우가 많다.

### 6.3 include guard는 구현체가 최적화할 여지가 있다

현대 컴파일러는 전형적인 include guard 패턴을 인식해 빠르게 처리할 수 있다.  
즉, guard는 의미론적으로 표준적이면서도, 구현체가 최적화할 수 있는 대상이기도 하다.

이 사실은 중요하다.  
왜냐하면 “guard는 느리고 once가 빠르다”라는 단순한 이분법이 과장될 수 있기 때문이다.

### 6.4 `#pragma once`의 이득은 종종 성능보다 간결성이다

실무에서 `#pragma once`를 선호하는 가장 큰 이유는 자주 다음이다.

- 헤더 앞머리가 간결해짐
- guard 이름 충돌을 신경 덜 써도 됨
- 반복적인 보일러플레이트 제거

즉, 실제 이득은 “극적인 성능 향상”보다 **작성 편의와 실수 감소** 쪽인 경우가 많다.  
하지만 편의성과 계약 안정성은 같은 문제가 아니다.

---

## 7. 어디서부터 보장 범위와 구현 경계가 갈리는가

이 섹션이 핵심이다.  
include guard와 `#pragma once`를 둘러싼 오해는 주로 “같은 목적”과 “같은 보장”을 혼동할 때 생긴다.

### 7.1 중복 포함 방지와 의존 구조 개선이 갈리는 지점

include guard가 하는 일은 중복 전개 방지다.  
하지만 다음을 자동으로 해 주지는 않는다.

- 순환 의존 해소
- 불필요 include 제거
- 전방 선언 대체
- 인터페이스 축소
- 모듈 경계 개선

즉, guard는 안전장치이지 설계 리팩터링이 아니다.

### 7.2 매크로 상태 기반과 파일 동일성 기반이 갈리는 지점

- include guard: 전처리기 매크로 상태를 사용
- `#pragma once`: 구현체가 파일을 “같은 헤더”로 판단하는 메커니즘에 기대는 경향이 있음

이 차이는 보통 평온한 환경에서는 크게 문제되지 않을 수 있다.  
하지만 정책을 세울 때는 분명히 알아야 한다.

### 7.3 “대부분 잘 동작함”과 “무엇을 계약으로 삼을 것인가”가 갈리는 지점

실무에서 많은 프로젝트가 `#pragma once`를 문제 없이 쓸 수 있다.  
그것은 현실적 사실일 수 있다.

하지만 다음 질문은 별개다.

- 우리 프로젝트는 무엇을 규약으로 채택할 것인가
- 어떤 컴파일러/빌드 환경을 공식 지원하는가
- generated header, symlink, vendored code에서 어떤 정책이 더 예측 가능한가

즉, 현실적 동작과 정책 결정은 같은 문장이 아니다.

### 7.4 번역 단위 중복 방지와 프로그램 전체 단일성 보장이 갈리는 지점

include guard는 한 번역 단위 안에서 헤더 본문 중복을 줄이는 장치다.  
이것이 곧 “프로그램 전체에서 정의가 하나만 존재한다”는 의미는 아니다.

예를 들어 `static inline` 함수나 매크로는 여러 번역 단위에 각각 존재할 수 있다.  
즉, guard는 번역 단위 내부 문제를 다루고, 프로그램 전체 링크 의미론까지 책임지지 않는다.

### 7.5 public header와 private header 정책이 갈리는 지점

사설 프로젝트 내부 헤더에서는 `#pragma once`를 허용하는 정책이 가능할 수 있다.  
반면 외부 배포용 public header는 더 보수적으로 include guard를 택할 수도 있다.

즉, “무조건 하나만 맞다”보다 **지원 범위와 배포 경계에 따라 정책이 달라질 수 있다**는 점도 중요하다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 include guard는 기본 안전장치로 항상 고려하라

어떤 정책을 택하든, 헤더는 “중복 전개될 수 있다”는 현실을 전제로 설계해야 한다.  
즉, guard 또는 그에 준하는 단일 포함 정책은 필수에 가깝다.

### 8.2 guard가 있다고 헤더 구조 검토를 건너뛰지 마라

다음을 별도로 봐야 한다.

- 이 include가 정말 필요한가
- forward declaration으로 충분한가
- public header가 private dependency를 노출하는가
- 순환 의존을 구조적으로 줄일 수 있는가

즉, guard는 구조를 가리는 안개막이 되면 안 된다.

### 8.3 `#pragma once` 채택 여부는 코드베이스 정책 문제로 다뤄라

다음 기준을 명확히 정해야 한다.

- 공식 지원 컴파일러 범위
- 생성 헤더/심볼릭 링크 사용 여부
- 서드파티/벤더 헤더와의 상호작용
- 팀이 표준 패턴을 선호하는지, 구현체 편의를 허용하는지

즉, 편하니까 쓰자/싫으니까 쓰지 말자 수준이 아니라 운영 규약으로 정해야 한다.

### 8.4 guard 이름은 충돌 가능성을 줄이도록 길고 명확하게 잡아라

추천 기준:

- 프로젝트 접두사
- 경로 반영
- 파일명 반영
- `_H` 또는 `_INCLUDED` 같은 종료 패턴

즉, guard 이름은 짧고 예쁜 것보다 **충돌하지 않는 것**이 중요하다.

### 8.5 public header는 특히 더 보수적으로 보라

외부 사용자에게 배포되는 헤더는 다음 비용이 크다.

- include 순서 문제
- 플랫폼 차이
- 빌드 시스템 차이
- vendored path 차이

따라서 public header에서는 헤더 hygiene, guard 정책, 의존 최소화가 더 중요해진다.

### 8.6 include guard와 once 선택보다 include graph를 줄이는 일이 더 중요할 수 있다

실무에서 더 큰 효과는 다음에서 나온다.

- 전방 선언 활용
- 불필요한 대형 헤더 제거
- private include를 `.c`로 밀어내기
- 플랫폼 분기를 어댑터 헤더로 몰기
- 공용 인터페이스 슬림화

즉, 중복 포함 방지 장치 선택은 중요하지만, 헤더 구조 자체가 더 근본적이다.

---

## 9. 판단 체크리스트

다음 질문에 명확히 답하지 못하면, 그 헤더 정책은 아직 불안정하다.

- 이 헤더는 번역 단위 안에서 중복 포함돼도 안전한가
- guard 또는 `#pragma once` 중 무엇을 정책으로 쓰는가
- 그 선택은 지원 빌드 환경과 일치하는가
- guard 이름은 충분히 충돌 저항적인가
- 이 헤더는 불필요한 include를 과도하게 끌어오고 있지 않은가
- 순환 의존을 guard가 아니라 forward declaration으로 줄일 수 없는가
- public header와 private header의 정책을 구분할 필요가 없는가
- generated header, symlink, vendored code 환경을 고려했는가
- include guard가 구조 문제를 가리고 있지는 않은가
- 성능 논쟁보다 include graph 개선이 더 시급한 상황은 아닌가

## 정리

include guard와 `#pragma once`는 둘 다 헤더의 중복 전개를 줄이기 위한 도구다.  
하지만 같은 목적을 가진다고 해서 같은 보장 층위를 갖는 것은 아니다.

반드시 기억해야 할 핵심은 다음이다.

- include guard는 전처리기 매크로 상태 기반의 표준적 패턴이다.
- `#pragma once`는 구현체가 제공하는 비표준 지시문이다.
- include guard가 막는 것은 번역 단위 안의 헤더 본문 중복 전개다.
- guard는 순환 의존, 과도한 include, 헤더 구조 문제를 자동으로 해결하지 않는다.
- `#pragma once`는 실용적으로 유용할 수 있지만, 파일 동일성 판단을 구현체에 기대는 성격이 있다.
- 좋은 헤더는 guard가 있는 헤더가 아니라, guard와 함께 header hygiene가 갖춰진 헤더다.
- 실무에서 더 중요한 것은 guard vs once만이 아니라 include graph 자체를 줄이는 것이다.

즉, include guard와 `#pragma once`를 이해한다는 것은  
“중복 포함을 막는 문법을 안다”는 것이 아니라,  
**헤더가 번역 단위 안에서 어떤 방식으로 존재하고, 그 존재를 어떤 정책으로 제한할지 이해하는 것**에 가깝다.

---

## 10. 더 깊게 볼 포인트

### 10.1 파일 디스크립터는 왜 중요한가

다음 우선순위 축으로 자연스럽게 넘어간다.  
전처리기 심화 축을 마쳤다면, 이제 system-interface의 다음 단계로 넘어가며 운영체제 자원 핸들 모델을 다루는 흐름이 자연스럽다.

### 10.2 forward declaration과 전체 정의 include는 어떤 기준으로 선택해야 하는가

header hygiene와 컴파일 의존 축소 문제를 더 깊게 볼 수 있다.

### 10.3 public header의 ABI 안정성을 위해 어떤 include 정책과 타입 노출 정책이 필요한가

헤더 설계와 바이너리 호환성 관점으로 확장할 수 있다.

### 10.4 generated header와 config header는 include guard / once 정책을 어떻게 다르게 가져가야 하는가

빌드 시스템과 전처리기 경계 문제를 더 실무적으로 볼 수 있다.

### 10.5 modular build, PCH, unity build 환경에서는 include guard와 once에 대한 판단이 어떻게 달라질 수 있는가

헤더 처리 전략과 빌드 성능 관점으로 확장할 수 있다.