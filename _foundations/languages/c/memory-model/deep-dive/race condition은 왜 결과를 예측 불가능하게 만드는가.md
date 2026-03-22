---
title: race condition은 왜 결과를 예측 불가능하게 만드는가
permalink: /foundations/languages/c/memory-model/deep-dive/race-condition은-왜-결과를-예측-불가능하게-만드는가/
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
tags: [c, race-condition, concurrency, memory-model, synchronization, data-race, threading, atomic]
prev_url: /foundations/languages/c/memory-model/deep-dive/atomic-이전의-c-코드에서-동시성-문제를-어떻게-이해해야-하는가/
next_url: /foundations/languages/c/memory-model/deep-dive/reentrant와-thread-safe는-무엇이-다른가/
---

## 1. 왜 이 주제를 깊게 봐야 하는가

동시성 문서를 읽다 보면 `race condition`은 매우 자주 등장한다.  
그런데 실무에서는 이 용어가 지나치게 넓고 느슨하게 쓰인다.

- “멀티스레드라서 race가 있다”
- “결과가 가끔 틀리니 race 같다”
- “락을 안 잡았으니 race다”
- “순서가 바뀔 수 있으니 race다”

이 말들은 일부는 맞고 일부는 틀리다.  
문제는 `race condition`을 단순히 “동시에 접근하면 생기는 문제” 정도로 이해하면, 정확히 무엇이 깨졌는지 설명할 수 없게 된다는 점이다.

실무에서 진짜 위험한 것은 다음과 같은 오해다.

- race condition을 단지 성능 문제나 타이밍 문제로 축소한다.
- data race와 논리적 race condition을 구분하지 않는다.
- “희귀하게 재현된다”는 이유로 구조적 결함을 우연한 버그처럼 취급한다.
- lock을 추가하면 모두 해결된다고 생각한다.
- 특정 테스트에서 재현되지 않으면 안전하다고 착각한다.

이런 오해가 위험한 이유는, race condition의 본질이 “드물게 틀리는 버그”가 아니라 **정확성 계약이 깨졌다는 신호**이기 때문이다.  
즉, race condition은 결과가 가끔 다르게 나오는 현상 그 자체가 아니라, 여러 실행 흐름 사이의 순서 관계와 공유 상태 접근 규율이 불완전하다는 구조적 문제다.

이 주제를 깊게 봐야 하는 이유는 세 가지다.

첫째, race condition은 동시성 문제의 핵심 표현이지만, 그 내부에는 서로 다른 층위의 문제가 섞여 있다.  
어떤 경우는 언어 수준의 data race이고, 어떤 경우는 synchronization은 되어 있지만 논리적 프로토콜이 틀린 것이다. 둘은 같은 말이 아니다.

둘째, race condition은 “결과가 랜덤하다”는 뜻이 아니다.  
그것은 프로그램이 기대하는 단일한 관찰 질서를 만들지 못해, 허용되지 말아야 할 여러 실행 순서가 열려 있다는 뜻에 가깝다.

셋째, 레거시 C 코드나 저수준 시스템 코드에서는 race condition이 “몇 년 동안 잠복했다가 환경이 바뀌면 터지는 문제”로 자주 나타난다.  
CPU가 바뀌거나, 컴파일러가 바뀌거나, 최적화 레벨이 바뀌거나, 부하가 증가하거나, 코어 수가 늘어나는 순간 갑자기 드러난다. 이 때문에 race condition은 단순 버그가 아니라 **보장 범위를 잘못 이해한 결과**로 봐야 한다.

이 문서의 목표는 `race condition`을 느슨한 경고 문구로 설명하는 데 있지 않다.  
핵심은 다음을 분리해서 정리하는 것이다.

- race condition과 data race는 무엇이 같은가, 무엇이 다른가
- 어떤 순서 문제는 언어 규칙 위반이고, 어떤 문제는 상위 프로토콜 결함인가
- 왜 결과가 “예측 불가능해 보이는가”
- 왜 테스트 통과와 correctness는 다른가
- 실무에서는 어떤 기준으로 race를 식별하고 차단해야 하는가

