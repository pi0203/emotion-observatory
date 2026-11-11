# 감정 관찰실 로그인 및 계정 연동 기술 명세서 (Phase 0 ~ 1, 초안)

> **2026-11-02 본인 결정 변경**: 기록 암호 없이 서버에 저장(RLS로 본인만), 관리자는 볼 수 있음. 로그인은 구글·카카오·네이버(애플은 미룸, 이메일 로그인은 같은 날 뺌, 동의는 세 칸: 계정·감정 기록·만 14세 이상). 운영 공개는 약관·처리방침 확정과 첫 화면 7일 알림(약관 제11조) 뒤.  
> **네이버 (2026-11-02 본인 결정 (가))**: 네이버는 Supabase 사용자 지정 공급자 `custom:naver`로 붙였고, 사용자 정보는 중계 함수 `naver-userinfo`(supabase/functions/naver-userinfo/index.ts)를 거친다. 네이버가 정보를 `{"response": {...}}`로 감싸 보내서 Supabase가 바로 읽지 못하기 때문이다. 이 함수는 네이버 식별자만 `{"sub": id}`로 넘기고 이메일은 받지도 넘기지도 않는다. 그래서 네이버로 들어온 사람은 네이버 전용 계정이 되고 구글·카카오·이메일 계정과 합치지 않는다. 이유: 네이버가 주는 이메일은 사용자가 정한 연락처 이메일이라 사람마다 고유하다는 보장이 없어서, 그것으로 계정을 합치면 남의 계정에 들어갈 수 있다.  
> **상태**: **초안 (Draft)** — 구현 참고 및 검토용 예시 스펙  
> **중요 안내**: 본 문서에 서술된 **Supabase 스택 채택 및 비동기(Promise 기반) StorageAdapter 인터페이스 권장은 확정 사항이 아닙니다.** 이는 기술적 가능성을 검토하기 위한 여러 대안 중 하나의 예시일 뿐이며, 실제 저장 계층의 동기/비동기 설계 여부와 백엔드/인증 스택(Supabase, 자체 API, NextAuth 등)은 프로젝트 의사결정에 따라 완전히 달라질 수 있습니다.  
> **기준 문서**: [PROJECT_CONTEXT.md §11 (배포와 계정 방향)](../PROJECT_CONTEXT.md#L383-L403), [SAFETY.md](../SAFETY.md), [lib/storage.ts](../lib/storage.ts)  
> **목적**: 다른 세션에서 향후 Storage Seam 및 계정 연동을 논의하거나 구현할 때 참고할 수 있는 검토용 초안을 제공한다.

---

## 0. 핵심 철학 및 보안 원칙

1. **게스트 사용 우선 (Guest-First)**
   - 로그인은 필수 관문(Gate)이 아니다. 앱은 로그인 없이 지금처럼 100% 동일하게 모든 기능(Quick Check, Coach, Deep Reflection, History)을 이용할 수 있어야 한다.
   - 로그인은 **"기기를 바꾸어도 기록을 이어보고 싶은 사람"**의 자발적 선택이다.

2. **비밀번호 없는 이메일 6자리 코드 (OTP Only)**
   - 비밀번호 관리, 복잡도 검증, 소셜 로그인(구글/카카오) SDK에 따른 개인정보 제3자 제공 동의 복잡도를 피한다.
   - 이메일 입력 $\rightarrow$ 6자리 인증번호 수신 $\rightarrow$ 입력 후 즉시 세션 발급.

3. **기록 마이그레이션의 명시적 동의**
   - 로그인 성공 시, 이 기기의 `localStorage`에 쌓여 있던 기록을 **절대 자동으로 서버에 올리거나 지우지 않는다.**
   - "이 기기의 기록 N개를 계정으로 가져올까요?"를 반드시 묻고, [가져오기]와 [이 기기에만 남겨두기]를 선택하게 한다.

4. **감정 데이터의 극단적 민감성 보호 (Zero-Leakage & RLS)**
   - 감정 관찰 데이터는 내밀한 신체 상태와 생각, 관계 맥락을 포함한다.
   - 데이터베이스는 반드시 **Row Level Security (RLS)**를 적용하여 본인(`auth.uid() = user_id`) 외에는 데이터베이스 관리자 계정이라도 클라이언트 API를 통해 조회할 수 없도록 격리한다.

---

## 1. 구현 로드맵 (4단계)

```text
[Phase 0: Storage Seam]   ─── UI 변경 없음. storage.ts를 StorageAdapter 인터페이스로 추상화
         │
[Phase 1: 이메일 OTP]     ─── 게스트 상태 유지 + 로그인 모달(이메일 6자리 코드) 추가
         │
[Phase 2: 계정 History]   ─── 로그인 사용자에게 서버 DB의 세션 목록 동기화
         │
[Phase 3: 기록 가져오기] ─── 로그인 시 로컬 기록을 계정으로 병합할지 묻는 확인 UI
```

---

## 2. Phase 0: Storage Seam 설계 (선행 필수 과업)

현재 [`lib/storage.ts`](../lib/storage.ts)는 `window.localStorage`를 동기적으로 직접 호출하고 있다. 이를 어댑터 패턴으로 격리하여, 향후 클라이언트가 로컬스토리지인지 서버 DB인지 알 필요가 없게 만든다.

### 인터페이스 정의 (`lib/storage-types.ts` 신설안)

```typescript
import type { EmotionSession } from "./session-types";

export interface StorageAdapter {
  loadDraft(): Promise<EmotionSession | null>;
  saveDraft(session: EmotionSession): Promise<void>;
  removeDraft(): Promise<void>;

  loadCompleted(): Promise<EmotionSession[]>;
  saveCompleted(session: EmotionSession): Promise<void>;
  dropCompleted(id: string): Promise<void>;

  /** 세션 상태에 따라 draft/completed를 안전하게 분기 저장 */
  persistSession(session: EmotionSession): Promise<void>;
}
```

### 구현 전략
1. 기존 [`lib/storage.ts`](../lib/storage.ts)의 로직을 `LocalStorageAdapter implements StorageAdapter`로 래핑한다.
2. `getStorageAdapter(user?: User | null): StorageAdapter` 팩토리 함수를 제공한다.
   - 유저가 없으면(`null`) $\rightarrow$ `LocalStorageAdapter`
   - 유저가 있으면 $\rightarrow$ `SupabaseStorageAdapter` (Phase 2에서 구현)
3. **Phase 0 적용 시 영향 범위**:
   - UI나 비즈니스 로직의 변경은 전혀 없으며, 기존 209개 Vitest 테스트가 100% 동일하게 통과해야 한다.

---

## 3. Phase 1: 이메일 OTP 및 인증 스택 선정

### 권장 인프라: **Supabase Auth + PostgreSQL**
- **선정 이유**:
  - Next.js App Router용 공식 SSR 패키지(`@supabase/ssr`) 제공
  - Passwordless Email OTP(`signInWithOtp`) 기본 내장
  - PostgreSQL의 강력한 Row Level Security(RLS)를 선언적으로 사용 가능

### DB 스키마 (`supabase/schema.sql` 안)

```sql
-- 감정 세션 테이블
create table public.emotion_sessions (
  id uuid primary key,                     -- EmotionSession.id와 1:1 매핑
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('draft', 'completed')),
  stage text not null,
  ended_at timestamptz,
  payload jsonb not null,                  -- EmotionSession 전체 구조 (v4 스키마 보존)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS 활성화 (필수)
alter table public.emotion_sessions enable row level security;

-- 본인 데이터만 CRUD 가능하도록 정책 설정
create policy "Users can view own emotion sessions"
  on public.emotion_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own emotion sessions"
  on public.emotion_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own emotion sessions"
  on public.emotion_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own emotion sessions"
  on public.emotion_sessions for delete
  using (auth.uid() = user_id);

-- 인덱스
create index emotion_sessions_user_status_idx on public.emotion_sessions(user_id, status);
create index emotion_sessions_ended_at_idx on public.emotion_sessions(ended_at desc);
```

---

## 4. UI/UX 및 컴포넌트 흐름 (Phase 1 & 3)

### 1) 상단 바 (Topbar)
- 우측 액션: `[지난 기록]` 옆에 `[로그인]` 버튼 추가 (로그인 상태면 `[내 계정 (이메일 앞자리)]` 또는 `[로그아웃]`)
- 게스트 상태일 때 어떠한 경고나 알림도 띄우지 않음.

### 2) 로그인 모달 흐름
```text
[로그인 클릭]
    ↓
이메일 입력 모달
  "기록을 다른 기기와 동기화하고 싶을 때만 로그인하세요."
  [ 이메일 주소 입력 ]
  [ 인증코드 받기 ]
    ↓
6자리 코드 입력 모달
  "{email}으로 발송된 6자리 번호를 입력하세요."
  [ _ _ _ _ _ _ ]
  [ 확인 ]  /  [ 다시 보내기 ]
    ↓
인증 완료
```

### 3) Phase 3: 로컬 기록 마이그레이션 모달
- 로그인 완료 직후, `localStorage`에 기존 `emotion-lab:completed:v4` 기록이 1개 이상 존재할 때만 표시:
```text
┌────────────────────────────────────────────────────────┐
│  이 기기에 저장된 기록 가져오기                         │
│                                                        │
│  이 브라우저에 3개의 지난 관찰 기록이 있습니다.         │
│  지금 로그인한 계정으로 가져올까요?                    │
│                                                        │
│  [ 계정으로 모두 가져오기 ]                            │
│  [ 이 기기에만 남겨두기 ]                              │
└────────────────────────────────────────────────────────┘
```

---

## 5. 다음 세션 작업자를 위한 프롬프트 (Next Session Prompt)

다른 세션을 열어 로그인 작업을 시작할 때, 아래 프롬프트를 복사하여 새 에이전트에게 전달하면 즉시 정확한 컨텍스트로 작업을 이어받을 수 있습니다:

```markdown
안녕하세요! [Thinking 'bout emotion] 프로젝트의 로그인 연동(Phase 0 및 Phase 1) 작업을 시작하려고 합니다.

작업 전 필독 문서:
- docs/AUTH_SPEC_PHASE0_1.md (상세 기술 명세 및 DB 스키마)
- PROJECT_CONTEXT.md §11 (배포와 계정 방향)
- SAFETY.md (감정 데이터 보안 원칙)

목표:
1. Phase 0: lib/storage.ts를 추상화하는 StorageAdapter 인터페이스를 만들고, 기존 LocalStorage 로직을 LocalStorageAdapter로 전환 (기존 테스트 209개 pass 유지)
2. Phase 1: Supabase Auth 기반 이메일 OTP(6자리 번호) 인증 흐름 구현 (게스트 모드는 100% 유지)

먼저 Phase 0(Storage Seam)부터 안전하게 구현해주세요.
```

---

## 6. 운영 설정과 대시보드 확인 (2026-11-12, 합치기 전 점검에서)

코드와 SQL만으로는 알 수 없는 설정이다. 운영에 로그인을 열기 전에 Supabase 대시보드에서 확인한다.

### naver-userinfo는 `verify_jwt = false`로 배포한다
- Supabase Auth가 사용자 지정 공급자 `custom:naver`의 사용자 정보 주소로 이 함수를 부를 때, `Authorization: Bearer` 머리에 **네이버가 준 접근 토큰**을 실어 보낸다. Supabase가 발급한 JWT가 아니다.
- JWT 확인을 켠 채 배포하면 Edge Functions 입구가 이 요청을 함수에 닿기 전에 401로 돌려보내, 네이버 로그인이 늘 실패한다.
- 확인을 꺼도 함수가 하는 일은 받은 토큰을 네이버(`openapi.naver.com/v1/nid/me`)로 그대로 보내고, 네이버가 맞다고 답한 경우에만 식별자 하나(`{"sub": id}`)를 돌려주는 것뿐이다. 토큰이 틀리면 네이버가 거절하고 함수도 401을 돌려준다. 토큰은 어디에도 기록하지 않는다.
- 배포 명령: `supabase functions deploy naver-userinfo --no-verify-jwt`. `supabase/config.toml`을 저장소에 둘 때는 `[functions.naver-userinfo]` 아래 `verify_jwt = false`.

### Supabase Auth에서 Email·Anonymous 로그인을 끈다
- 화면에서는 이메일 로그인을 뺐지만(2026-11-02), Supabase에서 Email 공급자나 익명 로그인(anonymous sign-in)이 켜져 있으면 공개 키(publishable key)만으로 Auth API를 직접 불러 계정을 만들 수 있다.
- 그렇게 만든 계정도 `authenticated`이므로 RLS 정책에 따라 자기 행을 records에 쓸 수 있다. 동의 화면을 거치지 않은 계정이 생기고, 저장 공간을 채우는 데 쓰일 수 있다(크기 제한은 `0004_limits.sql`).
- 그래서 Auth → Providers에서 Email을 끄고(또는 가입을 막고), Anonymous sign-ins를 끈다.

### 대시보드에서 확인할 것 (점검 보고서 1절 「대시보드 확인 필요」 항목)
1. Supabase Auth 설정: 화면에서 이메일 로그인을 뺐지만, Supabase에서 Email 공급자나 익명 로그인(anonymous sign-in)이 켜져 있으면 공개 키만으로 API를 직접 불러 계정을 만들고 records에 쓸 수 있음. → Auth → Providers에서 Email 끄기(또는 가입 막기), Anonymous sign-ins 끄기.
2. `0001_login_sync.sql:60-75`의 `delete_my_account()`: 코드는 바르지만, Supabase 보안 점검은 「로그인한 사람이 실행할 수 있는 security definer 함수」를 경고로 띄우는 경우가 있음. 대시보드 경고 4개 중 하나일 수 있음. → 경고 내용을 확인한 뒤 그대로 두는 이유를 문서에 적기(본인 계정만 지우므로 의도된 것).
3. naver-userinfo 배포 설정: Supabase가 이 함수를 네이버 토큰으로 부르므로 JWT 확인을 꺼서 배포했을 것인데, 그 설정이 저장소 어디에도 적혀 있지 않음. → 이 문서 6절 첫 항목대로 `verify_jwt = false`인지 확인.
4. 대시보드 경고 4개: 대시보드를 볼 수 없어 무엇인지 모름. 코드·SQL로 짐작할 수 있는 후보는 위 1의 Email·익명 로그인 설정, 2의 security definer 함수, 겹치는 색인(`records_user_id_idx`, `0004_limits.sql`에서 지움), 그리고 Auth 쪽 기본 경고(유출 비밀번호 확인 꺼짐, OTP 유효 시간 등, 이메일 로그인을 안 쓰면 영향 없음).
