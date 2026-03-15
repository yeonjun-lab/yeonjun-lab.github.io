---
title: "differential fuzzing은 언제 유용한가"
permalink: /foundations/languages/c/binary-layout/differential fuzzing은 언제 유용한가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-16
updated_at: 2026-03-16
sort_date: 2026-03-16
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-binary-layout
topic_slug: binary-layout
language: c
tags: [c, fuzzing, differential-fuzzing, parser, testing, compatibility, robustness]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

fuzzing, coverage-guided fuzzing, grammar-aware fuzzing까지 보면  
이제 테스트의 관점이 점점 넓어진다.

- crash만 찾으면 충분한가
- 프로그램이 죽지 않아도 “잘못된 해석”을 할 수 있지 않은가
- parser A와 parser B가 같은 입력을 다르게 해석하면 무엇이 맞는가
- 새 구현이 옛 구현과 미묘하게 다른 동작을 하면 어떻게 발견하는가
- reference implementation이 있을 때 그걸 테스트 oracle로 쓸 수는 없는가

여기서 중요한 기법이 바로 **differential fuzzing**이다.

초보자는 테스트 oracle을 보통 이렇게 생각한다.

- 입력이 있으면 정답 출력이 있다
- 그 정답과 비교하면 된다

하지만 parser, serializer, compiler, protocol stack 같은 시스템에서는  
항상 “유일한 정답”을 사람이 손으로 준비하기 어렵다.  
특히 입력 공간이 매우 크면 더 그렇다.

예를 들어 TLV parser를 생각해 보자.  
입력 바이트열이 수없이 많고, 그중 일부는 유효하고 일부는 부분 유효하고 일부는 명백히 잘못되었다.  
이 모든 케이스에 대해 기대 결과를 손으로 다 써 두는 것은 사실상 불가능하다.

그런데 만약 다음이 있다면 이야기가 달라진다.

- 기존 stable parser
- 새로 작성한 parser
- 다른 언어로 만든 reference parser
- strict mode parser와 lenient mode parser
- serializer ↔ deserializer 한 쌍

이런 구현 둘 이상이 있을 때,  
같은 입력을 여러 구현에 넣고 결과 차이를 비교하면  
“무엇인가 이상하다”는 사실을 자동으로 발견할 수 있다.

즉, differential fuzzing은  
**정답을 직접 쓰는 대신, 여러 구현의 결과를 서로 비교해 이상 징후를 찾는 방식**이다.

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- crash가 없는 logic bug도 찾을 수 있게 해 준다
- parser 호환성 테스트를 더 강하게 만든다
- 새 구현과 옛 구현의 의미 차이를 자동으로 드러내 준다
- reference implementation이 있을 때 테스트 가치를 크게 높인다
- fuzzing을 단순 안전성 탐지에서 semantic discrepancy 탐지로 확장해 준다

이 문서는 differential fuzzing이 무엇인지, 왜 유용한지,  
일반 fuzzing과 무엇이 다른지,  
어떤 상황에서 특히 강한지,  
그리고 실무에서 어떻게 적용해야 하는지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

differential fuzzing을 큰 구조로 보면 다음과 같다.

### 2.1 일반 fuzzing은 한 구현이 안전하게 버티는지 본다

기본 fuzzing은 보통 하나의 대상 프로그램에 많은 입력을 넣고 다음을 본다.

- crash
- sanitizer error
- hang
- resource abuse

즉, 한 구현의 robustness를 본다.

### 2.2 differential fuzzing은 둘 이상의 구현이 같은 입력에 대해 같은 의미를 내는지 본다

differential fuzzing에서는 입력 하나를 여러 구현에 동시에 넣는다.  
그리고 그 결과를 비교한다.

즉, 핵심 질문은 이것이다.

- 같은 입력에 대해 결과가 왜 다른가

### 2.3 차이는 곧 버그일 수도 있고, spec ambiguity일 수도 있다

결과 차이가 났다고 해서 무조건 한쪽이 버그인 것은 아니다.  
하지만 그 차이는 매우 중요한 신호다.

왜냐하면 차이의 원인은 보통 다음 둘 중 하나이기 때문이다.

- 구현 버그
- 명세가 모호하거나 해석이 갈리는 부분

즉, discrepancy는 항상 분석 가치가 있다.

### 2.4 differential fuzzing은 정답 oracle이 약한 문제에 특히 유리하다

사람이 모든 expected output을 쓰기 어려운 분야에서  
서로 다른 구현이 곧 oracle 역할을 해 줄 수 있다.

즉, parser, decoder, serializer, compiler, formatter 같은 영역에 잘 맞는다.

---

## 3. 내부 동작 원리

### 3.1 같은 입력을 여러 구현에 동시에 넣는다

예를 들어 parser A와 parser B가 있다고 하자.

입력 `buf`가 들어오면 다음을 수행한다.

