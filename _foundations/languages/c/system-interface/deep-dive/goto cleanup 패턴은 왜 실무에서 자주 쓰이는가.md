---
title: goto cleanup 패턴은 왜 실무에서 자주 쓰이는가
permalink: /foundations/languages/c/system-interface/deep-dive/goto-cleanup-패턴은-왜-실무에서-자주-쓰이는가/
layout: doc
section: foundations
subcategory: languages
created_at: 2026-03-17
updated_at: 2026-03-17
sort_date: 2026-03-17
nav_group: /foundations/languages/c/
doc_type: deep-dive
topic: c-system-interface
topic_slug: system-interface
language: c
tags: [c, goto, cleanup, error-handling, resource-management, errno, control-flow, api-design]
prev_url: /foundations/languages/c/system-interface/deep-dive/c에서-에러-처리는-왜-반환값-중심인가/
next_url: /foundations/languages/c/system-interface/deep-dive/자원-해제-순서는-왜-설계-대상인가/
---

## 1. 왜 이 주제를 깊게 봐야 하는가

C 문서를 읽다 보면 `goto cleanup` 패턴은 거의 반드시 만난다.  
특히 커널 코드, 시스템 라이브러리, 네트워크 데몬, 파일 처리 코드, 파서, 초기화 루틴, 드라이버, 오래된 엔터프라이즈 C 코드에서 매우 자주 등장한다.

그런데 초급 단계에서는 `goto` 자체가 흔히 부정적으로 배운다.

- `goto`는 스파게티 코드를 만든다
- structured programming에 반한다
- `if`와 `while`로 충분하다
- 사용하면 안 되는 문법이다

이 설명은 절반만 맞다.  
무질서한 점프는 분명히 해롭다. 하지만 그 사실이 곧바로 “모든 `goto`가 나쁘다”는 뜻은 아니다. 특히 C의 에러 처리와 자원 정리 문맥에서는 오히려 `goto cleanup`이 **제어 흐름을 흐리는 도구가 아니라, 실패 경로를 구조화하는 도구**가 되는 경우가 많다.

이 주제를 깊게 봐야 하는 이유는 세 가지다.

첫째, C에서는 반환값 중심 에러 처리와 수동 자원 관리가 결합된다.  
즉, 중간 단계에서 실패하면 지금까지 획득한 자원을 호출자가 직접 정리해야 한다. 이때 실패 지점이 여러 개면 정리 코드도 여러 군데에 흩어지기 쉽다. `goto cleanup`은 바로 이 중복과 누락을 줄이기 위해 등장한다.

둘째, `goto cleanup`은 단순 편의 문법이 아니다.  
그것은 “실패는 여러 지점에서 발생하지만, 정리와 반환은 하나의 출구에서 일관되게 수행한다”는 설계 의도를 코드 구조로 표현하는 방식이다. 즉, 이 패턴은 C의 에러 처리 철학과 자원 관리 철학이 만나는 지점이다.

셋째, `goto cleanup`을 제대로 이해하지 못하면 두 가지 극단으로 흐르기 쉽다.

- 무조건 `goto`를 금지해서 실패 경로를 중복 `if`와 중첩 블록으로 늘어지게 만든다.
- 아무 규율 없이 `goto`를 남발해 실제로 스파게티 코드를 만든다.

즉, 문제는 `goto`라는 키워드 자체가 아니라 **어떤 방향으로, 어떤 목적을 가지고, 어떤 invariant를 보존하기 위해 사용하는가**다.

이 문서의 핵심 목표는 `goto cleanup`을 “예외적으로 허용되는 편법”으로 설명하는 데 있지 않다.  
핵심은 다음을 분리하는 것이다.

- 일반적인 무질서한 `goto`와 cleanup용 `goto`는 무엇이 다른가
- 왜 C의 에러 처리에서는 이 패턴이 구조적으로 자연스러운가
- 중첩 `if`와 중복 해제 코드보다 어떤 점에서 더 낫고 어떤 비용이 있는가
- `errno` 보존, 부분 획득 자원 정리, 실패 전파와 어떤 관계가 있는가
- 어떤 형태의 `goto cleanup`은 좋은 패턴이고 어떤 형태는 실제로 위험한가