즉, 이 문서는 race condition을 “타이밍이 안 좋아서 생기는 문제”로 설명하지 않는다.  
그 대신 race condition을 **공유 상태에 대한 관찰 질서가 충분히 설계되지 않았을 때 나타나는 구조적 붕괴**로 설명한다.

---

## 2. 전체 구조

race condition을 정확히 이해하려면 먼저 문제를 다섯 층위로 나눠야 한다.

### 2.1 언어 규칙 층위

C에서 동시성 문제를 볼 때 가장 먼저 구분해야 하는 것은, 지금 문제 삼는 현상이 **언어 수준에서 이미 허용되지 않는 접근인가** 아니면 **언어 수준에서는 표현 가능하지만 상위 프로토콜이 틀린 것인가**다.

즉, race condition을 말할 때는 다음을 분리해야 한다.

- 언어 수준의 data race
- synchronization은 존재하지만 논리적으로 잘못된 경쟁
- 순서 제약이 불충분한 publication/consumption 문제
- higher-level invariant 붕괴

### 2.2 컴파일러 층위

컴파일러는 단일 스레드 의미론과 허용된 동기화 규칙을 기준으로 최적화한다.  
공유 상태에 대한 올바른 synchronization이 없으면, 사람이 기대하는 실행 순서를 코드가 보존해 줄 이유가 약해진다.

즉, 어떤 race는 단순히 CPU가 빨라서 생기는 것이 아니라, 애초에 컴파일러가 그 순서를 보존해야 할 계약이 없어서 생긴다.

### 2.3 CPU / 메모리 시스템 층위

다른 코어는 메모리 접근을 같은 순서로 관찰하지 않을 수 있다.  
store buffer, cache coherence timing, memory ordering model은 “내가 먼저 썼으니 상대도 먼저 볼 것”이라는 직관을 자주 깨뜨린다.

즉, race condition은 사람의 소스 순서 직관과 하드웨어 관찰 순서가 어긋나는 지점에서 더 쉽게 드러난다.

### 2.4 운영체제 / synchronization 층위

mutex, condition variable, semaphore, futex, thread join 같은 도구는 단순히 “겹치지 않게 만드는 것”만이 아니라, 공유 상태를 누가 언제 어떤 순서로 관찰할 수 있는지를 제한하는 장치다.

따라서 race condition은 흔히 “락이 없다”가 아니라 “필요한 관찰 질서를 만드는 synchronization contract가 없다”로 이해해야 한다.

### 2.5 실무 관례 층위

실무에서는 race condition이라는 말을 다음처럼 섞어 쓴다.

- data race
- check-then-act race
- TOCTOU(time-of-check to time-of-use)
- initialization race
- lost update
- double free race
- lifecycle race

이들을 한 단어로 묶으면 편하지만, 해결 방법은 다르다.  
따라서 먼저 종류를 나눠야 한다.

---

## 3. 내부 동작 원리

### 3.1 race condition의 본질은 “여러 실행 순서 중 일부가 잘못된 결과를 허용한다”는 데 있다

단일 스레드에서는 보통 실행 순서를 한 줄로 상상한다.

- A 실행
- B 실행
- C 실행

하지만 동시성에서는 둘 이상의 실행 흐름이 서로 얽히며 interleaving된다.  
이때 프로그램이 올바르려면, 허용 가능한 interleaving이 여러 개여도 모두 동일한 correctness contract를 만족해야 한다.

race condition은 바로 여기서 생긴다.

- 어떤 interleaving에서는 맞는다.
- 어떤 interleaving에서는 틀린다.
- 그런데 프로그램이 그 차이를 통제하지 못한다.

즉, race condition의 핵심은 “동시에 실행된다”가 아니라 **프로그램이 받아들일 수 없는 interleaving이 열려 있다**는 데 있다.

### 3.2 왜 결과가 예측 불가능해 보이는가

사람이 race condition을 “랜덤”하다고 느끼는 이유는, 입력값이 아니라 **스케줄링과 관찰 순서**가 결과를 바꾸기 때문이다.

