---
title: "schema evolution은 왜 중요한가"
permalink: /foundations/languages/c/binary-layout/deep-dive/schema-evolution은-왜-중요한가/
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
tags: [c, serialization, schema-evolution, compatibility, protocol, tlv, versioning]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

직렬화, 바이너리 포맷, length-prefixed format, TLV까지 이해했다면  
다음에는 반드시 이런 질문이 생긴다.

- 포맷은 한 번 정하면 영원히 그대로여야 하는가
- 나중에 필드를 추가하면 기존 프로그램은 깨지지 않는가
- 새 버전 writer가 만든 데이터를 옛 reader가 읽을 수 있는가
- 반대로 옛 writer 데이터도 새 reader가 읽을 수 있는가
- “버전 2”가 되면 그냥 struct에 필드 하나 더 붙이면 되는가

이 문제를 다루는 핵심 개념이 바로 **schema evolution**이다.

초보자는 종종 포맷을 이렇게 생각한다.

- 지금 필요한 필드를 정의한다
- 저장한다
- 읽는다
- 끝이다

하지만 실제 시스템은 그렇게 멈추지 않는다.  
프로그램은 바뀌고, 요구사항은 늘고, 데이터 수명은 코드 수명보다 길어지는 경우가 많다.

예를 들어 오늘은 이런 구조였다고 하자.

- id
- name

그런데 나중에 다음이 필요해질 수 있다.

- created_at
- flags
- optional metadata
- locale
- new enum values

이때 schema evolution을 생각하지 않고 포맷을 만들면  
아주 쉽게 다음 문제가 생긴다.

- 새 writer가 만든 데이터를 옛 reader가 못 읽음
- 옛 데이터가 새 코드에서 의미를 잃음
- 필드 순서 하나 바꿨는데 전체 호환성 붕괴
- optional field 추가가 불가능
- 버전이 바뀔 때마다 전체 재배포 필요
- 파일 포맷과 프로토콜이 쉽게 깨짐

즉, 포맷 설계는 현재 시점 기능만 맞추는 것으로 끝나지 않는다.  
처음부터 **변화 가능성**을 고려해야 한다.

TLV가 자주 쓰이는 이유 중 하나도 바로 여기 있다.  
unknown field를 skip할 수 있기 때문에 schema evolution에 유리하다.

하지만 TLV만 쓴다고 자동 해결되는 것은 아니다.  
중요한 것은 다음이다.

- 어떤 필드는 필수인가
- 어떤 필드는 선택적인가
- unknown field는 어떻게 처리하는가
- enum 값이 늘어나면 어떻게 할 것인가
- type 의미를 바꿔도 되는가
- 삭제된 필드는 어떻게 다룰 것인가

즉, schema evolution은 단순 버전 번호 문제가 아니라  
**데이터 계약을 시간이 지나도 유지·확장하는 설계 문제**다.

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- 포맷 설계를 “현재 구조체 정의”에서 “장기 데이터 계약”으로 끌어올려 준다
- backward compatibility와 forward compatibility를 구분하게 해 준다
- TLV, length-prefixed format, text/binary format 선택이 왜 중요한지 더 선명하게 보여 준다
- 네트워크 프로토콜, 파일 포맷, 저장 데이터, IPC 메시지 설계를 더 현실적으로 보게 해 준다
- “필드 하나 추가”가 왜 단순 코드 수정이 아닌지 이해하게 해 준다

이 문서는 schema evolution이 무엇인지, 왜 중요한지,  
backward/forward compatibility는 어떻게 다른지,  
실무에서 어떤 규칙으로 포맷을 진화시켜야 하는지 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

schema evolution을 큰 구조로 보면 다음과 같다.

### 2.1 schema는 데이터 구조에 대한 계약이다

schema는 단순 필드 목록이 아니다.  
실제로는 다음을 포함하는 계약이다.

- 어떤 필드가 있는가
- 각 필드 타입은 무엇인가
- 길이/표현 방식은 무엇인가
- 필수 필드와 선택 필드는 무엇인가
- unknown field 처리 규칙은 무엇인가