즉, 이 문서는 `goto cleanup`을 문법 취향의 문제가 아니라,  
**실패 경로를 단일화하고 자원 정리를 일관되게 만드는 제어 흐름 설계 패턴**으로 다룬다.

---

## 2. 전체 구조

`goto cleanup` 패턴을 정확히 이해하려면 먼저 문제를 다섯 층위로 나눠야 한다.

### 2.1 제어 흐름 층위

C에서 실패는 예외처럼 자동으로 상위로 전파되지 않는다.  
각 단계마다 호출자가 실패를 검사하고 분기해야 한다. 이때 실패 지점이 많아질수록 반환과 정리 흐름이 흩어진다.

즉, `goto cleanup`은 “실패 분기”와 “정리/반환 출구”를 분리하는 제어 흐름 패턴이다.

### 2.2 자원 획득 층위

실패 전까지 이미 획득한 자원이 무엇인지 추적해야 한다.

- 메모리
- 파일 디스크립터
- 뮤텍스
- 소켓
- 매핑
- 임시 버퍼
- 참조 카운트
- 부분 초기화된 객체

즉, cleanup 패턴은 단순 분기 기술이 아니라 **부분 성공 상태를 되감는 구조**다.

### 2.3 에러 정보 보존 층위

실패 직후의 `errno`, 상태 코드, 원인 정보를 cleanup 과정이 덮어쓰지 않게 해야 한다.  
따라서 cleanup은 단순 해제 코드가 아니라 **원래 실패 원인을 보존하며 정리하는 단계**다.

### 2.4 코드 중복 / 유지보수 층위

정리 코드가 실패 지점마다 복사되면 다음 문제가 생긴다.

- 해제 순서 불일치
- 일부 자원 해제 누락
- 새 자원 추가 시 모든 실패 경로 수정 필요
- 버그 수정 누락
- `errno` 보존 일관성 붕괴

즉, `goto cleanup`은 제어 흐름 단축이 아니라 중복 제거와 유지보수성 향상 수단이다.

### 2.5 실무 규율 층위

모든 `goto`가 cleanup 패턴은 아니다.  
좋은 `goto cleanup`은 보통 다음 특징을 가진다.

- 전방 점프(forward jump)만 사용
- 함수 하단의 cleanup 레이블로만 이동
- 자원 획득 순서와 역순 해제 구조를 따름
- 상태 플래그나 sentinel 초기화가 분명함
- 반환값/에러 코드 설정 규약이 명확함

즉, cleanup `goto`는 무질서한 점프가 아니라 제한된 구조 안에서 쓰인다.

---

## 3. 내부 동작 원리

### 3.1 `goto cleanup`이 필요한 근본 이유는 “실패 지점은 많고 정리 출구는 하나여야 한다”는 데 있다

다음과 같은 함수는 C에서 매우 흔하다.

- 메모리 할당
- 파일 열기
- 버퍼 초기화
- 구성 파싱
- 다른 객체 생성
- 락 획득
- 후속 작업 수행

이 중 어디서든 실패할 수 있다.  
문제는 실패 지점이 여러 개라는 것이다.

단순하게 쓰면 이런 코드가 된다.
```c
    int f(void) {
        char *buf = malloc(1024);
        if (buf == NULL) {
            return -1;
        }

        int fd = open(path, O_RDONLY);
        if (fd == -1) {
            free(buf);
            return -1;
        }

        void *map = mmap(...);
        if (map == MAP_FAILED) {
            close(fd);
            free(buf);
            return -1;
        }

        /* 작업 */

        munmap(map, ...);
        close(fd);
        free(buf);
        return 0;
    }
```
이 구조는 처음에는 이해하기 쉽다.  
하지만 단계가 늘어날수록 문제가 커진다.

- 실패마다 정리 코드가 반복된다.
- 자원 하나를 더 추가하면 모든 실패 분기를 다시 수정해야 한다.
- 일부 분기에서 해제 순서가 달라질 수 있다.
- 어떤 분기에서는 `errno` 보존을 놓칠 수 있다.

즉, 문제는 `return`이 많다는 사실 자체가 아니라, **실패 지점마다 동일한 cleanup 책임이 중복된다**는 데 있다.

