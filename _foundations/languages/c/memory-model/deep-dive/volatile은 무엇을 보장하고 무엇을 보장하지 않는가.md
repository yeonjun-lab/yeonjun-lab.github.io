---
title: volatile은 무엇을 보장하고 무엇을 보장하지 않는가
permalink: /foundations/languages/c/memory-model/deep-dive/volatile은-무엇을-보장하고-무엇을-보장하지-않는가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-17
updated_at: 2026-03-17
sort_date: 2026-03-17
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-memory-model
topic_slug: memory-model
language: c
tags: [c, volatile, memory-model, optimization, compiler, mmio, signal, concurrency, atomic]
prev_url:
next_url: /foundations/languages/c/memory-model/deep-dive/atomic-이전의-c-코드에서-동시성-문제를-어떻게-이해해야-하는가/
---

## 1. 왜 이 주제를 깊게 봐야 하는가

`volatile`은 C에서 가장 자주 오해되는 키워드 중 하나다.  
겉으로는 단순해 보인다. 변수 앞에 붙이면 “최적화를 막아 준다”, “항상 메모리에서 다시 읽는다”, “멀티스레드에서도 최신 값이 보인다”, “하드웨어 레지스터 접근에 쓴다” 같은 설명이 따라온다. 하지만 이 설명들은 서로 다른 층위의 사실을 한 문장으로 뭉개 놓은 경우가 많다.

실무에서 문제를 만드는 것은 `volatile` 자체가 아니라, `volatile`에 대한 잘못된 기대다.

- `volatile`이면 스레드 간 통신이 안전할 것이라고 기대한다.
- `volatile`이면 CPU가 순서를 바꾸지 못할 것이라고 기대한다.
- `volatile`이면 캐시를 우회해서 항상 최신 값을 볼 것이라고 기대한다.
- `volatile`이면 read-modify-write도 안전할 것이라고 기대한다.
- `volatile`이면 “하드웨어와 맞닿아 있는 특별한 메모리”가 되는 것처럼 생각한다.

이 기대들은 일부 환경에서는 겉보기로 맞아 보일 수 있다.  
특정 컴파일러, 특정 최적화 단계, 특정 CPU의 메모리 ordering, 특정 운영체제, 특정 테스트 조건에서는 우연히 의도대로 동작할 수 있다. 그러나 “테스트에서 그렇게 보였다”와 “언어가 그렇게 보장한다”는 전혀 다르다.

`volatile`을 정확히 이해해야 하는 이유는 다음과 같다.

첫째, `volatile`은 메모리 모델 문서에서 “보장 범위”를 설명하는 대표 사례다.  
무엇이 언어 규칙이고, 무엇이 구현 세부이고, 무엇이 하드웨어와 운영체제의 성질인지 분리하지 못하면 이후에 atomics, signal, MMIO, race condition, thread safety를 모두 흐린 상태로 배우게 된다.

둘째, `volatile`은 실무에서 종종 “대충 동작하게 만드는 응급처치”로 오용된다.  
특히 오래된 C 코드, 임베디드 코드, 드라이버 코드, 멀티스레드 레거시 코드에서는 `volatile`이 동기화 도구처럼 사용된 흔적을 자주 본다. 이런 코드는 테스트를 통과해도 구조적으로 취약하다.

셋째, `volatile`은 “접근 자체의 의미”가 중요한 대상을 다룰 때는 여전히 필요하다.  
대표적으로 MMIO, 일부 signal 플래그, 외부에서 값이 바뀌는 상태 관찰 같은 경우다. 즉, `volatile`은 쓸모없는 키워드가 아니라, 적용 경계가 좁고 정확해야 하는 키워드다.

이 문서의 핵심 목표는 정의 자체를 반복하는 데 있지 않다.  
핵심은 다음을 분리해서 정리하는 것이다.

- `volatile`이 언어 수준에서 무엇을 약속하는가
- 무엇은 약속하지 않는가
- 왜 그 차이를 자주 헷갈리는가
- 반례는 어떤 모습으로 나타나는가
- 실무에서 어떤 기준으로 써야 하는가

즉, 이 문서는 `volatile`을 “최적화 방지 키워드”로 설명하지 않는다.  
그 대신 `volatile`을 “접근 보존 규칙이 필요한 경계”로 설명한다.

---

## 2. 전체 구조

`volatile`을 정확히 이해하려면, 먼저 같은 현상을 서로 다른 네 층위로 나눠야 한다.

