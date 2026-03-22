---
title: reentrant와 thread-safe는 무엇이 다른가
permalink: /foundations/languages/c/memory-model/deep-dive/reentrant와-thread-safe는-무엇이-다른가/
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
tags: [c, reentrant, thread-safe, concurrency, signal, memory-model, synchronization, api-design]
prev_url: /foundations/languages/c/memory-model/deep-dive/race-condition은-왜-결과를-예측-불가능하게-만드는가/
next_url: /foundations/languages/c/system-interface/deep-dive/errno는-어떻게-이해해야-하는가/
---

## 1. 왜 이 주제를 깊게 봐야 하는가

`reentrant`와 `thread-safe`는 실무에서 자주 함께 등장한다.  
문제는 두 용어가 함께 등장하는 빈도에 비해, 둘의 경계는 매우 자주 흐려진다는 점이다.

실무에서는 흔히 다음과 같은 식으로 말한다.

- 멀티스레드에서 안전하면 reentrant한 것 아닌가
- 락을 쓰면 thread-safe니까 재진입도 안전한 것 아닌가
- static 변수를 안 쓰면 reentrant한 것 아닌가
- signal handler에서 호출하면 안 되는 함수는 thread-safe하지 않은 함수인가
- thread-local storage를 쓰면 reentrant 문제도 해결된 것 아닌가

이 직관들은 일부 상황에서는 맞아 보이지만, 그대로 믿으면 중요한 경계를 놓친다.  
특히 저수준 시스템 코드, signal handler, callback 기반 구조, 인터럽트성 진입, 라이브러리 설계, errno 처리, 포맷팅 함수, 파서, 메모리 할당기 주변에서는 이 차이가 실제 버그로 이어진다.

이 주제를 깊게 봐야 하는 이유는 세 가지다.

첫째, `reentrant`와 `thread-safe`는 같은 축의 개념이 아니다.  
둘 다 “동시에 다시 들어와도 안전한가”처럼 보이지만, 실제로는 다른 종류의 동시 진입을 상정한다. `thread-safe`는 여러 스레드가 동시에 호출하는 상황을, `reentrant`는 **호출 도중 같은 코드가 다시 중첩 진입하는 상황**을 더 직접적으로 다룬다.

둘째, 락은 `thread-safe`를 만들 수 있어도 `reentrant`를 자동으로 만들지 않는다.  
오히려 락 기반 구현은 signal handler나 callback 재진입 상황에서 deadlock, partial state exposure, invariant 붕괴를 만들 수 있다. 즉, 같은 보호 장치가 다른 종류의 동시 진입에는 오히려 위험해질 수 있다.

셋째, 실무에서는 “안전하다”는 표현이 너무 느슨하다.  
어떤 함수는 멀티스레드에서 안전하지만 signal handler에서 호출하면 안 되고, 어떤 함수는 재진입 가능하지만 외부 공유 상태 때문에 thread-safe하지 않고, 어떤 함수는 둘 다 아니지만 단일 스레드 규약 안에서는 문제가 없을 수 있다. 따라서 안전성은 반드시 맥락별로 분해해야 한다.

이 문서의 핵심 목표는 두 용어의 사전적 차이를 적는 데 있지 않다.  
핵심은 다음을 분리하는 데 있다.

- 어떤 종류의 동시 진입을 문제 삼는가
- 어떤 안전성은 synchronization contract에 기대고, 어떤 안전성은 함수 자체의 상태 구조에 달려 있는가
- 왜 `thread-safe`가 `reentrant`를 함의하지 않는가
- 왜 `reentrant`가 `thread-safe`를 함의하지 않는가
- signal, callback, TLS, errno, static buffer 같은 요소가 각각 어디에 걸리는가
- 실무에서 API를 어떻게 분류하고 설계해야 하는가

즉, 이 문서는 `reentrant`와 `thread-safe`를 비슷한 안전성 등급으로 설명하지 않는다.  
그 대신 둘을 **서로 다른 종류의 진입 위험을 다루는 별개의 계약**으로 설명한다.

---

## 2. 전체 구조

이 주제를 정확히 이해하려면 먼저 문제를 다섯 층위로 나눠야 한다.

### 2.1 호출 모델 층위

가장 먼저 봐야 할 것은 “같은 코드에 두 번째 진입이 어떻게 발생하는가”다.  
대표적인 경우는 다음과 같다.