`goto cleanup`은 이 중복을 다음처럼 바꾼다.
```c
    int f(void) {
        int rc = -1;
        char *buf = NULL;
        int fd = -1;
        void *map = MAP_FAILED;

        buf = malloc(1024);
        if (buf == NULL) {
            goto cleanup;
        }

        fd = open(path, O_RDONLY);
        if (fd == -1) {
            goto cleanup;
        }

        map = mmap(...);
        if (map == MAP_FAILED) {
            goto cleanup;
        }

        /* 작업 */

        rc = 0;

    cleanup:
        if (map != MAP_FAILED) {
            munmap(map, ...);
        }
        if (fd != -1) {
            close(fd);
        }
        free(buf);
        return rc;
    }
```
이제 실패는 여러 곳에서 발생해도, 정리와 반환은 한 곳으로 모인다.  
즉, `goto cleanup`의 본질은 점프가 아니라 **출구 단일화(exit unification)**다.

### 3.2 structured programming을 깨는 것이 아니라, 실패 경로의 구조를 드러낸다

`goto`에 대한 반감은 대개 무제한 점프 때문이다.  
예를 들어 앞뒤로 마구 점프하거나, 루프 안팎을 뒤섞거나, invariant가 다른 영역 사이를 임의로 넘나들면 코드를 추론하기 어려워진다.

하지만 cleanup `goto`는 일반적으로 다음 규율을 가진다.

- 앞으로만 점프한다
- 함수 하단의 단일 레이블로 모인다
- 정리 코드 외의 일반 로직으로 점프하지 않는다
- 획득된 자원 상태를 sentinel 값으로 판별한다

즉, cleanup `goto`는 무질서한 점프가 아니라, **에러 경로를 한 방향으로 접는 구조화된 점프**다.

왜 이 직관이 중요할까?

많은 사람이 “`goto`는 비구조적, `if`/`return`은 구조적”이라고 생각한다.  
하지만 자원 획득이 5단계, 7단계, 10단계로 늘어나면 중복 `if-return-cleanup`은 오히려 실패 경로를 흩어 놓는다. 반대로 cleanup `goto`는 “모든 실패는 이 출구로 간다”는 사실을 분명하게 만든다.

즉, 여기서 구조적이라는 말은 키워드 선택이 아니라 **실패 경로가 얼마나 일관되게 조직되는가**의 문제다.

### 3.3 cleanup 레이블은 단순 점프 목적지가 아니라 “부분 성공 상태를 되감는 단계”다

좋은 cleanup 레이블은 단순히 `free()` 몇 개를 모아 둔 곳이 아니다.  
그것은 함수가 지금까지 어떤 상태까지 진행했는지를 바탕으로, **부분적으로 획득된 자원을 안전하게 원상 복구하는 단계**다.

예를 들어 다음 상태가 있을 수 있다.

- `buf`는 할당되었는가
- `fd`는 열렸는가
- `map`은 성공했는가
- 락은 잡혔는가
- 객체의 필드들은 부분 초기화되었는가
- 원래 실패 원인은 저장되었는가

cleanup 코드는 이 상태를 보고 정리한다.  
즉, cleanup 레이블은 “실패 후 무조건 실행되는 코드”가 아니라, **현재까지의 획득 상태를 조건부로 되감는 코드**다.

이 점을 놓치면 cleanup이 엉성해진다.

- 아직 안 연 fd를 닫으려 한다
- 아직 안 잡은 락을 unlock하려 한다
- 이미 넘겨준 소유권의 메모리를 다시 free하려 한다
- 원래 실패 원인을 cleanup 도중 덮어쓴다

즉, cleanup 레이블은 무조건적인 해제 블록이 아니라, **자원 상태 기계의 역방향 단계**에 가깝다.

### 3.4 `goto cleanup`은 cleanup 중복을 줄일 뿐 아니라 변경 비용을 줄인다

실무에서 진짜 큰 장점은 여기에 있다.  
자원이 하나 더 추가될 때를 생각해 보자.

중복 해제 방식에서는 다음을 모두 수정해야 한다.

- 중간 실패 분기 1
- 중간 실패 분기 2
- 중간 실패 분기 3
- 정상 종료 경로
- 에러 로그 경로
- 추가 cleanup helper

즉, 변경 비용이 함수 길이에 비례해서 퍼진다.

반면 cleanup 단일화 구조에서는 보통 다음만 하면 된다.

- sentinel 초기화 추가
- 획득 코드 추가
- cleanup 블록에 해제 한 줄 추가

