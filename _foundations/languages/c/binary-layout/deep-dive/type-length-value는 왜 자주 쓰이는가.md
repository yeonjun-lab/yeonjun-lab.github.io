---
title: "TLV(Type-Length-Value)는 왜 자주 쓰이는가"
permalink: /foundations/languages/c/binary-layout/deep-dive/tlv-type-length-value-는-왜-자주-쓰이는가/
prev_url: /foundations/languages/c/binary-layout/deep-dive/length-prefixed-format은-왜-필요한가/
next_url: /foundations/languages/c/binary-layout/deep-dive/schema-evolution은-왜-중요한가/
layout: doc
section: foundations
subcategory: languages
language: c
created_at: 2026-03-10
updated_at: 2026-03-10
sort_date: 2026-03-10
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-binary-layout
topic_slug: binary-layout
tags: [c, serialization, tlv, binary-format, protocol, parsing, extensibility]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

앞 문서에서 length-prefixed format이 왜 필요한지 봤다면,  
그 다음 단계에서 자연스럽게 만나게 되는 형식이 있다.  
바로 **TLV(Type-Length-Value)** 다.

가변 길이 데이터를 다룰 때 length prefix만 있어도 기본적인 경계 문제는 해결할 수 있다.  
하지만 실제 프로토콜과 파일 포맷은 더 복잡하다.  
곧 이런 질문이 생긴다.

- 이 필드가 문자열인지 정수인지 어떻게 아는가
- 필드 순서가 바뀌어도 읽을 수 있게 만들 수 있는가
- 나중에 새 필드를 추가하면 구버전 파서는 어떻게 해야 하는가
- 알 수 없는 필드는 건너뛸 수 있어야 하지 않는가
- 선택적 필드와 반복 필드를 어떻게 표현할 것인가

이때 단순 `[length][data]`만으로는 부족할 수 있다.  
왜냐하면 길이는 “얼마나 읽을지”는 알려 주지만,  
“이 데이터가 무엇인지”까지는 알려 주지 않기 때문이다.

이 문제를 해결하는 대표 방식이 TLV다.

기본 형태는 이렇다.

- Type
- Length
- Value

즉, 각 데이터 조각이 다음 정보를 함께 가진다.

- 이 값의 종류가 무엇인가
- 길이는 얼마인가
- 실제 값은 무엇인가

예를 들어 개념적으로 이런 형태다.

```
[type=1][length=4][value=....]
[type=2][length=3][value=....]
```

이 형식은 매우 강력하다.  
왜냐하면 단순히 데이터를 나열하는 것을 넘어서,  
**자기 자신이 무엇인지 설명하는 조각들**로 메시지를 구성할 수 있기 때문이다.

TLV가 자주 쓰이는 이유는 다음과 같다.

- 가변 길이 필드를 안정적으로 다룰 수 있다
- 알 수 없는 필드를 건너뛸 수 있다
- 필드 순서가 고정되지 않아도 된다
- 확장성과 버전 호환성 설계가 쉬워진다
- 메시지를 부분적으로 파싱하기 쉽다
- 프로토콜과 바이너리 포맷 설계에서 유연성이 크다

즉, TLV는 단순 포맷 트릭이 아니라  
**확장 가능한 바이너리 데이터 계약을 만드는 핵심 패턴**이다.

이 문서를 깊게 봐야 하는 이유는 다음과 같다.

- length-prefixed format을 더 일반화된 설계 패턴으로 확장해 준다
- “고정 필드 나열”과 “자기 설명적 필드”의 차이를 이해하게 해 준다
- 프로토콜 확장성과 backward compatibility를 설계하는 감각을 준다
- parser를 어떻게 더 안전하고 유연하게 짤 수 있는지 보여 준다
- 이후 schema evolution, framed protocol, binary protocol design으로 자연스럽게 이어진다

이 문서는 TLV가 무엇인지, 왜 필요한지,  
length-prefixed format과 어떤 관계가 있는지,  
어떤 장점과 비용이 있는지,  
그리고 실무에서 어떻게 설계해야 하는지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

TLV를 큰 구조로 보면 다음과 같다.

### 2.1 TLV는 length-prefixed field의 확장판이다

length-prefixed format이 다음 구조였다면:

```
[length][data]
```

TLV는 여기에 “이 데이터가 무엇인가”를 나타내는 type이 추가된다.

```
[type][length][data]
```

즉, TLV는 경계 정보뿐 아니라 **의미 식별자**까지 포함한 형식이다.

### 2.2 Type은 필드 의미를 나타낸다