- 두 개 이상의 스레드가 동시에 같은 함수를 호출
- 한 스레드가 함수 실행 중 signal handler로 끊기고, handler가 같은 함수를 다시 호출
- 함수 내부에서 등록된 callback이 실행되며 외부 API를 다시 호출
- 인터럽트/비동기 이벤트로 인해 중첩 진입 발생
- 재귀처럼 같은 호출 경로가 논리적으로 다시 들어옴

이들은 모두 “다시 들어간다”는 공통점은 있지만, 같은 문제는 아니다.

### 2.2 상태 보관 층위

함수의 안전성은 그 함수가 상태를 어디에 두는가와 직접 연결된다.

- 지역 변수만 쓰는가
- static 내부 상태를 가지는가
- 전역 상태를 건드리는가
- 호출자가 제공한 버퍼만 사용하는가
- thread-local state를 쓰는가
- 외부 공유 자원에 접근하는가

같은 함수라도 상태 보관 위치에 따라 `reentrant`, `thread-safe` 성질이 달라진다.

### 2.3 synchronization 층위

`thread-safe`는 자주 락, atomic, synchronization discipline과 연결된다.  
하지만 `reentrant`는 “락을 잘 썼는가”로만 설명되지 않는다. 오히려 락이 있으면 재진입에 취약해질 수 있다.

즉, synchronization은 두 개념을 똑같이 지탱하는 공통 바닥이 아니다.  
같은 장치가 한 문제에는 해결책이고 다른 문제에는 위험 요소가 될 수 있다.

### 2.4 운영체제 / signal 층위

signal handler, async interruption, callback reentry는 일반 멀티스레드와 다른 성질을 가진다.  
여기서는 “다른 스레드가 동시에 부른다”가 아니라 “현재 실행 중인 흐름이 중간에 끊긴 채 같은 코드를 다시 밟는다”는 점이 중요하다.

즉, `reentrant`는 종종 signal-safe 문제와 더 가까운 축에서 이해해야 한다.

### 2.5 실무 API 설계 층위

실무에서는 어떤 API가 다음 중 무엇인지 구분해야 한다.

- 단일 스레드 전용
- thread-safe이지만 reentrant하지 않음
- reentrant하지만 thread-safe하지 않음
- 둘 다 만족
- 둘 다 만족하지 않음
- 특별한 호출 규약 하에서만 안전

이 구분이 없으면 문서와 구현이 모두 모호해진다.

---

## 3. 내부 동작 원리

### 3.1 `thread-safe`는 “동시에 호출돼도 정해진 계약이 깨지지 않는가”를 본다

`thread-safe`의 핵심은 여러 스레드가 같은 함수나 같은 객체를 동시에 다뤄도, 정의된 synchronization contract 아래에서 correctness가 유지되는가다.

중요한 점은 `thread-safe`가 “아무 조건 없이 항상 안전하다”는 뜻이 아니라는 점이다.  
실제 의미는 대개 다음 중 하나다.

- 내부적으로 락을 써서 동시 호출을 serialize한다.
- 호출자가 외부 락 규약을 지키면 안전하다.
- atomic protocol로 공유 상태를 보호한다.
- immutable state만 읽으므로 경쟁이 문제되지 않는다.
- 객체 단위로 분리된 상태를 가져 독립 호출은 안전하다.

즉, `thread-safe`는 공유 상태와 synchronization contract의 문제다.

### 3.2 `reentrant`는 “실행 도중 같은 코드가 다시 들어와도 현재 실행이 깨지지 않는가”를 본다

`reentrant`의 핵심은 중첩 진입이다.  
특히 중요한 상황은 다음과 같다.

- 함수 실행 중 signal handler가 끼어들어 같은 함수를 호출
- callback이 같은 모듈 API를 다시 호출
- 외부 비동기 이벤트가 실행 중인 코드를 다시 밟음
- 내부 static 상태를 사용 중인데 두 번째 진입이 그 상태를 덮어씀

즉, `reentrant`는 단순 동시 실행이 아니라 **중간 상태를 가진 채 다시 들어왔을 때도 안전한가**를 묻는다.

이 차이는 매우 중요하다.  
`thread-safe`는 서로 다른 호출들이 겹쳐도 synchronization으로 질서를 만들면 된다.  
반면 `reentrant`는 한 호출이 아직 불완전한 중간 상태를 가진 채 멈춰 있는 동안 두 번째 호출이 같은 내부 자원을 건드리지 않아야 한다.

