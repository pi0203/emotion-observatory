# 영어 버전 계획 (i18n)

이 문서는 영어 버전 작업을 이어받는 사람이 처음 읽는 문서다. 정해진 것, 지금까지 한 것,
남은 단계, 단계마다 지킬 규칙을 적는다.

현재 상태(2026-10-11): **단계 A(기반 공사)만 끝났다.** 화면은 이전과 같은 한국어이고,
영어 문구, 영어 데이터, `/en` 주소, 언어 전환 버튼은 아직 없다.

현재 상태(2026-10-11 갱신): **단계 B 끝남.** 루트 레이아웃이 언어별로 나뉘었다(`app/(ko)/layout.tsx`는 `lang="ko"`, `app/(en)/en/layout.tsx`는 개발 서버에서 `lang="en"`).
없는 주소의 404는 `app/global-not-found.tsx`(`experimental.globalNotFound`)가 그리고, 공사 전과 같다(lang ko, 제목 「감정 관찰실」, 픽셀 같음).
`/en`은 개발 서버에서만 열리고, 영어 문구와 데이터가 없다는 상태 틀만 보인다. 한국어로 대신 보여 주지 않는다.
- 운영 /en 404는 탭 제목과 서버 HTML 모양이 /nope와 다르다(`/proto/login`처럼 Next 오류 틀이고, 그려진 뒤 탭 제목이 「404: This page could not be found.」). 링크 없는 주소이며 화면 글자와 색, lang은 같다. 단계 F에서 /en 차단을 풀 때 해소된다.
- 단계 F에서 지울 것: `app/(en)/en/layout.tsx`의 운영 분기(운영 빌드에서 한국어 문서 틀과 제목을 쓰는 부분)와 `app/(en)/en/page.tsx`의 `notFound()` 차단.

---

## 1. 정해진 것

본인이 정한 것이다. 바꾸려면 본인에게 먼저 묻는다.

| 항목 | 결정 |
|---|---|
| 언어 | `ko`, `en` 두 가지. 기본은 `ko` |
| 주소 | `/`는 계속 한국어다. 리디렉션하지 않는다(기존 링크와 수업 안내가 그대로 살아야 한다). 영어는 `/en` |
| 영어 내용 | 한국어의 번역이 아니라 **새로 쓴다** (아래 2절) |
| 의존성 | 새 라이브러리(next-intl, formatjs 등)를 쓰지 않는다. `lib/i18n/`의 작은 자체 구현을 쓴다 |
| 기록 | localStorage의 저장 키(`emotion-lab:*:v4`)와 형식을 바꾸지 않는다. 이미 있는 기록은 모두 한국어로 본다 |
| 공개 | 영어 어휘와 Coach 세트는 항목마다 검토 상태를 두고, **본인이 검토하기 전에는 공개하지 않는다** (아래 4절) |

## 2. 원칙: 영어 내용은 번역이 아니라 새로 쓴다

감정 어휘, 몸 감각, 중요했던 것(concerns), 필요한 것(needs), Coach 예시 세트, 단계 안내는
언어마다 새로 쓴다. 한국어 항목을 하나씩 영어로 옮기지 않는다.

이유는 [EMOTION_CULTURE.md](EMOTION_CULTURE.md)에 적어 둔 앱의 기본 입장에서 나온다.
불쾌함과 유쾌함, 가라앉음과 활성됨 같은 넓은 방향은 언어를 가로질러 비교적 널리 통하지만,
그 안을 어떤 단어로 나누는지는 언어와 문화에 따라 달라질 수 있다. Jackson et al. (2019)의
언어 간 비교는 이 설계와 **양립하는 배경**이다. 영어 어휘가 이렇게 짜여야 한다는 것을
**검증한** 연구는 아니다.

그래서 이렇게 한다.

- 영어 어휘 목록은 영어 화자가 실제로 쓰는 말에서 출발한다. 한국어 목록과 항목 수나
  짝이 맞지 않아도 된다. 「억울함」처럼 영어에 딱 맞는 말이 없는 항목을 억지로 옮기지 않는다.
