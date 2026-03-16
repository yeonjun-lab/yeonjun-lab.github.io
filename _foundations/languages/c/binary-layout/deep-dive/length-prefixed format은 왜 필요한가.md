---
title: "length-prefixed format은 왜 필요한가"
permalink: /foundations/languages/c/binary-layout/deep-dive/length-prefixed-format은-왜-필요한가/
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
tags: [c, serialization, binary-format, length-prefix, protocol, parsing, safety]
---

## 1. 왜 이 주제를 깊게 봐야 하는가

텍스트 직렬화와 바이너리 직렬화의 차이를 이해했다면,  
다음으로 반드시 보게 되는 문제가 있다.  
바로 **가변 길이 데이터(variable-length data)를 어떻게 표현할 것인가**다.

고정 크기 정수는 비교적 쉽다.

- 4바이트 정수
- 8바이트 정수
- 1바이트 플래그

이런 값은 경계가 명확하다.  
하지만 문자열, 바이트 배열, 리스트, 가변 길이 payload는 그렇지 않다.

예를 들어 문자열 `"aki"`를 바이너리 포맷에 넣는다고 하자.  
이때 곧바로 질문이 생긴다.

- 문자열이 어디서 끝나는가
- 다음 필드는 어디서 시작하는가
- 중간에 0바이트가 들어오면 어떻게 되는가
- 파서는 몇 바이트를 읽어야 하는가
- 잘못된 입력이 오면 어디서 멈춰야 하는가

초보자는 종종 이렇게 생각한다.

- 문자열 끝에 `'\0'` 넣으면 되지 않나
- 구분자 하나 정하면 되지 않나
- 그냥 끝날 때까지 읽으면 되지 않나

하지만 이 방식은 상황에 따라 위험하거나 부적절할 수 있다.  
특히 바이너리 프로토콜, 네트워크 메시지, 파일 포맷에서는  
구분자 방식만으로는 안전성과 효율성을 확보하기 어렵다.

이때 자주 등장하는 방식이 바로 **length-prefixed format**이다.

예를 들어:

- 먼저 길이 4바이트
- 그 다음 실제 데이터 N바이트

이런 식으로 표현하는 방식이다.

예시:

```
[length=3][a][k][i]
```

혹은 더 일반적으로:

```
[u32 length][payload bytes...]
```

겉보기에는 단순하다.  
하지만 이 방식은 매우 중요하다.  
왜냐하면 다음을 가능하게 하기 때문이다.

- 정확한 경계 파악
- 중간에 0바이트가 있어도 안전
- binary payload 처리 가능
- 버퍼 검증 가능
- parsing 상태 기계 구현 용이
- 네트워크 프레이밍 명확화

즉, length-prefixed format은 단순 포맷 기법이 아니라  
**가변 길이 데이터를 안전하고 명확하게 다루기 위한 핵심 계약 방식**이다.

이 주제를 깊게 봐야 하는 이유는 다음과 같다.

- “경계(boundary)”가 왜 바이너리 파싱의 핵심인지 이해하게 해 준다
- 문자열/바이트 배열/메시지 프레이밍을 하나의 관점으로 보게 해 준다
- null-terminated 방식과 delimiter 방식의 한계를 분명히 보여 준다
- 역직렬화에서 길이 검증이 왜 중요한지 연결해 준다
- 이후 TLV, framed protocol, schema evolution, streaming parser로 자연스럽게 이어진다

이 문서는 length-prefixed format이 무엇인지, 왜 필요한지,  
delimiter 기반 방식과 무엇이 다른지,  
어떤 장점과 위험이 있는지,  
그리고 실무에서 어떻게 설계해야 하는지를 깊게 정리하기 위해 작성한다.

---

## 2. 전체 구조

length-prefixed format을 큰 구조로 보면 다음과 같다.

### 2.1 가변 길이 데이터는 경계 정보가 필요하다

고정 길이 필드는 경계를 따로 저장하지 않아도 된다.  
예를 들어 4바이트 정수는 언제나 4바이트다.

하지만 문자열과 payload는 길이가 달라질 수 있다.  
따라서 파서는 다음을 알아야 한다.

