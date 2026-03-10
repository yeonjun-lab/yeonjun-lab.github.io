---
title: "extern과 static은 무엇이 다르고 왜 중요한가"
permalink: /foundations/languages/c/extern과 static은 무엇이 다르고 왜 중요한가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-10
updated_at: 2026-03-10
sort_date: 2026-03-10
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c
tags: [c, program-structure, extern, static, linkage, symbol, scope]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

C를 단일 파일 수준에서 배울 때는 `extern`과 `static`이 크게 중요해 보이지 않을 수 있다.  
하지만 프로그램이 여러 파일로 나뉘기 시작하면, 곧 다음 질문이 생긴다.

- 어떤 함수는 왜 다른 파일에서도 쓸 수 있는가?
- 어떤 함수는 왜 현재 파일 안에서만 쓰는 것이 더 좋은가?
- 전역 변수는 왜 아무 데나 막 두면 위험한가?
- 헤더에 선언만 두고 실제 정의는 왜 한 곳에만 둬야 하는가?
- 이름이 같아도 어떤 것은 충돌하고 어떤 것은 충돌하지 않는가?

이 질문들의 중심에는 **linkage**, 즉 이름이 프로그램 전체에서 어떻게 연결되는가의 문제가 있다.  
그리고 `extern`과 `static`은 바로 이 linkage를 제어하는 핵심 도구다.

입문 단계에서는 보통 이렇게 외운다.

- `extern`은 외부에 있는 것을 가져온다.
- `static`은 정적이다.

이 설명은 너무 거칠다.  
왜냐하면 C에서 `static`은 문맥에 따라 의미가 달라지고,  
`extern`도 단순히 “외부 것 사용” 수준이 아니라 선언과 정의, linkage와 강하게 연결되기 때문이다.

예를 들어 다음은 겉보기는 비슷하지만 의미가 다르다.

    int counter;

    extern int counter;

    static int counter;

또 함수도 마찬가지다.

    void helper(void);

    static void helper(void);

이 차이를 이해하지 못하면 다음 문제가 자주 생긴다.

- multiple definition
- undefined reference
- 전역 심볼 과다 노출
- 헤더에서 잘못된 변수 선언
- 파일 내부 전용 함수가 외부에 노출되는 문제
- 모듈 경계가 흐려지는 문제

즉, `extern`과 `static`은 단순 키워드가 아니라 **프로그램의 공개 범위와 연결 방식을 설계하는 도구**다.

이 문서는 `extern`과 `static`이 각각 무엇을 의미하는지, 선언과 정의에서 어떤 차이를 만드는지, 변수와 함수에서 어떻게 다르게 작동하는지, 그리고 실무에서 왜 매우 중요한지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

`extern`과 `static`을 이해하려면 먼저 큰 틀을 잡아야 한다.

### 2.1 핵심은 “이 이름이 어디까지 보이고 연결되는가”다

C에서 어떤 이름은 프로그램 전체에서 공유될 수 있고,  
어떤 이름은 현재 파일 안에서만 의미를 가지게 만들 수 있다.

즉, 중요한 것은 단순 scope만이 아니라 **linkage**다.

- 이 이름이 다른 번역 단위에서도 같은 대상을 가리키는가
- 아니면 현재 파일 안에서만 의미를 가지는가

이 점에서 `extern`과 `static`이 중요해진다.

### 2.2 `extern`은 외부 연결을 전제로 한 선언과 관련이 깊다

`extern`은 보통 “이 이름의 실제 정의는 다른 곳에 있을 수 있다”는 맥락과 연결된다.

예를 들어:

    extern int counter;

이 선언은 보통 현재 파일에서 저장 공간을 새로 만드는 것이 아니라,  
어딘가에 존재하는 `counter`를 참조하겠다는 의미로 사용된다.

즉, `extern`은 외부 linkage를 전제로 한 선언과 강하게 연결된다.

### 2.3 `static`은 외부 연결을 끊고 현재 파일 안에 가두는 역할을 할 수 있다

파일 수준에서 `static`을 붙이면, 그 이름은 보통 현재 번역 단위 내부에서만 의미를 가진다.

예를 들어:

    static int counter;
    static void helper(void);

이 경우 `counter`와 `helper`는 다른 파일에서 직접 접근할 수 없는 내부 전용 이름이 된다.

즉, `static`은 “숨김” 또는 “내부 한정”의 역할을 할 수 있다.

### 2.4 `static`은 지역 변수에서 또 다른 의미를 가진다

블록 안에서 `static`을 쓰면 의미가 달라진다.

예를 들어:

    void f(void) {
        static int count = 0;
        count++;
    }