이 차이는 작은 예제에서는 미미해 보여도, 실무 코드에서는 매우 크다.  
즉, `goto cleanup`의 진짜 가치는 타이핑 줄이기가 아니라 **자원 관리 로직의 수정 지점을 집중화하는 것**이다.

### 3.5 `goto cleanup`은 `errno` 보존과 자연스럽게 결합된다

C 시스템 코드에서 cleanup은 종종 원래 실패 원인을 덮어쓰는 위험을 가진다.  
예를 들어 실패 후 다음을 할 수 있다.

- `close()`
- `fclose()`
- `munmap()`
- `pthread_mutex_unlock()`
- 로그 출력
- 보조 정리 함수 호출

이들 중 일부는 `errno`를 바꿀 수 있다.  
따라서 좋은 cleanup 패턴에서는 원래 실패 원인을 먼저 저장하고 cleanup으로 들어간다.
```c
    int rc = -1;
    int saved_errno = 0;

    fd = open(path, O_RDONLY);
    if (fd == -1) {
        saved_errno = errno;
        goto cleanup;
    }

    /* ... */

cleanup:
    if (fd != -1) {
        close(fd);
    }
    if (saved_errno != 0) {
        errno = saved_errno;
    }
    return rc;
```
즉, cleanup `goto`는 단순 자원 해제뿐 아니라, **에러 맥락 보존을 한곳에서 일관되게 처리하는 구조**를 만들기 쉽다.

### 3.6 여러 cleanup 레벨이 필요한 경우도 있다

모든 cleanup이 하나의 레이블이면 충분한 것은 아니다.  
실무에서는 종종 다음처럼 단계적 레이블이 등장한다.
```c
    int rc = -1;
    char *buf = NULL;
    int fd = -1;
    pthread_mutex_t *m = NULL;

    buf = malloc(...);
    if (buf == NULL) {
        goto out;
    }

    fd = open(...);
    if (fd == -1) {
        goto free_buf;
    }

    if (pthread_mutex_lock(m) != 0) {
        goto close_fd;
    }

    /* 작업 */

    rc = 0;
    pthread_mutex_unlock(m);
    goto close_fd;

close_fd:
    if (fd != -1) {
        close(fd);
    }
free_buf:
    free(buf);
out:
    return rc;
```
이런 구조는 자원 해제 순서와 조건이 더 복잡할 때 유용하다.  
중요한 것은 이것이 “점프가 많아졌다”가 아니라, **자원 획득 단계에 맞춰 역순 정리 단계를 계층화한 것**이라는 점이다.

하지만 이 방식은 읽기 어려워질 수 있으므로, 정말 필요한 경우에만 사용해야 한다.  
즉, cleanup 레이블이 여러 개일수록 규율과 naming이 더 중요해진다.

---

## 4. 핵심 구성 요소

### 4.1 sentinel 초기화

cleanup 패턴의 출발점은 각 자원을 “아직 획득하지 않은 상태”로 명확히 초기화하는 것이다.

예:

- 포인터는 `NULL`
- fd는 `-1`
- mapping은 `MAP_FAILED`
- lock held 여부는 `0/1`
- 객체 포인터는 `NULL`
- 상태 코드는 실패 기본값

이 sentinel이 있어야 cleanup에서 조건부 해제가 가능하다.

### 4.2 단일 또는 계층적 cleanup 레이블

cleanup 레이블은 실패 출구를 모으는 장소다.  
형태는 보통 두 가지다.

- 단일 `cleanup:` 또는 `out:` 레이블
- 단계별 `free_x:`, `close_y:`, `unlock_z:` 레이블

중요한 것은 레이블 수가 아니라, 자원 해제 규칙이 함수의 획득 순서와 일관되게 대응하는가다.

### 4.3 상태 코드와 반환값

cleanup 패턴에서는 종종 `rc` 같은 상태 변수를 둔다.
```c
    int rc = -1;
```
그리고 모든 성공 경로 끝에서만
```c
    rc = 0;
```
로 바꾸고 cleanup에서 `return rc;` 한다.

이 구조의 장점은 다음과 같다.

- 기본값을 실패로 두므로 초기화 누락에 덜 취약하다
- 성공 시점이 코드에서 명확하다
- cleanup 블록이 성공/실패 양쪽 출구를 공통 처리할 수 있다