- 어디서 시작하는가
- 몇 바이트를 읽어야 하는가
- 어디서 끝나는가

즉, 가변 길이 데이터는 반드시 **경계 정보**가 필요하다.

### 2.2 length-prefixed format은 “길이 + 데이터” 구조다

가장 기본적인 형태는 다음과 같다.

```
[length][data]
```

예를 들어 문자열 `"hello"`를 저장한다면:

```
[5]["hello"]
```

라고 생각할 수 있다.

즉, 실제 데이터를 읽기 전에  
먼저 몇 바이트를 읽어야 하는지 알려주는 방식이다.

### 2.3 delimiter 방식과는 다르다

delimiter 방식은 특정 구분 문자를 만나면 끝난다고 보는 방식이다.

예를 들어 텍스트에서는:

```
hello\n
```

처럼 줄바꿈을 구분자로 사용할 수 있다.

하지만 length-prefixed는 구분자에 의존하지 않는다.  
길이가 곧 경계를 정한다.

즉, “끝나는 문자를 찾는 방식”이 아니라  
“처음부터 길이를 명시하는 방식”이다.

### 2.4 binary data에 특히 잘 맞는다

텍스트 데이터는 구분자를 사용할 수 있는 경우가 많다.  
하지만 바이너리 데이터는 중간에 어떤 바이트든 들어올 수 있다.

예를 들어 payload 안에 `0x00`, `0x0A`, `0xFF` 같은 값이 있어도  
그 자체가 데이터일 수 있다.

즉, binary payload를 안정적으로 다루려면  
length-prefixed 방식이 훨씬 자연스럽다.

---

## 3. 내부 동작 원리

### 3.1 parser는 먼저 길이를 읽는다

length-prefixed 포맷의 핵심 흐름은 다음과 같다.

1. 길이 필드를 읽는다
2. 그 길이가 의미 있는지 검증한다
3. 정확히 그 길이만큼 payload를 읽는다

즉, 파싱 순서가 **header → payload** 구조가 된다.

### 3.2 길이 필드가 boundary를 결정한다

예를 들어 다음 구조를 생각하자.

```
[u32 length][payload]
```

여기서 `length = 8`이라면  
파서는 바로 다음 8바이트가 payload라는 것을 안다.

즉, payload 내용 자체를 해석하기 전에  
이미 경계를 확보할 수 있다.

이게 매우 중요하다.  
왜냐하면 파서가 “어디까지 읽어야 하는가”를 미리 알 수 있기 때문이다.

### 3.3 delimiter search가 필요 없다

delimiter 기반 포맷은 끝 문자를 찾을 때까지 스캔해야 한다.  
예를 들어 줄바꿈을 찾거나 null terminator를 찾는다.

반면 length-prefixed 포맷은  
끝을 찾는 것이 아니라 길이만큼 정확히 잘라서 읽으면 된다.

즉, parsing 비용 모델도 달라진다.

### 3.4 payload 안에 어떤 바이트가 와도 괜찮다

길이로 경계를 정하기 때문에  
payload 안에는 delimiter처럼 보이는 바이트가 들어와도 상관없다.

예를 들어 payload가 다음처럼 생겨도 된다.

```
0x00 0x01 0x0A 0xFF
```

이 값들은 모두 그냥 데이터다.  
경계는 오직 length가 결정한다.

즉, length-prefixed 방식은 binary-safe하다.

### 3.5 잘못된 길이는 큰 위험이 된다

장점만 있는 것은 아니다.  
length-prefixed 포맷은 길이 필드가 매우 중요하다.

만약 길이 값이 잘못되면 다음 같은 문제가 생길 수 있다.

- 실제 버퍼보다 많이 읽으려 함
- 메모리 과다 할당 유도
- 메시지 경계가 깨짐
- 이후 필드 해석이 연쇄적으로 무너짐

즉, length field는 강력하지만  
반드시 검증해야 하는 신뢰 경계다.

### 3.6 streaming 환경에서도 유용하다

네트워크 스트림처럼 데이터가 끊겨 들어오는 환경에서는  
메시지 경계를 아는 것이 중요하다.