여기서 `count`는 scope는 함수 블록 안이지만, lifetime은 함수 호출이 끝나도 유지된다.

즉, `static`은

- 파일 수준에서는 주로 내부 linkage
- 블록 수준에서는 정적 storage duration

과 연결된다.

따라서 문맥을 구분해서 이해해야 한다.

---

## 3. 내부 동작 원리

### 3.1 이름에는 scope, storage duration, linkage를 구분해서 봐야 한다

`extern`과 `static`을 제대로 이해하려면 세 가지를 분리해야 한다.

- **scope**: 이름이 코드 어디서 보이는가
- **storage duration**: 객체가 언제 생성되고 언제까지 존재하는가
- **linkage**: 같은 이름이 다른 번역 단위와 연결되는가

초보자는 이 셋을 자주 섞어 생각한다.  
하지만 `extern`과 `static`은 특히 linkage와 storage duration에 큰 영향을 준다.

### 3.2 파일 수준의 일반 전역 변수/함수는 보통 외부 linkage를 가진다

예를 들어 파일 수준에서 다음처럼 쓰면:

    int counter = 0;

    void helper(void) {
    }

이 이름들은 보통 다른 파일에서도 참조 가능한 외부 linkage를 가진다.  
즉, 프로그램 전체에서 연결 가능한 심볼이 된다.

그래서 다른 파일에서:

    extern int counter;
    void helper(void);

처럼 선언해 접근할 수 있다.

### 3.3 파일 수준의 `static`은 내부 linkage를 만든다

다음 코드를 보자.

    static int counter = 0;

    static void helper(void) {
    }

이 경우 `counter`와 `helper`는 현재 파일 내부에서만 연결 가능한 이름이 된다.  
즉, 다른 파일에서 같은 이름을 선언해도 이 대상과 연결되지 않는다.

이게 중요한 이유는 다음과 같다.

- 내부 구현을 외부에 노출하지 않을 수 있다.
- 이름 충돌을 줄일 수 있다.
- 모듈 경계를 명확히 만들 수 있다.

즉, 파일 수준 `static`은 “이건 이 파일 안에서만 써라”라는 의미를 가진다.

### 3.4 `extern` 선언은 보통 저장 공간을 새로 만들지 않는다

다음 선언을 보자.

    extern int counter;

이 문장은 보통 “여기서 `counter` 저장 공간을 새로 만들겠다”는 뜻이 아니다.  
대신 “어딘가에 이미 존재하는 `counter`를 여기서 참조하겠다”는 의미다.

즉, `extern`은 선언의 성격을 강하게 가지며, 실제 정의는 다른 곳에 있을 수 있다.

이 구조는 헤더 파일에 매우 자주 사용된다.

### 3.5 지역 `static` 변수는 scope와 lifetime이 분리되는 좋은 예다

다음 코드를 보자.

    void f(void) {
        static int count = 0;
        count++;
    }

여기서 `count`는 함수 블록 안에서만 접근 가능하다.  
즉, scope는 지역적이다.

하지만 `count`는 함수가 끝났다고 사라지지 않는다.  
다음 호출 때도 이전 값을 유지한다.

즉, 지역 `static` 변수는

- scope는 지역
- lifetime은 프로그램 전체 실행 동안 유지되는 정적 수명

이라는 특징을 가진다.

이건 일반 지역 변수와 매우 다르다.

### 3.6 함수 선언에서 `extern`은 보통 생략되어도 의미가 비슷할 수 있다

함수 선언에서는 `extern`을 명시하지 않아도 외부 linkage를 가지는 경우가 많다.

예를 들어:

    int add(int a, int b);

이 선언은 보통 외부 linkage 함수 선언처럼 동작한다.

즉, 함수 선언에서는 `extern`을 굳이 쓰지 않는 경우가 많다.  
하지만 변수에서는 `extern`의 의미를 더 의식적으로 봐야 한다.

---

## 4. 핵심 구성 요소

### 4.1 linkage

linkage는 같은 이름이 여러 번역 단위에서 같은 대상을 가리키는지를 결정하는 개념이다.

- external linkage
- internal linkage
- no linkage

`extern`과 파일 수준 `static`은 이 linkage를 제어하는 핵심 키워드다.

### 4.2 external linkage

외부 linkage는 다른 파일에서도 같은 이름으로 참조 가능하다는 뜻이다.  
전역 변수와 전역 함수는 보통 여기에 속할 수 있다.

즉, external linkage는 프로그램 전체 수준의 이름 연결을 허용한다.

### 4.3 internal linkage

내부 linkage는 현재 번역 단위 안에서만 같은 이름으로 의미를 가진다는 뜻이다.  
파일 수준 `static`이 대표적이다.

