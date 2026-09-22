# Emotion Self-Monitoring Web App — Product & Implementation Blueprint

> **먼저 읽을 것: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** — 제품 의도, 사용자 여정, 현재 사이클의 결정.
> 이 문서는 그 의도를 구현으로 옮긴 상세 명세이며, 구현의 source of truth다.
>
> Working title: **Emotion Lab / 감정 관찰실**  
> Status: **MVP design specification**  
> Primary use: handoff to Codex / Claude for implementation  
> Core stance: **self-monitoring first, optional assistance second**  
> Non-goal: diagnosis, therapy replacement, emotion “detection,” or maximizing engagement

---

## 0. Product definition

이 웹앱은 사용자의 감정을 맞혀주거나 진단하는 도구가 아니라, 사용자가 **몸의 상태·상황·의미·감정 개념을 구별해 보고, 자신에게 더 정확하고 유용한 언어로 표현하도록 돕는 짧은 자기관찰 도구**다.

### 제품 구조: 세 개의 층

제품은 하나의 긴 flow가 아니라 **깊이가 다른 세 층**으로 이루어진다.
기본 진입은 Quick Check이며, 아래 두 층은 사용자가 필요하다고 선택할 때만 열린다.

| 층 | 목표 시간 | 사용자가 하는 일 | 앱이 제공하는 것 |
|---|---:|---|---|
| **Quick Check** (기본) | 10~20초 | affect 공간을 한 번 탭 → 가까운 말 선택 | 수십 개 단어 중 탐색 범위를 3~5개로 줄인다 |
| **Granularity Coach** (선택) | +10~30초 | 비슷한 표현을 상황 예시로 비교 | “그냥 기분 나쁨”을 조금 더 구별해본다 |
| **Deep Reflection** (선택) | 2~5분 | 몸·맥락·중요했던 것·표현을 탐색 | 왜 그런 경험이 되었는지 살펴본다 |

세 층은 순차적 단계가 아니다. Quick Check만으로도 세션은 완결된다.

### Deep Reflection의 질문 흐름

깊은 층에서의 핵심은 “무슨 감정이지?”를 맞히는 것이 아니라 다음 질문의 흐름을 만드는 것이다.

> **지금 관찰하는 것이 도움이 되는가? → 몸에서는 무엇이 일어나는가? → 어떤 일이 있었는가? → 무엇이 중요했는가? → 어떤 감정 개념이 가장 가까운가? → 그래서 지금 무엇이 필요한가? → 표현한다면 어떻게 말할 수 있는가?**

### 왜 감정카드가 아니라 웹앱인가

아날로그 감정카드는 “어떤 단어들이 있는가”를 보여주는 데 이미 충분히 좋다.
정적인 감정 목록을 디지털로 옮기는 것은 이 제품의 목적이 아니다.

> 사용자의 현재 상태에 따라 **탐색할 감정 개념의 범위를 줄이고**, 필요하면 **비슷한 개념을 구별하도록 돕고**, 시간이 흐르며 **자신의 경험에 나타나는 패턴을 스스로 발견**할 수 있게 하는 것이 디지털 도구의 가치다.

기술의 역할은 정답을 맞히는 것이 아니라 **탐색공간을 줄이는 것**이다.

---

# 1. Product principles

제품의 철학은 다음 세 문장으로 고정한다.

> **1. 빠르게 시작하고, 필요할 때만 깊어진다.**
> **2. 감정을 판정하지 않고, 구별할 수 있는 선택지를 넓힌다.**
> **3. 설명으로 가르치기보다 상황 속 차이를 발견하게 한다.**

아래 원칙들은 이 세 문장을 구체화한 것이다.

---

## P0. 최소한의 상호작용만 요구한다

사용자가 감정을 더 오래, 더 많이 기록하게 만드는 것이 목적이 아니다.
**자신의 상태를 이해하는 데 필요한 최소한의 상호작용만 요구한다.**

- 기본 경험(Quick Check)은 **10~30초 안에 완결**될 수 있어야 한다.
- 기본 경로에서 free-text 입력을 요구하지 않는다. tap/click만으로 끝낼 수 있다.
- 깊은 자기성찰은 사용자가 필요하다고 **선택할 때만** 열린다.
- 입력 단계를 늘려 “정확도”를 높이는 방향으로 설계하지 않는다.

금지:
- 기본 경로에 필수 free-text
- 완주를 전제하는 progress 표시 (짧은 흐름에 진행률을 붙이면 “끝내야 하는 코스”가 된다)
- 더 많은 단계를 거친 세션을 더 좋은 세션처럼 보이게 하는 UI

P1과의 관계: P1은 “기록하지 않을 자유”를, P0은 “적게 기록할 자유”를 보장한다.

---

## P1. 사용하지 않는 선택도 성공이다

앱의 목적은 사용 빈도나 streak를 늘리는 것이 아니다.  
사용자가 지금 자기관찰이 도움이 되지 않는다고 판단하면 **기록하지 않고 종료할 수 있어야 한다.**

금지:
- 연속 기록(streak)
- “오늘 아직 기록하지 않았어요” 알림
- 기록 횟수 경쟁
- 감정을 매일 반드시 측정해야 한다는 인상
- 기록하지 않으면 실패한 것처럼 보이는 UI

성공의 한 형태:
> “지금은 기록보다 쉬는 게 낫겠다”고 사용자가 알아차리고 앱을 닫음.

---

## P2. 감정 이름보다 경험에서 시작한다 (Quick Check는 명시적 예외)

첫 화면부터 emotion wheel이나 전체 감정 단어 목록을 제시하지 않는다.

**Deep Reflection의 순서**는 다음을 유지한다.

1. 관찰 여부
2. 신체/전반적 느낌
3. valence / activation
4. 맥락
5. 중요했던 것
6. 감정 후보
7. 구별
8. 필요/행동
9. 표현
10. 도움 여부

즉:

`emotion → reason`

이 아니라

`body/affect → context → meaning → emotion concept → action/expression`

이다.

### 명시적 예외 — Quick Check

Quick Check는 body와 context 없이 **affect 한 번의 탭 직후 감정 후보를 보여준다.**
이것은 실수나 표류가 아니라 P0을 위해 **의도적으로 승인된 P2의 예외**다.

예외는 다음 조건을 **모두** 지킬 때만 유효하다.