### 3.3 왜 둘은 같은 보장 수준이 아닌가

실무에서 가장 중요한 포인트 중 하나는 이것이다.  
`reentrant`와 `thread-safe`는 “강도 차이만 있는 같은 안전성”이 아니다.

많은 사람이 이렇게 생각한다.

- reentrant가 더 강한 개념 아닌가
- thread-safe면 재진입도 결국 안전하지 않을까
- 둘 다 결국 공유 상태만 없애면 되는 것 아닌가

하지만 실제로는 둘이 보는 위험 모델이 다르다.

- `thread-safe`는 여러 스레드 사이의 경쟁을 본다.
- `reentrant`는 호출 중단과 중첩 진입을 본다.
- `thread-safe`는 락으로 해결될 수 있다.
- `reentrant`는 락 때문에 오히려 깨질 수 있다.

즉, 둘은 같은 사다리 위의 상하 개념이 아니라, **서로 다른 실패 모드를 다루는 별도 축**이다.

### 3.4 `thread-safe`지만 `reentrant`하지 않은 함수

이 반례는 반드시 봐야 한다.

    static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
    static int global_counter = 0;

    int next_id(void) {
        int v;
        pthread_mutex_lock(&m);
        v = ++global_counter;
        pthread_mutex_unlock(&m);
        return v;
    }

이 함수는 여러 스레드가 동시에 호출해도 lock이 serialization을 제공하므로 `thread-safe`처럼 보일 수 있다.

하지만 이 함수가 signal handler나 callback 재진입으로 같은 스레드 컨텍스트 안에서 다시 호출되면 문제가 생길 수 있다.

- 첫 번째 호출이 lock을 잡은 상태
- signal handler가 끼어들어 `next_id()` 다시 호출
- 두 번째 호출이 같은 lock을 잡으려 함
- deadlock 또는 undefined behavior에 가까운 상태

여기서 중요한 점은 다음이다.

- lock/unlock은 단순 함수 호출이 아니라 synchronization contract의 일부다.
- 그 contract는 “여러 스레드 간 질서”를 만들 수는 있어도, “비동기 재진입”까지 자동으로 안전하게 만들지는 않는다.
- 즉, thread-safe를 만드는 장치가 reentrancy에는 오히려 취약점이 될 수 있다.

### 3.5 `reentrant`하지만 `thread-safe`하지 않은 함수

이 반례도 중요하다.

    int sum_array(const int *arr, size_t n) {
        size_t i;
        int sum = 0;
        for (i = 0; i < n; ++i) {
            sum += arr[i];
        }
        return sum;
    }

이 함수는 내부 static 상태도 없고, 전역 쓰기도 없다.  
입력만 읽고 지역 변수만 사용한다면 재진입 자체는 문제가 없다. 같은 함수가 중첩 호출돼도 서로의 지역 상태를 덮어쓰지 않는다.

하지만 이것이 곧바로 thread-safe를 뜻하지는 않는다.  
왜냐하면 함수가 참조하는 `arr` 자체가 다른 스레드에 의해 동시에 수정되고 있다면, 함수 correctness는 깨질 수 있다.

즉, 함수 내부 구조만 보면 reentrant해 보이지만, 외부 공유 데이터 계약까지 포함하면 thread-safe하지 않을 수 있다.

여기서 중요한 점은 다음이다.

- reentrancy는 함수 내부 상태 구조에 더 직접적으로 연결된다.
- thread safety는 함수가 만지는 외부 공유 상태까지 포함한 더 넓은 호출 계약 문제다.
- 따라서 “지역 변수만 쓰므로 안전하다”는 문장은 reentrancy에는 도움이 되지만, thread safety 전체를 보장하는 문장은 아니다.

### 3.6 static 내부 버퍼는 왜 재진입을 깨뜨리는가

다음과 같은 함수는 고전적인 예다.

    char *to_hex(unsigned int v) {
        static char buf[16];
        snprintf(buf, sizeof(buf), "%x", v);
        return buf;
    }

이 함수는 여러 측면에서 문제다.

- 동시에 두 스레드가 호출하면 같은 `buf`를 덮어쓴다.
- 한 호출 도중 callback이나 signal handler가 다시 호출해도 `buf`를 덮어쓴다.
- 호출자가 반환 포인터를 오래 들고 있으면 다음 호출이 내용을 바꾼다.