### 4.4 원인 보존 변수

`errno` 또는 직접 반환할 에러 코드를 보존할 필요가 있을 때는 별도 변수가 필요하다.
```c
    int saved_errno = 0;
```
이 변수는 cleanup 도중 원래 실패 원인이 훼손되지 않게 한다.  
즉, cleanup 패턴의 핵심 구성 요소는 자원만이 아니라 **에러 맥락**도 포함한다.

### 4.5 소유권(ownership) 경계

cleanup 패턴이 안전하려면 “어떤 자원을 현재 함수가 책임지는가”가 분명해야 한다.

예를 들어:

- caller에게 넘긴 포인터는 더 이상 free하면 안 된다
- 성공 시 fd 소유권을 객체 필드로 넘겼다면 cleanup에서 닫으면 안 된다
- lock을 이미 다른 helper가 풀었다면 중복 unlock하면 안 된다

즉, cleanup은 단순히 획득한 것을 다 지우는 코드가 아니라, **현재 시점의 소유권 상태에 따라 정리 책임을 수행하는 코드**다.

---

## 5. 실행 흐름 또는 처리 순서

### 5.1 중복 return 기반 패턴
```c
    int load(void) {
        char *buf = malloc(1024);
        if (buf == NULL) {
            return -1;
        }

        int fd = open(path, O_RDONLY);
        if (fd == -1) {
            free(buf);
            return -1;
        }

        if (parse(fd, buf) != 0) {
            close(fd);
            free(buf);
            return -1;
        }

        close(fd);
        free(buf);
        return 0;
    }
```
이 코드는 짧을 때는 이해 가능하다.  
하지만 자원이 늘어나면 실패마다 cleanup이 반복된다.

### 5.2 단일 cleanup 출구 패턴
```c
    int load(void) {
        int rc = -1;
        char *buf = NULL;
        int fd = -1;

        buf = malloc(1024);
        if (buf == NULL) {
            goto cleanup;
        }

        fd = open(path, O_RDONLY);
        if (fd == -1) {
            goto cleanup;
        }

        if (parse(fd, buf) != 0) {
            goto cleanup;
        }

        rc = 0;

    cleanup:
        if (fd != -1) {
            close(fd);
        }
        free(buf);
        return rc;
    }
```
이 구조는 실패 지점이 늘어나도 출구는 유지된다.  
즉, 실패 분기는 분산되고 cleanup은 집중된다.

### 5.3 `errno` 보존을 포함한 cleanup
```c
    int load(void) {
        int rc = -1;
        int saved_errno = 0;
        int fd = -1;

        fd = open(path, O_RDONLY);
        if (fd == -1) {
            saved_errno = errno;
            goto cleanup;
        }

        if (configure(fd) != 0) {
            saved_errno = errno;
            goto cleanup;
        }

        rc = 0;

    cleanup:
        if (fd != -1) {
            close(fd);
        }
        if (rc != 0 && saved_errno != 0) {
            errno = saved_errno;
        }
        return rc;
    }
```
이 패턴은 cleanup 중 원래 실패 원인을 잃지 않도록 한다.

### 5.4 계층적 cleanup 레이블
```c
    int init_context(struct ctx *c) {
        int rc = -1;

        c->buf = NULL;
        c->fd = -1;

        c->buf = malloc(1024);
        if (c->buf == NULL) {
            goto out;
        }

        c->fd = open(path, O_RDONLY);
        if (c->fd == -1) {
            goto free_buf;
        }

        if (setup_parser(c) != 0) {
            goto close_fd;
        }

        rc = 0;
        goto out;

    close_fd:
        close(c->fd);
        c->fd = -1;
    free_buf:
        free(c->buf);
        c->buf = NULL;
    out:
        return rc;
    }
```
이 구조는 자원 의존 순서가 복잡할 때 유용하다.  
다만 레이블 간 흐름이 많아질수록 naming과 규율이 더 중요해진다.

### 5.5 잘못된 `goto` 사용 예
```c
    if (step1_failed) goto cleanup;
    if (step2_failed) goto retry;
    if (step3_failed) goto somewhere_else;

    /* ... 중간 중간 여러 레이블 ... */
```
이런 구조는 cleanup 패턴이 아니다.  
실패 의미, 재시도 의미, 정상 로직 점프가 뒤섞이면 오히려 제어 흐름이 흐려진다.