- 후보는 3~5개로 제한한다. 전체 vocabulary를 노출하지 않는다.
- 후보는 판정이 아니라 “지금 경험을 표현할 때 **가까울 수도 있는 말**”로만 제시한다.
- `가까운 말이 없음`과 `잘 모르겠음`이 항상 정상 선택지로 존재한다.
- affect 좌표는 **후보 축소에만** 사용한다. 감정을 산출하는 lookup table로 문서화하거나 구현하지 않는다.
- Quick Check에서 고른 단어는 Deep Reflection에서 정답이나 고정값으로 이어지지 않는다.
- 첫 화면(Landing)에는 여전히 감정 단어를 두지 않는다.

즉 순서 원칙 자체는 유지되지만, “감정 단어는 body/context 이후에만 나올 수 있다”는 **더 강한 형태는 Quick Check에 적용되지 않는다.**

이 예외를 되돌리려는 변경은 제품 결정 사항이며, 구현 판단으로 처리하지 않는다.

---

## P3. 앱은 감정을 판정하지 않는다

앱은 다음과 같은 표현을 사용하지 않는다.

- “당신은 분노하고 있습니다.”
- “이것은 불안입니다.”
- “AI가 분석한 결과 당신의 감정은 …”
- “정확도 87%로 서운함입니다.”

대신:

- “이 중 어느 표현이 더 가까운가요?”
- “둘 이상일 수도 있습니다.”
- “아직 이름 붙이기 어렵다면 그대로 둘 수 있습니다.”
- “직접 다른 표현을 적어도 됩니다.”

감정 이름은 **정답이 아니라 임시 가설**로 취급한다.

---

## P4. 관찰은 행동과 표현으로 이어져야 한다

“불안 7/10” 저장으로 끝내지 않는다.

세션 후반에는 반드시 다음 중 하나 이상으로 이어진다.

- 무엇이 중요했는지 이해
- 지금 필요한 것이 무엇인지 구별
- 작은 행동 선택
- 누군가에게 표현할 문장 구성
- 그냥 더 관찰하지 않고 종료

---

## P5. 부정적 감정만 수집하지 않는다

앱은 “문제 기록기”가 아니다.

다음도 같은 무게로 기록 가능해야 한다.

- 편안함
- 흥미
- 몰입
- 안도
- 만족
- 연결감
- 안전감
- 활력

장기적으로는 “무엇이 나를 힘들게 하나?”뿐 아니라  
**“어떤 조건에서 나는 조금 더 잘 기능하는가?”**를 보여주는 도구가 되어야 한다.

---

## P6. 관찰이 반추로 변하면 깊이를 줄인다

사용자가 같은 사건을 반복 입력하거나,
기록할수록 더 혼란스럽거나 괴롭다고 보고하면
앱은 더 많은 질문을 하지 않는다.

이 경우의 목적은 insight가 아니라 **stop / shift**다.

---

## P7. 특정 감정이론을 과학적 최종 정답으로 가르치지 않는다

앱은 **어떤 감정이론도 확정된 진리로 제시하지 않는다.**
설계는 특정 연구자의 이론이 아니라, 다음 **네 가지 이론 중립적 전제** 위에서만 이루어진다.

1. **정서 경험은 valence/arousal만으로 충분히 설명되지 않을 수 있다.**
2. **맥락과 의미평가(appraisal)는 정서 경험을 이해하는 데 중요하다.**
3. **생리·뇌·표정에는 정서 관련 정보와 일정한 규칙성이 있을 수 있다.**
4. **그러나 현재 단일 지표나 고정 패턴으로 개인의 특정 감정을 확정적으로 판정하는 것은 정당화하지 않는다.**

이 네 전제는 서로 경쟁하는 이론들 사이에서 **어느 한쪽이 수정되어도 살아남도록** 선택된 것이다.
특정 이론에 기대어 설계를 정당화하지 않으며, 이론이 바뀌어도 제품 원칙은 유지된다.

권장 설명:

> “이 도구는 감정을 몸의 상태, 상황, 과거 경험과 개념이 함께 만들어내는 경험으로 살펴보는 관점을 사용합니다.”

금지:

> “뇌는 감정을 이렇게 만들어냅니다. 이것이 과학적으로 밝혀졌습니다.”

> “감정에는 어떤 생물학적 신호도 없습니다.” — 위 3번 전제와 충돌한다.

> 특정 연구자의 이론을 앱의 교육 콘텐츠로 정답처럼 제시하는 것.

micro-learning 문구는 위 네 전제를 벗어나지 않아야 한다.
별도의 이론 강의 화면은 만들지 않는다.

---

## P8. 성공지표는 engagement가 아니라 usefulness다

핵심 outcome:

- 이전보다 조금 더 명확해졌는가?
- 적절한 단어를 찾는 데 도움이 되었는가?
- 지금 무엇이 필요한지 조금 더 알게 되었는가?
- 표현이 쉬워졌는가?
- 기록이 오히려 부담이 되었는가?

DAU / 세션 수 / 평균 체류시간은 제품 운영 지표일 뿐,
심리적 효과 지표로 해석하지 않는다.

### 주장의 범위 (설계 가설)

**emotional granularity 개선은 현재 이 제품에서 입증된 효과가 아니다.**

제품은 “granularity를 향상시킨다”고 주장하지 않는다.
대신 **“더 세밀하게 구별하고 표현하는 연습을 돕는다”**는 **설계 가설**로만 기술한다.

- 앱 내부 copy, README, 외부 소개문 어디에서도 치료 효과나 능력 향상을 주장하지 않는다.
- 참고한 연구들은 대부분 상관 연구이며, 이 앱의 효과를 검증한 것이 아니다.
- 반복 사용 전후의 변화는 향후 별도 연구로 평가할 대상이다.

---

# 2. Who this is for

## Primary user

- “기분이 이상한데 정확히 뭔지 모르겠다.”
- 화나거나 불편하지만 그 경험을 더 세분하고 싶다.
- 관계에서 감정을 표현할 말을 찾기 어렵다.
- 상담/자기성찰 전에 경험을 정리하고 싶다.
- 반복되는 상황에서 자신의 반응 패턴을 궁금해한다.
- 감정 어휘를 늘리고 싶다.

## Not primarily for

- 응급 상황을 해결하는 도구
- 정신질환 진단
- 위기상담
- 치료자 없이 복잡한 외상 기억을 깊게 탐색하는 도구
- 사용자의 “진짜 감정”을 AI가 추론하는 도구
- 지속적인 증상 모니터링이 필수인 의료기기

---

# 3. Entry gate: “지금 기록이 도움이 될까?”

앱을 열자마자 바로 기록 폼을 보여주지 않는다.