예를 들어 다음을 보자.

    int counter = 0;

    void worker(void) {
        counter++;
    }

두 스레드가 동시에 `worker()`를 호출하면, 사람은 종종 `counter == 2`를 기대한다.  
하지만 실제로는 다음 interleaving이 가능하다.

- 스레드 A: counter 읽기 -> 0
- 스레드 B: counter 읽기 -> 0
- 스레드 A: 1 저장
- 스레드 B: 1 저장

결과는 1이 된다.

이 결과가 “랜덤”처럼 보이는 이유는, 입력은 같아도 interleaving이 다를 수 있기 때문이다.  
하지만 이것은 진짜 의미의 무작위가 아니라, 프로그램이 허용하면 안 되는 순서를 열어 둔 결과다.

즉, 예측 불가능성은 자연현상처럼 주어진 것이 아니라, **공유 상태 접근 규율이 불완전해서 생긴다**.

### 3.3 data race와 race condition은 같은 말이 아니다

이 구분은 매우 중요하다.

#### 1) data race

공유 메모리에 대해 적절한 synchronization 없이 경쟁적인 접근이 일어나는 문제를 가리킨다.  
특히 적어도 하나가 write이면 심각하다.

예:

    int x = 0;

    void t1(void) { x = 1; }
    void t2(void) { x = 2; }

이런 코드는 언어 수준에서도 매우 위험하게 다뤄야 한다.  
즉, 접근 자체가 잘못된 경계 안에 있다.

#### 2) 논리적 race condition

동기화 primitive는 사용했지만, 상위 프로토콜이 틀려서 잘못된 결과가 나오는 경우다.

예:

    if (!initialized) {
        lock();
        if (!initialized) {
            init();
            initialized = 1;
        }
        unlock();
    }

겉보기에는 락이 있다.  
하지만 바깥쪽 검사와 안쪽 publication 방식이 충분한 질서를 만들지 못하면, 여전히 race condition이 된다.

즉, data race는 race condition의 하위 범주처럼 볼 수 있지만, 모든 race condition이 단순 data race는 아니다.

### 3.4 check-then-act가 왜 자주 깨지는가

다음 패턴은 매우 흔하다.

    if (resource_is_free()) {
        use_resource();
    }

단일 스레드에서는 문제 없어 보인다.  
하지만 두 스레드가 동시에 실행하면 다음 일이 가능하다.

- 스레드 A: free 확인
- 스레드 B: free 확인
- 스레드 A: 사용 시작
- 스레드 B: 사용 시작

즉, “확인 시점”과 “행동 시점” 사이에 다른 실행 흐름이 상태를 바꿀 수 있다.  
이것이 check-then-act race다.

왜 이 직관이 틀리는가?

- 사람은 검사와 행동을 하나의 논리 단위로 생각한다.
- 하지만 코드가 그것을 하나의 동기화 단위로 만들지 않으면, 다른 흐름이 중간에 끼어들 수 있다.
- 즉, 논리적 원자성과 실제 실행 원자성은 다르다.

### 3.5 TOCTOU는 race condition의 시스템 인터페이스 버전이다

파일 시스템이나 권한 검사에서 자주 나타나는 패턴이 있다.

- 먼저 상태를 검사한다.
- 그다음 그 상태를 전제로 행동한다.

예를 들면:

- 파일이 존재하는지 확인
- 접근 권한이 있는지 확인
- 이후 파일 열기 또는 수정

문제는 검사 이후 행동 전까지 외부 세계가 바뀔 수 있다는 점이다.  
즉, TOCTOU는 check-then-act race가 운영체제 경계를 넘어간 형태다.

따라서 race condition은 메모리 공유만의 문제가 아니다.  
관찰과 사용 사이에 상태가 바뀔 수 있는 모든 인터페이스에서 생긴다.

### 3.6 lifecycle race는 값보다 “존재 여부”를 깨뜨린다

다음과 같은 코드도 자주 문제다.

    if (obj != NULL) {
        use(obj);
    }

