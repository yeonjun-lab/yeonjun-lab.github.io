---
title: "coverage-guided fuzzing은 무엇이 다른가"
permalink: /foundations/languages/c/binary-layout/deep-dive/coverage-guided-fuzzing은-무엇이-다른가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-15
updated_at: 2026-03-15
sort_date: 2026-03-15
language: c
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-binary-layout
topic_slug: binary-layout
tags: [c, fuzzing, coverage-guided-fuzzing, parser, testing, robustness, safety]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

앞 문서에서 fuzzing이 왜 parser 테스트에 중요한지 봤다면,  
다음에는 아주 자연스럽게 이런 의문이 생긴다.

- 그냥 랜덤 바이트를 계속 넣으면 충분한가
- 왜 어떤 fuzzer는 훨씬 잘 찾고, 어떤 것은 거의 못 찾는가
- “coverage-guided”라는 말은 정확히 무엇을 뜻하는가
- seed corpus가 왜 중요한가
- parser 깊은 내부 상태까지 어떻게 들어가는가

초보자는 fuzzing을 종종 이렇게 생각한다.

- 입력을 무작위로 막 만든다
- 프로그램에 넣는다
- 죽으면 버그다

이 설명은 아주 기초 수준에서는 맞다.  
하지만 실제로는 이 방식만으로는 복잡한 parser 내부의 깊은 분기까지 거의 못 들어가는 경우가 많다.

예를 들어 바이너리 parser가 다음 순서로 검증한다고 하자.

1. magic number 확인
2. version 확인
3. length 검증
4. section count 확인
5. optional block 해석
6. nested payload 진입

완전 랜덤 입력은 보통 1단계나 2단계에서 바로 탈락한다.  
즉, parser의 진짜 복잡한 내부 코드는 거의 실행되지 않는다.

이 문제를 해결하는 핵심 아이디어가 바로 **coverage-guided fuzzing**이다.

단순 랜덤은 입력을 무작위로 던진다.  
반면 coverage-guided fuzzing은 이렇게 생각한다.

- 이 입력이 이전보다 새로운 코드 경로를 열었는가
- 새로운 분기, 새로운 함수, 새로운 edge를 밟았는가
- 그렇다면 이 입력은 더 가치 있다
- 그 입력을 다시 변형해서 더 깊이 들어가 보자

즉, coverage-guided fuzzing은  
무작위성 위에 **실행 피드백(feedback)** 을 얹은 방식이다.

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- fuzzing을 “랜덤 테스트” 수준에서 “탐색 알고리즘” 수준으로 이해하게 해 준다
- 왜 seed corpus가 중요한지 더 분명해진다
- parser 깊은 상태를 탐색하려면 어떤 전략이 필요한지 보게 해 준다
- sanitizer, corpus 관리, crash minimization과 어떻게 연결되는지 이해하게 해 준다
- 이후 grammar-based fuzzing, differential fuzzing, stateful fuzzing으로 자연스럽게 이어진다

이 문서는 coverage-guided fuzzing이 무엇인지,  
왜 단순 랜덤 fuzzing과 다른지,  
어떤 원리로 더 깊은 버그를 찾는지,  
그리고 실무에서 어떻게 활용해야 하는지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

coverage-guided fuzzing을 큰 구조로 보면 다음과 같다.

### 2.1 일반 fuzzing은 입력을 많이 던지는 것이다

기본 fuzzing은 자동으로 많은 입력을 만들어 프로그램에 넣는다.  
핵심은 사람 손으로 만들기 어려운 입력 공간을 넓게 두드려 보는 것이다.

즉, 입력 생성 자동화가 핵심이다.

### 2.2 coverage-guided fuzzing은 “어디까지 들어갔는지”를 본다

coverage-guided fuzzing은 단순히 많은 입력을 던지는 데서 끝나지 않는다.  
각 입력이 프로그램 안에서 어떤 코드 경로를 실행했는지 관찰한다.