## Screen 0 — Check-in gate

### Main copy

**지금 이 경험을 조금 들여다보고 싶나요?**

서두르지 않아도 됩니다.  
지금은 생각을 더 하지 않는 편이 낫다면 기록하지 않아도 됩니다.

### Options

1. `조금 살펴보고 싶어요`
2. `잘 모르겠어요`
3. `지금은 그만 생각하고 싶어요`

### Routing

#### 1 → Normal flow
Body / context 탐색 시작

#### 2 → 20-second mini-check
아래 2개만 질문:

- 지금 몸이 편안한가요, 긴장되어 있나요?
- 이것을 생각하는 것이 지금 도움이 될 것 같나요?

결과:
- 도움될 것 같음 → Normal flow
- 모르겠음/아님 → Exit card

#### 3 → Exit card
질문 추가 금지.

Example:

> 지금은 더 분석하지 않아도 됩니다.  
> 물 한 잔, 잠깐 걷기, 다른 일로 주의를 옮기기처럼  
> 경험에서 조금 거리를 두는 것도 선택입니다.

Buttons:
- `기록 없이 나가기`
- `한 줄만 남기기`

---

# 4. Core session flow (Deep Reflection)

이 절은 **Deep Reflection 층**을 기술한다. 기본 진입 경로가 아니며,
사용자가 `조금 더 천천히 들여다보기`를 선택할 때만 열린다.
기본 경로는 §0의 Quick Check이고, P0이 적용된다.

## Step-level micro feedback

각 단계에서 **선택을 실제로 한 직후**, 왜 이 질문을 했는지를 한 문장으로 보여준다.
문구는 `data/step-notes.ko.json`에 두고 코드 밖에서 검토한다.

규칙:

- 한 문장 이하. 선택 **전**의 `hint`와 역할이 다르다(hint는 무엇을 묻는지, note는 왜 묻는지).
- `다음`·`건너뛰기`를 막지 않는다. 모달이나 확인 절차가 아니다.
- 아무것도 고르지 않았으면 나타나지 않는다. Affect처럼 기본값이 있는 단계는
  사용자가 실제로 값을 움직인 뒤에만 보여준다.
- **P7의 네 전제를 벗어나지 않는다.** 특정 감정이론을 정답으로 가르치지 않으며,
  판정·진단·행동 권고를 하지 않는다.

---

## Step 1 — Body

### Prompt

**먼저, 몸에서는 무엇이 느껴지나요?**

설명:
> 감정 이름을 찾기 전에 지금 몸에서 알아차릴 수 있는 것부터 봅니다.

### UI

Multi-select chips + custom input.

Examples:

- 가슴이 답답함
- 심장이 빠르게 뜀
- 얼굴이 뜨거움
- 목/어깨가 긴장됨
- 배가 불편함
- 몸이 무거움
- 힘이 빠짐
- 안절부절못함
- 편안함
- 따뜻함
- 가벼움
- 특별히 모르겠음
- 직접 입력

Optional intensity:
`약함 — 보통 — 강함`

### Constraint

신체감각을 감정으로 자동 번역하지 않는다.

예:
`심장이 빠름 → 불안` 자동추론 금지.

---

## Step 2 — Core affect

### Prompt

**전체적으로 지금 경험은 어느 쪽에 가까운가요?**

Two continuous sliders or 5-point scales:

1. `불쾌함 ←→ 유쾌함`
2. `가라앉음 ←→ 활성됨`

Optional third:
`통제되는 느낌 ←→ 압도되는 느낌`

### Design principle

숫자를 크게 전면에 노출하지 않는다.
“7.3/10” 같은 정밀도는 필요 없음.

Prefer:
- 매우 낮음
- 낮음
- 중간
- 높음
- 매우 높음

---

## Step 3 — Context

### Prompt

**무슨 일이 있었나요?**

Sub-prompt:
> 사실만 간단히 적어도 충분합니다.

Textarea.

Optional structured fields:

- 누구와/어디에서?
- 방금 / 오늘 / 며칠 전
- 실제 사건 / 기억 / 예상 / 생각

### Important

사건과 해석을 완전히 강제로 분리하지 않는다.
그러나 후속 질문에서 gently distinguish:

> “일어난 일”과 “그 일이 나에게 어떤 의미였는지”를 따로 보면 도움이 될 수 있습니다.

---

## Step 4 — Meaning / concern

### Prompt

**그 순간 무엇이 중요했던 것 같나요?**

Options + custom:

- 존중받고 싶었다
- 이해받고 싶었다
- 안전하고 싶었다
- 인정받고 싶었다
- 연결되고 싶었다
- 내 선택권을 지키고 싶었다
- 공정했으면 했다
- 잘하고 싶었다
- 실패하고 싶지 않았다
- 잃고 싶지 않았다
- 쉬고 싶었다
- 잘 모르겠다
- 직접 입력

This is NOT a needs diagnosis.
Multiple selection allowed.

---

## Step 5 — Emotion candidates

### Prompt

**지금까지 적은 경험에 가까운 단어가 있나요?**

Show 6–10 candidates max.

Never show entire emotion dictionary by default.

Candidate pool may be filtered by valence/activation,
but this must be treated only as UI assistance, not inference.

Examples:

anger-family:
- 화남
- 짜증
- 억울함
- 분개
- 답답함

sadness/loss-family:
- 슬픔
- 허전함
- 외로움
- 서운함
- 실망

fear/uncertainty-family:
- 불안
- 걱정
- 초조
- 두려움
- 긴장

positive:
- 안도
- 만족
- 편안함
- 흥미
- 즐거움
- 뿌듯함
- 고마움

Always include:

- `여러 개`
- `잘 모르겠음`
- `내 단어로 적기`
- `더 많은 단어 보기`

---

# 5. Emotion granularity mechanism

감정어를 많이 보여주는 것 자체가 목표가 아니다.
“비슷한 단어 사이의 차이”를 사용자 경험과 연결해야 한다.

이 메커니즘은 두 곳에 나타난다.

- **Granularity Coach** (Quick Check 뒤, 선택) — 상황 예시를 비교해 차이를 **발견**하게 한다. 철학 3번이 여기에 적용된다.
- **Step 6 Differentiate** (Deep Reflection 안, 아래) — 이미 적은 맥락을 근거로 인접 개념을 비교한다.

어느 쪽도 사전식 정의를 가르치지 않으며, 상황 → 감정의 1:1 정답표를 만들지 않는다.

## Step 6 — Differentiate

사용자가 한 단어를 고르면:

### Prompt

**왜 이 단어가 조금 더 가까운가요?**

Example for “서운함”:

- 기대했던 반응이 오지 않아서
- 중요한 사람에게 덜 중요하게 느껴져서
- 이해받지 못했다고 느껴서
- 다른 이유
- 아직 설명하기 어려움

### Compare nearby concept

> “실망”과 “서운함” 중에서는 어느 쪽에 더 가깝나요?

Then:
> 꼭 하나만 고를 필요는 없습니다.

### Granularity rule

항상 “단어 → 정의” 방식이 아니라
“나의 경험 → 단어 간 차이” 방식으로 진행한다.

---

# 6. Action / need layer

## Step 7 — What now?

### Prompt

**이 경험을 알아차리고 나니, 지금 무엇이 가장 필요해 보이나요?**

Options:

- 잠깐 거리두기
- 쉬기
- 몸을 움직이기
- 생각을 정리하기
- 누군가에게 말하기
- 문제를 해결하기
- 경계를 세우기
- 사과하거나 수습하기
- 도움 요청하기
- 그냥 시간이 필요함
- 지금은 모르겠음

### Important

앱이 행동을 처방하지 않는다.

Instead:

> “이 중 지금 가능한 아주 작은 행동이 있을까요?”

Optional:
`내가 선택한 다음 행동`

---

# 7. Expression layer

## Step 8 — Put it into words

### Prompt

**누군가에게 이 경험을 말한다면, 어떤 문장이 가장 가깝나요?**

Template assistance:

> “___ 일이 있었을 때, 나는 ___하게 느꼈어.  
> 그때 나에게 중요했던 건 ___였던 것 같아.  
> 지금은 ___가 필요해.”

Alternative:
> “정확한 문장을 만들 필요 없이 한 줄로 적어도 됩니다.”

### AI rule

AI가 나중에 문장을 다듬는 기능이 추가되더라도:
- 사용자의 의미를 확장/왜곡하지 않음
- 공격적 표현을 “진짜 감정”으로 재해석하지 않음
- 관계 상대방의 동기 추론 금지

---

# 8. Session outcome check

## Step 9 — Was this useful?

### Prompt

**처음보다 지금 경험이 조금 더 분명해졌나요?**

Options:
- 많이 더 분명해짐
- 조금 더 분명해짐
- 비슷함
- 더 복잡해짐
- 더 불편해짐

Second question:

**이 기록은 지금 도움이 되었나요?**

- 도움됨
- 잘 모르겠음
- 도움되지 않음

Optional:
> “왜 그렇게 느꼈나요?” — 1 line

---

## 8.1 Synthesis summary v1

입력값 나열과 **별도로**, 전체 과정에서 무엇이 드러났는지를 이어주는 섹션을 둔다.

> **지금까지의 경험을 이렇게 정리해볼 수 있어요**

### 생성 방식

- **AI를 사용하지 않는다.** 사용자가 직접 입력·선택한 데이터만 쓰는 deterministic template이다.
- 같은 입력이면 항상 같은 문장이 나온다.
- 사용 가능한 정보: Quick affect, Deep affect, body, context, meaning, 선택한 감정어,
  후보를 고르지 않았다는 응답.

### 표현 원칙 (테스트로 고정)

금지:

- `당신은 X입니다` 같은 단정
- 인과관계 확정 (`때문에`, `그래서`, `이유는`)
- 타인의 의도 추론 (`상대는`, `그 사람은`, `의도`)
- 사용자가 제공하지 않은 심리 특성 추가 (`경향이 있`, `유형입니다`)
- 해석을 감춘 완곡어법 (`것으로 보입니다`, `듯합니다`, `분석`) — 가능하면 최소화

사용:

> **당신이 고른 내용을 연결하면 이렇게 정리해볼 수 있습니다.**

그리고 끝에 명시한다.

> 이것은 해석이나 진단이 아니라, 당신이 고른 내용을 그대로 이어 붙인 것입니다.

사용자가 적은 항목은 인용부호로 감싼 뒤 조사를 붙인다. 입력이 절인 경우가 많아
(`존중받고 싶었다`) 조사를 직접 붙이면 문장이 깨진다.

### Before / After (Quick → Deep)

두 affect가 모두 있으면 나란히 보여주되 **평가하지 않는다.**

> 처음 빠른 확인에서는 ___ 쪽이었고, 조금 더 살펴본 뒤에는 ___로 표시했습니다.

감정어가 달라졌다면:

> 살펴보면서 가까운 표현이 조금 달라졌습니다.

같은 표현을 유지했다면 그것도 그대로 적는다. `더 정확해졌다`, `개선됐다` 같은
효과 주장은 하지 않는다. 어느 쪽이 맞는지 판정하지 않는다.

### 사용자의 평가

> **이 설명이 지금 경험과 얼마나 맞나요?**
> `꽤 맞아요` · `일부만 맞아요` · `잘 모르겠어요`
> `내 말로 고쳐보기`

- `synthesisFeedback`으로 저장한다(§13). 향후 앱 자체의 usefulness 검증용이며,
  **사용자에게 점수로 되돌려주지 않는다.**
- 평가와 고쳐쓰기는 서로 독립이다. 고쳐쓰기를 저장해도 평가를 대신 고르지 않는다.
- 완료된 세션에 기록되며 stage·status를 바꾸지 않는다.

---

# 9. Rumination / Stop Logic

이 부분은 MVP에서 반드시 구현한다.

## 9.1 Trigger signals

다음 중 하나 이상이면 `rumination_risk += 1`.

### A. Repeated event
동일하거나 매우 유사한 사건을 짧은 기간 내 여러 번 기록.

MVP rule:
- same-session restart ≥ 2
- user manually indicates “같은 일을 계속 생각 중”

AI semantic similarity는 MVP에서 필수 아님.

### B. Deterioration
session outcome:
- `더 복잡해짐`
- `더 불편해짐`

### C. Excessive duration
한 세션이 지나치게 길어짐.

MVP threshold:
- 10 minutes: gentle check
- 15 minutes: stop suggestion

숫자는 향후 사용성 테스트로 조정.

### D. Re-entry
24시간 내 같은 entry를 사용자가 직접 열어 재분석하려는 경우.

### E. User report
- “계속 생각이 반복된다”
- “더 생각하고 싶지 않은데 멈추지 않는다”

---

## 9.2 Stop levels

### Level 0
No risk → normal flow

### Level 1 — gentle interruption

Message:

> 잠깐 확인해볼게요.  
> 지금 더 생각하는 것이 경험을 이해하는 데 도움이 되고 있나요?

Options:
- 네 → continue
- 잘 모르겠어요
- 아니요

### Level 2 — shorten

If `잘 모르겠어요 / 아니요`:

skip emotion differentiation and analysis.

Show:

> 지금은 더 세밀하게 분석하기보다 여기까지 알아차린 것으로 충분할 수 있습니다.

Then choose:
- 몸 움직이기
- 물 마시기
- 다른 일로 전환
- 사람과 이야기하기
- 그냥 닫기

### Level 3 — end

If repeated deterioration:

> 이 기록이 지금은 도움이 되지 않는 것 같습니다.  
> 이 세션은 여기서 끝내겠습니다.

No “continue anyway” CTA in primary position.

Secondary:
`한 줄 메모만 남기기`

---

# 10. Safety boundary

이 앱은 의료적 응급대응 또는 위기상담 기능으로 설계하지 않는다.

## If user enters clear imminent danger / self-harm language

MVP minimum:
- normal reflective flow 중단
- 장황한 감정 분석 금지
- “지금은 자기관찰보다 즉각적인 사람의 도움이 우선”이라는 안내
- 지역 응급 서비스 / 신뢰할 수 있는 사람 / 전문 도움 연결 선택지 제공

Implementation:
Create a separate `SAFETY.md` and do not mix crisis logic into ordinary emotion inference.

Do not:
- diagnose
- assess suicide probability numerically
- reassure “you are safe”
- continue emotion-granularity exercise as primary path

---

# 11. Information architecture

## MVP routes

```text
/
  Landing / start

/check-in
  Entry gate

/session/new
  Active self-monitoring flow

/session/:id/summary
  Session summary

/history
  Past records

/patterns
  Minimal pattern view

/settings
  Data/privacy/preferences

/about
  What this tool is / isn't
```

### MVP note

`/patterns` is deliberately modest.
Do NOT build predictive analytics yet.

Allowed:
- frequently selected words
- contexts the user entered
- helpful vs unhelpful sessions
- positive/negative experience balance
- “최근 이런 단어들을 자주 사용했습니다”

Not allowed:
- “당신은 회피형입니다”
- personality labels
- diagnosis-like scores
- “당신의 main emotion is anger”
- hidden psychometric scoring without validation

---

# 12. Wireframe

## Landing

```text
┌─────────────────────────────────┐
│ 지금의 경험을 조금 더 알아보기   │
│                                 │
│ 감정을 맞히는 검사가 아닙니다.    │
│ 몸·상황·말을 천천히 구별해봅니다. │
│                                 │
│ [ 지금 살펴보기 ]                │
│                                 │
│ 지난 기록 보기                    │
└─────────────────────────────────┘
```

---

## Check-in gate

```text
┌─────────────────────────────────┐
│ 지금 이 경험을                   │
│ 조금 들여다보고 싶나요?          │
│                                 │
│ ○ 조금 살펴보고 싶어요           │
│ ○ 잘 모르겠어요                  │
│ ○ 지금은 그만 생각하고 싶어요    │
│                                 │
│                     [다음]       │
└─────────────────────────────────┘
```

---

## Core flow

One question per screen.

```text
<  3 / 8

무슨 일이 있었나요?

┌───────────────────────────────┐
│                               │
│                               │
└───────────────────────────────┘

사실만 간단히 적어도 충분합니다.

[건너뛰기]                 [다음]
```

Rules:
- one dominant question
- skip allowed for most steps
- visible progress but no gamification
- no streak/confetti/reward animation

---

## Emotion candidate screen

```text
지금까지 적은 경험에
가까운 표현이 있나요?

[ 서운함 ] [ 실망 ] [ 외로움 ]
[ 답답함 ] [ 화남 ] [ 불안 ]

[ 여러 개 ]
[ 잘 모르겠음 ]
[ 내 단어로 적기 ]
[ 더 많은 단어 보기 ]
```

---

## Summary

```text
이번 기록에서

몸
가슴이 답답함 · 어깨 긴장

상황
답장을 기다렸는데 오지 않았다

중요했던 것
연결감 · 존중

가까웠던 말
서운함 · 불안

지금 필요한 것
잠깐 거리두기

내가 표현한 문장
“답을 기다리면서 내가 중요하지 않은 것처럼
느껴져서 서운했던 것 같아.”

────────────────────

이 기록이 도움이 되었나요?
[도움됨] [모르겠음] [아니요]
```

---

# 13. Data model

Prefer local-first for MVP.

## Session (storage schema v2)

**한 순간의 자기관찰은 깊이와 무관하게 하나의 세션이다.** Quick Check만 한 기록과
Quick Check 뒤 Deep Reflection까지 간 기록이 별개의 레코드로 쪼개지지 않는다.
완료된 Quick Check는 **같은 id로 reopen**되어 Deep Reflection을 이어 붙인다.

```ts
type EmotionSession = {
  id: string
  createdAt: string
  completedAt?: string
  status: "draft" | "completed" | "stopped"
  stage: Stage
  entry: "quick" | "deep"          // 어느 문으로 들어왔는지

  quickCheck?: {
    affect?: { valence?: Scale; activation?: Scale; unknown?: boolean }
    candidatePool: EmotionSelection[]   // 제시된 후보
    selected: EmotionSelection[]        // 사용자가 고른 것
    candidateResponse?: "none-close" | "unsure"
    concept?: string
    granularityResponse?: "unsure"
    contrastAnswer?: string
    microLearningSeen?: boolean
    endedAt?: string
  }

  deepReflection?: {
    startedAt: string
    entryDecision?: "observe" | "unsure"
    body: BodyObservation[]
    affect?: { valence?: Scale; activation?: Scale }
    context?: {
      eventText?: string
      source?: "event" | "memory" | "anticipation" | "thought"
    }
    concerns: string[]
    emotionCandidates: EmotionSelection[]
    outcome?: {
      clarity: "much_clearer" | "clearer" | "same" | "more_complex" | "more_distressed"
      usefulness: "helpful" | "unsure" | "unhelpful"
      note?: string
    }
  }

  synthesisFeedback?: {
    fit?: "close" | "partly" | "unsure"    // 선택은 optional: 고쳐쓰기가 평가를 대신하지 않는다
    correction?: string
  }

  stopReason?: "user" | "entry"
  migratedFromV1?: true
}
```

### 규칙