type은 이 value가 어떤 종류의 데이터인지를 알려준다.

예를 들어 다음처럼 약속할 수 있다.

- type 1 = user id
- type 2 = username
- type 3 = flag
- type 4 = payload
- type 5 = timestamp

즉, parser는 type을 보고 “이 값이 어떤 해석 규칙을 가져야 하는지”를 결정할 수 있다.

### 2.3 Length는 경계를 결정한다

length는 value가 몇 바이트인지 알려준다.  
즉, parser는 type을 알든 모르든 length만큼은 건너뛸 수 있다.

이 점이 매우 중요하다.  
왜냐하면 **알 수 없는 type도 안전하게 skip**할 수 있기 때문이다.

### 2.4 Value는 실제 바이트 데이터다

value는 실제 데이터 본체다.  
이건 정수일 수도 있고, 문자열일 수도 있고, 또 다른 nested TLV 묶음일 수도 있다.

즉, TLV의 value는 고정된 하나의 의미가 아니라  
type에 따라 해석이 달라지는 payload다.

---

## 3. 내부 동작 원리

### 3.1 parser는 먼저 type을 읽는다

TLV parsing의 첫 단계는 type 확인이다.

예를 들어 입력 스트림이 있다면 parser는 먼저 다음을 본다.

- 현재 필드 type은 무엇인가

이 단계에서 parser는 “무슨 종류 데이터인지”를 안다.

### 3.2 그 다음 length를 읽는다

type 다음에는 length가 온다.  
parser는 이제 value의 바이트 길이를 안다.

즉, 이 시점에서 parser는 다음 두 가지를 확보한다.

- 의미 분류(type)
- 경계(length)

이 둘이 결합되면 매우 유연한 parsing이 가능해진다.

### 3.3 알 수 없는 type도 length 덕분에 건너뛸 수 있다

이게 TLV의 가장 큰 장점 중 하나다.

예를 들어 parser가 type 1, 2, 3만 알고 있다고 하자.  
그런데 메시지 안에 type 9가 등장했다.

고정 구조 포맷이라면 여기서 전체 parsing이 꼬이기 쉽다.  
하지만 TLV에서는 length가 있으므로 다음이 가능하다.

- type 9는 모른다
- length는 12다
- 그럼 value 12바이트를 그냥 건너뛴다
- 다음 TLV로 이동한다

즉, TLV는 forward compatibility에 강하다.

### 3.4 필드 순서가 고정되지 않아도 된다

고정 레코드 포맷에서는 보통 필드 순서가 매우 중요하다.  
예를 들어 첫 4바이트는 id, 다음 2바이트는 level, 다음 1바이트는 flag처럼 정해 둔다.

TLV에서는 필드 순서를 덜 강하게 고정할 수 있다.  
왜냐하면 parser가 순서를 믿지 않고 type을 보고 해석할 수 있기 때문이다.

즉, TLV는 순서보다 **자기 설명성**에 더 의존한다.

### 3.5 선택적 필드 표현이 쉬워진다

어떤 필드는 있을 수도 있고 없을 수도 있다.  
고정 포맷에서는 이런 경우 nullable 규칙이나 reserved bytes가 필요할 수 있다.

TLV에서는 간단하다.

- 있으면 해당 TLV가 존재한다
- 없으면 해당 TLV가 없다

즉, optional field 표현이 자연스럽다.

### 3.6 nested TLV도 가능하다

하나의 value 안에 또 다른 TLV 집합을 넣을 수도 있다.  
즉, TLV는 계층 구조로도 확장될 수 있다.

예를 들어:

- type 10 = profile blob
- 그 value 안에는 또 여러 TLV 필드가 들어 있음

즉, TLV는 flat format뿐 아니라 nested format도 만들 수 있다.

---

## 4. 핵심 구성 요소

### 4.1 Type

필드 종류를 식별하는 값이다.  
이 값이 parser에게 해석 규칙을 알려 준다.

### 4.2 Length

value 길이를 나타낸다.  
parser가 경계를 정확히 파악하고 skip할 수 있게 해 준다.

### 4.3 Value

실제 payload다.  
type에 따라 의미가 달라진다.

### 4.4 self-describing field

필드 스스로 자기 종류와 길이를 포함하는 성질이다.  
TLV의 본질적 강점이다.

### 4.5 skip-unknown capability

알 수 없는 type을 길이만큼 건너뛸 수 있는 능력이다.  
확장성과 호환성의 핵심이다.

### 4.6 schema evolution friendliness