즉, cleanup `goto`의 장점은 **점프 목적이 단일하고 의미가 명확할 때만** 성립한다.

---

## 6. 성능 / 최적화 관점

### 6.1 `goto cleanup`의 핵심 이득은 런타임보다 구조 비용 절감에 있다

많은 경우 `goto cleanup`의 성능 차이는 본질이 아니다.  
진짜 이득은 다음이다.

- cleanup 중복 제거
- 버그 수정 지점 집중
- 자원 추가 시 수정 범위 축소
- 실패 경로 일관성 유지
- 리뷰 용이성 증가

즉, `goto cleanup`은 마이크로 최적화보다 **구조적 최적화**에 가깝다.

### 6.2 중첩 `if`를 줄여 hot path를 읽기 쉽게 만들 수 있다

실패가 드문 경로에서는 다음 패턴이 유리할 수 있다.

- 성공 경로를 위에서 아래로 자연스럽게 읽음
- 실패 시 즉시 cleanup 레이블로 이탈
- 깊은 중첩 없이 직선형 코드 유지

예:
```c
    if (step1_fail) goto cleanup;
    if (step2_fail) goto cleanup;
    if (step3_fail) goto cleanup;
```
이 구조는 성공 경로를 납작하게(flat) 유지한다.  
즉, cleanup `goto`는 단지 실패 경로 정리만이 아니라 **정상 경로 가독성**에도 기여할 수 있다.

### 6.3 과도한 계층 레이블은 오히려 비용이 된다

반대로 다음은 비용이다.

- 레이블이 지나치게 많음
- 자원 획득 순서와 해제 순서가 직관적이지 않음
- 정상 흐름과 실패 흐름이 섞임
- cleanup 블록이 너무 많은 일을 함
- 재시도, 롤백, 통계 업데이트, 로깅이 뒤섞임

즉, `goto cleanup`은 아무 제어 흐름이나 정당화하는 면죄부가 아니다.  
복잡성이 너무 커지면 helper 함수 분리나 구조 재설계가 더 낫다.

### 6.4 branch 수보다 유지보수 branch가 더 중요하다

실무에서 더 큰 비용은 CPU branch가 아니라 **인간이 관리해야 하는 실패 분기 수**다.

- 실패 분기 8곳마다 cleanup이 다름
- 일부 분기에서만 `errno` 저장
- 일부 분기에서만 lock unlock
- 일부 분기에서만 partial object reset

이런 구조는 시간이 지나면 거의 반드시 깨진다.  
즉, cleanup `goto`는 런타임 branch보다 **유지보수 branch를 줄이는 수단**으로 봐야 한다.

---

## 7. 어디서부터 보장 범위와 구현 경계가 갈리는가

이 섹션이 핵심이다.  
`goto cleanup`에 대한 오해는 주로 “`goto`라는 키워드 전체”와 “cleanup 패턴으로 제한된 사용”을 같은 층위로 볼 때 생긴다.

### 7.1 무질서한 점프와 cleanup 점프가 갈리는 지점

모든 `goto`가 같은 것이 아니다.

- 무질서한 `goto`: 임의 위치로 앞뒤 점프, 정상 로직과 오류 로직 혼합
- cleanup `goto`: 실패 시 함수 하단 정리 블록으로 전방 점프

즉, cleanup 패턴의 핵심은 `goto`라는 키워드가 아니라 **점프의 방향과 목적의 제한**이다.

### 7.2 정상 흐름 점프와 실패 흐름 점프가 갈리는 지점

좋은 cleanup `goto`는 보통 실패 흐름 전용이다.  
정상 로직을 이리저리 건너뛰는 용도로 쓰기 시작하면 구조가 무너지기 쉽다.

즉:

- 정상 경로는 위에서 아래로 흐르게 두고
- 실패 경로만 cleanup으로 접는다

이 경계가 중요하다.

### 7.3 단일 출구와 다중 반환이 갈리는 지점

cleanup 패턴은 단일 출구를 선호하는 경우가 많지만, 모든 함수에서 “반드시 return 하나만”이 정답인 것은 아니다.

중요한 것은 다음이다.

- 자원 해제가 필요한가
- 실패 원인 보존이 필요한가
- cleanup 중복이 커지는가

