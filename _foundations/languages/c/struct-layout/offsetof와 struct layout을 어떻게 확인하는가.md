---
title: "offsetof와 struct layout을 어떻게 확인하는가"
permalink: /foundations/languages/c/struct-layout/offsetof와 struct layout을 어떻게 확인하는가/
layout: doc
section: foundations
subcategory: languages
language: c
created_at: 2026-03-10
updated_at: 2026-03-10
sort_date: 2026-03-10
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-struct-layout
topic_slug: struct-layout
tags: [c, struct, offsetof, memory-layout, padding, alignment, debugging]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

앞 문서에서 struct padding과 alignment가 왜 중요한지 봤다면,  
다음에는 반드시 이런 질문이 생긴다.

- 실제로 이 구조체가 메모리에 어떻게 놓였는지 어떻게 확인하는가
- 필드 사이에 padding이 얼마나 들어갔는지 어떻게 아는가
- 내가 예상한 배치와 실제 배치가 같은지 어떻게 검증하는가
- 바이너리 포맷, 네트워크 패킷, FFI 연동 시 구조체 레이아웃을 어떻게 점검하는가
- `sizeof`만 보면 충분한가

여기서 중요한 도구가 바로 `offsetof`다.

초보자는 구조체 레이아웃을 머릿속으로만 계산하려는 경우가 많다.  
예를 들어 다음을 보고:

```c
typedef struct {
    char a;
    int b;
    char c;
} Example;
```

이렇게 추측한다.

- `a`는 0번 위치
- `b`는 1번 다음쯤
- `c`는 그 뒤
- 대충 6바이트쯤 아닐까

하지만 실제 배치는 alignment와 padding 규칙 때문에 달라질 수 있다.  
즉, 감으로 계산하는 것만으로는 부족하다.  
실제 구조체 레이아웃을 **도구와 코드로 확인하는 습관**이 필요하다.

`sizeof`는 구조체 전체 크기를 알려준다.  
하지만 그것만으로는 다음을 알 수 없다.

- 각 필드가 정확히 몇 바이트 오프셋에 있는가
- 중간 padding이 어디에 들어갔는가
- tail padding이 있는가
- 필드 순서를 바꾸면 어떤 차이가 나는가

이때 `offsetof`가 핵심이 된다.

즉, `offsetof`는 단순 매크로가 아니라  
**구조체의 실제 메모리 배치를 확인하고 추론을 검증하는 도구**다.

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- struct padding/alignment 이해를 실제 확인 방법으로 연결해 준다
- 바이너리 포맷과 FFI 연동에서 필수적인 검증 감각을 준다
- “예상한 배치”와 “실제 배치”를 구분하게 해 준다
- 디버깅과 성능 튜닝에서 구조체 설계를 점검하는 기준이 된다
- 이후 packed struct, ABI, serialization 주제로 자연스럽게 이어진다

이 문서는 `offsetof`가 무엇인지, 어떻게 쓰는지, `sizeof`와 어떤 차이가 있는지,  
구조체 레이아웃을 코드로 어떻게 확인하는지,  
그리고 실무에서 왜 중요한지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

`offsetof`와 struct layout 확인 문제를 큰 구조로 보면 다음과 같다.

### 2.1 `sizeof`는 전체 크기를 알려준다

예를 들어:

```c
sizeof(Example)
```

이 표현은 구조체 전체 크기를 알려준다.

즉, 구조체 하나가 메모리에서 몇 바이트를 차지하는지는 알 수 있다.  
하지만 각 필드 위치까지는 알 수 없다.

### 2.2 `offsetof`는 특정 필드의 시작 위치를 알려준다

예를 들어:

```c
offsetof(Example, b)
```

이 표현은 구조체 시작점으로부터 `b` 필드가 몇 바이트 떨어져 있는지를 알려준다.

즉, `offsetof`는 **필드 오프셋 확인 도구**다.

### 2.3 전체 크기와 각 필드 오프셋을 같이 봐야 layout이 보인다

구조체 레이아웃을 이해하려면 보통 다음을 함께 봐야 한다.