### 2.1 언어 규칙 층위

C에서 `volatile`은 타입 한정자다.  
핵심 의미는 “이 객체에 대한 접근은 프로그램 외부 요인과 연결될 수 있으므로, 컴파일러가 일반 객체처럼 함부로 제거·병합·축소해서는 안 된다”에 가깝다.

여기서 중요한 점은 `volatile`이 “객체를 특별한 메모리로 바꾸는 장치”가 아니라, 그 객체에 대한 접근을 다루는 규칙이라는 점이다.

### 2.2 컴파일러/구현 층위

컴파일러는 일반 객체에 대해서는 다음과 같은 최적화를 수행할 수 있다.

- 값 재사용을 위한 레지스터 캐싱
- 중복 load 제거
- dead store 제거
- loop invariant hoisting
- store 병합
- 표현식 재배치

하지만 `volatile` 접근은 외부에 의미를 가질 수 있으므로 이러한 자유도가 제한된다.  
즉, `volatile`은 우선적으로 컴파일러의 최적화 자유도와 연결된다.

### 2.3 CPU / 메모리 시스템 층위

CPU는 load/store를 내부적으로 재배치하거나, store buffer와 cache coherence 규칙에 따라 다른 코어에 관찰되는 시점을 다르게 만들 수 있다.  
이 문제는 컴파일러의 소스 변환 문제와는 별개다.

즉, `volatile`이 컴파일러에게 “이 접근을 남겨라”라고 말하는 것과, CPU가 “이 순서를 다른 코어에게 같은 순서로 보이게 하라”는 것은 다른 문제다.

### 2.4 운영체제 / 실무 관례 층위

실무에서는 `volatile`이 주로 다음 두 축과 연결된다.

- MMIO(memory-mapped I/O) 레지스터 접근
- signal handler와 main flow 사이의 제한된 상태 공유

반대로 다음 문제에 대해서는 `volatile`이 본질적 해결책이 아니다.

- 멀티스레드 공유 상태 동기화
- atomic read-modify-write
- publish/subscribe ordering
- happens-before 관계 설정
- lock-free correctness 보장

따라서 `volatile`은 “메모리와 관련된 모든 특수 상황”을 해결하는 범용 도구가 아니다.  
그것은 컴파일러가 접근을 지워서는 안 되는 좁은 경계를 표시하는 도구다.

---

## 3. 내부 동작 원리

### 3.1 `volatile`은 객체의 마법 속성이 아니라, 접근 경로의 의미를 바꾸는 규칙이다

처음 `volatile`을 배우면 이렇게 생각하기 쉽다.

- `volatile int x;` 라고 쓰면 `x`가 특별한 메모리가 된다.
- 한 번 `volatile`이면 그 객체는 어디서 접근하든 항상 같은 보장을 가진다.

이 직관은 부정확하다.  
`volatile`의 핵심은 “이 저장 위치가 특별하다”가 아니라, “이 저장 위치를 어떤 타입 경로로 접근하느냐”에 있다.

예를 들어 다음을 보자.
```c
    volatile int x = 0;

    void f(void) {
        x = 1;
        x = 2;
    }
```
이 경우 `x`에 대한 두 번의 쓰기는 각각 의미를 가질 수 있으므로, 컴파일러가 이를 일반 객체처럼 합쳐서는 안 된다.

하지만 같은 저장 위치에 대해 non-volatile 경로를 만들어 접근하면, 독자가 직관적으로 기대하는 “항상 volatile semantics”는 더 이상 자동으로 보장되지 않는다.
```c
    volatile int x = 0;

    void g(void) {
        int *p = (int *)&x;
        *p = 1;
        *p = 2;
    }
```
이 코드는 “대상 객체가 원래 volatile이니까 두 번의 쓰기가 여전히 보존되겠지”라는 잘못된 직관을 유도한다.  
하지만 실무적으로는 이처럼 volatile qualification을 벗겨 접근하는 순간, 그 접근은 volatile 접근이 아니라는 점을 먼저 경계해야 한다.

왜 이 직관이 틀리는가?

- `volatile`은 저장 위치 전체에 마법처럼 붙는 속성으로 이해하면 안 된다.
- C에서 의미를 가지는 것은 “어떤 lvalue, 어떤 타입, 어떤 qualification으로 접근했는가”다.
- 즉, “volatile 객체”라는 표현만으로 충분하지 않고, “volatile-qualified access인가”를 봐야 한다.

