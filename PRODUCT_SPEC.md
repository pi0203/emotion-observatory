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

## P0-b. Maximum granularity가 아니라 useful granularity

감정을 **최대한 세밀하게 분석하는 것이 목표가 아니다.**
“지금 무엇을 할지 정하는 데 필요한 만큼” 구별하면 충분하다.

- “기분이 좋다 / 나쁘다” 정도로 충분한 순간이 있다. 늘 더 쪼갤 필요가 없다.
- 구별이 유용한 이유는 정확도가 아니라 **선택**이다. 같은 답답함이라도
  쉬는 것이 필요할 때와 할 말을 정리하는 것이 필요할 때가 다르다.
- 따라서 더 많은 단계를 거친 세션이 더 좋은 세션이 아니다 (P0과 같은 방향).
- emotional granularity가 정서조절·기능과 관련된다는 보고는 있지만,
  **granularity 자체가 건강을 보장하지 않고 정신건강을 재는 지표도 아니다.**
  앱 안팎의 어떤 문구도 이보다 강하게 말하지 않는다 (P8 주장의 범위).

---

## P0-c. 몸은 고정된 측정값이 아니라 snapshot이다

> **몸의 느낌은 고정된 정답이 아니라 지금 순간의 snapshot입니다.
> 움직임, 자세, 호흡, 시간, 상황이 달라지면 다르게 느껴질 수 있습니다.**

- 사용자가 몸을 고정하도록 **요구하지 않는다.** 자세를 고쳐 앉으라고 하지 않는다.
- `이 자세 → 이 감정`, `이 감각 → 이 감정` 같은 mapping을 만들지 않는다.
- "자세를 바꾸면 기분이 좋아진다"는 효과를 보장하지 않는다.
- Body 값이 달라지는 것은 오류가 아니라 경험 변화의 일부일 수 있다.
- 따라서 body vocabulary에 valence를 두지 않는다 (§13 참고).
- `deepReflection.bodyRecheck`는 움직인 뒤 다시 확인한 값을 **첫 값과 나란히**
  보존하기 위한 자리다. Quick/Deep affect와 같은 원칙이다. 아직 흐름은 없다.

---

## P0-d. Cultural humility — 어휘는 보편적 정답표가 아니다

근거와 한계는 [docs/EMOTION_CULTURE.md](docs/EMOTION_CULTURE.md)에 기록한다.

현재 vocabulary는:

- 자연에 존재하는 감정 종류의 **완전한 목록이 아니다.**
- 한국인이 반드시 사용하는 감정 **taxonomy도 아니다.**
- **진단 분류도 아니다.**

사용자의 탐색을 돕는 **starting vocabulary / search space**다.

### Shared but personal

사람은 감정 표현을 혼자 발명하지 않는다. 언어·관계·가족·또래·공동체·문화 속에서
감정 개념과 표현을 배운다. 동시에 같은 단어도 사람과 맥락에 따라 조금씩 다르게 쓰인다.
따라서 **shared concept + personal meaning + situational context**를 동시에 존중한다.

`EmotionSelection.personalMeaning`이 그 자리다. 사용자가 가져온 말은 예외가 아니라
**일반 항목**이며, `내 말로 적기`는 목록 뒤에 숨기지 않는다.

### 두 극단을 모두 피한다

| 피하는 것 | |
|---|---|
| A | "분노·불안·슬픔에는 문화와 무관한 고정된 본질과 정확한 위치가 있다" |
| B | "감정에는 아무런 공통 구조도 없고 전부 문화가 만들어낸 것이다" |

제품의 입장은 더 제한적이다.

1. affective structure에는 **일부 넓은 공통성**이 있을 수 있다
   (Jackson et al. 2019: 2,474개 언어에서 hedonic valence와 physiological activation이
   감정 의미망을 조직하는 중요한 차원으로 나타남).
   이 결과는 valence × activation을 **넓은 탐색의 출발점**으로 쓰는 현재 구조와
   **양립하며 경험적 배경을 제공한다.** 다만 이 연구가 **affect pad 자체의
   측정타당도를 검증한 것은 아니다** ([EMOTION_CULTURE.md](docs/EMOTION_CULTURE.md)의
   근거 강도 구분 참고).
2. emotion category와 vocabulary의 **의미와 경계는 문화·언어·경험에 따라 달라질 수 있다.**
3. 개인 사용자에게 어느 의미가 맞는지는 **앱이 문화적 평균만으로 결정하지 않는다.**