다른 스레드가 동시에 `obj`를 해제하거나 교체하면, 검사 순간에는 유효했지만 사용 순간에는 더 이상 유효하지 않을 수 있다.

이 경우 race condition은 단순 값 불일치가 아니라 **객체 생애주기(lifetime) 계약 붕괴**로 이어진다.  
이 지점부터는 use-after-free, double free, dangling pointer와 연결된다.

즉, race condition은 단순 계산 오류를 넘어서 메모리 안전성 자체를 깨뜨릴 수 있다.

---

## 4. 핵심 구성 요소

### 4.1 공유 상태(shared state)

race condition의 출발점은 항상 공유 상태다.  
중요한 것은 값의 크기가 아니라, 둘 이상의 실행 흐름이 같은 논리적 상태를 함께 읽고 쓰는가다.

공유 상태의 예:

- 카운터
- 플래그
- 큐 헤드/테일
- 객체 포인터
- 참조 카운트
- 캐시 엔트리 상태
- 파일 디스크립터 테이블 항목
- 초기화 여부

### 4.2 관찰 질서(observation order)

동시성 문제는 단순히 쓰기 충돌만이 아니라, 누가 무엇을 언제 봤는지의 문제다.  
같은 값이라도 관찰 순서가 다르면 프로그램 의미가 달라질 수 있다.

예를 들어 어떤 스레드는 `ready == 1`을 먼저 보고 `payload`는 아직 이전 값을 볼 수 있다.  
이때 문제의 핵심은 값 자체보다 **공개 순서(publication order)**가 설계되지 않았다는 데 있다.

### 4.3 synchronization contract

mutex, atomic, condition variable, semaphore 같은 도구는 공유 상태 접근을 겹치지 않게 만들기만 하는 것이 아니다.  
더 중요한 역할은 다음이다.

- 어떤 실행 순서를 허용하는가
- 어떤 interleaving을 금지하는가
- 어떤 관찰 결과를 허용하는가
- 어떤 invariant를 보존하는가

즉, synchronization contract는 단순 상호배제가 아니라 **프로그램이 허용하는 관찰 세계를 제한하는 규칙**이다.

### 4.4 invariant

실무에서는 race condition을 값 하나의 충돌이 아니라 invariant 붕괴로 보는 것이 더 정확하다.

예:

- 큐의 head와 tail은 항상 유효 범위 안에 있어야 한다.
- 참조 카운트가 0이면 더 이상 접근하면 안 된다.
- initialized == 1이면 payload 전체가 완성되어 있어야 한다.
- free list에 있는 노드는 동시에 in-use 상태일 수 없다.

즉, race condition은 종종 “x 값이 달라졌다”보다 “프로그램이 전제로 삼은 불변식이 깨졌다”로 드러난다.

### 4.5 lifecycle

객체가 언제 생성되고, 공유되고, 해제되는가는 race condition에서 매우 중요하다.  
많은 실무 버그는 값 경쟁보다 lifecycle 경쟁에서 터진다.

- 해제 직후 다른 스레드가 접근
- 닫힌 파일 디스크립터 재사용
- partially initialized object 공개
- shutdown 중 콜백이 늦게 도착

따라서 race condition은 값의 동시성뿐 아니라 **존재의 동시성**도 다뤄야 한다.

---

## 5. 실행 흐름 또는 처리 순서

### 5.1 lost update

잘못된 구조:

    int counter = 0;

    void worker(void) {
        counter++;
    }

이 코드는 결과가 1, 2 중 무엇이 될지 실행 순서에 따라 달라진다.  
문제는 “운이 나쁘면 틀린다”가 아니라, 프로그램이 update 단위를 atomic하게 만들지 않았다는 점이다.

### 5.2 check-then-act

잘못된 구조:

    if (!busy) {
        busy = 1;
        use_resource();
    }

두 스레드가 동시에 `!busy`를 참으로 보면 둘 다 자원을 사용할 수 있다.  
사람은 이 코드를 “확인 후 선점”으로 읽지만, 실제로는 확인과 설정이 분리되어 있다.

### 5.3 publication race

