---
title: "integer promotion은 왜 헷갈리는가"
permalink: /foundations/languages/c/memory-model/concept/integer-promotion은-왜-헷갈리는가/
prev_url: /foundations/languages/c/memory-safety/deep-dive/use-after-free는-왜-치명적인가/
next_url: /foundations/languages/c/memory-model/concept/signed-unsigned-변환은-왜-위험한가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-16
updated_at: 2026-03-16
sort_date: 2026-03-16
nav_group: /foundations/languages/c/
doc_type: concept
topic: c-memory-model
topic_slug: memory-model
language: c
tags: [c, integer-promotion, arithmetic-conversion, signed, unsigned, bitwise, memory-model]
---

## 정의

integer promotion은 C에서 `char`, `short`, `_Bool`, 열거형처럼 `int`보다 좁은 정수형 값이 연산 전에 더 넓은 정수형으로 자동 변환되는 규칙이다.  
즉 눈에 보이는 선언 타입 그대로 계산하는 것이 아니라, **먼저 더 큰 정수형으로 끌어올린 뒤 계산하는 과정**이 들어간다.

핵심은 다음이다.

1. 작은 정수형은 연산 전에 그대로 쓰이지 않는 경우가 많다
2. 보통 `int` 또는 `unsigned int`로 먼저 승격된다
3. 그래서 결과가 "작은 타입끼리 계산"처럼 보이지만 실제론 더 큰 타입에서 계산된다
4. 이 규칙은 비교, 산술, 비트 연산, shift 결과를 모두 바꿀 수 있다

즉 integer promotion은  
**"선언된 타입"과 "실제 계산에 쓰이는 타입"이 다를 수 있다는 사실**의 핵심 예시다.

---

## 먼저 큰 그림부터

많은 초보자는 이렇게 생각한다.

- `char`끼리 더하면 `char` 결과겠지
- `short`끼리 계산하면 `short` 안에서 끝나겠지
- 작은 타입이면 작은 타입 계산일 것 같다

하지만 C는 그렇게 단순하지 않다.

예를 들어:
```c
    unsigned char a = 200;
    unsigned char b = 100;
    unsigned char c = a + b;
```
겉으로 보면 `unsigned char + unsigned char`다.  
하지만 실제 계산은 대개 `unsigned char` 안에서 바로 일어나는 것이 아니다.

보통은 다음처럼 생각해야 한다.

- `a`, `b`가 먼저 promotion된다
- 더 큰 정수형에서 계산한다
- 그 뒤 최종 대입 시 다시 작은 타입으로 들어간다

즉 integer promotion은  
**계산 중간 단계의 타입을 바꾸는 규칙**이다.

---

## 핵심 개념

### 1. 작은 정수형은 연산 전에 더 큰 타입으로 올라간다

대표 대상은 보통 이런 타입들이다.

- `char`
- `signed char`
- `unsigned char`
- `short`
- `unsigned short`
- `_Bool`
- 일부 열거형

이 타입들은 식 안에서 그대로 계산되는 경우보다,  
먼저 `int` 또는 `unsigned int`로 올라가는 경우가 많다.

즉 다음처럼 보이는 코드도:
```c
    char a = 1;
    char b = 2;
    int x = a + b;
```
실제로는 "char 덧셈"이라기보다  
**promotion된 정수형 덧셈**으로 보는 편이 맞다.

---

### 2. 왜 하필 `int`로 올라가느냐

C는 작은 정수형을 그대로 계산 단위로 두기보다,  
CPU가 다루기 쉬운 더 일반적인 정수 단위로 맞추는 쪽을 택한다.

즉 작은 타입은 저장공간 표현에는 유용하지만,  
연산 규칙에서는 더 넓은 기본 정수형으로 끌어올려 계산하는 것이 자연스럽다.

그래서 integer promotion은 단순 문법 장치가 아니라,  
**저장 타입과 연산 타입을 분리하는 규칙**으로 이해하는 것이 좋다.

---

### 3. 계산 결과 타입은 "피연산자 선언 타입"이 아니라 "승격 후 타입"에 더 가깝다