- `result_A = parse_A(buf)`
- `result_B = parse_B(buf)`

그리고 결과를 비교한다.

즉, differential fuzzing의 첫 단계는  
**동일 입력 동시 실행**이다.

### 3.2 비교 대상은 단순 성공/실패만이 아닐 수 있다

비교는 여러 수준에서 가능하다.

- parse success / failure 여부
- 반환 코드
- 생성된 AST/IR/객체
- canonical serialization 결과
- unknown field preservation 결과
- normalized semantic meaning

즉, 무엇을 비교할지 oracle 설계가 중요하다.

### 3.3 discrepancy가 나오면 interesting input으로 간주한다

예를 들어:

- A는 accept, B는 reject
- A와 B 모두 accept하지만 field 값이 다름
- 둘 다 serialize하지만 output이 다름
- 하나는 unknown field를 보존하고 하나는 버림

이런 경우 입력은 매우 흥미롭다.  
왜냐하면 두 구현 중 적어도 하나가 예상과 다를 가능성이 크기 때문이다.

즉, differential fuzzing은 crash가 없어도 bug candidate를 만들어 낸다.

### 3.4 reference implementation이 있으면 훨씬 강해진다

예를 들어 다음 조합을 생각할 수 있다.

- old stable parser vs new optimized parser
- spec-conformant reference parser vs production parser
- C implementation vs Rust/Python implementation

이 경우 reference 쪽이 더 신뢰 가능하다면  
차이를 분석할 방향이 더 명확해진다.

즉, differential fuzzing은  
**비교 대상 품질**에 따라 힘이 커진다.

### 3.5 serializer/deserializer 쌍에도 적용할 수 있다

differential fuzzing은 parser끼리만 쓰는 것이 아니다.  
예를 들어:

- implementation A serialize → parse
- implementation B serialize → parse
- round-trip normalized output 비교

같은 식으로도 적용할 수 있다.

즉, serialization stack 전체의 의미 일관성도 볼 수 있다.

### 3.6 normalized comparison이 필요한 경우가 많다

중요한 점은 출력 바이트가 다르다고 해서 의미가 다른 것은 아닐 수 있다는 것이다.

예를 들어:

- field order 다름
- canonicalization 여부 다름
- whitespace 차이
- stable sort 여부 차이

이런 건 byte-level 비교만 하면 noise가 될 수 있다.

즉, differential fuzzing에서는 종종  
**normalized semantic comparison**이 필요하다.

---

## 4. 핵심 구성 요소

### 4.1 implementation pair

같은 문제를 다루는 둘 이상의 구현이다.  
differential fuzzing의 비교 대상이다.

### 4.2 differential oracle

두 구현의 결과를 비교해 이상 여부를 판단하는 기준이다.  
이게 핵심 테스트 oracle 역할을 한다.

### 4.3 discrepancy

같은 입력에 대해 구현 결과가 달라지는 현상이다.  
differential fuzzing이 찾고자 하는 신호다.

### 4.4 reference implementation

상대적으로 더 신뢰하는 구현이다.  
차이를 해석할 때 기준점이 된다.

### 4.5 normalization

출력 비교 전에 의미적으로 동등한 형태로 정규화하는 과정이다.

### 4.6 semantic mismatch

둘 다 crash는 없지만 의미 해석이 달라지는 문제다.  
differential fuzzing이 특히 잘 찾는 버그다.

---

## 5. 실행 흐름 또는 처리 순서

예를 들어 old parser와 new parser를 비교한다고 하자.

대상 함수:
```c
    ParseResult parse_old(const unsigned char *buf, size_t len);
    ParseResult parse_new(const unsigned char *buf, size_t len);
```
### 5.1 fuzz input 생성

coverage-guided나 grammar-aware 방식으로 입력 하나를 만든다.

### 5.2 두 구현 실행

같은 입력을 두 parser에 넣는다.
```c
    r1 = parse_old(buf, len);
    r2 = parse_new(buf, len);
```
### 5.3 결과 정규화

필요하면 결과를 normalized form으로 바꾼다.

예를 들어:

- field order 정렬
- unknown field canonical representation
- whitespace 제거
- internal enum representation 통일

### 5.4 비교

이제 비교한다.

- 둘 다 accept인가
- 둘 다 reject인가
- accept라면 field 값이 같은가
- unknown field preservation 결과가 같은가
- reserialize 결과의 semantic meaning이 같은가

### 5.5 discrepancy 발견 시 interesting input 저장

차이가 난 입력은 corpus에 남긴다.  
필요하면 최소화해서 재현 가능한 sample로 만든다.

### 5.6 triage

마지막으로 차이 원인을 분석한다.

- new parser bug
- old parser bug
- spec ambiguity
- normalization rule 부족
- intentional behavior difference

즉, discrepancy는 발견 이후 triage가 중요하다.

---