따라서 독자가 반드시 기억해야 할 것은 다음이다.

- 같은 저장 위치라도 volatile 경로와 non-volatile 경로는 같은 의미가 아니다.
- `volatile`을 객체의 본질적 속성처럼 이해하면 접근 경계가 흐려진다.
- 하드웨어 레지스터나 signal 플래그처럼 접근 보존이 중요한 대상은, API와 타입 경로 전체를 그 의도에 맞게 설계해야 한다.

### 3.2 `volatile`은 접근 제거와 병합을 제한한다

일반 객체라면 다음 코드는 첫 번째 store가 제거될 수 있다.
```c
    int x;
    x = 10;
    x = 20;
```
최종 상태만 보면 `x == 20`이므로, `x = 10;`은 dead store가 될 수 있다.

하지만 `volatile` 객체라면 각 쓰기 자체가 의미를 가질 수 있다.
```c
    volatile int x;
    x = 10;
    x = 20;
```
예를 들어 어떤 장치 레지스터는 첫 번째 쓰기가 reset 의미를, 두 번째 쓰기가 start 의미를 가질 수 있다.  
이 경우 두 번의 store를 하나로 합치면 프로그램 의미가 깨진다.

`volatile`의 핵심 직관은 바로 이것이다.  
일반 객체는 “최종 값”이 중요하지만, `volatile` 객체는 “접근 행위 자체”가 중요할 수 있다.

### 3.3 `volatile`은 원자성을 주지 않는다

다음 코드는 매우 흔한 오해의 원인이다.
```c
    volatile int counter = 0;

    void inc(void) {
        counter++;
    }
```
겉보기에는 `counter`를 매번 메모리에서 읽고 다시 쓰므로 안전해 보일 수 있다.  
하지만 `counter++`는 보통 다음과 같이 분해된다.

- 현재 값 읽기
- 1 더하기
- 결과 쓰기

즉, 이것은 read-modify-write이고, 단일 원자 연산이 아니다.  
여러 실행 흐름이 동시에 실행하면 update lost가 발생할 수 있다.

핵심은 다음과 같다.

- `volatile`은 access preservation에 관한 규칙이다.
- atomicity는 연산 단위를 경쟁 환경에서 분해되지 않게 만드는 다른 문제다.
- 두 개념은 겉보기에는 비슷한 “특수한 변수”처럼 보여도 본질적으로 다르다.

### 3.4 `volatile`은 ordering 관계를 만들지 않는다

다음 패턴은 아주 흔하다.
```c
    int data = 0;
    volatile int ready = 0;

    void producer(void) {
        data = 42;
        ready = 1;
    }

    void consumer(void) {
        while (ready == 0) {
        }
        use(data);
    }
```
많은 사람이 `ready`를 volatile로 만들었으니 consumer가 `ready == 1`을 보면 `data == 42`도 본다고 기대한다.  
하지만 이 기대는 언어 규칙에서 바로 나오지 않는다.

왜 이 직관이 틀리는가?

- `ready`에 대한 접근 보존과
- `data`에 대한 publish ordering 보장은
- 같은 문제가 아니다.

`volatile`은 `ready` 접근을 제거하지 않게 만들 수는 있다.  
그러나 `data`와 `ready` 사이의 ordering, visibility, synchronization을 자동으로 만들지는 않는다.

즉, `volatile`은 “flag가 반복해서 읽히는 코드”는 만들 수 있어도, “그 flag가 올바른 동기화 프로토콜이 되게 하는 것”까지는 해 주지 않는다.

### 3.5 `volatile`은 외부에서 상태가 바뀔 수 있는 대상과 잘 맞는다

`volatile`이 가장 자연스럽게 쓰이는 상황은, 프로그램 내부의 평범한 계산 모델로는 접근 의미를 설명할 수 없는 경우다.

대표 예는 다음과 같다.

- MMIO 레지스터
- signal handler가 바꾸는 단순 플래그
- 인터럽트가 갱신하는 상태
- 외부 장치와 연결된 상태 레지스터

이 경우 중요한 것은 “이 값이 메모리에 있다”가 아니다.  
중요한 것은 “이 접근을 지워 버리거나 합치면 외부 세계와의 상호작용 의미가 깨진다”는 점이다.

---

## 4. 핵심 구성 요소