- **두 affect는 덮어쓰지 않는다.** `quickCheck.affect`는 최초의 빠른 자기평가,
  `deepReflection.affect`는 더 자세히 살펴본 뒤의 평가다. Deep의 slider는 Quick 값을
  초기값으로 제안하지만, 저장은 각자의 자리에 한다.
- **`deepReflection`은 entry gate를 통과한 뒤에 생성한다.** gate에서 종료하면 빈
  deep 기록이 남지 않으며, history에서 "깊게 살펴본 기록"으로 오인되지 않는다.
- **depth는 저장하지 않고 파생한다.** `sessionDepth()`가 두 하위 객체의 존재로
  `quick` / `quick+deep` / `deep`을 계산한다. 별도 `mode` 필드는 두지 않는다
  (상태 불일치 원인이 된다).
- `status`는 세션 전체의 상태다. Quick이 완료된 뒤 reopen해서 중단하면 `stopped`가
  되지만, `quickCheck.endedAt`이 남아 있으므로 "빠른 확인은 끝냈다"는 사실은 보존된다.

### Persistence

```text
emotion-lab:draft:v2       진행 중 세션 1개
emotion-lab:completed:v2   완료·중단 세션 목록 (newest first)
```

- completed 저장은 **id 기준 upsert**다. reopen으로 `completed → draft → completed`를
  왕복해도 같은 id가 두 번 쌓이지 않는다.
- draft로 저장할 때 completed 목록에서 같은 id를 제거한다. 저장 후 삭제 순서라
  두 저장소에서 동시에 사라지는 구간이 없다.

### v1 → v2 migration

v1은 모든 필드를 한 객체에 평평하게 두었고, `quickCandidatePool`이 `mode`에 따라
다른 것을 의미했다 (이것이 v2에서 중첩하는 이유다).

| v1 `mode` | `quickCandidatePool` | `emotionCandidates` |
|---|---|---|
| `quick` | 제시된 후보 pool | Quick에서 고른 단어 |
| `quick-to-deep` | Quick에서 고른 단어 | Deep에서 고른 단어 |
| `deep` | — | Deep에서 고른 단어 |

- `quick-to-deep` 레코드의 **원래 후보 pool은 복원 불가**다(새 세션에 저장되지 않았음).
  빈 배열로 두고 `migratedFromV1: true`로 표시한다.
- v1 draft는 폐기한다(미완 기록).
- v1 키의 존재가 트리거이며, 이관 후 키를 삭제하므로 idempotent하다.

## BodyObservation

```ts
type BodyObservation = {
  label: string
  intensity?: "low" | "medium" | "high"
  custom?: boolean
}
```

---

## EmotionSelection

```ts
type EmotionSelection = {
  label: string
  source:
    | "suggested"
    | "expanded-list"
    | "custom"

  confidence?: "close" | "maybe" | "uncertain"
}
```

---

# 14. Emotion vocabulary architecture

Do not hard-code a giant wheel into UI.

Create:

```text
/data/emotions.ko.json
```

Example:

```json
{
  "서운함": {
    "family": "sadness_social",
    "valence": "negative",
    "activation": "medium",
    "neighbors": ["실망", "외로움", "섭섭함"],
    "prompts": [
      "기대했던 반응이 오지 않았나요?",
      "중요한 사람에게 덜 중요하게 느껴졌나요?"
    ]
  }
}
```

Important:
- `family`, `valence`, `activation` = navigation metadata
- NOT psychological truth claims
- user may always override
- culturally natural Korean words preferred over translated taxonomy

## Item contract (v1 expansion)

```ts
{
  label, aliases?, family, valence, activation,
  neighbors, appraisalHints?, contextTags?, provisional: true
}
```

- `appraisalHints`는 **그 감정의 정의가 아니다.** 비슷한 단어 사이의 차이를 탐색할 때
  써볼 수 있는 가설적 힌트이며, 사용자는 언제든 "아니다"를 선택할 수 있다.
- `contextTags`는 어떤 상황에서 이 말을 써볼 수 있는지에 대한 느슨한 단서다.
- `aliases`는 같은 경험을 부르는 다른 말이며, label과 겹치지 않는다.
- 검증척도(mDES, PANAS 등)의 문항을 복제하지 않는다. 연구에서 아이디어를 얻되
  문구와 예시는 독립적으로 작성한다.
- 규모는 36~48개를 유지한다. 이것은 taxonomy 확정이 아니라 **탐색공간**이다.
  불쾌·고활성 / 불안 / 상실·관계 / 자기평가 / 긍정·고활성 / 긍정·저활성·관계를
  균형 있게 포함하고, 혐오 계열은 소수만 둔다.

Future:
allow user-created vocabulary.

## Progressive disclosure

한 번에 많은 단어를 보여주지 않는다. 후보 화면은 사용자가 요청할 때만 넓어진다.

```text
기본 후보 3~5개            valence × activation으로 좁힌 1차 후보
   ↓  비슷한 표현 더 보기
additional neighbors       1차 후보의 neighbors 중 아직 보이지 않은 것
   ↓  다른 표현 찾아보기 · 내 말로 적기
사용자가 직접 입력          source: "custom"으로 저장
```

이 구조는 **Quick Check의 후보 화면과 Deep Reflection의 감정어 화면 양쪽에 동일하게**
적용한다. vocabulary가 커진 뒤로는 어느 화면에서도 전체 목록을 한 번에 깔지 않는다.

- 여러 개를 동시에 고를 수 있다는 기존 원칙을 유지한다.
- `가까운 말이 없음` / `잘 모르겠음` / 내 표현은 **모든 단계에서 항상 정상 경로**다.
- `neighbors`는 "비교해볼 만한 단어"를 기록한 탐색 metadata이며, 심리적 근접성을
  주장하지 않는다. 사용자가 적은 말에는 neighbors가 없어도 된다.
- vocabulary 자체의 대규모 확장은 별도 단계다. 이 구조는 그것을 담기 위한 그릇이다.

---

# 15. Pattern view

The pattern page should answer:

> “나는 어떤 사람인가?” X  
> “내 기록에서 어떤 상황과 표현이 반복되었나?” O

## MVP cards

### 최근 자주 사용한 표현
- 서운함 4
- 긴장 3
- 안도 3

### 어떤 상황에서?
User-entered categories only.

### 도움이 되었던 기록
“도움됨” ratio.

### 긍정적/편안한 경험도 함께
Do not create a dashboard where only distress dominates.

---

# 16. Privacy by design

Emotion records are sensitive.

MVP default:
- local-first storage
- no account required
- no analytics containing free-text emotion content
- no third-party logging of text fields
- export / delete all
- per-entry delete