### Copy 규칙

| 쓰지 않는다 | 쓴다 |
|---|---|
| 정확한 감정 · 올바른 감정 · 실제 감정 · 정답 감정 | 가까운 표현 · 지금 설명에 도움이 되는 말 |
| 감정 목록 전체 | 탐색할 표현 · 이런 말도 사용될 수 있습니다 |
| 이 감정의 의미는 … | 나에게는 어떤 말이 가까운가요? |

### 문화를 다루되 stereotype을 만들지 않는다

**국적·민족·종교·성별을 묻지도 추론하지도 않는다.** 집단 라벨을 경유하지 않고
**사용자 자신의 언어 환경**을 사용자가 직접 말하게 한다.
cultural fit score, "한국형 감정" taxonomy, 문화 자동 분류를 만들지 않는다.

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

## 5.0 Coach v2 — 예시 상황으로 하는 표현 연습 (구현됨, 2026-10-10 명료화)

Coach는 **사용자의 실제 사건이나 지금 감정을 기록하는 단계가 아니다.** 적어 둔 예시 상황 하나를 두고,
그 예시에서 무엇이 눈에 띄는지 고른 뒤, 그 예시에 가까울 수 있는 표현을 탐색해보는 **연습**이다.
목표는 중요한 차이를 살펴보고 필요한 만큼 표현을 탐색하게 돕는 것이다. 감정 구별 능력을 높인다고 주장하지 않는다 (§P8).

```text
coach-appraisal   “이 예시 상황에는 어떤 것들이 있었을 수 있을까요?”   ← 단어를 아직 보여주지 않는다
      ↓
coach-words       “이 예시에서 가까울 수 있는 표현이 있나요?”
      ↓
coach-note        예시에서 살펴본 것 + 짧은 참고 → 원래 요약으로 복귀
```

세트는 두 개다. 불쾌 쪽만 다루는 기능이 되지 않도록 대칭을 맞췄다.

| 세트 | 단어 | 예시 상황 |
|---|---|---|
| `friction-unfair-stuck` | 짜증 ↔ 억울함 ↔ 답답함 | 상대가 내 요청을 계속 무시했다. |
| `calm-relief-content` | 평온 ↔ 안도 ↔ 만족 | 하던 일을 마치고 잠시 아무것도 하지 않고 있었다. |

두 번째 세트는 셋 다 **저활성**이라 각성이 변수로 섞이지 않고 평가 차이만 남는다.
세트를 더하는 데 코드 변경은 필요 없다. `coachSetFor`는 사용자가 고른 표현과 겹치는 단어가
가장 많은 세트를 고른다. **어느 예시를 보여줄지 고르는 데에만** 사용자의 표현을 쓴다.
예시 안의 답을 정하는 데에는 쓰지 않는다.

### 예시라는 것을 처음부터 말한다

- 진입 버튼 아래(빠른 확인 후보 화면): `예시 상황으로 해보는 짧은 연습입니다. 지금 고른 표현은 그대로 남습니다.`
- 첫 화면, 관찰을 고르기 전에, **접힘(`details`) 밖에서**: `예시 상황으로 해보는 표현 연습입니다.
  당신의 실제 일이나 지금 감정을 기록하는 단계가 아니고, 앞에서 고른 내 표현은 바뀌지 않습니다.`
- 상황 카드에는 `예시 상황` 라벨을 붙인다. 표현 화면에도 같은 카드를 짧게 다시 보여주고, 고른 관찰을 한 줄로 붙인다.
- 질문은 `지금 내 경험`이 아니라 **`이 예시`**를 주어로 쓴다.

### answer key를 구조적으로 막는 방법

`data/granularity.ko.json`에 **`appraisal → word` 매핑을 두지 않는다.**
어느 appraisal을 골랐든 표현 화면은 **같은 단어를 같은 순서·같은 모양으로**, 아무것도 미리 선택하지 않은 채
보여준다(테스트로 고정, 모든 세트 × 모든 appraisal). 사용자가 고른 관찰은 인용만 한다.
따라서 `상황 A = 짜증` 같은 정답표를 만들려면 데이터 구조부터 바꿔야 한다.

항상 함께 제시한다:
- appraisal 단계: `어느 것도 아니다` · `잘 모르겠다` · 직접 적기. 복수 선택이므로 "여러 가지가 함께 있었다"는
  따로 두지 않고 여러 개를 고르는 것으로 대신한다(2026-10-10 명세를 코드에 맞춤 — 이전 명세에는 이 선택지가 있다고 적혀 있었다).