자원이 거의 없고 실패 분기가 단순한 함수는 즉시 `return`이 더 명확할 수도 있다.  
즉, cleanup `goto`는 원칙이라기보다 **자원 관리 비용이 커질 때 자연스럽게 채택되는 구조**다.

### 7.4 cleanup 코드와 rollback 로직이 갈리는 지점

cleanup은 흔히 자원 해제와 연결되지만, 실제로는 더 넓다.

- 자원 해제
- 부분 초기화 undo
- 상태 reset
- 소유권 회수
- `errno` 복원
- lock 해제

하지만 여기에 재시도 정책, 사용자 메시지 정책, 상위 계층 번역 로직까지 다 넣으면 cleanup 블록이 과도하게 비대해진다.

즉, cleanup은 **현재 함수가 책임지는 정리 범위**에 집중해야 한다.

### 7.5 `goto cleanup`과 예외/RAII가 갈리는 지점

다른 언어의 예외나 RAII와 비교하면 다음 오해가 생길 수 있다.

- `goto cleanup`은 예외의 poor-man's version이다
- C에는 RAII가 없으니 억지로 흉내 내는 것이다

이 설명은 부분적으로만 맞다.  
cleanup 패턴은 자동 unwind가 없는 환경에서 자원 정리를 명시적으로 조직하는 방식이다. 하지만 그것이 단순 열화판이라는 뜻은 아니다.

오히려 중요한 차이는 다음이다.

- 자동 메커니즘이 아니라 호출자가 정리 책임을 명시적으로 기술한다
- 정리 순서와 범위를 매우 세밀하게 통제할 수 있다
- 비용과 흐름이 코드에 드러난다

즉, `goto cleanup`은 예외를 흉내 내는 것이 아니라, **C의 명시적 자원 관리 모델에 맞는 정리 패턴**이다.

---

## 8. 실무에서 중요한 판단 기준

### 8.1 자원이 2개 이상이고 실패 지점이 여러 개면 cleanup 단일화를 먼저 고려하라

다음 조건이 겹치면 `goto cleanup`이 자연스럽다.

- 획득 자원이 여러 개
- 중간 실패 가능성이 큼
- 실패 시 역순 정리가 필요
- `errno` 또는 상태 보존 필요
- 정상 반환과 실패 반환이 함께 존재

즉, 함수가 “단순 계산”이 아니라 “획득-설정-작업-정리” 구조라면 cleanup 패턴이 맞을 가능성이 높다.

### 8.2 sentinel 초기화 없이는 cleanup 패턴이 안전하지 않다

다음은 필수다.

- 포인터 `NULL`
- fd `-1`
- mapping `MAP_FAILED`
- lock held flag `0`
- rc 실패 기본값

이 초기화가 없으면 cleanup 블록이 조건부 해제를 안전하게 수행할 수 없다.

### 8.3 cleanup 블록은 현재 함수의 책임만 수행하라

좋은 cleanup 블록은 다음만 한다.

- 현재 함수가 획득한 자원 해제
- 현재 함수가 만든 부분 상태 되돌리기
- 원래 실패 원인 복원
- 반환값 정리

다음을 한곳에 과도하게 몰아넣으면 안 된다.

- 사용자 메시지 정책
- 상위 계층 번역
- 복잡한 재시도 루프
- unrelated 통계 업데이트
- 여러 객체의 비즈니스 규칙 처리

즉, cleanup은 정리 책임의 경계여야지, 만능 에러 핸들러가 아니다.

### 8.4 `goto cleanup`은 forward-only, error-only가 가장 안전하다

실무적으로 가장 안전한 규율은 다음이다.

- 전방 점프만
- 실패 경로 전용
- 함수 하단 레이블만
- 정상 흐름 점프 최소화
- 루프 제어와 cleanup 제어를 섞지 않음

이 규율을 벗어나면 `goto`의 고전적 문제가 다시 나타난다.

### 8.5 레이블 이름도 의미를 가져야 한다

다음처럼 추상적 이름 하나만 쓰는 것이 항상 최선은 아니다.

- `out:`
- `done:`

복잡한 함수에서는 다음이 더 명확할 수 있다.

- `unlock_mutex:`
- `close_fd:`
- `free_buf:`
- `cleanup:`

