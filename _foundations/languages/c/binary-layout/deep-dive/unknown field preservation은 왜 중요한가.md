---
title: "unknown field preservation은 왜 중요한가"
permalink: /foundations/languages/c/binary-layout/deep-dive/unknown-field-preservation은-왜-중요한가/
prev_url: /foundations/languages/c/binary-layout/deep-dive/버전-필드는-언제-필요하고-언제-해가-될-수-있는가/
next_url: /foundations/languages/c/binary-layout/deep-dive/golden-corpus는-왜-필요한가/
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
tags: [c, serialization, unknown-field, compatibility, schema-evolution, tlv, protocol]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

schema evolution과 versioning까지 이해했다면, 그다음에는 아주 실무적인 질문이 남는다.

- 모르는 필드는 그냥 버리면 되는가
- old reader가 새 메시지를 읽었다가 다시 저장하거나 전달할 때, 모르는 필드를 유지해야 하는가
- gateway, proxy, relay 같은 중간 계층은 자기에게 불필요한 필드를 어떻게 다뤄야 하는가
- unknown field를 skip하는 것과 preservation하는 것은 무엇이 다른가

초보자는 보통 이렇게 생각한다.

- 모르는 필드는 어차피 내 코드가 못 쓰니 버려도 된다
- unknown field skip만 되면 forward compatibility는 충분하다
- parse만 성공하면 다시 serialize할 때는 내 구조만 쓰면 된다

하지만 실제 시스템에서는 이 생각이 틀릴 수 있다.  
특히 다음 상황에서 문제가 커진다.

- 중간 프록시가 새 필드를 모른 채 메시지를 읽고 다시 써야 하는 경우
- 저장 시스템이 데이터를 일부 수정한 뒤 다시 기록해야 하는 경우
- 여러 버전의 서비스가 같은 메시지를 주고받는 경우
- old tool이 new data를 “읽고 조금 바꾼 뒤” 다시 내보내야 하는 경우

예를 들어 버전 2 메시지에 새로운 필드가 추가되었다고 하자.

- type 1 = id
- type 2 = name
- type 9 = metadata

버전 1 parser는 type 9를 모른다.  
여기서 단순 skip만 하면 “읽는 것”은 성공할 수 있다.  
하지만 그 메시지를 다시 저장하거나 전달할 때 type 9를 버려 버리면 어떻게 될까?

그러면:

- 새 시스템이 넣은 정보가 사라질 수 있다
- 중간 서비스 하나를 통과한 뒤 데이터가 손실될 수 있다
- old component가 new data를 파괴하는 호환성 문제가 생길 수 있다

즉, unknown field 문제는 단순 parser 문제가 아니라  
**데이터 보존(data preservation)** 문제다.

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- forward compatibility를 “읽을 수 있음”과 “보존할 수 있음”으로 더 정교하게 나누게 해 준다
- TLV와 extensible schema 설계가 왜 단순 skip만으로 끝나지 않는지 보여 준다
- proxy, relay, storage, migration tool 같은 중간 계층 설계에 필수적이다
- schema evolution을 파싱 차원에서 데이터 수명 차원으로 확장해 준다
- reserialization이 왜 위험한 지점인지 이해하게 해 준다

이 문서는 unknown field preservation이 무엇인지, 왜 중요한지,  
unknown skip과 무엇이 다른지,  
어떤 시스템에서 특히 중요한지,  
그리고 실무에서 어떤 전략을 써야 하는지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

unknown field preservation 문제를 큰 구조로 보면 다음과 같다.

### 2.1 unknown field skip은 “읽을 때 무시하고 지나가는 것”이다

TLV 같은 포맷에서는 모르는 type을 만나도 length만큼 건너뛰고  
다음 필드를 계속 읽을 수 있다.

즉, skip은 **파싱 지속성**을 보장한다.

### 2.2 unknown field preservation은 “읽은 뒤에도 버리지 않고 유지하는 것”이다

preservation은 더 강한 요구다.  
모르는 필드를 해석하지는 못해도, 그 바이트 표현을 보존했다가  
다시 serialize할 때 원래대로 포함시키는 전략이다.

즉, preservation은 **데이터 지속성**을 보장한다.

### 2.3 skip과 preservation은 전혀 다른 수준의 호환성이다

- skip: 내 parser가 망가지지 않는다
- preservation: 내 component를 거쳐도 남의 정보가 사라지지 않는다