즉, static 내부 버퍼는 thread safety와 reentrancy를 동시에 깨뜨리는 대표 사례다.  
중요한 것은 “static을 쓰지 마라”가 아니라, **호출 간 공유되는 내부 가변 상태가 있으면 두 종류의 동시 진입 모두 위험해진다**는 점이다.

### 3.7 TLS는 thread safety를 도울 수 있지만 reentrancy를 자동으로 해결하지는 않는다

다음과 같이 thread-local storage를 쓰면 스레드 간 충돌은 줄일 수 있다.

    static _Thread_local char buf[16];

    char *to_hex_tls(unsigned int v) {
        snprintf(buf, sizeof(buf), "%x", v);
        return buf;
    }

이 함수는 스레드마다 별도 `buf`를 가지므로, 서로 다른 스레드가 동시에 호출해도 충돌이 줄어든다.  
즉, thread safety 측면에서는 개선될 수 있다.

하지만 이 함수가 같은 스레드 안에서 재진입되면 여전히 같은 TLS 버퍼를 덮어쓴다.

- 첫 번째 호출이 `buf` 사용 중
- callback 또는 signal handler에서 같은 함수 재호출
- 같은 스레드의 같은 TLS 슬롯 사용
- 첫 번째 결과 오염

즉, TLS는 “스레드별 분리”를 제공할 뿐, “중첩 호출별 분리”를 제공하지 않는다.  
이 차이를 놓치면 thread safety 개선을 reentrancy 해결로 오해하게 된다.

### 3.8 errno는 왜 좋은 경계 사례인가

`errno`는 이 주제에서 매우 좋은 예다.  
오래된 직관으로 보면 `errno`는 전역 상태처럼 보이므로 thread-safe하지 않아 보일 수 있다. 하지만 실제 구현에서는 종종 thread-local로 제공된다. 그래서 서로 다른 스레드의 `errno`는 분리될 수 있다.

그렇다고 해서 모든 `errno` 관련 함수가 reentrant하다는 뜻은 아니다.  
어떤 함수는 내부 static 버퍼, 락, 전역 상태, malloc, locale 상태 등에 기대기 때문에 signal handler 재진입에는 여전히 안전하지 않을 수 있다.

즉, `errno`는 다음 사실을 보여 준다.

- 상태를 thread-local로 만들면 thread safety 경계는 개선될 수 있다.
- 하지만 reentrancy는 여전히 함수 내부 실행 구조와 비동기 재진입 가능성을 따로 봐야 한다.

---

## 4. 핵심 구성 요소

### 4.1 호출 중첩 모델

reentrancy를 판단하려면 먼저 함수가 어떤 방식으로 다시 호출될 수 있는지를 봐야 한다.

- 다른 스레드의 동시 호출
- signal handler 재진입
- callback 기반 재호출
- 재귀
- 인터럽트 유사 환경에서의 중첩 실행

중요한 것은 이들이 같은 “동시성”처럼 보여도 같은 보장 수준을 요구하지 않는다는 점이다.

### 4.2 내부 가변 상태

다음은 reentrancy를 깨뜨리는 전형적 요소다.

- static 지역 변수
- 전역 버퍼
- 내부 캐시
- 진행 중인 상태 머신 필드
- singleton 객체의 가변 멤버
- shared allocator state
- partially updated global context

내부 가변 상태는 중첩 진입 시 첫 번째 호출의 중간 상태를 두 번째 호출이 덮어쓸 수 있게 만든다.

### 4.3 외부 공유 상태

thread safety를 판단할 때는 함수 내부 상태만 보면 부족하다.

- 입력 포인터가 가리키는 메모리
- 전역 테이블
- 파일 디스크립터 집합
- 소켓 상태
- 공유 큐
- 객체 생애주기
- reference count

즉, 함수 본문이 지역 변수만 쓰더라도 외부 공유 상태를 만지면 thread safety 문제는 여전히 열려 있다.

### 4.4 synchronization primitive

락, atomic, semaphore, condition variable은 thread safety를 만들 수 있다.  
하지만 reentrancy에 대해서는 별도 판단이 필요하다.

특히 중요한 점은 다음이다.