- `sizeof(struct)`
- 각 필드의 `offsetof`
- 필드 자체의 `sizeof`
- 필요한 경우 정렬 조건

즉, `sizeof`만으로는 부족하고,  
필드 단위 오프셋 정보가 있어야 중간 padding도 추정할 수 있다.

### 2.4 결국 목표는 “머릿속 추측”이 아니라 “실제 배치 검증”이다

C 구조체는 플랫폼, ABI, 컴파일러 규칙과 연결된다.  
따라서 구조체 레이아웃이 중요한 상황에서는 추측보다 검증이 중요하다.

즉, `offsetof`는 지식 확인용이 아니라 **배치 검증용 실전 도구**다.

---

## 3. 내부 동작 원리

### 3.1 구조체 시작점으로부터 각 필드 위치를 생각해야 한다

다음 구조체를 보자.

```c
typedef struct {
    char a;
    int b;
    char c;
} Example;
```

이 구조체를 이해할 때 핵심은 “필드가 선언 순서대로 존재한다”는 것과  
“각 필드 시작 위치가 alignment 규칙에 따라 조정될 수 있다”는 점이다.

즉, 단순히 필드 크기를 더하는 것이 아니라  
각 필드의 **시작 오프셋**을 보는 것이 중요하다.

### 3.2 `offsetof`는 특정 필드 시작 오프셋을 수치로 보여준다

예를 들어 다음을 출력할 수 있다.

```c
printf("%zu\n", offsetof(Example, a));
printf("%zu\n", offsetof(Example, b));
printf("%zu\n", offsetof(Example, c));
```

이 결과를 보면 각 필드가 실제로 구조체 시작점으로부터 어디에 놓였는지 알 수 있다.

즉, `offsetof`는 padding이 어디에 끼어들었는지를 간접적으로 드러낸다.

### 3.3 중간 padding은 인접 필드 오프셋 차이로 추정할 수 있다

예를 들어:

- `a`의 오프셋이 0
- `b`의 오프셋이 4
- `sizeof(a)`가 1

이라면, `a` 뒤에 3바이트 정도의 간격이 존재한다고 추정할 수 있다.

즉, `offsetof(next_field) - (offsetof(current_field) + sizeof(current_field))`

를 보면 중간 padding을 추정할 수 있다.

### 3.4 tail padding은 마지막 필드와 전체 크기 차이로 추정할 수 있다

마지막 필드까지 봤다면 구조체 전체 크기와 비교할 수 있다.

예를 들어 마지막 필드 `c`가 오프셋 8, 크기 1이라면  
실제 데이터는 9바이트까지 의미가 있다.  
그런데 `sizeof(Example)`가 12라면, 마지막에 3바이트 tail padding이 있을 수 있다.

즉, tail padding은 다음처럼 볼 수 있다.

- `sizeof(struct) - (offsetof(last_field) + sizeof(last_field))`

### 3.5 필드 순서를 바꾸면 `offsetof` 결과가 바뀐다

다음 두 구조체를 보자.

```c
typedef struct {
    char a;
    int b;
    char c;
} A;
```

```c
typedef struct {
    int b;
    char a;
    char c;
} B;
```

이 둘에 대해 `offsetof`를 비교하면 필드 시작 위치가 달라질 수 있다.  
즉, field order가 실제 layout을 바꾼다는 것을 눈으로 확인할 수 있다.

### 3.6 `offsetof`는 binary compatibility 확인의 핵심 도구가 될 수 있다

외부 시스템과 구조체를 맞춰야 하는 경우:

- 바이너리 파일 포맷
- 네트워크 패킷
- 다른 언어와의 FFI
- 하드웨어 레지스터 맵

이런 상황에서는 특정 필드가 정확히 어느 바이트 위치에 있는지 중요하다.

즉, `offsetof`는 단순 학습용이 아니라  
**실제 ABI/serialization 검증 도구**다.

---

## 4. 핵심 구성 요소

### 4.1 `sizeof`

객체 또는 타입 전체 크기를 알려준다.  
구조체 전체가 몇 바이트인지 확인하는 기본 도구다.

### 4.2 `offsetof`