length-prefixed 방식에서는:

- 먼저 header 일부를 읽는다
- length를 얻는다
- 그 길이만큼 올 때까지 기다린다
- payload가 완성되면 처리한다

즉, framed protocol 설계에 매우 잘 맞는다.

---

## 4. 핵심 구성 요소

### 4.1 length field

payload 길이를 나타내는 필드다.  
보통 고정 크기 정수로 표현된다.

예를 들어:

- u8 length
- u16 length
- u32 length
- varint length

같은 형태가 가능하다.

### 4.2 payload

실제 데이터 본체다.  
문자열일 수도 있고, 바이너리 blob일 수도 있고, 중첩된 메시지일 수도 있다.

### 4.3 framing

데이터 스트림 안에서 메시지 경계를 정하는 방식이다.  
length prefix는 framing 기법의 대표 사례다.

### 4.4 delimiter-based parsing

구분자를 찾아서 끝을 정하는 방식이다.  
텍스트 줄 기반 포맷에서 흔하다.

### 4.5 binary-safe representation

어떤 바이트값이 payload 안에 와도 안전하게 표현 가능한 성질이다.  
length-prefixed 포맷의 큰 장점이다.

### 4.6 bounds validation

길이 값이 실제 입력 버퍼 범위 안에 있는지 확인하는 검증이다.  
역직렬화 안전성의 핵심이다.

---

## 5. 실행 흐름 또는 처리 순서

다음 같은 포맷을 생각해보자.

```
[u16 name_len][name bytes]
```

예를 들어 `"aki"`를 저장하면:

- `name_len = 3`
- payload = `a`, `k`, `i`

### 5.1 직렬화

직렬화할 때는 먼저 문자열 길이를 구한다.

```
len = 3
```

그 다음 length field를 포맷 규칙에 맞게 기록한다.  
예를 들어 u16 little-endian이면 2바이트로 쓴다.

그 다음 문자열 바이트를 그대로 쓴다.

즉, 결과는:

```
[03 00][61 6B 69]
```

같은 형태가 될 수 있다.

### 5.2 역직렬화 시작

역직렬화 시에는 먼저 length field 크기만큼 읽는다.  
여기서는 2바이트다.

### 5.3 길이 해석

읽은 2바이트를 u16 규칙에 따라 해석한다.  
그 결과 `len = 3`을 얻는다.

### 5.4 검증

이제 반드시 확인해야 한다.

- 남은 버퍼가 최소 3바이트 있는가
- 이 길이가 시스템 정책상 너무 크지 않은가
- 메모리 할당이 가능한 범위인가

즉, 길이 해석 직후 검증이 들어가야 한다.

### 5.5 payload 읽기

검증을 통과하면 정확히 3바이트를 payload로 읽는다.  
그 3바이트가 문자열 본문이다.

### 5.6 다음 필드로 이동

payload 길이를 정확히 알기 때문에  
파서는 다음 필드 시작 위치로 정확히 이동할 수 있다.

즉, message boundary가 깔끔하게 유지된다.

---

## 6. 성능 / 최적화 관점

### 6.1 delimiter search보다 경계 계산이 단순할 수 있다

delimiter 방식은 끝 문자를 찾기 위해 스캔이 필요할 수 있다.  
반면 length-prefixed는 길이만 읽으면 바로 payload 경계를 안다.

즉, parsing 전략이 더 직접적일 수 있다.

### 6.2 binary payload에서 escape 비용을 줄일 수 있다

delimiter 기반 포맷은 payload 안에 delimiter가 나오면  
escape 규칙이 필요할 수 있다.

length-prefixed는 이런 escape 부담이 줄어든다.  
즉, binary data 처리에서 더 자연스럽고 효율적이다.

### 6.3 잘못된 길이 검증 비용은 필수 비용이다

길이 기반 포맷은 빠를 수 있지만  
반드시 bounds check를 해야 한다.

즉, 안전한 parser에서는 다음 비용이 필수다.

- 길이 읽기
- 범위 검증
- 정책 검증
- 할당 검증

이건 생략 가능한 오버헤드가 아니라  
필수 안전 비용이다.