- mutex는 단순 함수 호출이 아니라 synchronization contract의 일부다.
- 그 contract는 여러 스레드의 관찰 질서를 맞추는 데 유효할 수 있다.
- 그러나 signal handler 재진입이나 callback 재호출까지 안전하게 만든다고 일반화하면 안 된다.

즉, “락이 있다”는 사실은 reentrancy 판단의 출발점이지 결론이 아니다.

### 4.5 호출자 제공 버퍼

reentrancy와 thread safety를 동시에 높이는 대표 설계는 내부 static 버퍼를 없애고 호출자에게 버퍼를 받는 형태다.

    int to_hex_r(unsigned int v, char *buf, size_t size);

이 구조의 장점은 분명하다.

- 호출마다 별도 저장 공간을 가질 수 있다.
- static 내부 상태를 제거할 수 있다.
- 스레드 간 충돌 가능성을 줄인다.
- 중첩 진입 시에도 서로 다른 버퍼를 쓰게 설계할 수 있다.

즉, `_r` 스타일 API가 생겨난 배경은 단순 취향이 아니라 호출 상태 분리 요구다.

---

## 5. 실행 흐름 또는 처리 순서

### 5.1 thread-safe하지만 reentrant하지 않은 경우

    static pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
    static int shared_state = 0;

    int f(void) {
        int result;
        pthread_mutex_lock(&m);
        result = ++shared_state;
        pthread_mutex_unlock(&m);
        return result;
    }

이 함수는 여러 스레드가 동시에 호출해도 lock이 경쟁을 직렬화한다.  
하지만 함수 실행 중 signal handler가 `f()`를 다시 호출하면 lock 재진입 문제가 생길 수 있다.

핵심은 다음이다.

- 스레드 간 경쟁은 lock이 다룬다.
- 중간 실행 상태 위로 다시 들어오는 재진입은 별도 문제다.
- 같은 경계처럼 보였던 “함수 호출 + 락”은 같은 보장 수준이 아니다.

### 5.2 reentrant하지만 thread-safe하지 않은 경우

    int read_first(const int *p) {
        return *p;
    }

이 함수 자체는 내부 공유 상태가 없으므로 재진입되어도 함수 내부 상태가 깨지지 않는다.  
하지만 `p`가 가리키는 객체를 다른 스레드가 동시에 수정하고 있다면 호출 계약은 thread-safe하지 않다.

즉, 함수 몸체의 단순함과 외부 데이터 계약은 अलग로 봐야 한다.

### 5.3 둘 다 아닌 경우

    char *format_id(int id) {
        static char buf[32];
        snprintf(buf, sizeof(buf), "id=%d", id);
        return buf;
    }

이 함수는

- 여러 스레드가 동시에 호출하면 같은 버퍼를 덮어쓴다.
- 한 호출 도중 signal handler나 callback이 다시 호출해도 버퍼를 덮어쓴다.

즉, thread-safe하지도 않고 reentrant하지도 않다.

### 5.4 둘 다 만족하는 방향

    int format_id_r(int id, char *buf, size_t size) {
        return snprintf(buf, size, "id=%d", id);
    }

이 함수는 내부 static 상태를 갖지 않고 호출자가 버퍼를 제공하므로, 같은 함수가 동시에 호출되거나 중첩 호출되더라도 서로 다른 버퍼를 쓰게 설계할 수 있다.

물론 이것도 자동으로 모든 상황에서 thread-safe라는 뜻은 아니다.  
같은 버퍼를 두 스레드가 공유해서 넘기면 다시 문제가 생긴다.  
즉, 함수 설계는 안전성을 올릴 수 있지만, 호출 계약 전체를 대체하지는 못한다.

### 5.5 callback 재진입은 왜 교묘한가

다음 패턴을 보자.

    static int in_progress = 0;

    void process(void (*cb)(void)) {
        in_progress = 1;
        cb();
        in_progress = 0;
    }

callback `cb()`가 다시 `process()`를 호출하면, 첫 번째 호출이 `in_progress = 1`인 중간 상태에 있는 동안 두 번째 호출이 같은 상태를 다시 덮어쓴다.

이 경우는 멀티스레드가 아니어도 발생한다.  
즉, 재진입 문제는 반드시 “여러 스레드”가 있어야 생기는 것이 아니다.  
이 점이 `reentrant`와 `thread-safe`의 가장 중요한 분기점 중 하나다.