### 4.1 타입 한정자로서의 `volatile`

`volatile`은 타입 한정자다.  
즉, `const`, `restrict`와 같은 층위의 요소다.

다음 선언들은 서로 다르다.
```c
    volatile int *p;
    int * volatile q;
    const volatile unsigned int status;
```
각각의 의미는 다음과 같다.

- `volatile int *p;`
  포인터가 가리키는 대상 객체 접근이 volatile이다.
- `int * volatile q;`
  포인터 변수 `q` 자체가 volatile이다.
- `const volatile unsigned int status;`
  수정은 허용하지 않지만, 읽기 접근은 volatile semantics를 가진다.

실무에서 특히 중요한 것은 MMIO 선언에서 “무엇이 volatile인가”를 정확히 잡는 것이다.  
포인터 변수 자체가 volatile한 것과, 그 포인터가 가리키는 대상 접근이 volatile한 것은 전혀 다르다.

### 4.2 접근 폭과 구현 세부

`volatile`이 붙었다고 해서 하드웨어 접근 폭까지 자동으로 맞춰 주는 것은 아니다.  
예를 들어 32비트 장치 레지스터에 대해 `volatile uint32_t *`로 접근한다고 해도, 실제 하드웨어가 그 정렬과 폭의 접근만 허용하는지, unaligned access가 trap을 일으키는지는 표준 C가 아니라 플랫폼이 결정한다.

즉, `volatile`은 “접근을 남겨라”라는 규칙이지,  
“이 접근이 장치가 기대하는 버스 프로토콜과 완벽히 일치한다”는 보장은 아니다.

### 4.3 `const volatile`의 실무적 의미

MMIO나 상태 레지스터 중에는 읽기는 가능하지만 쓰면 안 되는 경우가 많다.  
이럴 때 `const volatile`은 매우 자연스럽다.
```c
    const volatile unsigned int *status =
        (const volatile unsigned int *)0x40001000u;
```
이 선언은 두 가지를 동시에 표현한다.

- `const`: 이 코드 경로에서는 쓰지 말라
- `volatile`: 읽기는 매번 실제 접근으로 보존해야 한다

즉, `const`와 `volatile`은 서로 충돌하지 않는다.  
하나는 수정 가능성, 다른 하나는 접근 보존을 다룬다.

### 4.4 signal에서의 제한적 사용

signal handler는 일반 함수 호출과 다르게 비동기적으로 개입한다.  
이 때문에 메인 흐름이 어떤 값을 반복해서 읽고, signal handler가 그 값을 바꾸는 구조에서는 `volatile sig_atomic_t`가 등장한다.
```c
    #include <signal.h>

    volatile sig_atomic_t stop = 0;

    void on_signal(int signo) {
        stop = 1;
    }

    int main(void) {
        while (!stop) {
        }
    }
```
이 경우 `stop`에 대한 load를 캐시해 버리거나 루프 밖으로 빼 버리면 의도가 깨진다.  
따라서 `volatile`이 실질적 의미를 가진다.

하지만 이것을 일반 멀티스레드 동기화로 일반화하면 안 된다.  
signal은 별도 규칙을 갖는 제한된 비동기 맥락이다.

### 4.5 MMIO에서의 전형적 사용

다음은 매우 전형적인 MMIO 패턴이다.
```c
    #define UART_STATUS ((volatile unsigned int *)0x40001000u)
    #define UART_TX     ((volatile unsigned int *)0x40001004u)

    while (((*UART_STATUS) & 0x1u) == 0u) {
    }

    *UART_TX = 'A';
```
이 코드에서 상태 레지스터를 반복해서 다시 읽는 것은 중요하다.  
장치 상태는 일반 RAM처럼 프로그램 내부 계산만으로 정해지지 않기 때문이다.

다만 이 경우에도 다음을 추가로 검토해야 한다.

- 레지스터 접근 순서가 장치 프로토콜상 중요한가
- 특정 read/write 사이에 barrier가 필요한가
- device memory ordering을 아키텍처가 어떻게 정의하는가
- 같은 레지스터라도 read-to-clear, write-1-to-clear 같은 부작용이 있는가

즉, MMIO에서 `volatile`은 자주 필요하지만, 언제나 충분한 것은 아니다.

---

## 5. 실행 흐름 또는 처리 순서

### 5.1 busy-wait loop에서의 차이