- 단어 단계: `여러 개` · `어느 것도 아님` · `잘 모르겠음` · `내 말로 표현하기`. 직접 적기는 후보와 **동등한 선택**이라고 화면에 적는다.

### Coach는 "과학적으로 이렇게 구분된다"고 말하지 않는다

목적은 *"이 표현들을 구별해서 사용하는 **한 가지 방법**을 예시 상황 속에서 탐색해본다"*이다.
화면 문구로 이것을 명시한다 — 같은 예시라도 사람마다, 또 어떤 관계와 상황인지에 따라 눈에 들어오는 것이
다를 수 있다는 것, 그리고 세 단어가 그 예시를 나누는 유일한 방법이 아니라는 것.
`정답을 맞히는 문제가 아닙니다`도 적는다.

appraisal을 골랐다는 이유만으로 emotion word를 **추천하거나 채점하거나 자동 선택하지 않는다.**

### appraisal은 상황 관찰이지 감정 뜻풀이가 아니다

v2 첫 세트의 appraisal은 각 단어의 `appraisalHints`를 거의 그대로 옮겨 적어서
schema에 매핑이 없어도 **읽는 사람에게는 1:1 정답표**였다. 다시 썼다.

- appraisal은 **그 상황에서 관찰된 것**을 적는다 (`같은 말을 여러 번 해야 했다`).
  감정의 느낌을 적지 않는다 (`부당하게 대우받는 느낌이 들었다` ✗).
- 하나의 appraisal이 **여러 단어와 양립**해야 한다. 단어 수보다 appraisal이 많다.
- **복수 선택**이며 직접 입력도 받는다. 하나만 고르게 하면 그 자체가 정답 찾기가 된다.
- 테스트가 appraisal 문구와 단어의 `appraisalHints`가 6자 이상 겹치면 실패시킨다.

### 종료 화면 — 예시의 결과만 보여준다

`coach-note`는 예시에서 고른 것만 보여준다.

| 줄 | 값 |
|---|---|
| 예시에서 눈에 띈 것 | 고른 관찰 + 직접 적은 관찰(인용부호) · 없으면 `고르지 않음` |
| 예시에 가까울 수 있는 표현 | 고른 표현·탈출 선택 + 직접 적은 표현(인용부호) · 없으면 `고르지 않음` |

그리고 적는다: `예시 연습의 결과입니다. 앞에서 고른 내 표현을 바꾸지 않고, 요약에도 쓰이지 않습니다.`

**이전 동작과 다른 점 (2026-10-10):** 이전에는 `살펴보기 전에는 A, 살펴본 뒤에는 B를 골랐습니다`를 보여주었다.
A는 **내 경험**에 대해 고른 말이고 B는 **예시**에 대해 고른 말이라 서로 다른 질문의 답이다.
나란히 놓으면 감정이 바뀐 것처럼, 또는 연습으로 나아진 것처럼 읽힌다. 그래서 뺐다.
Quick → Deep 비교(§8.1 Before / After)는 둘 다 내 경험에 대한 답이므로 그대로 둔다.

요약 복귀·뒤로는 이전과 같다. Need → Response 연결은 바꾸지 않았다.

**나가는 길은 둘이다 (2026-10-10).**
- `예시 연습 그만하고 요약으로` — 관찰·표현 화면 아래에 접힘 없이 둔다. 예시 연습만 접고 원래 요약으로 돌아간다.
  기록은 **완료**로 남고, 그때까지 예시에서 고른 것은 `coach`에 그대로 남는다. 종료 화면의 `요약으로 돌아가기`와 같은 동작이다.
- 위쪽의 `그만하기` — 이전과 같다. 세션 전체를 **중단**으로 남긴다. 아예 멈추고 싶은 사람을 위한 길이다.
  이전에는 이것만 있어서, 예시 연습만 접고 싶어도 이미 끝낸 빠른 확인까지 중단 기록이 되었다.
빠른 확인 후보 화면에서 바로 Coach로 들어간 경우, `요약으로 돌아가기`가 빠른 확인을 **완료**로 저장한다
(이전에는 작성 중으로 남아 지난 기록에 보이지 않고 첫 화면에 "이어하기"가 떴다 — 2026-10-10 수정).

### 기록