## 6. 성능 / 최적화 관점

### 6.1 구현을 두 번 이상 실행하므로 비용이 더 든다

입력 하나마다 여러 구현을 돌려야 하므로  
일반 fuzzing보다 실행 비용이 높다.

즉, 속도는 느릴 수 있다.

### 6.2 하지만 crash 없는 semantic bug를 잡는 가치가 크다

단순 fuzzing은 crash가 없으면 지나칠 수 있다.  
반면 differential fuzzing은 의미 차이를 신호로 잡을 수 있다.

즉, parser correctness와 compatibility 테스트에서 매우 가치가 크다.

### 6.3 normalization 설계가 부실하면 false positive가 많아질 수 있다

의미상 같은데 표현만 다른 경우를 잘 처리하지 못하면  
쓸모없는 discrepancy가 너무 많이 쌓인다.

즉, differential fuzzing의 품질은 comparison layer 품질에 달려 있다.

### 6.4 모든 입력에 full differential을 돌리기보다 단계적 전략이 유용할 수 있다

실무에서는 다음처럼 할 수 있다.

- 먼저 단일 fuzzing으로 crash/hang 탐지
- interesting input에만 differential 비교
- 혹은 nightly/full job에서만 differential fuzzing 수행

즉, 비용과 효과를 분리해 운영할 수 있다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 비교 가능한 두 구현이 있을 때 적극 검토한다

다음 같은 경우 differential fuzzing 가치가 높다.

- legacy parser vs rewrite parser
- C parser vs reference parser
- strict parser vs optimized parser
- serializer A vs serializer B

### 7.2 semantic oracle를 먼저 정한다

무엇이 같은 결과인지 명확해야 한다.

- accept/reject만 비교할 것인가
- AST를 비교할 것인가
- canonical serialization 결과를 비교할 것인가
- unknown field preservation까지 볼 것인가

즉, oracle 정의가 핵심이다.

### 7.3 false discrepancy를 줄이는 normalization이 중요하다

byte-for-byte 비교만으로는 noise가 많을 수 있다.  
특히 canonical ordering, formatting 차이, benign reordering은 정규화해서 제거해야 한다.

### 7.4 discrepancy triage 체계를 준비한다

차이가 발견되면 곧바로 “새 코드가 틀렸다”라고 결론내리면 안 된다.  
old 코드가 틀렸을 수도 있고, spec이 모호할 수도 있다.

즉, discrepancy 분석 프로세스가 필요하다.

### 7.5 발견 입력은 corpus와 regression test로 편입한다

한 번 의미 차이를 드러낸 입력은 매우 가치 있다.  
이런 입력은 반드시 regression asset으로 승격하는 것이 좋다.

---

## 8. 더 깊게 볼 포인트

### 8.1 N-way differential fuzzing

두 구현이 아니라 세 개 이상 구현을 동시에 비교하는 전략으로 확장할 수 있다.

### 8.2 metamorphic testing과의 관계

입력 변환 전후에 특정 성질이 유지되어야 한다는 관점과 differential fuzzing을 비교할 수 있다.

### 8.3 serializer/parser cross-check

serialize(parse(x))와 parse(serialize(y)) 관계를 함께 비교하는 방식으로 확장할 수 있다.

### 8.4 spec ambiguity detection

차이가 구현 버그가 아니라 명세 모호성임을 어떻게 판별할지 더 깊게 볼 수 있다.

### 8.5 heterogeneous implementation fuzzing

C 구현과 다른 언어 구현을 함께 비교할 때 생기는 장점과 주의점으로 확장할 수 있다.

---

## 정리

differential fuzzing은 여러 구현의 결과 차이를 이용해 버그를 찾는 강력한 기법이다.

핵심은 다음과 같다.

- 같은 입력을 둘 이상의 구현에 넣고 결과를 비교한다.
- crash가 없어도 semantic mismatch를 찾아낼 수 있다.
- parser, serializer, decoder, compiler처럼 정답 oracle을 직접 쓰기 어려운 영역에 특히 유용하다.
- discrepancy는 구현 버그일 수도 있고 spec ambiguity일 수도 있다.
- normalization과 comparison oracle 설계가 매우 중요하다.
- reference implementation이나 legacy implementation이 있으면 더 강력해진다.
- 발견된 interesting input은 regression corpus에 편입할 가치가 높다.

즉, differential fuzzing을 이해한다는 것은  
단순히 “두 프로그램을 비교한다”가 아니라  
**직접 정답을 쓰기 어려운 입력 공간에서, 여러 구현이 같은 의미를 유지해야 한다는 계약 자체를 테스트 oracle로 활용해 crash 없는 semantic bug와 compatibility 문제까지 자동으로 드러낼 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 parser rewrite, protocol migration, serializer 교체, mixed-language implementation 검증을 훨씬 더 강하게 수행할 수 있다.