즉, “읽을 수 있다”와 “손상시키지 않는다”는 다르다.

### 2.4 중간 계층에서는 preservation이 특히 중요하다

end-point는 모르는 필드를 버려도 괜찮을 수 있다.  
하지만 relay, proxy, storage, sync tool 같은 중간 계층은  
자기에게 의미 없는 필드도 미래를 위해 보존해야 할 수 있다.

즉, preservation 필요성은 시스템 역할에 따라 달라진다.

---

## 3. 내부 동작 원리

### 3.1 unknown skip만 하면 parse는 성공할 수 있다

예를 들어 TLV 메시지가 다음처럼 왔다고 하자.

- T=1, L=4, value=...
- T=9, L=12, value=...
- T=2, L=3, value=...

old parser는 T=1, T=2만 안다고 하자.  
이 경우 T=9는 length 12만큼 skip하고 나머지를 계속 읽을 수 있다.

즉, 메시지 해석은 계속 가능하다.

### 3.2 하지만 object model로 변환한 순간 unknown field가 사라질 수 있다

문제는 내부 표현으로 바꿀 때 생긴다.

예를 들어 내부 구조체가 다음만 가진다면:

- id
- name

parser는 T=9를 skip만 하고 구조체에는 저장하지 않을 수 있다.  
그 뒤 이 구조체를 다시 serialize하면 T=9는 완전히 사라진다.

즉, parse 성공과 data preservation은 다르다.

### 3.3 preservation은 “모르는 필드의 raw form도 함께 보관”하는 전략이다

unknown field preservation을 하려면 보통 다음이 필요하다.

- 알고 있는 필드는 의미 있는 내부 표현으로 변환
- 모르는 필드는 raw TLV/field blob 형태로 따로 저장
- 다시 serialize할 때 known field와 unknown field를 함께 쓴다

즉, preservation은 “모르지만 잃지 않는 저장 전략”이다.

### 3.4 중간 수정 시 unknown field 손실이 더 위험하다

가장 위험한 상황은 이거다.

1. old component가 new message를 읽음
2. 자신이 아는 필드 하나만 바꿈
3. 다시 전체 메시지를 serialize함
4. 모르는 필드를 다 잃어버림

겉보기에는 “부분 수정”이지만 실제로는 데이터 파괴가 일어난다.

즉, unknown field preservation은 partial update 시스템에서 특히 중요하다.

### 3.5 preservation은 순서와 중복 정책까지 고민하게 만든다

TLV나 유사 포맷에서는 다음도 문제다.

- unknown field 순서를 유지해야 하는가
- 중복 field가 있으면 어떻게 보존하는가
- 같은 type의 반복 field를 그대로 유지할 것인가
- known field를 수정할 때 unknown field의 상대적 위치는 어떻게 되는가

즉, preservation은 단순 raw byte 저장을 넘어서  
**reserialization semantics** 문제로 이어진다.

### 3.6 preservation이 항상 필요한 것은 아니다

모든 시스템이 unknown field를 보존할 필요는 없다.

예를 들어:

- 최종 소비자(end consumer)
- 단방향 파서
- 분석 전용 도구
- strict validator

이런 경우에는 모르는 필드를 skip하거나 reject하면 충분할 수 있다.

즉, preservation 필요성은 역할 기반으로 판단해야 한다.

---

## 4. 핵심 구성 요소

### 4.1 unknown field skip

모르는 필드를 읽을 때 경계만 넘기고 무시하는 전략이다.  
파싱 지속성 확보에 중요하다.

### 4.2 unknown field preservation

모르는 필드를 해석하지는 않지만 raw form으로 보존해  
다시 serialize할 때 손실 없이 유지하는 전략이다.

### 4.3 pass-through component

메시지를 최종 소비하지 않고 중간에서 전달하거나 일부 수정하는 컴포넌트다.  
preservation이 특히 중요하다.

### 4.4 lossy reserialization

parse 후 다시 serialize하는 과정에서  
모르는 필드나 표현 정보가 사라지는 현상이다.

### 4.5 partial update semantics

전체 메시지 중 일부 필드만 수정하는 의미 규칙이다.  
unknown preservation이 없으면 쉽게 깨진다.

### 4.6 raw field storage

모르는 필드를 원본 바이트 덩어리 또는 구조적 blob로 저장하는 방식이다.  
preservation 구현의 핵심이다.

---

## 5. 실행 흐름 또는 처리 순서

다음 같은 TLV 메시지를 생각해보자.