### 6.4 streaming parser에 유리하다

메시지 하나가 완전히 들어왔는지 판단하기 쉽기 때문에  
네트워크 프로토콜이나 framed I/O에서 효율적이다.

즉, 대기 상태 관리와 버퍼 관리가 깔끔해질 수 있다.

---

## 7. 실무에서 중요한 판단 기준

### 7.1 가변 길이 binary data에는 우선 검토할 가치가 높다

문자열, blob, nested message처럼  
길이가 달라질 수 있는 binary data에는 length-prefixed 방식이 매우 자연스럽다.

즉, delimiter보다 먼저 고려할 만한 기본 후보가 된다.

### 7.2 길이 필드는 항상 신뢰하지 않는다

역직렬화에서 가장 중요한 원칙 중 하나다.

- length가 버퍼보다 큰가
- length가 정책상 허용 범위를 넘는가
- length로 인해 큰 메모리 할당이 유도되는가

즉, length는 포맷 핵심이면서 동시에 공격 표면이다.

### 7.3 길이 타입 크기를 신중히 정한다

u8, u16, u32 중 무엇을 쓸지는 단순 취향 문제가 아니다.

- 최대 payload 크기
- 헤더 오버헤드
- 확장 가능성
- 구현 단순성

을 함께 봐야 한다.

즉, 포맷 설계의 일부다.

### 7.4 텍스트 문자열과 바이너리 payload를 구분해서 생각한다

텍스트라면 delimiter 기반이 더 자연스러운 경우도 있다.  
하지만 binary payload는 delimiter 충돌 가능성이 높다.

즉, 데이터 성격에 따라 framing 전략도 달라져야 한다.

### 7.5 length-prefixed만으로 모든 문제가 해결되지는 않는다

길이만 있으면 끝나는 것이 아니다.  
다음도 같이 설계해야 한다.

- byte order
- versioning
- 필드 의미
- nested structure
- error handling

즉, length prefix는 framing 해결책이지 포맷 전체 해결책은 아니다.

---

## 8. 더 깊게 볼 포인트

### 8.1 TLV(Type-Length-Value)

length-prefixed를 더 일반화한 포맷 설계 방식으로 확장할 수 있다.

### 8.2 varint length

고정 길이 정수 대신 가변 길이 정수로 length를 표현하는 전략으로 이어질 수 있다.

### 8.3 streaming state machine parser

네트워크 입력이 조각나 들어올 때 parser를 어떻게 상태 기계로 설계할지로 이어질 수 있다.

### 8.4 denial-of-service 방어

악의적인 큰 length 값으로 인한 과다 할당, 과다 복사, parser 붕괴를 어떻게 막을지 확장할 수 있다.

### 8.5 framed transport design

메시지 경계가 없는 byte stream 위에서 어떻게 안정적인 message framing을 만들지 더 깊게 볼 수 있다.

---

## 정리

length-prefixed format은 가변 길이 데이터를 다루는 핵심 기법이다.

핵심은 다음과 같다.

- 가변 길이 데이터에는 경계 정보가 필요하다.
- length-prefixed format은 `[length][data]` 구조로 경계를 명시한다.
- delimiter를 찾을 필요 없이 정확히 payload 길이만큼 읽을 수 있다.
- payload 안에 어떤 바이트가 와도 binary-safe하다.
- 네트워크 스트림과 framed protocol에 잘 맞는다.
- 하지만 길이 필드는 반드시 검증해야 한다.
- length prefix는 강력한 framing 기법이지만 포맷 전체 설계의 일부일 뿐이다.

즉, length-prefixed format을 이해한다는 것은  
단순히 “길이를 앞에 붙인다”를 아는 것이 아니라  
**가변 길이 데이터를 안전하게 구분하고, parser가 어디까지 읽어야 하는지 명확히 하며, binary payload를 안정적으로 전달하기 위한 경계 계약을 설계할 수 있게 되는 것**을 뜻한다.

이 관점이 잡혀야 TLV, framed protocol, 스트리밍 파서, 안정적인 바이너리 포맷 설계로 자연스럽게 확장할 수 있다.