### 5.6 signal handler는 왜 더 엄격한가

signal handler는 현재 실행 중인 흐름을 임의 시점에 끊고 들어올 수 있다.  
즉, 함수가 내부 invariant를 절반만 업데이트한 순간에도 재진입이 가능하다.

그래서 signal-safe 문제는 thread safety보다 더 좁고 까다로운 제약을 갖는다.

- lock을 잡은 상태일 수 있다.
- malloc 내부 상태를 갱신 중일 수 있다.
- stdio 버퍼를 만지는 중일 수 있다.
- errno나 locale 등 런타임 상태를 일시적으로 사용 중일 수 있다.

즉, signal handler에서 호출 가능한 함수 집합이 제한되는 이유는 단순히 “스레드가 많아서”가 아니라, **중간 상태 노출 위에 재진입이 발생하기 때문**이다.

---

## 6. 성능 / 최적화 관점

### 6.1 내부 락은 thread safety를 만들지만 비용을 가진다

함수 내부에서 mutex를 잡으면 thread-safe를 만들기 쉽다.  
하지만 대가도 분명하다.

- contention 비용
- 커널 진입 가능성
- cache line bouncing
- convoy effect
- deadlock 위험
- signal/callback 재진입 취약성

즉, 내부 락은 강력한 도구지만, “thread-safe = 좋은 API”로 단순화하면 안 된다.  
특히 라이브러리 경계에서는 내부 락 때문에 호출자가 예상하지 못한 재진입 위험이 생길 수 있다.

### 6.2 reentrant 설계는 종종 상태 외부화를 요구한다

reentrant하게 만들려면 내부 static 상태를 줄이고 호출별 상태를 분리해야 한다.  
이 과정은 종종 다음을 요구한다.

- 호출자 버퍼 전달
- explicit context object 전달
- hidden global state 제거
- callback 중첩을 고려한 state machine 재설계

이것은 편의성을 줄일 수 있다.  
즉, `foo()` 대신 `foo_r(ctx, buf, size)` 같은 API가 늘어난다.

하지만 이 비용은 우연한 중첩 진입 버그를 제거하는 대가다.  
따라서 “간단한 API”와 “재진입 가능 API”는 자주 긴장 관계에 있다.

### 6.3 TLS는 타협점이지만 완전한 해법은 아니다

TLS를 쓰면 thread safety는 좋아질 수 있다.  
하지만 다음 문제가 남는다.

- 같은 스레드 안에서 재진입되면 여전히 충돌
- TLS 초기화/소멸 비용
- 라이브러리 경계에서 숨은 상태 유지
- 테스트와 문서에서 안전성 착시 유발

즉, TLS는 “전역 상태를 스레드별로 복제한 것”이지, 상태 자체를 제거한 것이 아니다.

### 6.4 안전성 종류를 섞으면 최적화도 잘못된다

실무에서 흔한 오류는 다음과 같다.

- static buffer를 TLS로 바꿨으니 reentrant 문제도 해결됐다고 생각
- 내부 락을 넣었으니 signal handler에서도 안전하다고 생각
- 지역 변수만 쓰니 멀티스레드에서도 자동으로 안전하다고 생각

이런 오해는 최적화 방향 자체를 잘못 잡게 만든다.  
따라서 먼저 어떤 안전성을 목표로 하는지 분명히 해야 한다.

---

## 7. 어디서부터 보장 범위와 구현 경계가 갈리는가

이 섹션이 핵심이다.  
`reentrant`와 `thread-safe`에 대한 오해는 주로 “경계처럼 보였던 것들”을 같은 보장 수준으로 취급할 때 생긴다.

### 7.1 여러 스레드의 동시 호출과 한 실행 흐름의 중첩 진입이 갈리는 지점

이 둘은 같은 “동시성”처럼 보이지만 같은 실패 모델이 아니다.

- 여러 스레드의 동시 호출  
  공유 상태 경쟁과 관찰 질서 문제
- 같은 실행 흐름이 중간 상태에서 다시 진입  
  partially updated state 노출과 중첩 사용 문제

즉, thread safety와 reentrancy는 같은 축의 강약 차이가 아니다.

### 7.2 lock/unlock과 reentrancy가 갈리는 지점

mutex는 synchronization contract의 일부일 수 있다.  
그 contract는 공유 상태의 관찰 질서를 만들 수 있다.  
하지만 그 사실을 곧바로 “재진입도 안전하다”로 일반화하면 안 된다.

