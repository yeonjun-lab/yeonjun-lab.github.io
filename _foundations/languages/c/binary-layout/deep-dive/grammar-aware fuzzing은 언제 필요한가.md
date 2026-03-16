---
title: "grammar-aware fuzzing은 언제 필요한가"
permalink: /foundations/languages/c/binary-layout/deep-dive/grammar-aware-fuzzing은-언제-필요한가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-15
updated_at: 2026-03-15
sort_date: 2026-03-15
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-binary-layout
topic_slug: binary-layout
language: c
tags: [c, fuzzing, grammar-aware-fuzzing, parser, testing, protocol, robustness]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

앞에서 fuzzing과 coverage-guided fuzzing을 봤다면, 그 다음에는 자연스럽게 이런 한계가 보이기 시작한다.

- random mutation만으로는 복잡한 포맷 깊숙이 잘 못 들어간다
- magic number나 length field를 겨우 맞춰도, 내부 구조가 깨져서 금방 reject된다
- JSON, CSV, TLV, nested binary format처럼 “형식”이 강한 입력은 단순 바이트 뒤집기로 깊이 탐색하기 어렵다
- checksum, length consistency, nesting rule, delimiter escaping 같은 규칙이 있으면 coverage가 잘 안 늘어난다

즉, coverage-guided fuzzing이 강력하긴 하지만, **입력 형식 자체가 복잡한 경우**에는 mutation만으로 한계가 생길 수 있다.

예를 들어 TLV 기반 포맷을 생각해 보자.

- type
- length
- value

가 반복되는 메시지이고, value 안에 또 nested TLV가 들어갈 수 있다면, 단순 mutation은 보통 다음을 쉽게 망가뜨린다.

- length 값과 실제 payload 길이 일치
- 중첩 경계 일치
- 필수 헤더 존재 여부
- field ordering rule
- checksum consistency

이 경우 fuzzer는 대부분 초반 validation에서 떨어지고, parser의 더 깊은 로직까지 잘 못 들어간다.

여기서 등장하는 것이 **grammar-aware fuzzing**이다.

이 방식은 단순히 바이트를 뒤집는 것이 아니라, **입력 포맷의 구조와 규칙을 어느 정도 이해한 상태에서 입력을 생성·변형**한다.

즉, grammar-aware fuzzing은 이런 질문에 대한 답이다.

- 이 포맷에서 “대충 valid한” 입력을 더 많이 만들려면 어떻게 해야 하는가
- 구조를 보존하면서도 다양한 변형을 하려면 어떻게 해야 하는가
- parser의 deeper semantic path까지 도달하려면 어떤 전략이 필요한가

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- fuzzing을 단순 바이트 노이즈 주입에서 구조적 입력 탐색으로 확장해 준다
- 왜 어떤 포맷은 mutation-based fuzzing만으로 잘 안 뚫리는지 이해하게 해 준다
- parser의 깊은 semantic branch를 테스트하려면 어떤 준비가 필요한지 보여 준다
- coverage-guided fuzzing과 grammar-aware fuzzing이 경쟁 관계가 아니라 결합 관계임을 이해하게 해 준다
- 이후 structure-aware mutation, stateful protocol fuzzing, differential fuzzing으로 자연스럽게 이어진다

이 문서는 grammar-aware fuzzing이 무엇인지, 왜 필요한지,  
coverage-guided fuzzing과 무엇이 다른지,  
어떤 포맷에서 특히 중요한지,  
그리고 실무에서 어떻게 활용해야 하는지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

grammar-aware fuzzing을 큰 구조로 보면 다음과 같다.

### 2.1 일반 fuzzing은 입력을 바이트 덩어리로 본다

기본 fuzzing은 입력을 일단 바이트 배열로 본다.  
그리고 그 바이트를 뒤집거나 삽입하거나 삭제하면서 새로운 입력을 만든다.

즉, 포맷 의미를 몰라도 탐색은 가능하다.