```ts
coach?: {
  origin?: "example-practice"  // 2026-10-10부터 새 Coach마다 기록. 없으면 unknown
  setId: string
  wordsBefore: string[]        // Coach를 연 순간의 내 표현 스냅숏. Coach가 바꾸지 않는다
  appraisals: string[]         // 예시에 대해 고른 관찰
  ownAppraisal?: string
  wordsAfter: string[]         // 예시에 대해 고른 표현(탈출 선택 포함). 내 표현이 아니다
  ownWord?: string             // 예시에 대해 적은 표현. 내 표현이 아니다
}
```

- `wordsAfter`·`ownWord`는 **예시 연습의 결과**다. `quickCheck.selected`, `deepReflection.emotionCandidates`,
  synthesis, 지난 기록 목록 어디에도 합치지 않는다(테스트로 고정).
- 필드 이름(`wordsBefore`/`wordsAfter`)은 바꾸지 않았다. 저장된 기록과의 호환을 위해서다. 뜻은 위 주석이 정한다.
- **출처 없는 기존 기록은 `unknown`**이다(`coachOrigin`). 그때 표현 화면은 "지금 경험에 가까운 말"을 물었으므로
  사용자가 예시로 읽었는지 자기 경험으로 읽었는지 알 수 없다. 소급해서 출처를 붙이지 않고, 값을 지우지 않는다.
  unknown 기록이 종료 화면에 다시 열리면 `이 단계에서 고른 …`이라고 쓰고, 예시 연습으로 저장되었는지 확인할 수 없다고 적는다.
- optional 필드라 **저장소 버전은 v4 그대로**다. migration이 필요 없다.

### 긍정 세트도 같은 구조로 들어간다

데이터와 UI는 세트에 무관하다. 두 세트 모두 같은 구조·같은 탈출 선택이 적용되는지 테스트가 확인한다.

### 사용성 확인 계획 (미실시 — 계획만)

추적·설문 기능은 만들지 않는다. 소수의 사용자와 함께 화면을 보며 말로 확인한다.

| 질문 | 볼 것 |
|---|---|
| 예시와 자기 경험을 구분하는가? | 첫 화면 뒤 "이건 무엇을 하는 화면인가요?"에 대한 답 |
| 정답 맞히기로 느끼는가? | "맞혔나요/틀렸나요" 같은 말이나 망설임 |
| 후보 밖의 말을 써도 된다고 이해하는가? | 직접 적기 칸을 알아보는지, 써도 되는 것으로 여기는지 |
| 부담 없이 끝낼 수 있는가? | 그만두는 길을 찾는지, 그만둘 때 불편해하는지 |
| 도움됨 · 도움되지 않음 · 불편해짐 | 셋을 모두 같은 무게로 기록한다. 불편해짐을 실패한 회차로 빼지 않는다 |

이 결과는 **화면의 이해도·사용성**에 대한 것이다. 감정 구별 능력이나 치료 효과의 증거로 부르지 않는다.

### Phase 2 제안 — 내 경험으로 하는 Coach (미구현, 설계 제안만)

- 예시 대신 사용자가 Deep Reflection에서 적은 상황을 쓰는 방식. 근거 쪽 사정은 이렇다.
  효과가 보고된 연구들은 자기 상태를 평정하게 했다. 효과가 없던 단어 교육(Fugate 2026)에는 자기 경험에 적용하는 단계가 없었다.
  이것은 **약한 추론**이다 ([docs/EVIDENCE_CHAIN.md](docs/EVIDENCE_CHAIN.md) 「관통하는 교훈」 3).
- 열어 둘 질문: 실제 사건을 다시 떠올리게 하는 것이 반추로 이어지지 않게 하는 중단 경로(§9, Watkins 2008),
  결과를 개인 기록에 합칠지와 그 출처 표시, 같은 화면에서 "예시/내 경험"을 고르게 할지.
- 구현 전에 이 문서와 PROJECT_CONTEXT에서 따로 결정한다.

---


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

## 6.1 Need → Response (구현됨)

`OBSERVE → FORMULATE → CHOOSE SUPPORT`. synthesis 다음에 **선택적으로** 열리는
화면이며, Quick Check의 10~30초 완결(P0)을 지키기 위해 필수 단계가 아니다.

> **지금 무엇이 가장 도움이 될 것 같나요?**

**한 화면 두 층이다. 새 stage도 progress도 없다.**

```text
NEED       “지금 가장 필요한 방향은 어느 쪽에 가까운가요?”   단일 선택
  ↓ 같은 화면 아래로 펼쳐짐
RESPONSE   그 방향에서 앱을 닫고 실제로 해볼 수 있는 2~4개   복수 선택
```