- Coach 예시 세트도 영어로 새로 쓴다. 예시 상황, 눈에 띄는 것(appraisals), 표현 세 가지,
  참고 설명 모두 그 언어 안에서 서로 비교할 만한 말로 고른다.
- 화면 문구(사전)는 뜻이 같아야 하는 안전 문구와 원칙 문구가 있다(「감정을 맞히는 검사가
  아닙니다」, 효과 미검증, 위기 창구 아님). 이 문구들은 뜻을 바꾸지 않고 영어로 다시 쓴다.
  나머지 안내 문구는 영어 화자에게 자연스러운 말로 쓴다.
- 한국어 조사처럼 한 언어에만 있는 문법은 그 언어의 사전 안에서 처리한다(아래 3절의 `{~name|A/B}`).
  코드가 특정 언어의 문법을 알지 않게 한다.

## 3. 단계 A에서 만든 것 (기반 공사)

### 사전과 번역 함수 (`lib/i18n/`)

| 파일 | 하는 일 |
|---|---|
| `locale.ts` | `Locale`(`"ko" \| "en"`), `DEFAULT_LOCALE`(`"ko"`), `localeOf(record)`: locale이 없거나 모르는 값이면 `ko` |
| `messages.ko.ts` | 한국어 문구 사전. 화면과 기능별로 묶었다(`landing`, `quickCandidates`, `coach`, `synthesis`, `records` …) |
| `format.ts` | 매개변수 채우기. `{name}`은 값, `{~name\|을/를}`은 `name`의 마지막 글자에 맞는 조사만 넣는다 |
| `t.ts` | `getT(locale)`가 돌려주는 `t(key, params)`와 `t.list(key)`. 키와 매개변수는 타입 검사가 확인한다 |
| `dates.ts` | `formatWhen(iso, locale)`: 숫자는 `Intl.DateTimeFormat`에서, 순서와 문장부호는 사전의 `records.when`에서 |
| `react.tsx` | `I18nProvider`, `useT()`, `renderRich()`. 사전의 `\n`은 `<br />`, `<b>…</b>`는 `<strong>`으로 그린다 |

키와 매개변수는 두 겹으로 확인한다.

1. **타입 검사:** 사전의 한국어 문장에서 `{…}`를 읽어 매개변수 타입을 만든다. 없는 키를 쓰거나
   매개변수를 빼먹거나 이름을 틀리면 `npx tsc --noEmit`이 실패한다.
2. **시험(`tests/i18n-messages.test.ts`):** 코드의 모든 `t(...)` 호출을 구문 트리로 읽어 키가 있는지,
   넘긴 매개변수가 문장 속 자리와 정확히 같은지, 아무도 쓰지 않는 키가 없는지 본다.

### 콘텐츠 (`lib/content.ts`)

`getContent(locale)`는 지금 `ko`에 대해 `data/*.ko.json`을 그대로 돌려주고, `en`에 대해서는 `null`을
돌려준다. 콘텐츠 없이는 진행할 수 없는 코드는 `requireContent(locale)`를 쓴다. `en`이면
「아직 쓰지 않았다」는 오류를 낸다. 한국어로 조용히 대신 보여 주지 않는다.

### 기존 export를 그대로 둔 방식

기존 시험을 고치지 않고 통과시키려고 이름과 형태를 그대로 두고, 언어는 맨 끝의 선택 매개변수로 더했다.

- `coachSets`, `COACH_ESCAPES`, `APPRAISAL_ESCAPES`, `TRIED`, `HELPED`, `SYNTHESIS_LEAD`,
  `SYNTHESIS_CAVEAT`, `NOT_ENOUGH`는 한국어 값의 상수로 남아 있다. 언어별 값은 새 함수
  `getCoachSets(locale)`, `coachEscapes(locale)`, `appraisalEscapes(locale)`, `triedOptions(locale)`,
  `helpedOptions(locale)`로 받는다.
- `filterQuickCandidates(point, limit, locale)`, `expandCandidates(shown, limit, locale)`,
  `quickValence(value, locale)` 같은 함수는 마지막 매개변수가 없으면 한국어로 동작한다.
- `coachSetFor(session)`, `coachResult(session)`, `buildSynthesis(session)`, `responseLabels(session)`은
  기본값으로 **기록의 언어**(`localeOf(session)`)를 쓴다.