즉, 레이블 이름은 “어디로 점프하는가”보다 **무엇을 정리하는 단계인가**를 드러내는 편이 낫다.

### 8.6 cleanup이 길어지면 함수 분리도 검토해야 한다

`goto cleanup`이 있다고 해서 긴 함수를 정당화하면 안 된다.  
다음 신호가 보이면 helper 분리나 구조 재설계를 고려해야 한다.

- 레이블이 너무 많다
- cleanup이 30~50줄 이상 된다
- 서로 다른 소유권 모델이 뒤섞인다
- rollback 논리와 자원 해제가 뒤엉킨다
- 정상 경로보다 cleanup 경로가 더 복잡하다

즉, cleanup 패턴은 복잡성을 관리하는 도구이지, 무한히 수용하는 도구는 아니다.

---

## 9. 판단 체크리스트

다음 질문에 명확히 답하지 못하면, 그 `goto cleanup`은 아직 좋은 패턴이 아닐 수 있다.

- 이 함수는 정말 여러 실패 지점과 여러 자원을 가지는가
- cleanup 중복을 줄이는 것이 실제 이득인가
- 각 자원은 sentinel 값으로 “획득 전 상태”가 명확히 표현되는가
- cleanup 블록이 현재 함수의 책임만 다루는가
- 원래 실패 원인(`errno` 또는 상태 코드)을 보존하는가
- 자원 해제 순서는 획득 순서의 역순과 일관되는가
- 점프는 전방/실패 전용인가
- 정상 흐름을 무의미하게 섞고 있지 않은가
- 레이블 이름이 정리 단계의 의미를 드러내는가
- 이 복잡도라면 helper 함수 분리가 더 낫지 않은가

## 정리

`goto cleanup` 패턴이 실무에서 자주 쓰이는 이유는 단순하다.  
C에서는 실패가 명시적 분기로 드러나고, 자원 해제가 자동으로 따라오지 않으며, 실패 지점은 많아지기 쉽기 때문이다.

따라서 `goto cleanup`의 핵심 가치는 다음에 있다.

- 실패 출구를 단일화한다
- cleanup 중복을 줄인다
- 자원 해제 로직을 한곳에 집중한다
- 변경 비용을 낮춘다
- `errno`와 실패 원인 보존을 일관되게 만들기 쉽다
- 정상 경로를 납작하게 유지할 수 있다

반드시 기억해야 할 점도 있다.

- 모든 `goto`가 좋은 것은 아니다
- cleanup용 `goto`는 forward-only, error-only, cleanup-only일 때 가장 안전하다
- cleanup 블록은 자원 상태와 소유권을 정확히 반영해야 한다
- 자원 해제 순서와 실패 원인 보존은 설계 대상이다
- 지나치게 복잡해지면 함수 분리와 구조 재설계가 필요하다

즉, `goto cleanup`은 “허용된 예외”가 아니라,  
**C의 반환값 중심 에러 처리와 수동 자원 관리 환경에서 실패 경로를 구조화하는 대표 패턴**이다.

---

## 10. 더 깊게 볼 포인트

### 10.1 자원 해제 순서는 왜 설계 대상인가

다음 문서로 가장 자연스럽다.  
cleanup 패턴이 자원 정리를 한곳에 모은다면, 그다음 질문은 “무슨 순서로, 어떤 소유권 규칙으로, 어떤 실패를 고려하며 해제할 것인가”다.

### 10.2 cleanup 중 `errno`를 보존해야 하는 이유는 무엇인가

cleanup 함수와 정리 호출들이 원래 실패 원인을 덮어쓸 수 있다는 점을 더 깊게 볼 필요가 있다.

### 10.3 partial initialization과 rollback은 어떻게 구분해야 하는가

객체 생성, 모듈 초기화, 다단계 설정 함수에서는 단순 해제보다 더 넓은 rollback 개념이 필요하다.

### 10.4 `_cleanup_` 확장이나 defer류 패턴은 C에서 어디까지 대안이 되는가

컴파일러 확장이나 매크로 기반 defer는 cleanup 패턴을 어떻게 대체하거나 보완하는지 비교할 수 있다.

### 10.5 helper 함수 분리와 단일 cleanup 블록은 어떤 기준으로 선택해야 하는가

cleanup이 길어질수록 추상화 경계와 함수 책임 분할 기준이 중요해진다.