새 필드를 추가해도 구버전 파서가 전체를 망치지 않고 일부를 무시할 수 있는 성질이다.  
TLV가 실무에서 자주 쓰이는 큰 이유다.

---

## 5. 실행 흐름 또는 처리 순서

다음 같은 TLV 스트림을 가정하자.

```
[T=1][L=4][....]
[T=2][L=3][....]
[T=9][L=5][....]
[T=3][L=1][....]
```

그리고 parser는 type 1, 2, 3만 알고 있다고 하자.

### 5.1 첫 번째 TLV 읽기

parser는 먼저 T=1을 읽는다.  
이건 아는 type이다.

그 다음 L=4를 읽고, value 4바이트를 해당 규칙에 맞게 해석한다.

### 5.2 두 번째 TLV 읽기

다음으로 T=2를 읽는다.  
이것도 아는 type이므로, L=3만큼 읽고 적절히 처리한다.

### 5.3 세 번째 TLV에서 unknown type 등장

이제 T=9를 읽는다.  
parser는 이 type을 모른다.

하지만 L=5라는 length를 읽을 수 있다.  
따라서 value 5바이트를 그냥 건너뛴다.

즉, unknown field 때문에 전체 parsing이 깨지지 않는다.

### 5.4 다음 TLV로 정상 진행

그 다음 T=3을 읽고 처리한다.  
즉, 중간 unknown field가 있어도 나머지 메시지를 계속 읽을 수 있다.

### 5.5 확장성 확보

나중에 새 버전 writer가 type 9를 추가하더라도  
구버전 parser는 그것을 skip하고 계속 동작할 수 있다.

이게 TLV의 실질적 힘이다.

---

## 6. 성능 / 최적화 관점

### 6.1 TLV는 고정 필드 포맷보다 오버헤드가 있다

각 필드마다 type과 length가 붙으므로  
고정 구조 포맷보다 헤더 오버헤드가 있다.

즉, 매우 작은 필드가 많으면 공간 효율이 떨어질 수 있다.

### 6.2 하지만 유연성과 확장성이 큰 장점이다

고정 필드 포맷은 compact할 수 있지만  
확장과 부분 파싱이 어렵다.

TLV는 약간의 공간/파싱 오버헤드를 내고  
확장성, 선택적 필드, skip unknown 능력을 얻는다.

즉, 성능만 볼 것이 아니라 protocol lifecycle 전체를 봐야 한다.

### 6.3 부분 파싱이 가능할 수 있다

필요한 type만 골라 읽고 나머지는 skip할 수 있다.  
즉, 모든 필드를 다 materialize하지 않고도 관심 필드만 처리할 수 있다.

이건 큰 메시지에서 유리할 수 있다.

### 6.4 parser 구현이 더 안전해질 수도 있다

고정 구조 바이너리에서 오프셋 계산을 하드코딩하는 것보다,  
TLV는 경계가 명시되어 있어 parser state machine을 더 명확히 짤 수 있다.

물론 length 검증이 전제되어야 한다.

---

## 7. 어디서부터 고정 구조 직관과 확장 가능한 조각 구조가 갈리는가

### 7.1 TLV는 단순 포맷 모양이 아니라 경계와 의미를 함께 명시하는 방식이다

초보자는 TLV를 `[type][length][value]` 모양 하나로만 외우기 쉽다.  
하지만 핵심은 각 필드가 자기 경계와 의미를 함께 가진다는 데 있다.

즉, TLV는 바이트 배열이 아니라  
자기 설명적 조각들의 집합으로 읽어야 한다.

### 7.2 고정 필드 포맷의 compact함과 TLV의 확장성은 서로 다른 가치다

고정 구조는 오버헤드가 적고 단순할 수 있다.  
반면 TLV는 type/length 오버헤드를 내고  
확장성과 unknown skip 능력을 얻는다.

즉, 이 선택은 공간 효율과 수명 주기 유연성의 trade-off다.

### 7.3 길이가 있다는 사실만으로 안전성이 자동 확보되지는 않는다

TLV는 경계 명시에 유리하지만  
length 검증을 빼먹으면 오히려 parser 전체가 흔들릴 수 있다.

즉, length 정보는 안전성의 재료이지  
자동 안전 장치 자체는 아니다.

### 7.4 TLV의 힘은 모르는 필드를 견디는 능력에 있다

필드 순서 고정 의존성이 줄고,  
unknown type을 길이 기준으로 건너뛸 수 있다는 점이  
장기 evolution에서 큰 장점이 된다.