잘못된 구조:

    struct item global_item;
    int ready = 0;

    void producer(void) {
        global_item.a = 10;
        global_item.b = 20;
        ready = 1;
    }

    void consumer(void) {
        while (!ready) {
        }
        use(global_item.a, global_item.b);
    }

겉으로는 `ready`가 신호처럼 보인다.  
하지만 `global_item`의 완성 상태가 `ready`와 어떤 질서로 연결되는지 명시되어 있지 않으면, consumer는 partially observed state를 볼 수 있다.

### 5.4 lifecycle race

잘못된 구조:

    if (obj != NULL) {
        use(obj);
    }

다른 스레드가 `obj`를 해제한 뒤 NULL로 바꾸거나 다른 객체로 교체하면,  
검사와 사용 사이가 끊어져 use-after-free 또는 stale reference가 생길 수 있다.

### 5.5 락이 있지만 여전히 틀린 경우

잘못된 구조:

    lock();
    if (queue_not_empty()) {
        unlock();
        item = pop_queue();
        process(item);
    } else {
        unlock();
    }

겉보기에는 락이 있다.  
하지만 “검사”와 “pop”이 같은 critical section 안에 있지 않다.  
즉, 락 사용 여부가 아니라 **어떤 논리 단위를 하나의 질서로 묶었는가**가 중요하다.

---

## 6. 성능 / 최적화 관점

### 6.1 race condition은 종종 “성능 최적화”에서 시작된다

실무에서 race condition은 자주 다음 이유로 도입된다.

- 락 비용을 줄이고 싶다
- contention을 피하고 싶다
- fast path를 락 없이 만들고 싶다
- 읽기 정도는 그냥 해도 될 것 같다
- atomic 대신 plain load/store로 충분해 보인다

문제는 이런 최적화가 종종 “보장 비용”을 생략하는 방식으로 이루어진다는 점이다.  
즉, 빨라진 것이 아니라 correctness를 담보하던 비용을 제거한 경우가 많다.

### 6.2 왜 테스트에서는 잘 돌고 운영에서 깨지는가

race condition은 다음 환경 변화에서 자주 드러난다.

- 코어 수 증가
- CPU 아키텍처 변경
- 최적화 레벨 변경
- 부하 증가
- sleep/yield/logging 제거
- 타이밍 변화
- 더 긴 실행 시간

이 때문에 race condition은 “재현이 어렵다”는 특징을 가진다.  
하지만 이건 bug가 약하다는 뜻이 아니라, interleaving 공간이 너무 넓다는 뜻이다.

### 6.3 logging이 버그를 숨길 수 있다

매우 흔한 현상이다.

- 로그를 넣으면 버그가 사라진다.
- 디버거로 돌리면 정상이 된다.
- `printf`를 넣으면 덜 재현된다.

왜 이런가?

- 타이밍이 바뀐다.
- 스케줄링이 달라진다.
- 함수 호출과 I/O가 비의도적 경계를 만든다.
- 경쟁 창(window)이 줄어든다.

즉, race condition은 관찰 행위 자체가 실행 순서를 바꿔 버릴 수 있다.  
이것이 디버깅을 특히 어렵게 만든다.

### 6.4 락을 무조건 줄이는 것이 답은 아니다

많은 race condition은 “락을 덜 쓰면 더 좋다”는 성급한 직관에서 나온다.  
하지만 실제 병목은 종종 다음에 있다.

- 잘못된 자료구조 선택
- 너무 넓은 critical section
- 불필요한 shared state
- false sharing
- poor locality
- wake-up storm
- contention hot spot

즉, 먼저 correctness contract를 세우고, 그다음 contention과 병목을 줄여야 한다.  
그 반대로 가면 race condition을 성능 최적화로 위장하게 된다.

---

## 7. 어디서부터 보장 범위와 구현 경계가 갈리는가

이 섹션이 핵심이다.  
race condition을 둘러싼 많은 오해는, 서로 다른 종류의 경쟁을 한 단어로 묶으면서 생긴다.

### 7.1 data race와 상위 논리 race가 갈리는 지점

다음은 구분해야 한다.