### 기록의 언어 (`EmotionSession.locale`)

- 선택 필드 `locale?: Locale`을 더했다. 새 기록은 만들 때 그 화면의 언어를 넣는다(`createSession`,
  `START_QUICK`, `START_DEEP`).
- **기록에는 사용자가 본 말이 그대로 저장된다.** 고른 감정 단어, 몸 감각, 「여러 개」·「잘 모르겠음」
  같은 탈출 선택지는 id가 아니라 그 언어의 낱말로 남는다. 그래서 `locale`은 「이 낱말들을 어느 언어로
  읽어야 하는가」를 알려 준다. 나중에 사전 문구를 고쳐도 옛 기록의 낱말은 바뀌지 않는다.
- **마이그레이션은 필요 없다.** 저장소는 기록 객체를 통째로 JSON으로 저장하고 읽으며, 옛 판(v1~v3)을
  옮기는 코드도 필드를 펼쳐 복사한다. 필드가 선택이고, 없으면 `ko`로 읽으며, 지금까지의 기록은 모두
  한국어 화면에서 만들어졌다. 그러니 저장 키와 판 번호(v4)를 그대로 두어도 옛 기록과 새 기록이 같이
  읽힌다. `locale`이 있는 새 기록을 이전 판의 앱이 읽어도 모르는 필드로 무시한다.
- 시험: `tests/i18n-record-locale.test.ts`.

### 코드에 한국어를 직접 쓰지 않는다

`tests/i18n-no-korean-in-code.test.ts`가 `app/page.tsx`와 `lib/` 아래 모든 `.ts`, `.tsx`에서 한글이 든
문자열, 템플릿, JSX 글자를 찾는다(주석은 제외, 사전 파일은 제외). 새 문구는 사전에 넣고 `t()`로 부른다.

`lib/norm-audit.ts`에 있던 한국어 열 이름(「단어」, 「정서가」 등)은 화면 문구가 아니라 외부 한국어
norm 표를 읽는 규칙이라 사전이 아니라 `data/norm-headers.ko.json`으로 옮겼다.
`scripts/audit-norms.mjs`의 출력은 옮기기 전과 같다.

### 단계 A에서 옮기지 않은 것

- `data/*.ko.json`의 내용(어휘, 몸 감각, needs, Coach 세트, 단계 안내). 콘텐츠이므로 언어별로 새로 쓴다.
- `app/layout.tsx`의 제목, 설명, `<html lang="ko">`. 단계 B에서 경로와 함께 다룬다. (단계 B에서 처리: 제목과 설명은 사전의 `meta`, 문서 틀은 `app/korean-document.tsx`)
- `app/proto/bread`. 운영에서 막혀 있는 실험 화면이라 범위 밖이다.
- `scripts/audit-norms.mjs`의 한국어 출력. 개발 도구다.

## 4. 영어 어휘와 Coach 세트의 검토 상태

영어 어휘 항목과 Coach 세트에는 항목마다 `reviewStatus`를 둔다.

| 값 | 뜻 |
|---|---|
| `draft` | 쓰기만 했고 본인이 아직 검토하지 않았다. 기본값 |
| `reviewed` | 본인이 검토했다. 이 상태의 항목만 운영 화면에 나간다 |

규칙:

- 새로 쓰는 항목은 언제나 `draft`로 시작한다. AI가 쓴 초안도, 사람이 쓴 초안도 같다.
- `reviewed`로 바꾸는 것은 본인만 한다. 검토한 날짜를 함께 적는 것을 권한다.
- 운영 빌드는 `reviewed`가 아닌 항목을 보여 주지 않는다. 걸러낸 결과 화면을 구성할 수 없으면
  (예: 어휘가 너무 적거나 Coach 세트가 없으면) 그 언어는 공개하지 않는다.
- 시험으로 지킨다: 「운영에서 보이는 영어 항목은 모두 `reviewed`다」.
- 화면 문구 사전(`messages.en.ts`)도 같은 이유로 공개 전 본인 검토를 거친다. 특히 안전 문구와
  위기 안내는 [SAFETY.md](../SAFETY.md)의 기준을 따르고, 지역 응급 연락처 같은 구체 정보는
  검토 없이 넣지 않는다.