일반 객체:
```c
    int done = 0;

    void wait_done(void) {
        while (done == 0) {
        }
    }
```
이 코드는 단일 실행 흐름 의미론에서는 `done`이 루프 내부에서 바뀌지 않는다고 볼 수 있다.  
컴파일러는 이 값을 한 번만 읽고 무한 루프로 바꿀 여지가 있다.

`volatile` 객체:
```c
    volatile int done = 0;

    void wait_done(void) {
        while (done == 0) {
        }
    }
```
여기서는 각 반복에서 접근을 남겨야 할 가능성이 커진다.  
즉, 외부에서 값이 달라질 수 있는 상태 관찰이라는 의도가 반영된다.

하지만 이 차이를 곧바로 “멀티스레드에 안전하다”로 해석하면 틀린다.  
이 코드는 접근 보존과 동기화 보장을 혼동하게 만드는 대표 사례다.

### 5.2 write collapsing 방지

일반 객체:
```c
    int cmd;
    cmd = 1;
    cmd = 2;
```
최종 값만 중요하면 첫 번째 store는 제거될 수 있다.

`volatile` 객체:
```c
    volatile int cmd;
    cmd = 1;
    cmd = 2;
```
각 write가 외부 의미를 가질 수 있으므로 그대로 남아야 할 수 있다.  
MMIO command register는 이런 상황의 전형이다.

### 5.3 read-modify-write의 오해

잘못된 기대:
```c
    volatile int count = 0;

    void inc(void) {
        count++;
    }
```
겉보기에는 매번 memory access를 하는 것처럼 보인다.  
그러나 경쟁 환경에서는 여전히 lost update가 가능하다.

원자 연산 의도가 있는 경우:
```c
    _Atomic int count = 0;

    void inc(void) {
        count++;
    }
```
여기서는 적어도 언어 차원에서 atomic increment semantics를 논할 수 있다.  
즉, `volatile`과 `_Atomic`은 해결하려는 문제가 다르다.

### 5.4 publish flag의 잘못된 사용

잘못된 구조:
```c
    int payload = 0;
    volatile int ready = 0;

    void publish(void) {
        payload = 123;
        ready = 1;
    }

    void consume(void) {
        while (!ready) {
        }
        use(payload);
    }
```
이 구조는 테스트에서는 흔히 통과한다.  
그래서 더 위험하다.  
독자는 `ready`가 volatile이므로 `payload`도 안전하게 공개된 것처럼 오해하기 쉽다.

하지만 실제 핵심은 다음이다.

- `ready`는 단지 접근 보존 대상일 뿐이다.
- `payload`가 언제 어떤 순서로 관찰되는지는 별도 동기화 문제다.
- ordering과 visibility는 `volatile`만으로 확보되지 않는다.

### 5.5 volatile qualification을 우회한 접근의 반례

다음 코드는 매우 중요한 반례다.
```c
    volatile unsigned int reg = 0;

    void write_via_nonvolatile(void) {
        unsigned int *p = (unsigned int *)&reg;
        *p = 1;
        *p = 2;
    }
```
많은 독자는 “원래 reg가 volatile이니 두 번의 쓰기 모두 보존되겠지”라고 생각한다.  
하지만 이 코드는 바로 그 직관이 왜 위험한지를 보여 준다.

실무적으로 기억해야 할 점은 다음이다.

- volatile semantics는 접근 경로와 qualification에 기대어 이해해야 한다.
- API 바깥에서 qualification을 벗겨 접근할 수 있게 만들면, 독자가 기대한 보장 경계가 무너진다.
- 따라서 MMIO나 외부 상태 관찰 대상은 타입과 인터페이스를 통해 non-volatile 우회를 최대한 막는 설계가 중요하다.

---

## 6. 성능 / 최적화 관점

### 6.1 레지스터 재사용과 common optimization 기회를 줄인다

일반 객체는 레지스터에 오래 머물 수 있고, 중복 load/store가 사라질 수 있다.  
하지만 `volatile` 객체는 각 접근 자체가 의미를 가질 수 있으므로 이런 최적화가 제한된다.

그 결과 다음 비용이 생길 수 있다.

- load/store 증가
- loop optimization 기회 감소
- dead store 제거 억제
- common subexpression elimination 제한
- instruction scheduling 자유도 감소

즉, `volatile`은 성능 향상 힌트가 아니라, 성능 자유도를 줄이더라도 의미 보존이 우선인 경우에 쓰는 장치다.