- synchronization 없이 같은 메모리를 경쟁적으로 접근하는가  
  data race 후보
- synchronization은 있지만 논리 단위가 잘못 쪼개져 있는가  
  higher-level race condition 후보

전자는 언어 수준에서도 매우 위험한 경계다.  
후자는 언어 규칙만으로는 설명이 끝나지 않고, 프로토콜 설계 문제로 올라간다.

### 7.2 “동시에 접근함”과 “잘못된 interleaving이 허용됨”이 갈리는 지점

동시성 자체가 곧 race condition은 아니다.  
공유 상태가 있더라도 synchronization이 올바르면 여러 interleaving 모두 안전할 수 있다.

즉, race condition은 단순 병행 실행이 아니라 **통제되지 않은 잘못된 interleaving의 존재**다.

### 7.3 lock 사용 여부와 lock 설계 correctness가 갈리는 지점

락이 있다고 해서 race condition이 사라지는 것은 아니다.  
중요한 것은 다음이다.

- 같은 invariant를 지키는 모든 접근이 같은 락 규율 아래 있는가
- check와 act가 같은 critical section에 있는가
- publication과 consumption이 같은 질서 위에 있는가
- object lifetime을 락이 실제로 보호하는가

즉, “락을 썼다”와 “락이 필요한 질서를 만들었다”는 다르다.

### 7.4 compiler / CPU / OS가 만드는 착시가 갈리는 지점

어떤 race condition은 다음 이유로 오랫동안 숨어 있을 수 있다.

- compiler가 우연히 보수적이다
- CPU ordering이 강하다
- 스레드 스케줄링이 단순하다
- 운영 환경에서 경쟁이 낮다

이것은 correctness가 아니라 환경 우연성이다.  
즉, 관찰된 정상 동작을 보장 문장으로 바꾸면 안 된다.

### 7.5 memory safety와 concurrency bug가 갈리는 지점

초기에는 단순 값 오류처럼 보이던 race condition이 결국 use-after-free, double close, stale pointer, corrupted structure로 이어질 수 있다.

즉, race condition은 “논리 버그”로만 끝나지 않는다.  
lifecycle와 결합하면 메모리 안전성 문제로 상승한다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 race condition을 의심해야 하는 신호

다음 현상이 보이면 race condition 가능성을 먼저 봐야 한다.

- 같은 입력에서 결과가 가끔 달라진다
- 부하가 높을 때만 깨진다
- 로그를 넣으면 덜 터진다
- 릴리즈 빌드에서만 재현된다
- 코어 수가 늘면 깨진다
- shutdown 시점에만 드물게 크래시 난다
- “가끔 NULL인데 원인을 모르겠다” 같은 증상이 있다

### 8.2 리뷰할 때 봐야 할 것

코드 리뷰에서는 단순히 “락이 있는가”만 보면 부족하다.  
다음을 확인해야 한다.

- 공유 상태가 무엇인지 이름 붙일 수 있는가
- 어떤 invariant를 지켜야 하는가
- 그 invariant를 깨뜨릴 수 있는 interleaving은 무엇인가
- check와 act가 같은 동기화 단위에 있는가
- object lifetime은 누가 보호하는가
- publication과 consumption 사이의 ordering은 명시되어 있는가
- plain load/store가 정말 허용 가능한가

### 8.3 해결책은 race 종류에 따라 달라진다

race condition을 한 단어로 부르면 해결도 흐려진다.

- lost update  
  atomic increment 또는 lock
- check-then-act  
  검사와 행동을 같은 critical section으로 묶기
- publication race  
  release/acquire 또는 명시적 synchronization
- lifecycle race  
  ownership model, refcount discipline, hazard management
- TOCTOU  
  check/use 분리 제거, kernel-supported atomic operation 사용

즉, 해결책은 “락을 넣자” 하나로 끝나지 않는다.  
무엇이 경쟁하고 있는지 먼저 분해해야 한다.

### 8.4 invariant 중심으로 설계해야 한다

실무적으로 가장 강한 기준은 변수 단위가 아니라 invariant 단위로 설계하는 것이다.