### 2.2 grammar-aware fuzzing은 입력을 구조화된 문법 객체로 본다

반면 grammar-aware fuzzing은 입력을 다음처럼 본다.

- header
- section
- field
- nested block
- delimiter structure
- AST-like node

즉, 입력을 단순 바이트열이 아니라 **문법과 구조를 가진 객체**로 취급한다.

### 2.3 핵심은 “형식을 너무 빨리 깨뜨리지 않고” 변형하는 것이다

단순 mutation은 조금만 바꿔도 전체 포맷이 invalid가 되기 쉽다.  
grammar-aware fuzzing은 가능한 한 구조를 유지한 채 변형한다.

예를 들어:

- length를 바꾸면 payload 길이도 함께 조정
- TLV field 하나를 추가/삭제
- JSON key/value 구조 유지하며 값만 변형
- CSV 열 개수는 유지하되 셀 내용 변형

즉, 더 깊은 parser 상태까지 갈 가능성이 높아진다.

### 2.4 grammar-aware fuzzing은 valid-ish input을 많이 만든다

목표는 완벽히 정상 입력만 만드는 것이 아니다.  
핵심은 **초반 검증은 통과할 가능성이 높고, deeper logic에서는 이상 상태를 유발할 수 있는 입력**을 더 많이 만드는 것이다.

즉, shallow reject를 줄이고 deep exploration을 늘리는 전략이다.

---

## 3. 내부 동작 원리

### 3.1 포맷에는 보통 명시적이든 암묵적이든 grammar가 있다

텍스트 포맷이든 바이너리 포맷이든 대부분 어떤 규칙을 가진다.

예를 들어 JSON은:

- 중괄호
- 키/값
- 배열
- 문자열 escape
- 숫자 문법

을 가진다.

TLV 포맷은:

- type
- length
- value
- nested TLV 가능 여부

같은 구조 규칙을 가진다.

즉, parser가 있다면 대체로 grammar도 있다.

### 3.2 단순 mutation은 grammar invariant를 쉽게 깨뜨린다

예를 들어 길이 필드가 20인데 payload를 3바이트로 줄여 버리면,  
parser는 깊은 semantic logic에 들어가기 전에 바로 length mismatch로 reject할 수 있다.

또 JSON에서 닫는 괄호 하나만 깨뜨려도 parser가 초반 문법 오류로 멈춘다.

즉, random mutation은 종종 너무 일찍 실패한다.

### 3.3 grammar-aware fuzzing은 grammar invariant를 일부 유지한다

예를 들어 TLV라면 다음 식의 변형이 가능하다.

- field 추가
- field 제거
- field 순서 변경
- known type을 unknown type으로 바꾸기
- length와 payload를 함께 바꾸기
- nested TLV depth 늘리기

즉, 포맷 핵심 골격은 유지하면서도 다양한 예외 상황을 만들 수 있다.

### 3.4 더 깊은 semantic path를 자극할 수 있다

parser는 보통 이런 층을 가진다.

1. lexical / framing validation
2. structural validation
3. semantic validation
4. business rule validation
5. transformation / storage / reserialization

grammar-aware fuzzing은 1단계나 2단계에서 바로 죽는 입력을 줄이고  
3, 4, 5단계까지 가는 입력을 더 많이 만들 수 있다.

즉, 단순 parse crash가 아니라 deeper logic bug도 잘 찾게 된다.

### 3.5 coverage-guided와 결합하면 더 강력해진다

grammar-aware fuzzing만 있으면 구조는 좋지만 탐색 방향성이 약할 수 있다.  
반대로 coverage-guided만 있으면 구조를 자주 깨뜨릴 수 있다.

둘을 결합하면 다음이 가능하다.

- grammar-aware mutation으로 구조 유지
- coverage feedback으로 유망 입력 선별
- deeper path 중심으로 진화

즉, 실전에서는 결합 전략이 특히 강력하다.