If cloud sync is later added:
- explicit opt-in
- encryption
- data retention explanation
- user-controlled deletion
- no training on private records by default

---

# 17. AI role

## MVP recommendation

**Do not make AI required.**

Version 1 can be fully deterministic:
- curated prompt flow
- emotion vocabulary
- user-selected tags
- rules-based stop logic

AI can be optional in V2 for:
- suggesting 3–5 possible emotion words from user's own text
- rephrasing the user's expression sentence
- summarizing repeated patterns

## AI constraints

AI must never:
- diagnose
- state hidden motives as fact
- infer another person's intent
- claim to know the “real emotion”
- over-interpret childhood/attachment/trauma
- manufacture causal stories
- encourage endless introspection

Preferred phrasing:
- “가능한 표현으로는 …”
- “당신이 적은 내용만 보면 …”
- “이 중 가까운 것이 있나요?”
- “아니라면 무시해도 됩니다.”

---

# 18. Copy style

Tone:
- calm
- non-clinical
- non-patronizing
- short
- curious
- permission-based

Avoid:
- “정상입니다”
- “감정을 통제하세요”
- “부정적인 감정”
- “잘못된 생각”
- “당신은 ~형입니다”
- excessive therapeutic language

Prefer:
- “가까운 표현”
- “지금 경험”
- “조금 살펴보기”
- “잘 모르겠음”
- “여기까지 해도 됩니다”

---

# 19. Visual principles

Existing site philosophy can inform the app:

> 복잡성을 없애지 말고, 복잡성에 도달하는 순서를 설계한다.

Apply as:

- first screen = one question
- one screen = one cognitive task
- deeper concepts appear only when needed
- full emotion vocabulary hidden behind “더 보기”
- history/patterns separated from active reflection
- no dashboard density on landing
- generous whitespace
- text hierarchy more important than decorative components

## Palette

```text
--accent        #B4FF00   채움 전용
--accent-hover  #A6EE00
--accent-press  #96D900
--accent-soft   #E8FFB8   선택 상태
--accent-subtle #F5FFE6   micro-feedback
--accent-ink    #4E7A00   대비가 필요한 자리의 accent
--ink           #24302A   본문
--muted         #67756C   보조 텍스트
--line          #DCE7DF   구분선·카드 경계
--line-strong   #7E9487   입력·버튼 등 조작 요소 경계
--paper         #FCFDFB   배경
```

규칙:

- **`#B4FF00`은 채움에만 쓴다.** 배경 위 대비가 1.19:1이라 얇은 테두리, focus ring,
  작은 글자에 쓰면 사실상 보이지 않는다. 그 자리에는 `--accent-ink`를 쓴다.
- 페이지 전체 배경을 형광 연두로 채우지 않는다. accent는 버튼·선택·focus에만.
- 본문과 긴 텍스트는 `--ink`를 유지한다.
- hover / focus / pressed를 모두 구분한다. focus는 `:focus-visible` 2px outline.
- 선택 상태는 색만으로 표시하지 않는다. `--accent-soft` 배경에 `--accent-ink`
  테두리를 함께 써서 색 지각에 의존하지 않게 한다.

### Contrast floor

본문·보조 텍스트는 4.5:1, 조작 요소의 경계와 focus ring은 3:1을 지킨다.
이 기준 때문에 원래 제안된 값에서 조정한 것:

| 값 | 변경 | 이유 |
|---|---|---|
| text-secondary | `#6F7D75` → `#67756C` | 4.23:1로 AA 미달 → 4.74:1 |
| 조작 요소 경계 | `--line` → `--line-strong` 신설 | `#DCE7DF`는 배경 대비 1.24:1 |
| accent 테두리·링 | `--accent-ink` 신설 | `#B4FF00`은 배경 대비 1.19:1 |

But unlike the personal archive site:

**This app must explicitly explain**
- what it does
- what it does not do
- why a question is being asked when needed
- when to stop
- privacy behavior

Mental-health adjacent tooling should not depend on “discoverability” for safety-critical meaning.

---

# 20. MVP scope

## Must have

- entry gate
- body observation
- affect sliders
- context
- concern/meaning
- emotion candidates
- emotion differentiation
- next need/action
- expression sentence
- usefulness check
- rumination stop logic
- local history
- delete/export
- about/privacy

## Nice to have

- custom emotion vocabulary
- simple patterns
- light/dark mode
- optional reminder chosen by user

## Explicitly NOT MVP

- login
- social sharing
- therapist dashboard
- LLM dependency
- diagnosis
- psychometric scoring
- voice emotion detection
- facial emotion recognition
- passive smartphone sensing
- streaks
- push notifications by default
- predictive “mood forecasting”

---

# 21. Suggested project structure

```text
emotion-self-monitor/
├── README.md
├── PRODUCT_SPEC.md
├── SAFETY.md
├── COPY.md
├── docs/
│   ├── flow.md
│   ├── wireframes.md
│   ├── data-model.md
│   └── decisions.md
│
├── app/
│   ├── page.tsx
│   ├── check-in/
│   ├── session/
│   ├── history/
│   ├── patterns/
│   ├── settings/
│   └── about/
│
├── components/
│   ├── SessionShell.tsx
│   ├── QuestionScreen.tsx
│   ├── ChoiceChip.tsx
│   ├── AffectScale.tsx
│   ├── EmotionPicker.tsx
│   └── StopCard.tsx
│
├── lib/
│   ├── session-machine.ts
│   ├── rumination-guard.ts
│   ├── storage.ts
│   └── export.ts
│
├── data/
│   ├── emotions.ko.json
│   ├── body-signals.ko.json
│   ├── concerns.ko.json
│   └── needs.ko.json
│
└── tests/
    ├── session-flow.test.ts
    ├── rumination-guard.test.ts
    └── storage.test.ts
```

---

# 22. State machine

Use an explicit state machine rather than scattered page logic.

## 22.1 Implemented (current)