왜냐하면:

- 첫 번째 호출이 lock을 잡은 상태에서 중첩 진입 가능
- 같은 lock을 다시 잡으며 deadlock 가능
- callback 또는 signal이 lock 안쪽 invariant를 깨진 상태로 관찰 가능
- reentrancy는 상호배제만으로 설명되지 않음

즉, lock/unlock은 단순 함수 호출이 아니라 synchronization contract의 일부이지만, **그 contract가 다루는 범위와 reentrancy가 요구하는 범위는 다를 수 있다**.

### 7.3 thread-local state와 call-local state가 갈리는 지점

이 경계는 자주 놓친다.

- thread-local state는 스레드별 분리를 제공한다.
- call-local state는 호출별 분리를 제공한다.

TLS는 전자를 주지만 후자를 주지 않는다.  
따라서 “TLS니까 안전하다”는 말은 thread safety 일부에는 맞을 수 있어도 reentrancy에는 틀릴 수 있다.

### 7.4 함수 본문과 호출 계약이 갈리는 지점

함수 본문이 지역 변수만 쓴다고 해서 thread-safe 결론을 내리면 안 된다.  
그 함수가 참조하는 입력 포인터, 외부 객체, 전역 자원, lifetime contract까지 봐야 한다.

즉:

- reentrancy는 함수 내부 상태 구조에 더 가깝고
- thread safety는 호출 계약 전체에 더 가깝다

이 경계를 놓치면 “순수 함수처럼 보이는 API”의 안전성을 과신하게 된다.

### 7.5 signal-safe와 thread-safe가 갈리는 지점

이 둘도 반드시 분리해야 한다.

- thread-safe: 여러 스레드 동시 호출에서의 correctness
- signal-safe: 비동기 interruption 상태에서의 제한된 호출 안전성

어떤 함수는 thread-safe일 수 있지만 signal-safe하지 않다.  
내부 락, malloc, stdio, locale 상태, 전역 런타임 상태 때문일 수 있다.

즉, signal-safe는 thread-safe의 상위 호칭이 아니다.  
별도의 더 좁고 가혹한 호출 환경 계약이다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 함수 문서를 쓸 때 “safe”라고만 쓰면 안 된다

실무 문서에서 가장 나쁜 표현 중 하나는 그냥 “이 함수는 안전하다”다.  
반드시 어떤 의미의 안전성인지 써야 한다.

- thread-safe
- reentrant
- async-signal-safe
- 호출자 외부 동기화 필요
- 객체 단위 thread-safe
- 인스턴스 분리 시 안전
- 같은 버퍼 재사용 시 비안전

즉, 안전성은 라벨 하나가 아니라 호출 맥락별 계약이다.

### 8.2 내부 static 상태가 보이면 먼저 경계하라

다음 요소가 보이면 reentrancy와 thread safety를 먼저 의심해야 한다.

- static buffer
- static cursor
- static parsing state
- singleton mutable cache
- hidden global error buffer
- 내부 전역 formatter state

물론 static이 있다고 무조건 틀린 것은 아니다.  
하지만 “숨겨진 호출 간 공유 상태”라는 점에서 두 종류의 동시 진입 모두에 경고 신호다.

### 8.3 `_r` 스타일 API가 왜 존재하는지 이해해야 한다

예: `strtok`와 `strtok_r` 같은 구분은 단순 네이밍 취향이 아니다.  
내부 상태를 함수 바깥으로 꺼내고 호출자가 상태를 관리하게 함으로써, 숨은 공유 상태를 없애려는 설계다.

즉, `_r` 패턴은 다음을 위한 것이다.

- 호출 간 상태 분리
- static 내부 상태 제거
- 재진입 가능성 향상
- 스레드 간 충돌 가능성 감소

### 8.4 콜백과 signal이 있다면 reentrancy를 먼저 보라

다음 환경에서는 thread safety만 봐서는 부족하다.

- signal handler가 개입할 수 있음
- 사용자 callback을 호출함
- 이벤트 루프에서 재호출 가능
- 라이브러리 내부에서 hook이 다시 API를 호출할 수 있음
- 인터럽트성 알림이 들어올 수 있음

이 경우 “여러 스레드가 동시에 부를 수 있는가”보다  
“실행 중간 상태 위로 다시 들어올 수 있는가”가 더 직접적인 질문이다.