즉, schema는 데이터 해석의 규칙 전체다.

### 2.2 evolution은 그 계약이 시간이 지나며 바뀌는 것이다

프로그램이 바뀌면 schema도 바뀔 수 있다.

예를 들어:

- 필드 추가
- 필드 삭제
- 필드 이름 변경
- 타입 변경
- enum 값 추가
- nested 구조 확장

즉, schema evolution은 “포맷이 시간이 지나며 진화하는 과정”이다.

### 2.3 핵심 문제는 호환성이다

포맷이 바뀌는 것 자체는 피할 수 없는 경우가 많다.  
중요한 것은 바뀐 뒤에도 누가 누구를 읽을 수 있느냐다.

즉, schema evolution의 핵심 질문은 다음이다.

- 새 reader가 옛 data를 읽을 수 있는가
- 옛 reader가 새 data를 어느 정도 처리할 수 있는가

### 2.4 backward compatibility와 forward compatibility를 구분해야 한다

이 둘은 비슷해 보여도 다르다.

- **backward compatibility**: 새 시스템이 옛 데이터를 읽을 수 있는가
- **forward compatibility**: 옛 시스템이 새 데이터를 읽을 수 있는가

즉, 호환성 방향을 구분해야 설계가 명확해진다.

---

## 3. 내부 동작 원리

### 3.1 backward compatibility는 새 코드가 옛 형식을 이해하는 문제다

예를 들어 버전 1 데이터가 다음 구조였다고 하자.

- id
- name

버전 2에서 다음이 추가되었다.

- id
- name
- created_at

이때 버전 2 reader가 버전 1 data를 읽을 수 있다면  
backward compatible하다고 볼 수 있다.

즉, 새 코드가 옛 형식을 이해할 수 있게 설계하는 것이 backward compatibility다.

보통 이건 비교적 쉬운 편이다.  
새 코드가 “없는 필드는 기본값 처리”를 해 줄 수 있기 때문이다.

### 3.2 forward compatibility는 옛 코드가 새 형식을 견디는 문제다

반대로 버전 1 reader가 버전 2 data를 만났다고 하자.  
새 필드 `created_at`를 모른다.

이때도 나머지 핵심 필드를 읽고 진행할 수 있어야 한다면  
forward compatible한 설계가 된다.

즉, 옛 코드가 새 필드를 **무시하거나 skip할 수 있는가**가 핵심이다.

이 점에서 TLV나 self-describing format이 유리하다.

### 3.3 필드 추가는 가장 흔한 진화 방식이다

대부분의 evolution은 새 필드 추가에서 시작한다.  
예를 들어:

- 새로운 optional metadata
- 새 플래그
- 새 timestamp
- 확장 정보 blob

이때 좋은 schema는 “모르는 필드를 버릴 수 있게” 설계되어 있어야 한다.

즉, 필드 추가는 호환성 테스트의 첫 번째 기준이다.

### 3.4 필드 삭제는 생각보다 더 민감하다

필드를 삭제하면 단순히 안 쓰면 된다고 생각하기 쉽다.  
하지만 기존 reader/writer가 그 필드 존재를 기대하고 있을 수 있다.

즉, 삭제는 다음을 고민해야 한다.

- 물리적으로 제거할 것인가
- deprecated로 남겨 둘 것인가
- reserved slot으로 비워 둘 것인가

필드 삭제는 추가보다 더 조심해야 한다.

### 3.5 필드 의미 변경은 가장 위험하다

예를 들어 `type=3`이 원래 “seconds”였는데  
나중에 “milliseconds”로 의미를 바꾸면 어떨까.

겉보기에는 같은 필드, 같은 타입처럼 보여도  
해석 의미가 바뀌므로 사실상 호환성이 깨진다.

즉, 필드 의미를 재정의하는 것은  
겉보기 호환성과 실제 의미 호환성을 동시에 깨뜨릴 수 있다.

### 3.6 enum 확장도 schema evolution 문제다

enum 값이 늘어나는 것도 흔하다.