즉, internal linkage는 파일 내부 전용 심볼을 만드는 도구다.

### 4.4 `extern`

`extern`은 보통 외부 linkage 대상을 참조하는 선언에 사용된다.  
특히 전역 변수 선언에서 중요하다.

즉, `extern`은 “실제 정의는 다른 곳에 있지만 여기서 그 이름을 쓰겠다”와 연결된다.

### 4.5 `static`

`static`은 문맥에 따라 다르게 작동한다.

- 파일 수준 변수/함수 → internal linkage
- 블록 수준 변수 → static storage duration

즉, `static`은 하나의 단순 의미가 아니라 문맥을 봐야 하는 키워드다.

### 4.6 storage duration

storage duration은 객체가 언제 생성되고 언제까지 존재하는지를 말한다.

지역 `static` 변수는 일반 지역 변수와 달리 정적 수명을 가지므로,  
`static`을 이해할 때 linkage뿐 아니라 storage duration도 함께 봐야 한다.

---

## 5. 실행 흐름 또는 처리 순서

다음 구조를 기준으로 보자.

    // config.h
    extern int global_count;
    void increment(void);

    // config.c
    int global_count = 0;

    void increment(void) {
        global_count++;
    }

    // main.c
    #include "config.h"

    int main(void) {
        increment();
        return global_count;
    }

### 5.1 헤더에서 선언 제공

`config.h`는 다음을 다른 파일에 알려준다.

- `global_count`라는 외부 변수가 있다
- `increment`라는 함수가 있다

여기서 `extern int global_count;`는 저장 공간을 새로 만들지 않고  
기존 전역 정의를 참조하겠다는 선언 역할을 한다.

### 5.2 소스 파일에서 실제 정의 제공

`config.c`에서 다음이 실제 정의다.

    int global_count = 0;

이건 실제 저장 공간을 제공한다.

또한:

    void increment(void) {
        global_count++;
    }

이건 함수 정의다.

즉, 헤더는 declaration, 소스는 definition 역할을 한다.

### 5.3 다른 파일에서 선언을 보고 사용

`main.c`는 `config.h`를 포함함으로써 `global_count`와 `increment`의 형태를 안다.  
따라서 컴파일 단계에서 이 이름들을 사용할 수 있다.

### 5.4 링크 단계에서 실제 정의와 연결

링커는 `main.o`와 `config.o`를 보며 다음을 맞춘다.

- `main.o`가 참조한 `global_count`
- `config.o`가 정의한 `global_count`
- `main.o`가 참조한 `increment`
- `config.o`가 정의한 `increment`

즉, external linkage가 있기 때문에 이 연결이 가능하다.

### 5.5 `static`을 붙이면 외부 연결이 끊긴다

만약 `config.c`에서 다음처럼 바꾼다고 하자.

    static int global_count = 0;

이 경우 `global_count`는 `config.c` 내부 전용이 된다.  
그러면 다른 파일의 `extern int global_count;`와 연결되지 않는다.

즉, 파일 수준 `static`은 심볼 공개 범위를 끊는다.

---

## 6. 성능 / 최적화 관점

### 6.1 `static`은 단순히 숨김이 아니라 구조 최적화에도 도움을 준다

파일 내부 전용 함수와 변수를 `static`으로 제한하면,  
외부에 노출되는 심볼 수를 줄일 수 있다.

이건 단순한 미관 문제가 아니라 다음에 도움이 된다.

- 이름 충돌 감소
- 인터페이스 최소화
- 내부 구현 변경 자유도 증가
- 모듈 경계 명확화

즉, `static`은 구조적으로 좋은 최적화 도구다.

### 6.2 외부 전역 심볼 남발은 유지보수 비용을 키운다

모든 전역 변수와 helper 함수를 외부로 공개하면 처음에는 편해 보일 수 있다.  
하지만 프로젝트가 커질수록 다음 문제가 생긴다.

- 어디서든 접근 가능해져 추적 어려움
- 의도치 않은 결합 증가
- 이름 충돌 가능성 증가
- API 경계 붕괴

즉, external linkage는 꼭 필요한 것만 열어야 한다.

### 6.3 지역 `static` 변수는 성능보다 상태 유지 의미가 더 중요하다

지역 `static` 변수는 함수 호출 사이에 상태를 유지한다.  
이건 때때로 유용하지만, 동시에 숨은 상태를 만들어 코드 이해를 어렵게 할 수 있다.

즉, 지역 `static`은 편리함보다 상태 모델 측면에서 신중히 써야 한다.

### 6.4 내부 linkage는 컴파일 단위 최적화 이해로도 이어진다