### 8.5 라이브러리 API는 가능하면 상태 소유권을 명시적으로 드러내라

실무적으로 좋은 방향은 다음과 같다.

- hidden global state를 줄인다.
- context object를 호출자가 명시적으로 넘기게 한다.
- 출력 버퍼를 호출자가 제공하게 한다.
- object-level synchronization contract를 문서화한다.
- signal-safe가 아니면 명확히 금지한다.

즉, 안전성은 구현 디테일로 숨기는 것이 아니라 API 계약으로 드러내야 한다.

---

## 9. 판단 체크리스트

다음 질문에 답하지 못하면, 그 함수의 안전성은 아직 제대로 분류되지 않은 것이다.

- 이 함수는 여러 스레드가 동시에 호출해도 안전한가
- 그 안전성은 내부 락, atomic, immutable state, 외부 호출 규약 중 무엇에 기대는가
- 함수 실행 도중 signal handler나 callback으로 같은 함수가 다시 호출되면 어떤 일이 생기는가
- 내부 static 상태, 전역 상태, TLS, hidden cache가 있는가
- TLS를 쓰고 있다면 call-local이 아니라 thread-local일 뿐이라는 점을 인식하고 있는가
- 입력 포인터와 외부 객체 lifetime까지 포함하면 정말 thread-safe한가
- lock을 쓰고 있다면 deadlock 없는 재진입까지 고려했는가
- signal-safe와 thread-safe를 혼동하고 있지 않은가
- `_r` 또는 context-based API로 숨은 공유 상태를 없앨 수 있는가
- 문서에서 “safe”를 맥락 없이 쓰고 있지 않은가

## 정리

`reentrant`와 `thread-safe`는 비슷해 보이지만 같은 계약이 아니다.

반드시 구분해야 할 핵심은 다음이다.

- `thread-safe`는 여러 스레드의 동시 호출에서 correctness가 유지되는가를 본다.
- `reentrant`는 실행 중인 코드가 중첩 진입되어도 내부 상태가 깨지지 않는가를 본다.
- 락은 thread safety를 만들 수 있지만 reentrancy를 자동으로 만들지 않는다.
- TLS는 thread-local 분리를 주지만 call-local 분리를 주지 않는다.
- 함수 내부에 공유 가변 상태가 없더라도 외부 공유 데이터 때문에 thread-safe하지 않을 수 있다.
- signal-safe는 thread-safe와 또 다른 별도 계약이다.

즉, `thread-safe`와 `reentrant`는 같은 안전성의 강약 차이가 아니라,  
**서로 다른 종류의 동시 진입 위험을 다루는 별도 축**이다.

실무 판단 기준도 명확하다.

- 여러 스레드 경쟁이 문제인가  
  thread safety를 보라.
- 실행 중 중첩 진입이 문제인가  
  reentrancy를 보라.
- signal handler 개입이 가능한가  
  async-signal-safe 경계를 따로 보라.
- 숨은 공유 상태가 있는가  
  API 설계부터 다시 보라.

---

## 10. 더 깊게 볼 포인트

### 10.1 errno는 어떻게 이해해야 하는가

다음 문서로 자연스럽다.  
`errno`는 전역처럼 보이지만 thread-local 구현과 호출 규약이 얽혀 있는 대표 사례다. thread safety와 reentrancy, signal-safe 경계를 분리해서 보기 좋은 주제다.

### 10.2 async-signal-safe 함수 집합은 왜 그렇게 제한적인가

signal handler에서 안전한 함수가 왜 극도로 제한되는지 보면, reentrancy와 런타임 내부 상태 문제를 더 깊게 이해할 수 있다.

### 10.3 `_r` 계열 함수는 왜 생겼고 어디까지 해결하는가

hidden state 제거, caller-provided storage, API 계약 분리를 더 구체적으로 볼 수 있다.

### 10.4 callback 기반 설계에서 재진입을 어떻게 모델링해야 하는가

event loop, observer, hook, plugin 구조에서는 멀티스레드가 없어도 재진입 문제가 심각해질 수 있다.

### 10.5 object-level thread safety와 module-level reentrancy는 어떻게 다르게 문서화해야 하는가

대형 라이브러리나 런타임 API 설계에서는 함수 단위 안전성보다 더 세밀한 문서화가 필요하다.