## 5. 단계

| 단계 | 할 일 | 끝났다고 보는 기준 |
|---|---|---|
| **A. 기반 공사** (끝남) | 사전, `t()`, 컨텍스트, `getContent(locale)`, 기록의 `locale`, 코드 속 한국어 금지 시험 | 한국어 화면이 글자 하나 다르지 않고, 기존 시험이 고치지 않고 통과 |
| **B. `/en` 경로와 차단** | `/en` 화면을 만들되 **운영에서는 막는다.** 빵 프로토타입과 같은 방식: `app/en/page.tsx`에서 `process.env.NODE_ENV === "production"`이면 `notFound()`. `/`는 손대지 않는다. 언어별 `<html lang>`, 제목, 설명 | 개발 서버에서만 `/en`이 열리고, 운영 빌드에서는 404. `/`는 리디렉션 없이 한국어 |
| **C. 영어 화면 문구** | `lib/i18n/messages.en.ts`를 `Messages` 타입에 맞춰 새로 쓴다. `t.ts`의 `MESSAGES`에 연결 | 타입 검사가 키 누락을 막는다. 안전·원칙 문구는 뜻이 같다. 본인 검토 |
| **D. 영어 콘텐츠** | `data/*.en.json`을 새로 쓴다. 어휘와 Coach 세트에 `reviewStatus`. `lib/content.ts`의 `CONTENT.en`에 연결하고 운영에서는 `reviewed`만 남기는 필터 | 4절의 규칙과 시험 |
| **E. 언어가 섞인 기록** | 화면의 언어와 기록의 언어가 다를 때: 기록의 낱말은 저장된 그대로, 화면 틀(제목, 버튼)은 보는 사람의 언어. 지난 기록 목록과 상세, 요약 문장, Coach 결과를 각각 정한다 | 한국어 기록을 영어 화면에서 열어도 낱말이 바뀌거나 사라지지 않는다 |
| **F. 공개** | 언어 전환 UI, `/en` 차단 해제, PRODUCT_SPEC과 README 갱신, 영어 화면 접근성 점검(대비, 키보드, 움직임 줄이기), 영어 화면 사용성 확인 | 본인 승인 후에만 |

### 단계 B를 위한 메모 (Next 16 문서 기준)

- `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`는 `app/[lang]` 아래로 전부 옮기고
  Proxy로 언어를 골라 리디렉션하는 방식을 예로 든다. 이 앱은 **`/`를 리디렉션하지 않기로** 했으므로
  그 방식을 그대로 쓰지 않는다. `/`는 지금 파일 그대로 두고, 영어만 `/en`이라는 별도 경로로 둔다.
- Proxy(`proxy.ts`, 옛 `middleware`)는 이 결정에서는 필요하지 않다. 브라우저 언어로 자동 이동시키지 않기
  때문이다. 나중에 자동 안내가 필요해져도 이동이 아니라 안내 문구로 하는 쪽을 먼저 검토한다.
- 화면 컴포넌트는 이미 `I18nProvider` 아래에서 `useT()`로 문구를 읽으므로, `/en` 화면은
  `<I18nProvider locale="en">`으로 같은 화면을 감싸는 것에서 출발할 수 있다.
- 단계 E 전까지 영어 화면은 한국어 기록과 같은 저장소 키를 쓰게 된다. 그래서 영어 화면이 `ko` 기록을
  만나는 경우를 단계 B에서부터 시험에 넣는다.

## 6. 새 문구를 더하는 법

1. `lib/i18n/messages.ko.ts`에서 그 화면이나 기능의 묶음에 키를 더한다. 줄바꿈은 `\n`, 강조는
   `<b>…</b>`, 값은 `{name}`, 한국어 조사는 `{~name|을/를}`.
2. 코드에서 `const t = useT();`(화면) 또는 `getT(locale)`(lib) 뒤에 `t("묶음.키", { name })`.
3. 기록에 저장되는 낱말이면 사전 주석에 그렇게 적는다(지금은 `emotion.escapes`, `coach.escapes`).
4. `npm test`, `npx tsc --noEmit`, `npm run build`.