예를 들어:

- `ready` 하나만 보호하는 것이 아니라, `ready == 1이면 payload 전체가 유효`라는 invariant를 보호해야 한다.
- `refcount`만 올바른 것이 아니라, `refcount > 0인 동안 객체가 해제되지 않음`을 보장해야 한다.
- `queue size`만 맞는 것이 아니라, `head/tail/buffer content`가 함께 일관되어야 한다.

즉, race condition은 변수 충돌이 아니라 invariant 붕괴로 봐야 잡힌다.

---

## 9. 판단 체크리스트

다음 질문에 명확히 답하지 못하면, 그 코드는 race condition에 취약할 가능성이 높다.

- 이 코드의 공유 상태는 정확히 무엇인가
- 어떤 invariant가 유지되어야 하는가
- 허용 가능한 interleaving과 허용 불가능한 interleaving을 구분할 수 있는가
- 같은 invariant를 건드리는 모든 접근이 같은 synchronization contract 아래 있는가
- check와 act, publish와 consume, retain과 release가 같은 질서 안에 있는가
- plain load/store를 사용한 이유가 명시적인가
- `volatile`로 동기화를 대신하고 있지 않은가
- 락이 있다면 단순 존재가 아니라 필요한 관찰 질서를 실제로 만들고 있는가
- object lifetime을 누가 보호하는가
- 재현이 어려운 이유를 “운이 나쁘다”가 아니라 interleaving 공간으로 설명할 수 있는가

## 정리

race condition은 단순히 “동시에 접근해서 결과가 가끔 달라지는 문제”가 아니다.  
더 정확히 말하면, race condition은 **공유 상태에 대해 허용되면 안 되는 실행 순서와 관찰 결과가 열려 있는 상태**다.

반드시 구분해야 할 점은 다음이다.

- 모든 race condition이 단순 data race는 아니다.
- lock이 있다고 해서 race condition이 자동으로 사라지지 않는다.
- check-then-act, publication, lifecycle, TOCTOU는 각각 다른 종류의 경쟁이다.
- 결과의 예측 불가능성은 무작위성이 아니라 synchronization contract의 부재에서 나온다.
- 테스트 통과는 correctness 보장이 아니다.
- race condition은 값 오류를 넘어서 메모리 안전성 문제로 상승할 수 있다.

즉, race condition의 핵심은 “타이밍이 안 좋았다”가 아니라,  
**프로그램이 어떤 interleaving을 허용하고 어떤 interleaving을 금지해야 하는지 충분히 설계하지 않았다는 점**에 있다.

---

## 10. 더 깊게 볼 포인트

### 10.1 reentrant와 thread-safe는 무엇이 다른가

다음 문서로 자연스럽다.  
race condition이 여러 실행 흐름의 관찰 질서 문제라면, reentrant와 thread-safe는 “어떤 종류의 동시 진입을 허용하는가”를 더 정교하게 나누는 주제다.

### 10.2 `volatile`과 `_Atomic`은 race condition에 각각 어디까지 관여하는가

`volatile`은 access preservation, `_Atomic`은 원자성과 ordering 계약을 다룬다.  
둘이 race condition을 같은 방식으로 해결하지 않는다는 점을 더 깊게 볼 필요가 있다.

### 10.3 lifecycle race는 왜 memory safety 문제로 이어지는가

concurrency bug가 메모리 안전성 버그로 어떻게 상승하는지 연결해서 보면, use-after-free와 double free를 더 정확히 해석할 수 있다.

### 10.4 TOCTOU는 왜 시스템 인터페이스에서 더 위험한가

파일, 권한, 경로, 파일 디스크립터, 프로세스 상태처럼 외부 세계가 개입하는 문제에서는 race condition이 메모리 공유보다 더 교묘하게 나타난다.

### 10.5 lock-free를 시도할 때 가장 먼저 질문해야 할 것은 무엇인가

락을 없애는 것이 곧 고급 설계가 아니다.  
어떤 invariant를 어떤 atomic protocol로 지킬 것인지 먼저 명확히 해야 한다.