- T=1, L=4, id
- T=2, L=3, name
- T=9, L=8, metadata

버전 1 component는 T=1, T=2만 안다.

### 5.1 skip-only 전략

파서가 다음처럼 동작한다고 하자.

- T=1 읽어서 id 저장
- T=2 읽어서 name 저장
- T=9는 모름 → skip

이후 내부 구조체는 id, name만 가진다.

### 5.2 skip-only 후 재직렬화

이 구조체를 다시 serialize하면:

- T=1
- T=2

만 나간다.  
T=9는 완전히 사라진다.

즉, parse는 성공했지만 preservation은 실패했다.

### 5.3 preservation 전략

이번에는 파서가 다음처럼 동작한다.

- T=1 읽어서 id 저장
- T=2 읽어서 name 저장
- T=9는 모름 → raw TLV blob로 unknown_fields에 저장

이제 내부 표현은:

- known fields
- unknown raw fields

를 함께 가진다.

### 5.4 preservation 후 재직렬화

다시 serialize할 때:

- 수정된 known field 기록
- preserved unknown field도 함께 기록

이렇게 하면 T=9가 유지된다.

즉, old component가 new data를 통과시켜도 정보가 사라지지 않는다.

---

## 6. 성능 / 최적화 관점

### 6.1 preservation은 메모리와 코드 복잡도를 늘릴 수 있다

unknown field raw blob를 저장해야 하므로  
메모리 사용량과 parser complexity가 증가할 수 있다.

즉, preservation은 무료가 아니다.

### 6.2 하지만 distributed evolution 비용을 크게 줄일 수 있다

구버전 서비스가 신버전 메시지를 파괴하지 않게 되면  
롤링 업그레이드, 점진 배포, mixed-version 운영이 훨씬 쉬워진다.

즉, preservation은 런타임 비용을 내고 운영 안정성을 사는 전략일 수 있다.

### 6.3 end-point보다 middlebox에서 가치가 크다

최종 소비자는 unknown field를 버려도 큰 문제가 아닐 수 있다.  
반면 중간 계층은 preservation 가치가 훨씬 크다.

즉, 모든 컴포넌트에 일률적으로 적용할 필요는 없고  
역할에 따라 선택적으로 적용하는 것이 현실적이다.

### 6.4 canonical reserialization과 preservation reserialization은 비용 모델이 다르다

어떤 시스템은 읽어서 canonical form으로 다시 쓰고 싶어 한다.  
어떤 시스템은 unknown field를 byte-exact에 가깝게 유지하고 싶어 한다.

즉, preservation 수준에 따라 reserialization 비용과 의미가 달라진다.

---

## 7. 어디서부터 parse 성공과 정보 보존이 갈리는가

### 7.1 unknown field를 skip할 수 있다는 것과 다시 살려낼 수 있다는 것은 다르다

많은 사람이 "모르는 필드를 넘길 수 있으면 충분하다"고 생각한다.  
하지만 중간 계층에서는 parse 성공만으로는 부족하고,  
다시 serialize할 때 그 정보가 살아 있어야 할 수 있다.

즉, parse success와 information preservation은 다른 층이다.

### 7.2 end-point와 transit node는 요구가 다를 수 있다

최종 소비자는 모르는 필드를 버려도 큰 문제가 없을 수 있다.  
반면 relay, gateway, partial update store는  
모르는 필드를 잃으면 미래 데이터 계약을 파괴할 수 있다.

즉, preservation 필요성은 컴포넌트 역할에 따라 달라진다.

### 7.3 unknown field preservation은 parser 세부 기능이 아니라 evolution 정책이다

raw blob를 어떻게 들고 다닐지,  
순서를 보존할지, duplicate field를 어떻게 다룰지는  
실제로 schema evolution 정책과 연결된다.

즉, 구현 디테일처럼 보여도  
장기 호환성 계약 일부다.

### 7.4 partial update 시스템에서는 손실 없는 재직렬화가 핵심일 수 있다

일부 필드만 수정하고 나머지는 유지해야 하는 시스템에서는  
unknown field를 잃는 순간 의도치 않은 lossy transform이 된다.

즉, preservation은 특히 partial update와 mixed-version 경계에서 중요하다.

### 7.5 preservation 수준은 byte-exact 보존과 의미 보존 사이에서 설계해야 한다

어떤 시스템은 원본에 최대한 가깝게 다시 써야 하고,  
어떤 시스템은 의미만 유지하면 충분할 수 있다.