구조체 시작점으로부터 특정 멤버가 시작하는 바이트 오프셋을 알려준다.  
필드 위치를 확인하는 핵심 도구다.

### 4.3 member offset

멤버 오프셋은 구조체 시작점 기준 각 필드의 위치다.  
padding과 alignment를 파악하는 기준이 된다.

### 4.4 layout inspection

레이아웃 점검은 `sizeof`, `offsetof`, 필드 크기, 정렬 요구를 종합해  
실제 메모리 배치를 파악하는 과정이다.

### 4.5 padding estimation

필드 사이와 끝에 들어간 padding을 오프셋 차이와 전체 크기로 추정하는 것이다.

### 4.6 ABI-sensitive structure

배치가 정확히 맞아야 하는 구조체다.  
이런 구조체는 `offsetof` 점검이 특히 중요하다.

---

## 5. 실행 흐름 또는 처리 순서

다음 구조체를 기준으로 보자.

```c
#include <stddef.h>
#include <stdio.h>
```

```c
typedef struct {
    char a;
    int b;
    char c;
} Example;
```

```c
int main(void) {
    printf("sizeof(Example) = %zu\n", sizeof(Example));
    printf("offsetof(a) = %zu\n", offsetof(Example, a));
    printf("offsetof(b) = %zu\n", offsetof(Example, b));
    printf("offsetof(c) = %zu\n", offsetof(Example, c));
    return 0;
}
```

### 5.1 전체 크기 확인

먼저 `sizeof(Example)`를 본다.  
이 값은 구조체 전체가 차지하는 크기다.

### 5.2 각 필드 오프셋 확인

그 다음 `offsetof`로 `a`, `b`, `c` 시작 위치를 본다.

예를 들어 결과가 다음처럼 나올 수 있다.

- `a` → 0
- `b` → 4
- `c` → 8

즉, 각 필드가 구조체 시작점에서 몇 바이트 떨어져 있는지 알 수 있다.

### 5.3 중간 padding 추정

이제 필드 크기와 비교한다.

- `a`는 크기 1인데 `b`는 오프셋 4
- 즉, `a` 뒤에 3바이트 간격이 있다

이건 `b` 정렬을 맞추기 위한 padding으로 해석할 수 있다.

### 5.4 tail padding 추정

마지막 필드 `c`의 오프셋과 크기를 본다.

- `c`가 오프셋 8
- `sizeof(c)`는 1
- 그런데 `sizeof(Example)`가 12라면

즉, 마지막에도 3바이트 tail padding이 있다고 볼 수 있다.

### 5.5 필드 순서 변경 후 비교

이제 구조체를 이렇게 바꿔 본다.

```c
typedef struct {
    int b;
    char a;
    char c;
} Example2;
```

이후 다시 `sizeof`와 `offsetof`를 비교한다.  
그러면 필드 순서가 실제 layout과 크기를 바꾼다는 사실을 확인할 수 있다.

---

## 6. 성능 / 최적화 관점

### 6.1 구조체 배열에서는 작은 layout 차이가 크게 누적된다

구조체 하나에서는 padding 몇 바이트가 작아 보여도,  
그 구조체를 수백만 개 담은 배열에서는 차이가 매우 커질 수 있다.

즉, `offsetof`를 통해 레이아웃을 확인하는 것은  
메모리 사용량과 캐시 효율을 점검하는 일과 연결된다.

### 6.2 필드 순서 재배치는 메모리 절약뿐 아니라 캐시 활용에도 영향을 줄 수 있다

구조체 크기가 줄어들면 같은 캐시 라인 안에 더 많은 객체가 들어갈 수 있다.  
즉, layout 개선은 캐시 효율 개선으로도 이어질 수 있다.

### 6.3 하지만 무조건 가장 작은 struct가 최선은 아니다

필드 순서를 메모리 절약만 기준으로 재배치하면  
코드 의미가 흐려지거나 자주 함께 쓰는 필드가 멀어질 수도 있다.

즉, `offsetof`로 layout을 볼 때는 단순 크기뿐 아니라  
접근 패턴과 가독성도 함께 봐야 한다.

### 6.4 ABI/직렬화에서는 성능보다 정확성이 더 중요할 수 있다