즉, 핵심 질문은 이것이다.

- 이 입력이 새로운 실행 경로를 열었는가

### 2.3 새로운 경로를 연 입력을 더 가치 있게 본다

만약 어떤 입력이 이전까지 안 가던 분기 안으로 들어갔다면,  
그 입력은 이후 더 흥미로운 입력을 만들 seed가 된다.

즉, coverage-guided fuzzing은  
“성공적인 탐색 입력”을 살아남게 하는 진화 방식에 가깝다.

### 2.4 그래서 coverage-guided fuzzing은 random + feedback 구조다

정리하면 다음 두 요소가 결합된다.

- mutation 기반 입력 생성
- 실행 경로 기반 피드백 선택

즉, 단순 랜덤이 아니라  
**피드백을 받으며 입력을 진화시키는 탐색**이다.

---

## 3. 내부 동작 원리

### 3.1 입력 하나를 실행하고 어떤 코드가 실행됐는지 본다

coverage-guided fuzzer는 입력을 하나 선택해 대상 프로그램을 실행한다.  
그리고 다음 같은 정보를 수집한다.

- 어떤 basic block이 실행됐는가
- 어떤 branch edge를 지났는가
- 이전에 안 밟던 경로가 있었는가

즉, 입력 결과로 단순 성공/실패만 보는 것이 아니라  
실행 흔적 자체를 본다.

### 3.2 새로운 coverage를 만든 입력을 corpus에 남긴다

예를 들어 입력 A와 B가 있다고 하자.

- A는 기존 경로만 실행
- B는 새로운 분기 한 곳 진입

그렇다면 B는 더 가치 있다.  
coverage-guided fuzzer는 보통 이런 입력을 내부 corpus에 유지한다.

즉, corpus는 단순 샘플 모음이 아니라  
**탐색 성과가 있는 입력 집합**으로 성장한다.

### 3.3 이후 mutation은 그 가치 있는 입력들에서 출발한다

새로운 coverage를 만든 입력은 다시 여러 방식으로 변형된다.

예를 들어:

- 바이트 뒤집기
- 특정 바이트 증가/감소
- 블록 삽입/삭제
- 길이 필드 주변 변형
- 다른 입력 일부 splice

이 과정을 반복하면  
한 번 의미 있는 경로에 들어간 입력에서 더 깊은 상태로 진입할 가능성이 높아진다.

### 3.4 parser는 “조금만 맞아도 깊어지는” 구조라 coverage-guided와 잘 맞는다

예를 들어 parser는 보통 단계적으로 gate를 통과한다.

- magic 맞아야 다음 단계
- version 맞아야 다음 단계
- length가 맞아야 다음 단계
- structure가 맞아야 deeper parse

coverage-guided fuzzing은  
이 gate를 하나씩 통과하는 입력을 점진적으로 키워 갈 수 있다.

즉, parser 같은 계층적 해석 코드는  
coverage-guided 탐색과 특히 궁합이 좋다.

### 3.5 crash가 없더라도 coverage 증가는 가치가 있다

일반 fuzzing에서는 보통 crash가 목표처럼 느껴질 수 있다.  
하지만 coverage-guided fuzzing에서는 crash가 없더라도  
새로운 경로 진입 자체가 중요한 성과다.

왜냐하면 새로운 경로는 결국 다음 crash를 찾는 발판이 되기 때문이다.

즉, coverage는 탐색의 중간 보상 신호다.

### 3.6 sanitizer와 결합하면 “깊이 들어간 경로의 작은 오류”도 잡힌다

coverage-guided fuzzing이 내부 깊은 경로까지 들어가고,  
AddressSanitizer/UBSan이 거기서의 잘못된 접근을 잡아주면  
매우 강력한 조합이 된다.

즉, 한쪽은 더 깊이 들어가고,  
다른 한쪽은 그 안의 작은 메모리 오류까지 밝혀낸다.

---

## 4. 핵심 구성 요소