즉, preservation도 하나가 아니라  
어느 수준까지 보존할지 정책을 정해야 한다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 내 컴포넌트가 end-point인지 transit node인지 먼저 구분한다

이 질문이 가장 중요하다.

- 최종 소비자인가
- 중간 전달자인가
- 일부 수정 후 다시 저장하는가

중간 계층일수록 preservation 필요성이 커진다.

### 8.2 partial update 시스템에서는 preservation을 강하게 고려한다

일부 필드만 수정하고 나머지는 유지해야 하는 시스템에서는  
unknown field 손실이 매우 위험하다.

예를 들어 config store, metadata store, gateway, sync engine 같은 곳이 여기에 가깝다.

### 8.3 unknown field를 버리면 lossy transformation임을 명시해야 한다

preservation을 안 하기로 했다면  
그 컴포넌트가 메시지를 lossy하게 변환할 수 있다는 사실을 문서화해야 한다.

즉, 침묵 속 데이터 손실이 가장 위험하다.

### 8.4 preservation 정책은 포맷 설계와 함께 정해야 한다

단순 parser 구현 문제가 아니다.  
다음이 함께 정의되어야 한다.

- unknown field를 보존하는가
- 순서를 보존하는가
- duplicate field를 보존하는가
- canonicalization 시 어떤 field는 재배치되는가

즉, schema policy의 일부다.

### 8.5 테스트에서 mixed-version round-trip을 반드시 본다

다음 같은 테스트가 중요하다.

- new message → old reader → reserialize → new reader
- unknown field가 사라지지 않는가
- 일부 필드만 수정했을 때 다른 필드가 손실되지 않는가

즉, preservation은 실제 round-trip test로 검증해야 한다.

---

## 9. 판단 체크리스트

- unknown field skip과 unknown field preservation을 다른 문제로 보고 있는가
- 내 컴포넌트 역할이 end-point인지 transit node인지 먼저 구분하고 있는가
- preservation을 parser 기능이 아니라 evolution 정책으로 이해하고 있는가
- partial update 시스템에서 손실 없는 재직렬화가 중요한지 판단하고 있는가
- preservation 수준을 byte-exact 보존과 의미 보존 사이에서 명시적으로 정하고 있는가

---

## 10. 더 깊게 볼 포인트

### 10.1 protobuf unknown fields

실제 시스템이 unknown field preservation을 어떻게 다루는지 사례 기반으로 확장할 수 있다.

### 10.2 canonical form vs original form preservation

원본 바이트를 최대한 그대로 보존할지, 의미만 보존할지 더 깊게 비교할 수 있다.

### 10.3 patch/merge semantics

부분 업데이트와 병합 로직에서 unknown field preservation이 어떤 의미를 가지는지 확장할 수 있다.

### 10.4 gateway protocol translation

서로 다른 버전 또는 서로 다른 프로토콜 사이를 중계할 때 preservation이 어떻게 작동해야 하는지로 이어질 수 있다.

### 10.5 storage migration tools

옛 데이터를 새 형식으로 변환할 때 unknown field를 어떻게 다뤄야 하는지 실무 문제로 확장할 수 있다.

---

## 정리

unknown field preservation은 schema evolution에서 매우 중요한 설계 주제다.

핵심은 다음과 같다.

- unknown field skip은 파싱을 계속하게 해 준다.
- unknown field preservation은 다시 serialize할 때도 모르는 필드를 잃지 않게 해 준다.
- parse 성공과 data preservation은 다르다.
- 중간 계층, partial update 시스템, relay/proxy/storage 컴포넌트에서는 preservation이 특히 중요하다.
- preservation을 하려면 모르는 필드를 raw form으로 따로 저장하는 전략이 필요하다.
- 모든 시스템에 preservation이 필요한 것은 아니며 역할에 따라 선택해야 한다.
- preservation 정책은 parser 구현 세부가 아니라 schema evolution 정책의 일부다.

즉, unknown field preservation을 이해한다는 것은  
단순히 “모르는 필드는 넘긴다”를 아는 것이 아니라  
**버전이 다른 시스템이 공존할 때, 내가 이해하지 못하는 미래의 데이터까지 중간 계층이 파괴하지 않도록 메시지와 저장 포맷을 설계할 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 mixed-version 시스템, 중간 프록시, 저장 포맷, 장기 호환성 설계를 훨씬 더 안정적으로 다룰 수 있다.