### 3.6 grammar를 너무 엄격하게 잡으면 오히려 탐색 폭이 줄 수 있다

주의할 점도 있다.  
너무 “정상 입력만” 만들도록 grammar를 강하게 제한하면  
오히려 invalid-but-interesting case를 놓칠 수 있다.

즉, grammar-aware fuzzing의 목표는 완벽한 정답 입력 생성이 아니라  
**유의미한 구조를 가진 변형 공간 확장**이다.

---

## 4. 핵심 구성 요소

### 4.1 grammar

입력 포맷의 구조와 규칙이다.  
텍스트 문법일 수도 있고, 바이너리 프레임 규칙일 수도 있다.

### 4.2 structure-aware mutation

입력 구조를 고려해서 변형하는 방식이다.  
grammar-aware fuzzing의 핵심 동작이다.

### 4.3 syntactic validity

문법적으로 너무 일찍 깨지지 않는 상태다.  
깊은 parser path 진입에 중요하다.

### 4.4 semantic exploration

단순 문법 통과를 넘어서 의미 검증 분기까지 탐색하는 것이다.

### 4.5 deep parser path

헤더 검증 이후 nested field 처리, unknown handling, preservation logic 등  
더 안쪽 코드 경로를 뜻한다.

### 4.6 grammar-preserving mutation

포맷의 핵심 규칙 일부를 유지하면서 입력을 변형하는 전략이다.

---

## 5. 실행 흐름 또는 처리 순서

예를 들어 간단한 TLV 포맷 parser가 있다고 하자.

포맷 규칙:

- 1바이트 type
- 2바이트 length
- length 바이트 payload
- payload 안에 nested TLV 가능

### 5.1 seed 준비

먼저 valid seed 몇 개를 만든다.

- 단일 TLV
- 2개 TLV 연속 메시지
- nested TLV 메시지
- unknown type 포함 메시지

### 5.2 문법 단위로 입력 해석

grammar-aware fuzzer는 입력을 단순 바이트열이 아니라  
TLV 목록으로 해석하려고 한다.

예를 들어:

- field1: T=1, L=4, V=...
- field2: T=9, L=3, V=...
- field3: T=2, L=8, V=nested...

### 5.3 구조적 mutation 수행

그 다음 다음 같은 변형을 한다.

- field 하나 삭제
- 새 TLV 삽입
- known type을 unknown type으로 변경
- length 증가 + payload padding
- nested TLV depth 증가
- field 순서 섞기

### 5.4 parser 실행

이 입력으로 parser를 돌린다.  
coverage-guided와 결합되어 있다면 새로운 경로도 측정한다.

### 5.5 더 깊은 경로 연 입력 유지

예를 들어 unknown field preservation path, nested TLV parse path,  
max length validation path에 들어갔다면 그 입력을 corpus에 유지한다.

### 5.6 bug 또는 interesting case 발견 시 축소

문제가 나는 입력은 최소화해서  
재현 가능한 regression sample로 만든다.

---

## 6. 성능 / 최적화 관점

### 6.1 grammar-aware fuzzing은 입력당 계산 비용이 더 클 수 있다

구조를 해석하고 보존하며 변형해야 하므로  
단순 byte mutation보다 입력 생성 비용이 더 들 수 있다.

즉, 속도는 느릴 수 있다.

### 6.2 하지만 deep path 탐색 효율은 더 좋아질 수 있다

완전 랜덤은 수백만 번 돌려도 shallow reject만 많이 낼 수 있다.  
grammar-aware fuzzing은 입력당 비용이 크더라도  
유효한 구조를 더 자주 만들어 deeper path를 많이 탐색할 수 있다.

즉, 총 탐색 효율은 오히려 더 좋을 수 있다.

### 6.3 포맷 복잡도가 높을수록 가치가 커진다

단순 flat binary blob에는 과할 수 있다.  
하지만 nested TLV, JSON-like structured text, self-describing protocol 같은 포맷에서는  
가치가 크게 올라간다.