```text
LANDING
 ├── [빠르게 살펴보기]  ← 기본 진입
 │     ↓
 │   QUICK_AFFECT ──────────────── 잘 모르겠음 ──→ QUICK_SUMMARY
 │     ↓
 │   QUICK_CANDIDATES
 │     ├── 여기까지 ───────────────────────────→ QUICK_SUMMARY
 │     └── 조금 더 정확히 살펴보기
 │           ↓
 │         GRANULARITY
 │           ↓
 │         CONTEXT_CONTRAST
 │           ↓
 │         MICRO_LEARNING ─────────────────────→ QUICK_SUMMARY
 │
 │   QUICK_SUMMARY
 │     └── 조금 더 천천히 들여다보기 ──→ ENTRY (같은 id를 reopen)
 │
 └── [조금 더 천천히 살펴보기]
       ↓
     ENTRY
       ├── 잘 모르겠어요 → ENTRY_MINI → BODY | STOPPED
       ├── 지금은 그만 생각하고 싶어요 → STOPPED
       ↓
     BODY → AFFECT → CONTEXT → MEANING → EMOTION → OUTCOME → SUMMARY
```

활성 상태 어디에서든:

```text
ANY ACTIVE STATE → STOPPED
```

`QUICK_SUMMARY → ENTRY`는 새 세션을 만들지 않는다. 완료된 세션을 draft로 되돌리고
(`completedAt`을 지우고) 같은 id에 `deepReflection`을 이어 붙인다. §13을 따른다.

## 22.2 Not yet implemented

다음 상태는 아직 없다. 구현 전 별도 제품 판단이 필요하다.

- `DIFFERENTIATE`, `NEED`, `EXPRESSION` (Deep Reflection 후반)
- `RUMINATION_CHECK` (§9)
- `SAFETY_TRIGGER`, `SAFETY_SCREEN` — SAFETY.md에 따라 **의도적으로 미구현**

## 22.3 Target routes

Interrupt route:

```text
ANY ACTIVE STATE
   ↓
RUMINATION_CHECK
   ├── CONTINUE
   ├── SHORTEN → NEED / EXIT
   └── STOP → EXIT
```

Safety route:

```text
ANY TEXT INPUT
   ↓
SAFETY_TRIGGER
   ↓
SAFETY_SCREEN
```

Do not implement this as ad-hoc conditional UI spread across components.

---

# 23. Acceptance criteria

The MVP is acceptable when:

1. A user can finish a Quick Check in ~10–30 seconds, and a Deep Reflection session in ~3–5 minutes.
2. Every non-essential step can be skipped.
3. User can choose “잘 모르겠음” without penalty, and that choice is stored as a normal state rather than as missing data.
4. No screen tells the user what they “really feel.”
5. In Deep Reflection, emotion selection occurs after body/context. In Quick Check, every condition of the P2 exception is satisfied.
6. The session ends with usefulness feedback.
7. A user who reports worsening is not pushed deeper.
8. Repeated reflection triggers a stop check.
9. Free-text data is not sent to external analytics.
10. User can delete all records.
11. User can export records.
12. The app still works with AI completely disabled.
13. The UI contains no streak/gamification.
14. Positive/pleasant experiences are equally recordable.
15. Pattern summaries remain descriptive, not diagnostic.
16. Quick Check can be completed with no free-text input at all.
17. `가까운 말이 없음` and `잘 모르겠음` both leave the user on a path forward — never on a dead-end screen.
18. No screen selects an emotion word on the user's behalf, including when the user answers “잘 모르겠음.”
19. No product copy claims that the app improves emotional granularity.
20. Every step's rationale appears only after a choice is made, and never blocks 다음.
21. The candidate screen opens with at most 5 words; related words and the user's own
    wording appear only when the user asks for them.
22. The synthesis contains no sentence the user did not supply the content for, and no
    claim about cause, trait or anyone else's intent.
23. Rating the synthesis and rewriting it are independent; neither answers the other.

---

# 24. First implementation sequence for Codex / Claude

## Phase 1 — Skeleton
- routes
- design tokens
- `SessionShell`
- local storage
- state machine

## Phase 2 — Core flow
Build Steps 0–9 with static curated data.

No AI.

## Phase 3 — Stop logic
- time threshold
- worsening outcome
- repeated session
- manual rumination flag

## Phase 4 — History
- list
- summary
- delete
- export JSON

## Phase 5 — Pattern view
Only descriptive counts.

## Phase 6 — UX review
Test:
- confused user
- angry user
- pleasant experience
- user unable to name emotion
- user who wants to stop
- repeated-rumination case

Only after these work should AI assistance be considered.

---

# 25. Instructions for the coding agent

Copy the following into Codex / Claude together with this document.

---

## Implementation prompt

You are implementing an MVP self-monitoring web app based on `PRODUCT_SPEC.md`.

Before writing code:

1. Read the complete product specification.
2. Summarize the product's purpose, non-goals, and safety constraints.
3. Inspect the existing repository and report:
   - framework
   - routing structure
   - styling system
   - storage approach
   - reusable components
4. Propose the smallest implementation plan.
5. Do not edit files until the plan is reported.

Hard constraints:

- This is not a diagnostic app.
- Do not add gamification or streaks.
- Do not make AI necessary for MVP.
- Do not infer a user's “real emotion.”
- Emotion words must come after body/context steps.
- “잘 모르겠음” and skip must be valid choices.
- Implement rumination interruption as a first-class state.
- Keep active sessions visually simple: one dominant question per screen.
- Free-text emotion content must remain local in MVP.
- Do not add third-party analytics to text fields.
- Do not redesign unrelated parts of the repository.
- Prefer an explicit state machine for session flow.
- Add tests for normal flow, skip flow, rumination stop flow, and local deletion.

Before each substantial design decision, ask:

> Does this help the user understand and express experience more clearly,
> or does it merely increase engagement or data collection?

If the latter, do not implement it.

At completion, report:
- files changed
- behavior implemented
- tests run
- known limitations
- decisions requiring human review

---

# 26. Human-review decisions before V2

Do not automate these decisions yet.

1. What exact Korean emotion vocabulary should be included?
2. Should intensity be recorded for emotion labels?
3. How often should pattern summaries appear?
4. What counts as “same event” for rumination detection?
5. Should any reminders exist at all?
6. Should cloud sync ever be offered?
7. Should the user be able to share a summary with a clinician?
8. What evidence is sufficient before claiming the app improves emotional granularity?
9. Which parts should be validated in a small user study?
10. Should the product remain a self-monitoring tool or later become a clinician-assisted tool?

These are product/research decisions, not coding decisions.

---

# 27. Product north star

The app is successful when a user can say:

> “앱이 내 감정을 알려준 것은 아니지만,
> 내가 무엇을 느끼고 있었는지 조금 더 구별할 수 있었고,
> 그래서 무엇을 말하거나 할지 조금 더 분명해졌다.”

It is also successful when a user can say:

> “지금은 더 생각하지 않는 게 낫겠다는 걸 알아차리고 닫았다.”

Both outcomes belong to the product.