- 방향은 묶어서 보여준다(`지금 이 순간에` / `들여다보기` / `사람과` / `움직이기` / `지금은`).
  순서는 추천이 아니며, **긍정적인 방향이 목록 아래로 밀리지 않도록** 섞어 둔다.
  이전 순서에서는 `좋은 경험에 머물기`가 7번째라 휴대폰 첫 화면 밖이었다.
- Need는 **단일 선택**이다. 여러 개를 고르면 Response가 다시 너무 많아진다.
  대신 **언제든 바꿀 수 있고**, `choicesByNeed`가 방향별 선택을 보존해
  다른 방향에 갔다 돌아와도 이전 선택이 남는다.
- 사용자에게 "당신의 진짜 Need는 이것입니다"라고 **말하지 않는다.**
  Need 역시 잠정적으로 골라보는 방향이다.
- Response의 마지막에는 늘 **하지 않을 선택지**가 있다.
- `잘 모르겠음`·`지금은 아무것도 하지 않기`는 Response를 **건너뛴다.**
- 편안하거나 벅찬 경험을 위해 `좋은 경험에 조금 더 머물기`와
  `이 좋은 상태를 만든 조건 살펴보기`를 **서로 다른 방향으로** 둔다.
  전자는 savoring, 후자는 무엇이 이 경험과 함께 있었는지 보는 것이다.
- `이 경험을 조금 더 이해하기`는 앱 밖 행동이 아니라 **경로**다.
  Quick만 했으면 Deep Reflection으로, Deep까지 마쳤으면 Granularity Coach로 간다.

### Response explanation

각 Response 묶음에 `because` 한 줄을 붙인다. **근거는 오직 사용자가 고른 Need다.**

> ✅ "‘표현할 준비하기’를 고르셨기 때문에, 바로 이야기하기 전에 내용을 정리해볼 수 있는 선택지를 보여드립니다."
> ❌ "억울함은 표현하지 않으면 쌓이므로…" — 심리 기제 주장
> ❌ "불안할 때는 호흡을 해야 하므로…" — 처방
> ❌ "당신에게 필요한 것은…" — 판정

### 추천하지 않는다

- **감정 단어 하나만 보고 solution을 고르지 않는다.** `화남 → 진정하세요` 같은
  1:1 규칙을 만들지 않는다. 같은 화남도 휴식·경계설정·문제해결·의사표현 중
  필요한 것이 다를 수 있다.
- v1에서는 **순위도 강조도 하지 않는다.** 모든 선택지를 같은 순서로 보여준다.
- 옵션의 `signals` 필드는 나중에 관련도를 볼 때 무엇을 함께 봐야 하는지를
  적어둔 것이며(affect · context · concern · 사용자가 고른 목표),
  **현재 어디에서도 사용하지 않는다.**

### Clinical layer는 별도

반복되는 고통·기능저하는 `self-monitoring → optional validated screening →
professional assessment`라는 별도 층으로 설계한다. EmotionSession의 결과를
우울증·불안장애·성격 진단으로 **변환하지 않는다.** 이번 범위가 아니다.

---


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

### 네 개의 섹션

```text
관찰한 것                   사용자가 고른 것을 그대로 다시 말한다
연결해서 생각해볼 수 있는 것   고른 것들 사이의 관계만 짚는다 (단서 2개 이상일 때만)
아직 알기 어려운 것          이 기록으로 정해지지 않는 것
다음에 생각해볼 질문          1~3개, 답을 암시하지 않는다
```

**단서로 인정하는 것은 넷뿐이다.**

| 단서 | 근거 |
|---|---|
| `concern-overlap` | concern과 고른 단어의 `contextTags`가 겹침. **특이도 높은 태그만** (전체 vocabulary의 20% 미만이 가진 태그) |
| `words-shifted` | Quick과 Deep에서 고른 표현이 다름 |
| `several-kinds` | 서로 다른 family의 표현을 동시에 고름 |
| `not-happening-now` | `context.source`가 기억·예상·생각 |

**단서가 2개 미만이면 해석하지 않는다.** `지금 기록만으로는 연결해볼 만한 정보가
충분하지 않습니다.`를 표시하고 질문만 보여준다.

`valence/arousal → 접근·회피 방향 추론`은 **구현하지 않는다.** 두 축만으로
동기적 방향을 확정할 수 없다.

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