예를 들어:

- 0 = guest
- 1 = user
- 2 = admin

이 상태에서 새 값 3 = system을 추가하면  
옛 코드가 3을 만났을 때 어떻게 해야 하는지 정의가 필요하다.

즉, enum도 “미래의 알 수 없는 값”을 고려해 설계해야 한다.

### 3.7 unknown field를 보존할지, 버릴지도 설계 문제다

일부 시스템은 모르는 필드를 그냥 무시한다.  
일부 시스템은 읽어서 다시 쓸 때 unknown field를 그대로 유지한다.

이건 단순 구현 차이가 아니라 evolution 전략 차이다.

즉, parser뿐 아니라 re-serialization 전략까지 schema evolution에 영향을 준다.

---

## 4. 핵심 구성 요소

### 4.1 schema

데이터 구조와 해석 규칙의 계약이다.

### 4.2 schema evolution

그 계약이 시간이 지나면서 바뀌는 과정이다.

### 4.3 backward compatibility

새 코드가 옛 데이터를 읽을 수 있는 성질이다.

### 4.4 forward compatibility

옛 코드가 새 데이터를 어느 정도 처리할 수 있는 성질이다.

### 4.5 optional field

없어도 되는 필드다.  
evolution에서 매우 중요하다.

### 4.6 unknown field handling

모르는 필드를 어떻게 처리할지에 대한 정책이다.  
skip, reject, preserve 등 다양한 전략이 있다.

### 4.7 deprecation

즉시 제거하지 않고 더 이상 권장되지 않는 상태로 두는 것이다.  
schema 진화에서 안전한 전환 전략과 연결된다.

---

## 5. 실행 흐름 또는 처리 순서

다음과 같은 evolution 시나리오를 생각해보자.

버전 1:

- type 1 = id
- type 2 = name

버전 2:

- type 1 = id
- type 2 = name
- type 3 = created_at

### 5.1 버전 1 writer → 버전 2 reader

버전 1 메시지에는 `created_at`가 없다.  
버전 2 reader는 type 1, 2를 읽고 type 3이 없으면 기본값 처리할 수 있다.

즉, backward compatibility 확보가 가능하다.

### 5.2 버전 2 writer → 버전 1 reader

버전 2 메시지에는 type 3이 추가된다.  
버전 1 reader는 type 1, 2는 알고 있고 type 3은 모른다.

TLV라면:

- type 3 확인
- 모르는 type
- length만큼 skip
- 계속 parsing

즉, forward compatibility도 가능해진다.

### 5.3 필드 의미 변경 시 문제 발생

만약 type 2가 원래 plain UTF-8 name이었는데  
버전 3에서 compressed blob으로 의미가 바뀌었다고 하자.

이 경우 옛 reader는 type 2를 “안다”고 생각하고 잘못 해석하게 된다.

즉, unknown field보다 더 위험한 것은  
**같은 field id에 다른 의미를 덮어씌우는 것**이다.

### 5.4 deprecated field 처리

더 이상 쓰지 않는 필드는 즉시 재사용하지 않는 편이 좋다.  
옛 시스템이 여전히 그 의미를 기대할 수 있기 때문이다.

즉, field id 재사용은 매우 위험할 수 있다.

---

## 6. 성능 / 최적화 관점

### 6.1 evolution 친화적 포맷은 오버헤드가 있을 수 있다

optional field, type id, length, version handling, unknown skip 정책은  
고정 포맷보다 약간의 공간/파싱 비용을 추가할 수 있다.

즉, 확장성을 얻는 대신 약간의 오버헤드를 감수하는 경우가 많다.

### 6.2 하지만 장기 운영 비용을 크게 줄일 수 있다

포맷이 조금 커지더라도,  
새 버전과 옛 버전이 공존 가능하고 점진적 배포가 가능하면  
전체 시스템 운영 비용은 훨씬 줄 수 있다.

즉, evolution 설계는 단기 성능보다 장기 운영비 절감과 연결된다.

### 6.3 무리한 compact fixed format은 이후 비용을 폭발시킬 수 있다