예시:
```c
    unsigned char a = 200;
    unsigned char b = 100;
    int x = a + b;
```
이 코드에서 `a + b`는 `unsigned char` 범위 안에서 계산되는 것이 아니라,  
승격된 타입에서 계산된다.

즉 중요한 것은 다음이다.

- `a`, `b`가 무엇으로 선언되었는가
- 연산 전에 무엇으로 promotion되는가
- 그 promotion된 타입에서 어떤 산술 규칙이 적용되는가

즉 C 식을 읽을 때는 변수 선언보다  
**식 내부 변환 단계**를 함께 봐야 한다.

---

## 왜 헷갈리는가

### 1. 코드에 드러나지 않기 때문이다

예시:
```c
    short a = 30000;
    short b = 2;
    int x = a * b;
```
코드에는 promotion이 써 있지 않다.  
그냥 `short * short`처럼 보인다.

하지만 실제로는 보통 더 큰 타입으로 올린 뒤 곱셈이 수행된다.

즉 integer promotion은 코드에 명시되지 않지만,  
실행 의미를 크게 바꾼다.

이 때문에 초보자뿐 아니라 실무자도 종종 착각한다.

---

### 2. 저장 타입과 계산 타입이 다르기 때문이다

예를 들어:
```c
    unsigned char x = 255;
    unsigned char y = x + 1;
```
여기서 많은 사람은 "`unsigned char` 안에서 바로 255 + 1"처럼 생각한다.  
하지만 더 정확히는:

- `x`가 promotion됨
- 더 큰 타입에서 `255 + 1` 계산
- 결과가 다시 `unsigned char`에 대입됨

즉 overflow/변환/최종 결과를 이해하려면  
**중간 계산 타입**을 반드시 봐야 한다.

---

### 3. bitwise 연산과 만나면 더 헷갈린다

예시:
```c
    unsigned char x = 0x80;
    int y = ~x;
```
많은 사람은 `~x` 결과를 "unsigned char 뒤집기"처럼 생각한다.  
하지만 실제로는 `x`가 먼저 promotion된 뒤 비트 반전이 적용된다.

즉 `~`나 shift 같은 비트 연산은  
integer promotion과 만나면 결과가 훨씬 덜 직관적이 된다.

그래서 bitwise 주제는 integer promotion 없이 설명하면 거의 반드시 헷갈린다.

---

## 어떤 타입으로 promotion되는가

기초적으로는 이렇게 잡으면 된다.

### 1. `int`로 표현 가능한 경우

작은 정수형 값 범위를 `int`가 모두 표현할 수 있으면, 보통 `int`로 승격된다.

### 2. 그렇지 않으면 `unsigned int`

즉 integer promotion은 무조건 원래 부호를 그대로 유지하는 규칙이 아니라,  
**값 범위를 어떤 타입이 수용할 수 있는가**와 연결된다.

이 지점이 signed/unsigned 문제와 다시 이어진다.

즉 promotion은 단순히 "큰 타입으로 바뀐다"가 아니라  
**어느 큰 타입으로 바뀌느냐**까지 봐야 한다.

---

## 예시로 보는 착각 포인트

### 1. `char + char`

예시:
```c
    char a = 100;
    char b = 20;
    int x = a + b;
```
겉으로는 `char`끼리 더한다.  
하지만 실제 계산은 보통 promotion 후 일어난다.

즉 "`char` 덧셈"이라고 생각하면 틀리고,  
"승격된 정수형 덧셈"이라고 생각해야 맞다.

---

### 2. `unsigned char`의 비트 반전

예시:
```c
    unsigned char x = 0x01;
    int y = ~x;
```
많은 사람은 `~x` 결과가 `0xFE` 정도일 것 같다고 생각한다.  
하지만 실제로는 `x`가 먼저 promotion되고, 그 더 넓은 타입 전체에서 비트 반전이 일어난다.

즉 결과는 작은 8비트 세계가 아니라  
**승격된 타입의 비트폭 세계**에서 해석해야 한다.

---

### 3. shift 결과

예시:
```c
    unsigned char x = 1;
    int y = x << 7;
```
이것도 `unsigned char` 안에서 shift되는 것이 아니라,  
보통 promotion된 뒤 shift된다.