### 4.1 coverage

입력이 실행하게 만든 코드 경로 정보다.  
block, edge, branch 단위로 생각할 수 있다.

### 4.2 feedback signal

입력이 가치 있는지 판단하는 실행 피드백이다.  
coverage-guided fuzzing의 핵심이다.

### 4.3 seed / corpus

탐색을 시작하거나 계속 확장하는 입력 집합이다.  
새로운 coverage를 만든 입력이 여기에 편입된다.

### 4.4 mutation

기존 입력을 조금씩 바꾸는 과정이다.  
탐색 공간을 넓히는 핵심 기법이다.

### 4.5 path exploration

입력에 따라 서로 다른 프로그램 경로를 밟아 보는 과정이다.  
coverage-guided fuzzing의 본질이다.

### 4.6 instrumentation

프로그램이 어떤 경로를 실행했는지 측정할 수 있도록  
실행 정보를 심는 기법과 연결된다.

---

## 5. 실행 흐름 또는 처리 순서

예를 들어 파일 포맷 parser가 있다고 하자.
```c
    int parse_file(const unsigned char *buf, size_t len);
```

그리고 정상 파일은 대략 이런 구조를 가진다.

- magic 4바이트
- version 1바이트
- section_count 1바이트
- length-prefixed sections...

### 5.1 초기 seed corpus 준비

먼저 몇 개의 seed를 넣는다.

- 최소 valid file
- section 없는 file
- section 하나 있는 file
- optional field 포함 file

### 5.2 seed 하나 선택

fuzzer는 corpus에서 입력 하나를 고른다.

### 5.3 mutation 수행

예를 들어 다음 같은 변경을 한다.

- magic의 한 바이트 변경
- version 증가
- section_count 증가
- 길이 필드 뒤집기
- payload 중간 바이트 삽입

### 5.4 실행과 coverage 수집

변형된 입력으로 parser를 실행한다.  
그리고 다음을 본다.

- 새 branch 실행 여부
- 이전에 안 들어가던 section parser 진입 여부
- sanitizer/crash 여부

### 5.5 새로운 coverage면 corpus에 추가

만약 어떤 입력이 section parser 안 deeper path까지 들어갔다면  
그 입력은 corpus에 남는다.

### 5.6 반복 진화

이제 그 deeper-path 입력을 다시 변형한다.  
그러면 다음에는 nested structure, unknown field handling, preservation path 등  
더 안쪽까지 들어갈 가능성이 높아진다.

즉, coverage-guided fuzzing은  
입력을 “깊이 들어가는 방향으로 진화”시킨다.

---

## 6. 성능 / 최적화 관점

### 6.1 단순 랜덤보다 훨씬 효율적으로 입력 공간을 탐색할 수 있다

완전 랜덤은 대부분 초반 validation에서 탈락한다.  
반면 coverage-guided fuzzing은 조금씩 더 안으로 들어간 입력을 기억하고 발전시킨다.

즉, 같은 실행 횟수라도 탐색 효율이 훨씬 좋아질 수 있다.

### 6.2 instrumentation 오버헤드는 있지만 가치가 크다

coverage를 측정하려면 실행 계측이 들어가므로 오버헤드가 생긴다.  
하지만 parser 안정성 버그를 찾는 목적에서는 이 비용이 충분히 정당화된다.

### 6.3 깊은 parser path를 여는 seed 품질이 중요하다

coverage-guided라 해도 시작 seed가 너무 빈약하면  
깊은 상태 공간 진입이 어렵다.

즉, seed corpus 품질은 탐색 효율에 큰 영향을 준다.

### 6.4 구조화된 포맷에서는 grammar-aware와 결합하면 더 강해질 수 있다

coverage-guided fuzzing은 강력하지만  
포맷 구조를 전혀 모르면 한계가 있다.  
특히 길이 필드, checksum, nested grammar가 강한 경우에는  
구조를 아는 mutation과 결합하면 더 효과적이다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 외부 입력 parser는 coverage-guided fuzzing 우선 대상이다