즉, TLV는 compact encoding보다  
확장성 친화적 경계 모델로 이해하는 편이 정확하다.

### 7.5 type namespace 설계도 TLV 자체만큼 중요하다

type 값 충돌, reserved range, critical/non-critical 구분 정책이 없으면  
TLV 모양을 써도 실제 프로토콜은 금방 혼란스러워질 수 있다.

즉, TLV는 포맷 패턴과 identifier 정책을 함께 설계해야 한다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 확장 가능성이 중요한 프로토콜이라면 TLV를 적극 검토한다

필드 추가 가능성, optional field, backward/forward compatibility가 중요하면  
TLV는 매우 강력한 선택이다.

### 8.2 매우 작은 고정 메시지에는 과할 수 있다

필드 종류와 순서가 절대 바뀌지 않고  
매우 compact해야 하는 작은 메시지라면 TLV 오버헤드가 부담일 수 있다.

즉, TLV는 만능이 아니라 목적 적합성이 중요하다.

### 8.3 unknown type 처리 정책을 명확히 한다

TLV를 쓰면 “모르면 skip”이 가능하다.  
하지만 실제 시스템 정책은 더 명확해야 한다.

- 무조건 skip하는가
- critical type은 모르면 에러인가
- duplicate type은 허용하는가
- 순서가 중요한 type이 있는가

즉, TLV도 schema 규칙이 필요하다.

### 8.4 length 검증은 절대 생략하지 않는다

TLV는 length에 크게 의존하므로  
잘못된 length를 허용하면 parser 전체가 무너질 수 있다.

즉, 다음을 반드시 확인해야 한다.

- 버퍼 범위 초과 여부
- 정책상 최대 길이 초과 여부
- nested TLV에서 총 길이 일관성

### 8.5 Type 값 공간도 설계해야 한다

type 번호를 어떻게 배정할지,  
reserved range를 둘지,  
vendor-specific extension을 허용할지 같은 문제도 중요하다.

즉, TLV는 필드 구조뿐 아니라 identifier namespace 설계도 포함한다.

---

## 9. 판단 체크리스트

- TLV를 단순 바이트 모양이 아니라 경계와 의미를 함께 가진 조각 구조로 이해하고 있는가
- 고정 필드 포맷의 compact함과 TLV의 확장성을 다른 가치로 보고 있는가
- length가 있다고 해서 자동 안전해진다고 생각하고 있지 않은가
- unknown type을 견디는 능력이 TLV의 핵심 장점임을 의식하고 있는가
- type namespace와 critical 정책을 포맷 구조와 함께 설계하고 있는가

---

## 10. 더 깊게 볼 포인트

### 10.1 BER/DER 같은 ASN.1 계열 TLV

TLV 계열 포맷이 실제 표준 시스템에서 어떻게 쓰이는지로 확장할 수 있다.

### 10.2 nested TLV parser

재귀적 TLV 구조를 안전하게 파싱하는 방법으로 이어질 수 있다.

### 10.3 critical vs non-critical extension

알 수 없는 type을 언제 skip하고 언제 실패해야 하는지 프로토콜 정책 설계로 확장할 수 있다.

### 10.4 varint length / compact encoding

작은 필드 오버헤드를 줄이기 위한 길이 표현 최적화로 이어질 수 있다.

### 10.5 protocol versioning strategy

버전 번호를 따로 둘지, TLV 확장만으로 버전 진화를 처리할지 설계 주제로 이어질 수 있다.

---

## 정리

TLV(Type-Length-Value)는 확장 가능한 바이너리 포맷 설계의 핵심 패턴 중 하나다.

핵심은 다음과 같다.

- TLV는 `[type][length][value]` 구조를 가진다.
- type은 필드 의미를, length는 경계를, value는 실제 데이터를 나타낸다.
- 길이 덕분에 unknown type도 안전하게 skip할 수 있다.
- 필드 순서 고정 의존성이 줄고 optional field 표현이 쉬워진다.
- nested structure로도 확장할 수 있다.
- 대신 type/length 오버헤드와 설계 복잡도가 늘 수 있다.
- length 검증과 type 정책은 필수다.

즉, TLV를 이해한다는 것은  
단순히 포맷 모양 하나를 아는 것이 아니라  
**가변 길이 데이터와 확장 가능한 필드를 포함하는 프로토콜을, 경계와 의미를 함께 명시하는 자기 설명적 조각들로 안전하게 설계할 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 schema evolution, framed protocol, binary parser, 네트워크 메시지 설계를 훨씬 더 안정적으로 다룰 수 있다.