즉 shift는 작은 타입 비트 조작처럼 보여도  
실제로는 더 큰 정수형 식 연산인 경우가 많다.

---

## signed/unsigned 변환과 어떻게 연결되는가

integer promotion은 standalone 규칙처럼 보이지만,  
실제로는 signed/unsigned 혼합 문제와 거의 항상 엮인다.

예를 들어:
```c
    unsigned char a = 200;
    signed char b = -1;
    int x = a + b;
```
이 코드에서 중요한 것은 단순히 부호가 다르다는 사실이 아니다.  
실제 계산 전에 둘이 어떤 타입으로 promotion되는지가 중요하다.

즉 signed/unsigned 문제는  
"서로 다른 정수형이 섞인다"는 이야기이고,  
integer promotion은  
"그 섞임 전에 작은 타입들이 어떤 단계로 올라가느냐"의 문제다.

둘은 분리된 문서지만 실제 식 해석에서는 같이 움직인다.

---

## 왜 비교에서도 중요해지는가

예시:
```c
    unsigned char a = 255;
    unsigned char b = 1;

    if ((a - b) < 0) {
        /* ... */
    }
```
겉으로는 작은 타입 차이 계산처럼 보인다.  
하지만 실제로는 promotion 후 계산이 일어나므로,  
식 결과 타입과 비교 결과는 초보자 직관과 달라질 수 있다.

즉 integer promotion은 단순 산술뿐 아니라  
**비교 결과의 의미**도 바꿀 수 있다.

---

## 메모리 모델 관점에서 왜 중요한가

이 문서가 memory-model 축에 있는 이유는  
integer promotion이 단순 문법 규칙이 아니라,  
**저장 표현과 계산 표현을 분리하는 대표 사례**이기 때문이다.

즉 C에서는 다음이 항상 같지 않다.

- 객체가 메모리에 저장되는 타입
- 식에서 계산되는 타입

작은 정수형은 바로 이 차이를 가장 잘 보여 준다.

예를 들어 `unsigned char`는 저장공간 1바이트 객체일 수 있지만,  
연산식에서는 `int`로 끌어올려 계산될 수 있다.

즉 memory-model 관점에서 integer promotion은  
**저장 타입과 계산 타입이 다를 수 있음을 이해하는 핵심 규칙**이다.

---

## 왜 보안/안전성과도 연결되는가

정수형 변환 문제는 길이, 인덱스, 바이트 처리에서 자주 취약점으로 이어진다.  
integer promotion도 여기에 기여할 수 있다.

예시적 문제:

- 작은 정수형 연산 결과를 잘못 예측함
- bitwise 마스킹 결과를 잘못 이해함
- shift/비교 조건을 잘못 설계함
- 최종 대입 시 작은 타입으로 다시 잘리면서 오류 발생

즉 promotion 자체가 곧 취약점은 아니지만,  
**프로그램이 실제로 무엇을 계산하는지 잘못 이해하게 만드는 원인**이 된다.

---

## 자주 하는 오해

### 오해 1. `char`, `short`는 자기 타입 그대로 계산된다

아니다.  
많은 식에서 먼저 integer promotion이 일어난다.

---

### 오해 2. promotion은 단순히 타입 이름만 바꾸는 것이다

아니다.  
비교 결과, 산술 결과, bitwise 결과까지 바꿀 수 있다.

---

### 오해 3. `unsigned char` bitwise는 항상 8비트 안에서 끝난다

아니다.  
먼저 더 큰 정수형으로 승격된 뒤 연산될 수 있다.

---

### 오해 4. 선언 타입만 보면 식 의미를 알 수 있다

아니다.  
C에서는 식 내부 변환 단계가 매우 중요하다.

---

### 오해 5. promotion은 별로 중요하지 않은 사소한 규칙이다

아니다.  
정수 비교, 마스킹, shift, signed/unsigned 혼합을 이해하는 데 핵심이다.

---

## 어디서부터 직관과 실제 규칙이 갈리는가

### 1. 선언 타입이 아니라 식 안의 계산 타입이 의미를 결정한다