초기에 “가장 작은 포맷”만 추구해서  
확장성과 optional field를 전혀 고려하지 않으면  
나중에는 버전 업마다 프로토콜 전체를 갈아엎어야 할 수 있다.

즉, compact함이 항상 총비용 최적은 아니다.

### 6.4 parser simplicity와 compatibility flexibility의 균형이 필요하다

지나치게 유연한 포맷은 파서가 복잡해질 수 있다.  
반대로 너무 고정된 포맷은 진화가 어렵다.

즉, schema evolution은 유연성과 단순성의 균형 문제다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 필드 추가를 기본 진화 방식으로 설계한다

가장 안전한 evolution은 보통 “새 필드를 추가하고, 옛 필드는 유지하는 것”이다.

즉, 처음부터 optional field와 unknown field skip을 염두에 두는 편이 좋다.

### 7.2 필드 의미를 재정의하지 않는다

같은 field id, 같은 key, 같은 tag에  
다른 의미를 부여하는 것은 매우 위험하다.

즉, 의미가 바뀌면 새 type/tag/id를 쓰는 편이 안전하다.

### 7.3 삭제보다 deprecate를 먼저 고려한다

실무에서는 필드를 바로 없애기보다  
deprecated 상태로 유지하면서 점진적으로 사용 중단하는 전략이 더 안전하다.

### 7.4 unknown field 처리 정책을 명확히 문서화한다

다음이 분명해야 한다.

- 모르면 skip 가능한가
- critical field는 모르면 실패해야 하는가
- unknown field를 다시 쓸 때 보존해야 하는가

즉, compatibility는 parser 코드만이 아니라 정책 문서 문제다.

### 7.5 versioning 전략을 schema와 함께 설계한다

버전 번호를 둘지, TLV 확장만으로 갈지,  
major/minor를 어떻게 나눌지 등도 중요하다.

즉, evolution은 필드 규칙과 버전 전략이 함께 가야 한다.

---

## 8. 더 깊게 볼 포인트

### 8.1 explicit version field vs implicit extensibility

포맷에 버전 필드를 둘지, TLV/optional field만으로 확장을 처리할지 비교할 수 있다.

### 8.2 field reservation strategy

미래를 위해 type range나 field id를 예약하는 설계로 확장할 수 있다.

### 8.3 unknown field preservation

읽은 unknown field를 다시 쓸 때 보존하는 전략이 왜 중요한지 더 깊게 볼 수 있다.

### 8.4 enum evolution rules

새 enum 값 추가와 old reader 처리 전략을 더 구체적으로 다룰 수 있다.

### 8.5 compatibility testing

여러 버전 writer/reader 간 조합을 어떻게 테스트할지 실전 전략으로 이어질 수 있다.

---

## 정리

schema evolution은 데이터 포맷을 시간이 지나도 유지·확장 가능하게 만드는 핵심 설계 문제다.

핵심은 다음과 같다.

- schema는 데이터 구조와 해석 규칙의 계약이다.
- evolution은 그 계약이 시간이 지나며 바뀌는 과정이다.
- backward compatibility는 새 코드가 옛 데이터를 읽는 능력이다.
- forward compatibility는 옛 코드가 새 데이터를 견디는 능력이다.
- 필드 추가는 가장 흔하고 비교적 안전한 진화 방식이다.
- 필드 삭제와 의미 변경은 더 위험하다.
- unknown field skip, optional field, TLV 같은 기법은 evolution 친화적이다.
- compatibility는 포맷 구조뿐 아니라 정책과 문서화가 함께 필요하다.

즉, schema evolution을 이해한다는 것은  
단순히 “버전이 바뀐다”를 아는 것이 아니라  
**데이터 계약이 시간이 지나며 바뀌더라도 시스템 전체가 깨지지 않게, backward/forward compatibility를 의식하며 포맷과 파서를 설계할 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 파일 포맷, 네트워크 프로토콜, 저장 데이터, IPC 메시지 구조를 훨씬 더 장기적이고 안정적으로 설계할 수 있다.