### 6.2 “느리다”가 본질은 아니다

`volatile`을 단순히 “느린 변수”라고 기억하는 것은 부정확하다.  
핵심은 느림 자체가 아니라 “컴파일러가 더 이상 같은 공격적 최적화를 할 수 없게 된다”는 점이다.

이 차이는 실무 판단에서 중요하다.

- MMIO에서는 느려져도 맞는 접근을 유지하는 것이 우선이다.
- 일반 공유 변수에 습관적으로 `volatile`을 붙이면 성능만 잃고 정확성은 얻지 못할 수 있다.

즉, 판단 기준은 “빠른가”가 아니라 “접근 보존이 본질적으로 필요한가”다.

### 6.3 `volatile`은 캐시 우회 수단이 아니다

이 오해는 반드시 분리해야 한다.

- `volatile`을 붙이면 CPU cache를 안 쓴다.
- `volatile`이면 다른 코어의 최신 값을 즉시 본다.

이것은 C 언어 규칙이 아니다.  
cache behavior, store buffer, coherence, memory type은 하드웨어와 시스템의 문제다.

왜 이 직관이 틀리는가?

- `volatile`은 소스 수준의 access preservation 규칙이다.
- CPU가 그 access를 어떻게 처리하는지는 아키텍처와 메모리 시스템이 결정한다.
- 따라서 `volatile`은 “컴파일러가 잊지 않게 하는 장치”이지, “하드웨어 coherence를 강제하는 장치”가 아니다.

### 6.4 불필요한 `volatile`은 버그를 가린다

무분별한 `volatile`은 다음과 같은 부작용을 만든다.

- 성능 저하
- 최적화 모드에 따라 관찰 결과 왜곡
- 진짜 synchronization bug를 숨기는 착시
- 코드 리뷰에서 의도 파악 실패
- “왜 atomic이 아니라 volatile인가”라는 질문이 사라짐

즉, `volatile`을 넓게 뿌리는 설계는 정밀도를 높이는 것이 아니라 문제를 흐리게 만든다.

---

## 7. 어디서부터 보장 범위와 구현 경계가 갈리는가

이 섹션이 이 문서의 핵심 경계다.  
`volatile`을 둘러싼 대부분의 오해는 서로 다른 층위를 한 문장으로 섞을 때 발생한다.

### 7.1 언어 규칙이 보장하는 것

언어 차원에서 핵심은 다음이다.

- volatile-qualified access는 일반 access처럼 함부로 제거·병합·축소해서는 안 된다.
- 접근 자체가 관찰 가능한 의미를 가질 수 있다는 가정을 코드에 반영한다.
- busy-wait, MMIO read/write, signal flag 같은 패턴에서 이 성질이 중요하다.

즉, 언어는 “접근 보존”에 관여한다.

### 7.2 언어 규칙이 보장하지 않는 것

다음은 `volatile`만으로는 보장되지 않는다.

- atomic increment
- read-modify-write의 indivisibility
- 스레드 간 happens-before 형성
- release/acquire ordering
- cache flush
- 다른 코어에서의 즉시 가시성
- lock-free correctness

즉, `volatile`은 synchronization primitive가 아니다.

### 7.3 컴파일러 경계

컴파일러는 `volatile` access를 일반 access와 다르게 취급해야 하지만, 그렇다고 모든 인접 연산에 대해 무한정 재배치를 금지당하는 것은 아니다.  
특히 “volatile access 하나가 있으면 모든 일반 메모리 access도 함께 고정될 것”처럼 기대하면 곤란하다.

즉, `volatile`은 컴파일러 재주문의 모든 문제를 푸는 장치가 아니다.  
문맥에 따라 compiler barrier와도 구분해야 한다.
따라서 `volatile`은 “일부 access를 남겨라”에 가깝지, 일반 메모리 연산 전체에 대한 compiler barrier를 자동으로 대체하는 도구로 이해하면 안 된다.

### 7.4 CPU ordering 경계

CPU와 메모리 시스템은 컴파일러가 생성한 load/store를 다시 내부적으로 재배치하거나 지연 관찰시킬 수 있다.  
이것은 `volatile`의 본래 역할과 다른 층위다.

따라서 다음 같은 기대는 틀릴 수 있다.

- `volatile store`를 먼저 썼으니 다른 코어도 그 전에 쓴 일반 store를 반드시 먼저 본다.
- `volatile load`를 했으니 그 이후 읽는 값은 최신이다.