현재 단계에서 깊게 다루지 않아도 되지만,  
심볼 가시성을 줄이면 나중에 링크 타임 최적화나 내부 분석 측면과도 이어질 수 있다.

즉, `static`은 단지 문법 차원이 아니라 빌드 구조와 최적화 모델에도 연결된다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 외부에 공개할 필요가 없는 함수는 `static`을 우선 검토한다

helper 함수가 다른 파일에서 쓰이지 않는다면 파일 수준 `static`으로 두는 것이 좋다.

예를 들어:

    static int parse_value(const char *s) {
        return 0;
    }

이렇게 하면 내부 구현임이 더 명확해진다.

즉, 기본 태도는 “필요한 것만 공개”가 좋다.

### 7.2 전역 변수는 특히 더 조심해서 공개해야 한다

전역 변수는 강한 결합을 만든다.  
그래서 외부에서 직접 보이게 둘지, 아니면 파일 내부 `static`으로 숨길지 더 신중히 봐야 한다.

가능하면 전역 상태는 줄이고,  
필요하면 접근 함수로 감싸는 구조가 더 나을 수 있다.

### 7.3 헤더의 전역 변수 선언은 보통 `extern`이어야 한다

헤더에서 전역 변수를 공유하려면 보통 다음처럼 선언한다.

    extern int global_count;

그리고 실제 정의는 한 `.c` 파일에 둔다.

즉, 헤더는 declaration, 소스는 definition이라는 원칙을 지켜야 multiple definition 문제를 줄일 수 있다.

### 7.4 지역 `static` 변수는 “숨은 전역 상태”가 될 수 있음을 의식한다

다음 같은 코드는 편리할 수 있다.

    void f(void) {
        static int count = 0;
        count++;
    }

하지만 함수 호출 사이 상태가 남기 때문에 테스트, 재사용, 동시성 관점에서 주의가 필요하다.

즉, 지역 `static`은 지역 변수처럼 보여도 성격은 더 무겁다.

### 7.5 `extern`은 정의가 아니라 참조 선언이라는 감각이 중요하다

특히 변수에서 `extern`을 볼 때는 “여기서 새로 만드는가?”보다  
“이미 어딘가 있는 대상을 참조하는가?”를 먼저 떠올리는 것이 좋다.

즉, `extern`을 storage 생성 키워드처럼 생각하면 구조를 잘못 이해하기 쉽다.

---

## 8. 더 깊게 볼 포인트

### 8.1 symbol visibility

심볼이 외부에 얼마나 노출되는지, 라이브러리 설계에서 어떤 영향을 가지는지 더 깊게 볼 수 있다.

### 8.2 translation unit

`static`의 내부 linkage가 정확히 어느 범위까지 의미를 가지는지는 번역 단위 개념과 함께 보면 더 명확해진다.

### 8.3 전역 변수 설계

전역 변수의 노출, 초기화, 경쟁 상태, API 캡슐화와 연결되는 더 큰 설계 주제로 확장할 수 있다.

### 8.4 static inline

헤더 안 함수 설계와 함께 `static inline`이 왜 등장하는지도 이후 확장 주제로 좋다.

### 8.5 라이브러리 ABI와 공개 심볼 설계

어떤 심볼을 외부에 공개할지, 어떤 심볼을 숨길지의 문제는 라이브러리 설계와 ABI 안정성으로 이어진다.

---

## 정리

`extern`과 `static`은 단순 키워드가 아니다.  
이들은 **이름의 연결 범위와 객체의 수명 모델을 제어하는 핵심 도구**다.

핵심은 다음과 같다.

- `extern`은 보통 외부 linkage 대상을 참조하는 선언과 관련이 깊다.
- 파일 수준 `static`은 internal linkage를 만들어 현재 파일 내부로 이름을 제한한다.
- 블록 수준 `static` 변수는 scope는 지역이지만 lifetime은 정적이다.
- 전역 함수와 변수는 기본적으로 외부 linkage를 가질 수 있으므로 공개 범위를 의식해야 한다.
- 헤더의 전역 변수 선언은 보통 `extern`, 실제 정의는 한 `.c` 파일에 둔다.
- helper 함수와 내부 상태는 `static`으로 숨기는 것이 구조적으로 유리한 경우가 많다.

즉, `extern`과 `static`을 이해한다는 것은  
단순히 “키워드 뜻을 외운다”가 아니라  
**어떤 이름을 외부에 공개하고, 어떤 이름을 파일 내부에 가두며, 어떤 객체가 얼마나 오래 살아야 하는지 프로그램 구조 관점에서 설계할 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 C 코드를 단일 파일 예제에서 벗어나 실제 모듈 구조와 라이브러리 구조로 확장할 수 있다.