사람은 보통 `char`, `short`를 보면 그 타입 그대로 계산한다고 생각한다.  
하지만 C는 저장 타입과 계산 타입을 분리하는 방향으로 설계되어 있다.

즉 다음을 따로 봐야 한다.

- 메모리에 저장된 타입
- 식에 들어온 뒤 승격된 타입
- 최종 대입 시 다시 줄어드는 타입

이 세 단계를 한꺼번에 보지 않으면 promotion은 계속 헷갈린다.

### 2. promotion은 산술보다 비트 연산에서 더 교묘하게 문제를 만든다

덧셈/뺄셈은 그나마 값 의미로 따라가기 쉽지만,  
`~`, `<<`, `>>`, 마스크 연산은 "몇 비트 폭에서 계산되는가"를 놓치는 순간 직관이 바로 무너진다.

즉 promotion은 부수 규칙이 아니라  
**정수형 식 해석의 시작점**이다.

---

## 실무 관점

### 1. 작은 정수형은 저장용으로, 연산은 더 큰 타입에서 일어난다고 생각하는 편이 낫다

이 사고를 기본으로 두면 많은 혼란이 줄어든다.

즉 다음처럼 보는 편이 좋다.

- `char`, `short`는 저장공간 타입
- 실제 계산은 `int` 계열에서 일어나는 경우가 많음

이 관점은 bitwise 코드에서 특히 중요하다.

---

### 2. bitwise/shift 코드를 쓸 때 promotion을 먼저 떠올려야 한다

예를 들어 마스크, 플래그, 바이트 추출 코드를 쓸 때  
"지금 이 값이 몇 비트 세계에서 연산되고 있지?"를 먼저 물어야 한다.

이걸 놓치면 코드가 의도와 다르게 동작할 수 있다.

---

### 3. 최종 대입 시 다시 작은 타입으로 줄어든다는 점도 같이 봐야 한다

예시:
```c
    unsigned char x = 250;
    unsigned char y = x + 10;
```
여기서는

- 먼저 promotion 후 계산
- 그다음 결과를 다시 `unsigned char`에 저장

이 두 단계가 모두 중요하다.

즉 식의 의미는  
**승격 단계 + 계산 단계 + 재대입 단계**를 함께 봐야 한다.

---

### 4. 다음 문서들과 직접 연결된다

이 문서는 아래와 바로 이어진다.

- signed/unsigned 변환은 왜 위험한가
- bitwise 연산과 shift는 실무에서 어떻게 연결되는가
- undefined behavior는 왜 위험한가

즉 정수형 식 해석의 중간 다리 역할을 한다.

---

## 판단 체크리스트

작은 정수형이 식에 들어오면 먼저 아래를 묻는 편이 좋다.

1. 이 값은 저장 타입이 무엇인가
2. 연산 직전에 `int` 또는 `unsigned int`로 승격되는가
3. 실제 의미는 승격된 타입에서 어떻게 계산되는가
4. 최종 대입 시 다시 좁아지면서 값이 바뀌지는 않는가

즉 integer promotion은 외워야 할 부칙이 아니라  
**"이 식은 실제로 몇 비트 세계에서 계산되고 있는가"를 묻는 기본 체크리스트**다.

---

## 정리

integer promotion은 작은 정수형이 연산 전에 더 큰 정수형으로 자동 변환되는 규칙이다.

핵심은 다음과 같다.

- `char`, `short` 등은 식에서 그대로 계산되지 않는 경우가 많다
- 보통 `int` 또는 `unsigned int`로 먼저 승격된다
- 그래서 선언 타입과 실제 계산 타입이 다를 수 있다
- 이 규칙은 산술, 비교, 비트 연산, shift 결과를 바꾼다
- signed/unsigned 문제와 강하게 연결된다

즉 integer promotion을 이해한다는 것은  
작은 정수형을 "그 자체로 계산되는 타입"으로 보지 않고, **식 안에서 더 큰 정수형으로 끌어올려지는 저장 타입**으로 보는 것이다.

이 관점이 잡히면 다음의 bitwise 연산과 shift 문서가 훨씬 더 자연스럽게 읽히게 된다.