이 문제는 memory ordering과 barrier, atomic semantics의 영역이다.

### 7.5 MMIO 관례 경계

MMIO에서는 `volatile`이 거의 항상 필요해 보인다.  
그러나 “MMIO에는 volatile이면 충분하다”라고 말하면 그것도 지나친 단순화다.

MMIO에서는 다음이 같이 검토되어야 한다.

- 접근 폭
- 정렬
- read side effect / write side effect
- 장치 프로토콜 순서
- architecture-specific barrier
- device memory type

즉, MMIO는 `volatile`의 대표 사용처이지만, 동시에 `volatile`만으로 설명이 끝나지 않는 대표 영역이다.

### 7.6 signal 관례 경계

signal에서는 `volatile sig_atomic_t`가 제한적으로 타당하다.  
하지만 이것이 곧바로 일반 멀티스레드 shared state까지 확장되지는 않는다.

즉, signal과 thread는 둘 다 “비동기적으로 값이 바뀌는 것처럼 보인다”는 공통점은 있지만, 같은 문제는 아니다.

### 7.7 실무적으로 어떻게 분리해야 하는가

정리하면 다음처럼 봐야 한다.

- 접근을 지우면 안 되는가  
  `volatile` 후보
- 경쟁 환경에서 연산 자체가 깨지는가  
  atomic / lock 후보
- ordering과 visibility가 필요한가  
  atomic memory order / barrier / synchronization 후보
- 외부 장치 프로토콜을 맞춰야 하는가  
  MMIO 설계 + barrier + device rule 후보

즉, `volatile`은 전체 동시성 문제의 하위 부분일 뿐이다.  
그것을 상위 개념처럼 사용하면 설계가 무너진다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 `volatile`이 적절한 경우

#### 1) MMIO 레지스터 접근

하드웨어 레지스터는 접근 자체가 의미를 가질 수 있다.  
읽기/쓰기를 없애거나 합치면 프로그램 의미가 깨질 수 있으므로 `volatile`이 자연스럽다.

#### 2) signal handler와 main flow 사이의 단순 플래그

`volatile sig_atomic_t` 같은 제한된 형태는 타당하다.  
다만 복수 필드 일관성, 복합 상태 머신, 고급 동기화까지 기대하면 안 된다.

#### 3) 외부 세계가 값을 바꿀 수 있는 상태 관찰

디버그 레지스터, 장치 상태, 인터럽트 연동 상태처럼  
프로그램 외부 의미가 있는 접근이라면 `volatile`이 필요할 수 있다.

### 8.2 `volatile`이 해결책이 아닌 경우

#### 1) 멀티스레드 공유 상태 보호

스레드 간 상태 공유는 mutex, semaphore, condition variable, atomics 같은 동기화 도구의 문제다.  
`volatile`은 이를 대체하지 못한다.

#### 2) 카운터 증가, 플래그 publish, lock-free 자료구조

이 문제는 atomicity, ordering, visibility가 핵심이다.  
`volatile`은 본질적 요구사항을 만족시키지 못한다.

#### 3) 메모리 배리어 대용

특정 플랫폼에서 우연히 비슷하게 보이는 경우가 있어도,  
그것을 이식 가능한 언어 계약처럼 믿으면 안 된다.

### 8.3 qualification을 API 경계에서 보존해야 한다

`volatile`을 객체의 본질 속성처럼 생각하면, 중간에 non-volatile 포인터로 접근하는 반례를 놓치게 된다.  
따라서 접근 보존이 중요한 대상은 API 설계 단계에서부터 qualification을 유지해야 한다.

예를 들어 다음처럼 얇은 HAL 경계 안으로 가두는 것이 낫다.
```c
    static inline unsigned int uart_status_read(void) {
        return *(const volatile unsigned int *)0x40001000u;
    }

    static inline void uart_tx_write(unsigned int v) {
        *(volatile unsigned int *)0x40001004u = v;
    }
```
이 접근의 장점은 분명하다.

- `volatile`이 필요한 경계를 좁힐 수 있다.
- 상위 로직이 일반 메모리와 MMIO를 혼동하지 않게 된다.
- qualification stripping 같은 실수를 줄일 수 있다.
- barrier나 register width 처리를 한곳에서 관리할 수 있다.

### 8.4 “테스트에서는 된다”를 신뢰하면 안 된다