외부 시스템과 바이트 단위 배치를 맞춰야 하는 경우에는  
몇 바이트 절약보다 정확한 위치 보장이 훨씬 중요하다.

즉, `offsetof`는 성능 도구이면서 동시에 정확성 검증 도구다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 구조체 레이아웃이 중요한 경우 반드시 `sizeof`와 `offsetof`를 같이 본다

단순한 일반 로직에서는 굳이 layout을 따질 필요가 없을 수 있다.  
하지만 다음 경우에는 반드시 확인하는 편이 좋다.

- 대규모 구조체 배열
- 파일/패킷 직렬화
- FFI
- packed struct 사용
- 하드웨어/OS 인터페이스 경계

즉, 중요한 구조체는 눈이 아니라 코드로 검증해야 한다.

### 7.2 추측하지 말고 출력해서 확인한다

“이 정도면 아마 12바이트겠지” 같은 식의 추측은 위험하다.  
플랫폼과 ABI에 따라 달라질 수 있기 때문이다.

즉, 레이아웃이 중요하다면 실제 코드로 확인하는 습관이 필요하다.

### 7.3 마지막 필드만 보고 구조체 크기를 단정하면 안 된다

tail padding이 있기 때문에 마지막 필드 끝 위치와 전체 크기가 다를 수 있다.

즉, `offsetof(last) + sizeof(last)`와 `sizeof(struct)`는 분리해서 봐야 한다.

### 7.4 바이너리 포맷과 직접 매핑할 때는 더 엄격해야 한다

외부 바이트 포맷과 정확히 맞춰야 한다면  
필드별 오프셋 검증 없이는 안심하면 안 된다.

즉, `offsetof`는 이런 상황에서 사실상 필수 도구다.

### 7.5 필드 순서를 바꿀 때는 의미/ABI/성능을 함께 검토한다

단순 padding 감소만 보고 구조체를 무분별하게 재배치하면  
API 의미나 호환성이 깨질 수 있다.

즉, 레이아웃 최적화는 구조 설계의 일부로 신중히 해야 한다.

---

## 8. 더 깊게 볼 포인트

### 8.1 `_Static_assert`

특정 구조체 크기나 오프셋이 기대값과 맞는지 컴파일 타임에 강제 검증하는 방식으로 확장할 수 있다.

### 8.2 packed struct 검증

packed를 썼을 때 실제 오프셋이 어떻게 달라지는지 비교 분석으로 확장할 수 있다.

### 8.3 ABI 문서 기반 레이아웃 확인

플랫폼 ABI 문서와 실제 `offsetof` 결과를 대조하는 고급 주제로 이어질 수 있다.

### 8.4 serialization / deserialization

구조체 레이아웃과 바이트 직렬화가 왜 항상 1:1 대응되지 않는지 더 깊게 볼 수 있다.

### 8.5 FFI 연동

다른 언어의 구조체 정의와 C 구조체 오프셋을 맞추는 실전 문제로 확장할 수 있다.

---

## 정리

`offsetof`는 struct layout을 이해하고 검증하는 핵심 도구다.

핵심은 다음과 같다.

- `sizeof`는 구조체 전체 크기를 알려준다.
- `offsetof`는 각 필드의 시작 위치를 알려준다.
- 둘을 함께 봐야 필드 사이 padding과 tail padding을 추정할 수 있다.
- 필드 순서를 바꾸면 `offsetof`와 전체 크기가 달라질 수 있다.
- 구조체 레이아웃이 중요한 상황에서는 추측보다 코드 검증이 중요하다.
- `offsetof`는 성능 튜닝, ABI 확인, 바이너리 포맷 검증, FFI 연동에서 매우 유용하다.

즉, `offsetof`와 struct layout 확인을 이해한다는 것은  
단순히 매크로 하나를 아는 것이 아니라  
**구조체의 실제 메모리 배치를 수치로 확인하고, 그 배치가 성능·호환성·정확성에 어떤 영향을 주는지 검증할 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 packed struct, ABI, 바이너리 직렬화, FFI, 구조체 최적화를 훨씬 더 정확하게 다룰 수 있다.