단순 unit test만으로는 parser 깊은 분기를 충분히 검증하기 어렵다.  
파일 포맷, TLV, 네트워크 프레임 parser는 coverage-guided fuzzing 가치가 매우 높다.

### 7.2 seed corpus는 작아도 의미 있게 준비한다

다음 같은 seed가 좋다.

- 최소 valid input
- optional field 포함 valid input
- unknown field 포함 input
- nested structure input
- boundary size input

즉, 적더라도 parser 여러 경로를 여는 seed가 중요하다.

### 7.3 fuzz 결과에서 “새 coverage”와 “crash”를 분리해서 본다

crash만 보는 것은 부족하다.  
새 coverage를 계속 늘리고 있는지 보는 것도 중요하다.

즉, fuzzing은 즉시 버그 발견만이 아니라  
탐색 능력 자체도 관찰해야 한다.

### 7.4 발견된 interesting input은 regression corpus로 승격한다

새로운 coverage를 열었거나 실제 bug를 만들었던 입력은  
golden regression corpus에 편입할 가치가 있다.

즉, fuzzing과 golden corpus는 선순환 구조를 이룬다.

### 7.5 parser harness를 단순하고 결정적으로 유지한다

coverage-guided fuzzing은 재현성과 측정성이 중요하므로  
대상 함수는 가능한 한 입력-출력 관계가 단순해야 한다.

즉, 외부 시간, 네트워크, 파일 시스템 상태에 과도하게 의존하면 fuzz 효율이 떨어질 수 있다.

---

## 8. 더 깊게 볼 포인트

### 8.1 grammar-aware fuzzing

포맷 구조를 이해하는 mutation을 coverage-guided 방식과 결합하는 전략으로 확장할 수 있다.

### 8.2 structure-aware mutation

length field, checksum, nested TLV 관계를 보존하며 변형하는 기법으로 이어질 수 있다.

### 8.3 differential fuzzing

같은 입력을 두 구현에 넣고 결과 차이를 coverage와 함께 보는 전략으로 확장할 수 있다.

### 8.4 stateful coverage-guided fuzzing

단일 메시지 parser를 넘어서 세션 상태를 가진 프로토콜 fuzzing으로 이어질 수 있다.

### 8.5 crash triage와 minimization

coverage-guided fuzzing이 만든 많은 interesting input 중  
실제 중요한 버그를 분류하는 과정으로 확장할 수 있다.

---

## 정리

coverage-guided fuzzing은 단순 랜덤 fuzzing보다 훨씬 더 전략적인 탐색 방식이다.

핵심은 다음과 같다.

- coverage-guided fuzzing은 입력이 어떤 코드 경로를 실행했는지 피드백으로 본다.
- 새로운 coverage를 만든 입력을 더 가치 있게 평가하고 corpus에 유지한다.
- 그런 입력을 다시 mutation해서 더 깊은 경로를 탐색한다.
- parser처럼 계층적으로 validation을 통과해야 하는 코드에서 특히 강하다.
- crash가 없더라도 새로운 coverage는 중요한 탐색 성과다.
- sanitizer와 결합하면 깊은 경로의 메모리 안전성 버그까지 잘 잡을 수 있다.
- 좋은 seed corpus와 regression corpus 결합이 매우 중요하다.

즉, coverage-guided fuzzing을 이해한다는 것은  
단순히 “랜덤 입력을 많이 넣는다”가 아니라  
**실행 피드백을 이용해 입력을 점점 더 유망한 방향으로 진화시키면서, parser와 deserializer의 깊은 내부 경로까지 자동 탐색하고 숨겨진 안정성 버그를 찾아내는 방법을 이해하는 것**을 뜻한다.

이 관점이 잡혀야 parser robustness 테스트를 훨씬 더 체계적이고 강력하게 설계할 수 있다.
