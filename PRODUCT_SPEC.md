# Emotion Self-Monitoring Web App — Product & Implementation Blueprint

> Working title: **Emotion Lab / 감정 관찰실**  
> Status: **MVP design specification**  
> Primary use: handoff to Codex / Claude for implementation  
> Core stance: **self-monitoring first, optional assistance second**  
> Non-goal: diagnosis, therapy replacement, emotion “detection,” or maximizing engagement

---

## 0. One-sentence product definition

이 웹앱은 사용자의 감정을 맞혀주거나 진단하는 도구가 아니라, 사용자가 **몸의 상태·상황·의미·감정 개념을 구별해 보고, 자신에게 더 정확하고 유용한 언어로 표현하도록 돕는 짧은 자기관찰 도구**다.

핵심은 “무슨 감정이지?”를 맞히는 것이 아니라 다음 질문의 흐름을 만드는 것이다.

> **지금 관찰하는 것이 도움이 되는가? → 몸에서는 무엇이 일어나는가? → 어떤 일이 있었는가? → 무엇이 중요했는가? → 어떤 감정 개념이 가장 가까운가? → 그래서 지금 무엇이 필요한가? → 표현한다면 어떻게 말할 수 있는가?**

---

# 1. Product principles

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

## P2. 감정 이름보다 경험에서 시작한다

첫 화면부터 emotion wheel이나 감정 단어 목록을 제시하지 않는다.

기본 순서:

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

## P7. 이론은 사용자에게 교리가 되지 않는다

Barrett의 구성주의적 감정 관점을 설계 원리로 사용하되,
“감정에 대한 과학적 진실은 이것 하나다”라는 식으로 제시하지 않는다.

권장 설명:

> “이 도구는 감정을 몸의 상태, 상황, 과거 경험과 개념이 함께 만들어내는 경험으로 살펴보는 관점을 사용합니다.”

금지:

> “뇌는 감정을 이렇게 만들어냅니다. 이것이 과학적으로 밝혀졌습니다.”

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

# 4. Core session flow

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

## Session

```ts
type EmotionSession = {
  id: string
  createdAt: string
  completedAt?: string

  entryDecision:
    | "observe"
    | "unsure"
    | "stop"

  body: BodyObservation[]

  affect?: {
    valence?: 1 | 2 | 3 | 4 | 5
    activation?: 1 | 2 | 3 | 4 | 5
    overwhelmed?: 1 | 2 | 3 | 4 | 5
  }

  context?: {
    eventText?: string
    timeFrame?: "now" | "today" | "recent" | "past" | "future"
    source?: "event" | "memory" | "anticipation" | "thought"
  }

  concerns?: ConcernTag[]

  emotionCandidates?: EmotionSelection[]

  differentiation?: {
    selectedConcepts: string[]
    whyText?: string
    comparisonAnswers?: Record<string, string>
  }

  nextNeed?: string[]
  nextActionText?: string

  expression?: string

  outcome?: {
    clarity:
      | "much_clearer"
      | "clearer"
      | "same"
      | "more_complex"
      | "more_distressed"

    usefulness:
      | "helpful"
      | "unsure"
      | "unhelpful"

    note?: string
  }

  safety?: {
    ruminationRiskLevel: 0 | 1 | 2 | 3
    stopTriggered: boolean
    triggerCodes: string[]
  }
}
```

---

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

Future:
allow user-created vocabulary.

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

```text
ENTRY
 ↓
BODY
 ↓
AFFECT
 ↓
CONTEXT
 ↓
MEANING
 ↓
EMOTION
 ↓
DIFFERENTIATE
 ↓
NEED
 ↓
EXPRESSION
 ↓
OUTCOME
 ↓
SUMMARY
```

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

1. A user can finish a normal session in ~3–5 minutes.
2. Every non-essential step can be skipped.
3. User can choose “잘 모르겠음” without penalty.
4. No screen tells the user what they “really feel.”
5. Emotion selection occurs after body/context.
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