### 6.4 설계 비용이 있다

grammar-aware fuzzing을 하려면  
포맷 구조를 어느 정도 모델링해야 한다.

즉, tooling과 harness 설계 비용이 추가된다.  
그래서 가치가 큰 parser에 집중 적용하는 것이 현실적이다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 shallow reject가 너무 많은 parser라면 적극 검토한다

fuzzer를 돌려 봤는데 대부분 magic mismatch, syntax error, length mismatch에서 끝난다면  
grammar-aware 전략이 필요할 가능성이 높다.

### 7.2 nested structure나 self-describing format에서 특히 유용하다

다음 같은 경우는 특히 적합하다.

- TLV / nested TLV
- JSON/XML/CSV 계열 structured text
- length-prefixed nested message
- optional/unknown field가 많은 protocol

### 7.3 coverage-guided fuzzing과 결합하는 편이 좋다

grammar-aware만 쓰면 입력 품질은 좋아도 탐색 방향성이 약할 수 있다.  
coverage와 결합하면 훨씬 강해진다.

### 7.4 grammar를 “정상 입력 생성기”로만 생각하면 안 된다

목표는 specification-conformant sample generator가 아니라  
bug를 찾는 것이다.

즉, 구조를 유지하되 경계 조건, 부분 위반, 이상 조합도 만들 수 있어야 한다.

### 7.5 발견된 구조적 crash sample은 반드시 corpus에 편입한다

grammar-aware fuzzing으로 찾은 입력은 종종 parser deep logic bug를 재현한다.  
이런 입력은 regression corpus에 매우 가치 있다.

---

## 8. 더 깊게 볼 포인트

### 8.1 AST-based mutation

텍스트 포맷을 파싱 트리 수준에서 변형하는 전략으로 확장할 수 있다.

### 8.2 checksum-aware fuzzing

형식을 유지하면서 checksum이나 length consistency까지 맞춰 주는 전략으로 이어질 수 있다.

### 8.3 stateful grammar fuzzing

단일 메시지가 아니라 여러 메시지 순서와 상태 전이를 포함한 프로토콜로 확장할 수 있다.

### 8.4 format-aware minimization

구조를 망가뜨리지 않고 crash input을 더 작게 줄이는 전략으로 이어질 수 있다.

### 8.5 semantic oracle 결합

단순 crash뿐 아니라 semantic inconsistency까지 탐지하는 고급 fuzzing 전략으로 확장할 수 있다.

---

## 정리

grammar-aware fuzzing은 구조화된 포맷 parser를 더 깊게 테스트하기 위한 중요한 기법이다.

핵심은 다음과 같다.

- 단순 fuzzing은 입력을 바이트열로 보고 mutation한다.
- grammar-aware fuzzing은 입력 포맷의 구조와 규칙을 고려해 변형한다.
- 덕분에 shallow reject를 줄이고 deeper parser path를 더 많이 탐색할 수 있다.
- TLV, nested binary format, JSON 같은 structured format에서 특히 유용하다.
- coverage-guided fuzzing과 결합하면 더 강력해진다.
- 목표는 정상 입력만 만드는 것이 아니라 구조를 유지한 채 더 유의미한 이상 입력을 만드는 것이다.
- 설계 비용은 있지만 복잡한 parser에서는 큰 가치를 가진다.

즉, grammar-aware fuzzing을 이해한다는 것은  
단순히 “랜덤 입력을 많이 넣는다”가 아니라  
**입력 형식의 구조를 활용해 parser가 더 깊은 의미 검증 단계까지 도달하도록 만들고, 단순 바이트 mutation으로는 잘 드러나지 않는 복잡한 파싱 버그와 호환성 문제를 더 효과적으로 찾을 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 복잡한 바이너리 포맷과 structured text parser를 훨씬 더 강하게 검증할 수 있다.