`volatile` 오용 코드는 테스트 환경에서 잘 돌아가는 경우가 많다.

그 이유는 다음과 같다.

- 강한 ordering을 보이는 CPU
- 보수적인 컴파일러 코드 생성
- 낮은 경쟁도
- 디버그 빌드
- 우연히 재현되지 않는 타이밍

따라서 실무에서는 “지금까지 잘 돌았다”보다 “보장 범위가 무엇인가”를 먼저 봐야 한다.

---

## 9. 판단 체크리스트

다음 질문에 명확히 답하지 못하면 `volatile` 사용 이유를 다시 검토해야 한다.

- 내가 해결하려는 문제가 정말 “접근 보존” 문제인가
- 아니면 “원자성” 문제인가
- 아니면 “ordering / visibility” 문제인가
- 이 값은 외부 장치나 비동기 사건 때문에 바뀌는가
- 이 접근이 제거되거나 병합되면 의미가 깨지는가
- 같은 저장 위치를 non-volatile 경로로 우회 접근할 가능성이 있는가
- 그 가능성을 API 설계로 차단했는가
- MMIO라면 접근 폭, 정렬, side effect, barrier까지 검토했는가
- signal이라면 `sig_atomic_t` 수준의 제한된 사용인가
- 멀티스레드라면 `_Atomic`이나 lock이 더 적절한 문제는 아닌가
- 현재 동작이 특정 컴파일러/CPU의 우연한 성질을 표준 보장으로 착각한 것은 아닌가

## 정리

`volatile`은 “최적화를 막는 키워드”라고만 기억하면 거의 반드시 오해하게 된다.  
더 정확한 표현은 다음과 같다.

- `volatile`은 접근 보존이 필요한 대상을 표시하는 타입 한정자다.
- 그것은 주로 컴파일러의 접근 제거·병합·축소 자유도를 제한한다.
- `volatile`은 atomicity를 주지 않는다.
- `volatile`은 스레드 간 ordering과 synchronization을 주지 않는다.
- `volatile`은 cache coherence나 CPU memory ordering을 직접 통제하지 않는다.
- `volatile`은 MMIO, signal 플래그 같은 좁은 경계에서 유효하다.
- 같은 저장 위치라도 non-volatile 경로로 접근하면 독자가 기대한 보장 경계는 무너질 수 있다.

즉, `volatile`은 범용 동시성 도구가 아니라,  
“이 접근은 일반 메모리 access처럼 취급하면 안 된다”는 사실을 코드에 새기는 장치다.

---

## 10. 더 깊게 볼 포인트

### 10.1 atomic 이전의 C 코드에서 동시성 문제를 어떻게 이해해야 하는가

`volatile` 다음 문서가 이 주제로 자연스러운 이유는 명확하다.  
`volatile`을 오해하는 가장 큰 이유가 바로 “예전 C 코드에서 동시성 문제를 대충 어떻게 처리해 왔는가”와 연결되기 때문이다. `volatile`의 경계를 이해한 직후, 왜 그것이 synchronization 도구가 아닌지를 역사적·구조적으로 보는 흐름이 가장 자연스럽다.

### 10.2 race condition은 왜 결과를 예측 불가능하게 만드는가

`volatile` 오용의 다음 단계 문제는 race condition이다.  
접근을 남기는 것과 경쟁 상태를 제거하는 것은 다르다는 점을 이 주제에서 더 선명하게 볼 수 있다.

### 10.3 reentrant와 thread-safe는 무엇이 다른가

signal, interrupt, async callback, thread safety를 같은 문제로 뭉뚱그리면 `volatile`의 경계도 함께 흐려진다.  
이 차이를 분리해야 설계 판단력이 생긴다.

### 10.4 compiler barrier와 CPU barrier는 어떻게 다른가

`volatile`이 막는 것과 막지 못하는 것을 더 엄밀하게 이해하려면, compiler reordering과 CPU memory ordering을 따로 봐야 한다.

### 10.5 MMIO와 일반 메모리는 왜 같은 pointer 연산으로 보여도 같은 의미가 아닌가

겉으로는 둘 다 주소를 읽고 쓰는 코드처럼 보인다.  
하지만 외부 세계와 연결된 접근은 “값 저장”보다 “접근 행위” 자체가 중요하다. 이 차이를 분리해서 이해해야 드라이버, 임베디드, low-level runtime 문서를 제대로 읽을 수 있다.