## Session (storage schema v4)

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
    affect?: AffectPoint          // { valence?: 0..1, activation?: 0..1, unknown?: boolean }
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
    affect?: AffectPoint          // 같은 pad로 다시 표시한 값. quickCheck.affect를 덮어쓰지 않는다
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

  support?: { chosen: string[]; note?: string }   // 사용자가 고른 대응 방향. 앱이 고르지 않는다
  coach?: { origin?: "example-practice"; setId: string; wordsBefore: string[]; appraisals: string[]; ownAppraisal?: string; wordsAfter: string[]; ownWord?: string }
                                                 // 예시 연습의 결과. 개인 기록에 합치지 않는다. 출처 없으면 unknown (§5.0 기록)
  history?: Stage[]                              // 지나온 화면. 한 단계 뒤로 가기를 위한 것
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
emotion-lab:draft:v4       진행 중 세션 1개
emotion-lab:completed:v4   완료·중단 세션 목록 (newest first)
```

- completed 저장은 **id 기준 upsert**다. reopen으로 `completed → draft → completed`를
  왕복해도 같은 id가 두 번 쌓이지 않는다.
- draft로 저장할 때 completed 목록에서 같은 id를 제거한다. 저장 후 삭제 순서라
  두 저장소에서 동시에 사라지는 구간이 없다.

### 축의 표현

| 축 | 쓰는 말 | 원어 |
|---|---|---|
| valence | `불쾌함 ↔ 유쾌함` | hedonic valence |
| activation | `가라앉음 ↔ 활성됨` | physiological activation |

**`편안함`을 valence 축 표현으로 쓰지 않는다.** 저활성 의미를 함께 품어 activation 축과
개념적으로 겹친다. 앱의 한국어는 원어를 쉬운 말로 옮긴 것이지 같은 구성개념을 측정한다는
주장이 아니다. 이 표현은 pad, Quick 요약, Deep 요약, synthesis에서 **모두 같아야 한다** —
Quick과 Deep이 같은 pad를 쓰므로 같은 좌표가 화면마다 다르게 읽히면 안 된다.

### Affect coordinate

`AffectPoint`는 **0..1 정규화 연속값**이다. 사용자에게 숫자를 보여주지 않는다.

- Quick과 Deep은 **같은 pad**를 쓴다. 차이는 측정도구가 아니라 질문 문구뿐이다.
- 따라서 두 값은 같은 척도 위에 있고, 비교가 성립한다. 어느 쪽이 더 정확하다고 평가하지 않는다.
- 후보 계산은 `lib/quick-check.ts`의 **boundary blending**을 쓴다. 이것은
  categorical band의 딱딱한 경계를 완화하는 **잠정 장치**이며, 단어에 좌표를
  부여하지 않는다. empirical norm이 연결되면 교체한다 (PROJECT_CONTEXT Decision B).
- third axis는 추가하지 않는다.

### v3 → v4 migration

`support.chosen`이 v3에서는 **고른 방향**을 담았는데, v4의 구조는 같은 자리를
**방향 안에서 고른 대응**으로 읽는다. 그대로 두면 값의 의미가 바뀌므로 `need`로
옮기고 `chosen`은 비운다. stage 이름 변경(`micro-learning` → `coach-note` 등)도
같은 단계에서 처리한다.

### v2 → v3 migration

`(n - 1) / 4`로 기존 1~5 값을 같은 위치의 연속값으로 옮긴다. 무손실이다.
v1 draft는 폐기하지만 **v2 draft는 이관한다** — 변환이 무손실이고 사용자가
진행 중인 세션을 갖고 있을 수 있기 때문이다.

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

## Body vocabulary

`data/body-signals.ko.json`은 7영역(호흡·가슴 / 심박 / 근육·자세 / 배·속 /
온도·피부 / 에너지·무게 / 움직임·정지) 32개이며, 첫 화면에 12개만 보여주고
`다른 몸의 느낌 보기`로 영역별로 펼친다. 직접 입력은 유지한다.

- **valence 필드를 두지 않는다.** 신체감각에 쾌/불쾌를 붙이면 "몸 → 감정" 추론의
  문턱이 생긴다. `심장이 빠르게 뜀`은 불안을 뜻하지 않는다.
- 첫 화면 12개는 7영역을 모두 덮고, 불편한 감각과 편안한 감각을 함께 포함한다.
  (이전 11개 목록은 불쾌 7 / 편안 3으로, 사실상 불편한 감각만 고를 수 있었다.)

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
- **개수 제한을 두지 않는다.** 현재 실용 범위는 55~60개 정도이지만, 숫자를 채우는
  것이 목적이 아니라 **빈 정서 영역을 보완**하는 것이 목적이다.
  불쾌·고활성 / 불안 / 상실·관계 / 자기평가 / 긍정·고활성 / 긍정·저활성·관계 /
  self-transcendent를 균형 있게 포함하고, 혐오 계열은 소수만 둔다.
- `contextDependent: true`는 맥락에 따라 valence 경험이 달라질 수 있는 표현에 쓴다
  (경외감·놀라움·감동·연민). "mixed emotion이라는 본질적 분류"가 아니라 **고정
  판정을 피하라는 UI metadata**이며, 후보 탐색에서 양쪽 어느 방향에서도 제시된다.
- norm 필드(`valencePrototype`, `arousalPrototype`, `valenceSD`, `arousalSD`,
  `normSource`, `normStatus`)는 계약만 존재한다. **출처와 사용 조건을 확인하지 못한
  값은 넣지 않는다.** `normStatus: "provisional"`인 동안에는 좌표가 없다.

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

# 14-A. Records (최소 History, 구현됨)

`completed:v4`를 그대로 읽는다. 스키마 변경 없음.

랜딩에서만 들어간다 — 세션 도중에 들어가면 reducer의 현재 세션과 편집 대상이
충돌할 수 있는데, 랜딩에서는 persist가 건너뛰므로 안전하다.

목록에 보여주는 것: 날짜·시각 / `빠른 확인` · `빠른 확인 + 자세히` · `자세히` /
고른 표현 / 고른 방향 / 해보기로 한 것. **해석·점수·진단·기록 간 pattern 추론은 하지 않는다.**

## Follow-up

Response를 고른 기록에만 나타난다.

> 그때 골랐던 것을 실제로 해봤나요? → `해봤어요` · `일부만 해봤어요` · `아니요`
> (앞이 yes/partly일 때만) 조금이라도 도움이 됐나요? → `도움이 됐어요` · `조금은요` · `아니요` · `잘 모르겠어요`

- **compliance 평가가 아니다.** `아니요`도 그대로 정상적인 답이다.
- `saveCompleted`가 id 기준 upsert라 답을 바꿔도 레코드가 늘지 않는다.
- 이 데이터로 **추천·성공률·효과 점수·개인 특성 추론을 만들지 않는다.**
  지금 목적은 사용자가 자기 과거 기록을 다시 보는 것뿐이다.

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
  (2026-10-11 구현: 「지난 기록」 화면 아래 「기록 옮기기와 지우기」. 완료·중단 기록의 JSON 내보내기(작성 중 초안 제외, 암호화 안 됨을 알림), 가져오기(먼저 개수를 보여 주고 묻는다, 같은 id는 기존 기록 유지), 모두 지우기(한 번 확인). 네트워크 없음, `lib/record-transfer.ts`)
- 중단 화면의 `이 기록을 지우기`는 그 기록을 이 기기에서 **실제로 지운다**(다른 기록은 남긴다). 2026-10-10 이전에는 작성 중 자리만 지워서, 중단 기록이 그대로 남는 버그가 있었다.
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

## Form constraints — 관계가 생기지 않게 (2026-10-19)

위의 금지는 **내용**에 대한 것이다. 동반자 챗봇 연구([docs/EVIDENCE_CHAIN.md §5](docs/EVIDENCE_CHAIN.md))가
보여주는 위험은 내용보다 **형식**에서 시작한다 — 상대가 있다고 느끼게 하는 말투. V2에서 AI를 켜더라도:

- 1인칭 주어로 감정을 말하지 않는다. (“저는 걱정돼요”, “함께 있을게요” 금지)
- 이름·아바타·“다시 만나요” 같은 관계 지속 언어를 쓰지 않는다.
- 지난 기록을 **“기억하고 있다”**는 식으로 되돌려 주지 않는다. (「나를 알아주는 상대」는 애착의 재료다)
- 요약은 항상 **“당신이 적은 것”**으로 귀속한다. “제가 보기엔”은 없다.
- 말투와 태도를 버전 사이에 바꾸지 않는다. 문구 집합을 고정하고 모델 교체 때 같은 입력으로 전후를 대조한다.
  업데이트로 「상대가 달라진」 느낌은 사용자에게 상실로 읽힌다.

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
- (영어판) “I notice …”, “It sounds like …”, “I’m here for you” 같은 상담자 어투.
  영어 상담 어투는 한국어보다 훨씬 쉽게 의인화를 만든다. “What you wrote …”, “Among these …”처럼
  주어를 사용자가 적은 것에 둔다 ([docs/EVIDENCE_CHAIN.md §5](docs/EVIDENCE_CHAIN.md)).

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

### 한글 줄바꿈과 움직임 (2026-10-10)

- 본문 전체에 `word-break: keep-all; overflow-wrap: break-word`. 한글이 낱말 안에서 끊기지 않는다("가 / 까울" ✗).
  URL·긴 입력처럼 끊을 곳이 없는 문자열은 칩·카드·요약 행 안에서 어디서든 줄을 바꿔 가로 스크롤을 만들지 않는다.
  제목은 `text-wrap: balance`, 문단은 `pretty`로 보강한다. 지원하지 않는 브라우저에서는 기본 줄바꿈으로 남는다.
- `prefers-reduced-motion: reduce`에서는 기존 전환과 스크롤 움직임을 즉시로 바꾼다. 새 전환은 만들지 않는다.

### Coach 영역 구분 (실험 1 — 설계 가설, 효과 미검증)

예시·내 선택·참고 설명을 다르게 보이게 하면 "예시 연습"과 "자기 기록"을 덜 혼동할 것이라는 가설이다.
Coach 세 화면에만 적용하고, 글·순서·선택지·동작은 바꾸지 않았다. 기존 토큰만 쓰고 accent는 쓰지 않는다.

| 역할 | 클래스 | 표면 | 역할을 알리는 것 |
|---|---|---|---|
| 예시 | `zone-example` | `--warm` 배경, 얇은 `--line` 경계, 작은 모서리(3px) | 실제 텍스트 라벨(`예시 상황` · `예시 연습 결과`), `region` + `aria-labelledby` |
| 내 선택 | `zone-mine` | `--card`, `--line-strong` 경계, 둥근 모서리(12px) | `group` + `aria-label="내 선택"` |
| 참고 설명 | `zone-note` | 상자 없이 왼쪽 `--line-strong` 3px 세로선, `--muted` 글자 | `complementary` + `aria-label="참고 설명"` |

- 색만으로 구분하지 않는다. 라벨과 경계(선 색·모서리)가 함께 다르다.
- `--muted`는 `--warm` 위에서 4.36:1이라 기준 미달이다. 예시 영역 안의 작은 글자는 `--ink`(12.35:1)를 쓴다. 테스트가 토큰에서 직접 계산해 확인한다.
- 출처를 알 수 없는 옛 기록의 결과는 예시 영역에 넣지 않는다(§5.0 기록).
- 평가 질문(사용성 확인 때): 예시와 내 선택을 구분해서 읽었는가? 어디를 눌러야 하는지 바로 이해했는가? 화면이 차분하고 읽기 편했는가, 어색한 곳은 어디인가?
  이 답은 화면의 이해도에 대한 것이다. 능력 향상이나 치료 효과의 증거로 부르지 않는다.

### 영화 미학 출처 (설계 영감, 근거 아님)

일부 화면 가설은 영화 미학 논문 한 편(양영철 2024, <올드보이>의 외화면과 롱테이크)에서 영감을 얻었다.
출처와 가설은 [docs/AESTHETIC_SOURCES.md](docs/AESTHETIC_SOURCES.md)에 있다. 작품 한 편의 질적 분석이고 관객 반응을 측정하지 않았으므로 효과의 근거가 아니다.
긴장이나 궁금증을 만들거나, 그만두기·개인정보·앱의 한계 같은 안전 관련 안내를 숨기거나 늦게 보여주는 데 쓰지 않는다.

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

- login (MVP 이후 방향은 [PROJECT_CONTEXT §11](PROJECT_CONTEXT.md))
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
 │     └── 표현 사이의 차이 살펴보기 (고른 표현과 겹치는 예시 세트가 있을 때)
 │           ↓
 │         COACH_APPRAISAL   예시 상황에서 눈에 띄는 것 (단어 없음)
 │           ↓
 │         COACH_WORDS       예시에 가까울 수 있는 표현
 │           ↓
 │         COACH_NOTE ─────────────────────────→ QUICK_SUMMARY (빠른 확인을 완료로 저장)
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

Deep을 마친 뒤에는 `SUPPORT`의 "이해하기" 방향에서 같은 `COACH_*` 화면으로 들어가고, `SUMMARY`로 돌아온다.
Coach의 결과는 세션의 `coach`에만 남는다 (§5.0).

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
