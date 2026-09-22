# PROJECT CONTEXT — 감정 관찰실

> **작업을 이어받는 사람이 가장 먼저 읽는 문서.**
> 개별 대화 기록 없이 이 저장소만 보고도 제품 맥락을 복원할 수 있도록 유지한다.
>
> - 여기: **왜 이렇게 만들고 있는가**, 사용자 여정, 현재 결정, 다음 순서
> - [PRODUCT_SPEC.md](PRODUCT_SPEC.md): 화면·데이터 모델·state machine·copy 규칙의 상세 명세
> - [SAFETY.md](SAFETY.md): 안전 경계와 의도적으로 구현하지 않은 것
> - [docs/NORMS.md](docs/NORMS.md): 한국어 valence/arousal norm을 연결하기 전에 확인할 것
>
> 충돌하면 **PRODUCT_SPEC.md가 구현의 source of truth**이고, 이 문서는 그 위의 의도다.

---

## 0. 이 앱이 왜 존재하는가

이 앱은 mood tracker도, 감정일지도 아니다.
감정카드의 단어 목록을 화면으로 옮긴 디지털 버전은 더더욱 아니다.

> 사용자가 자신의 감정을 **맞히는** 것이 아니라,
> 최소한의 입력으로 현재 경험에 가까운 정서 언어를 탐색하고
> → 필요하면 비슷한 감정 사이의 차이를 더 세밀하게 구별하고
> → 맥락과 의미를 살펴본 뒤
> → **처음보다 자기 경험을 조금 더 잘 설명하거나 더 좋은 질문을 갖도록** 돕는 self-monitoring 도구.

정적인 감정 목록을 제공하는 것이 존재 이유가 아니다. 디지털 도구여야 하는 이유는 넷이다.

1. 현재 상태를 이용해 **탐색 범위를 줄인다**
2. 가까운 개념들 **사이를 이동**할 수 있게 한다
3. 필요한 경우 **맥락과 appraisal을 연결**한다
4. 마지막에 사용자가 선택한 정보들이 **어떤 관계를 가질 수 있는지 조심스럽게 되돌려준다**

아날로그 감정카드는 1번을 못 하고, 2·4번은 아예 불가능하다.

---

## 1. 제품 철학

최상위 원칙 세 문장:

> **빠르게 시작하고, 필요할 때만 깊어진다.**
> **감정을 판정하지 않고, 구별할 수 있는 선택지를 넓힌다.**
> **설명으로 가르치기보다 상황 속 차이를 사용자가 발견하게 한다.**
> **Maximum granularity가 아니라 useful granularity.**
> **몸은 고정된 측정값이 아니라 지금 순간의 snapshot이다.**

네 번째 문장의 뜻: 목표는 최대한 세밀하게 분석하는 것이 아니라 **지금 무엇을 할지
정하는 데 필요한 만큼** 구별하는 것이다. “기분이 좋다/나쁘다”로 충분한 순간이 있고,
구별이 유용한 이유는 정확도가 아니라 **선택**이다.

추가 원칙:

- 사용자가 감정을 **더 오래 기록하게 만드는 것이 목표가 아니다.**
- 자신의 상태를 이해하는 데 필요한 **최소한의 상호작용만** 요구한다.
- `잘 모르겠음`, `가까운 말이 없음`, `그만하기`는 실패가 아니라 **정상 경로**다.
- 감정 단어는 정답표가 아니라 경험을 **구별해보는 도구**다.
- 여러 감정 표현이 **동시에** 가까울 수 있다.
- 긍정적·편안한·경외로운 경험도 부정정서와 **동등하게** 탐색할 수 있어야 한다.
- granularity가 실제로 향상된다는 것은 **아직 제품 효과로 입증되지 않았다.**
  현재는 "더 세밀하게 구별하고 표현하는 **연습을 돕는다**"는 설계 가설 수준으로만 표현한다.

상세: [PRODUCT_SPEC §1 (P0~P8)](PRODUCT_SPEC.md)

---

## 2. 이론적 태도

Lisa Feldman Barrett의 constructed emotion 관점에서 많은 아이디어를 얻었지만,
**Barrett 이론을 과학적 최종 정답으로 구현하는 앱이 아니다.**

다음 네 전제만 따른다. 어느 한 이론이 수정되어도 살아남도록 고른 최소 공통분모다.

1. 정서 경험은 단순한 valence/arousal만으로 충분히 설명되지 않을 수 있다.
2. 맥락과 의미평가(appraisal)는 정서 경험을 이해하는 데 중요하다.
3. 생리·뇌·표정에는 정서 관련 정보와 **일정한 규칙성이 있을 수 있다.**
4. 그러나 현재 단일 지표나 고정된 패턴으로 개인의 특정 감정을 **확정적으로 판정하는 것은 정당화하지 않는다.**

따라서:

- 얼굴·신체·뇌 신호를 "감정 지문"처럼 진단에 쓰지 않는다.
- **affect 좌표는 감정 진단값이 아니다.**
- **vocabulary metadata는 존재론적 정답 taxonomy가 아니다.**
- **empirical norm은 후보 검색을 돕는 자료이지 개인 감정의 정답표가 아니다.**

3번을 특히 주의할 것. "감정에는 어떤 생물학적 신호도 없다"고 가르치는 것도 금지다.

---

## 3. 현재 사용자 여정

```text
01 ENTRY                지금 살펴볼지 결정
      ↓
02 QUICK CHECK          아주 적은 입력으로 현재 affective state 표시
      ↓
03 WORD EXPLORATION     3~5개 후보
                          ↓ 비슷한 표현 더 보기
                        neighbor 탐색
                          ↓ 다른 표현 찾아보기
                        직접 자기 말로 표현
      ↓
   ┌──────────┐
   │ 여기까지 │  ← Quick Check만으로도 완결된 세션
   └──────────┘
      또는
04 GRANULARITY COACH    비슷한 개념을 상황·appraisal 차이로 구별
      또는
05 DEEP REFLECTION      몸 → affect → context → 무엇이 중요했는지 → emotion language
      ↓
06 SYNTHESIS            관찰한 것 → 연결해서 생각해볼 수 있는 것
                        → 아직 알기 어려운 것 → 다음에 생각해볼 질문
      ↓  (선택)
07 NEED                 “지금 가장 필요한 방향은 어느 쪽에 가까운가요?” (단일 선택)
      ↓  같은 화면
08 RESPONSE             그 방향에서 실제로 해볼 수 있는 2~4개 (복수 선택)
```

### Body is dynamic

> **몸의 느낌은 고정된 정답이 아니라 지금 순간의 snapshot입니다.
> 움직임, 자세, 호흡, 시간, 상황이 달라지면 다르게 느껴질 수 있습니다.**

이 앱은 사용자가 특정 자세를 유지한 상태에서만 유효한 측정도구가 아니다.
몸의 감각·자세·움직임·호흡과 정서경험은 서로 영향을 주고받을 수 있고,
그 관계는 개인·상황에 따라 달라진다.

- 몸을 고정하도록 **요구하지 않는다.**
- `이 자세 → 이 감정` 같은 mapping을 **만들지 않는다.**
- "자세를 바꾸면 기분이 좋아진다"는 효과를 **보장하지 않는다.**
- Body 값의 변화는 오류가 아니라 **경험 변화의 일부**일 수 있다.
- `deepReflection.bodyRecheck` 자리를 만들어 두었다. 움직인 뒤 다시 확인하는 것은
  treatment가 아니라 사용자가 자기 경험을 비교해보는 **작은 self-experiment**다.
  아직 흐름은 만들지 않았다.

### OBSERVE → FORMULATE → NEED → RESPONSE

**OBSERVE → FORMULATE → CHOOSE SUPPORT.** 앱은 하나의 대응을 처방하지 않는다.
감정 단어 하나만 보고 solution을 추천하지 않으며(`화남 → 진정하세요` 금지),
같은 화남도 휴식·경계설정·문제해결·의사표현 중 필요한 것이 다를 수 있다.
편안하거나 벅찬 경험에서는 문제를 풀기보다 **음미·공유·기억·가치 연결**이 맞을 수 있다.

**Quick Check만 해도 하나의 완결된 세션이다.**
Granularity와 Deep Reflection은 더 정확한 답을 찾기 위한 필수단계가 아니라 **선택적 depth**다.

---

## 4. 각 단계가 존재하는 이유

**Entry** — self-monitoring이 항상 도움이 되는 것은 아니므로, 기록을 시작하지 않는 것도 정상적인 선택으로 둔다.

**Quick Check** — 일기를 쓰지 않고도 10~30초 안에 현재 상태를 표시하게 한다.
목표는 `5점 척도를 선택하는 경험`이 **아니라**, 연속된 공간에서 그냥 "이쯤"이라고 표시하는 경험이다.

**Word Exploration** — 수십 개를 모두 보여주는 대신 소수 후보부터 점진적으로 넓힌다.
아날로그 감정카드 대비 웹앱이 제공하는 핵심 가치 중 하나다.

**Granularity Coach** — 단어 정의를 암기시키는 기능이 **아니다.**
`짜증 ↔ 억울함 ↔ 답답함` 사이에서 "어떤 단어가 정답인가?"보다 **"그 상황에서 무엇이 중요했는가?"** 를 탐색하게 한다.
같은 사건도 appraisal에 따라 여러 표현이 가능해야 한다.

**Deep Reflection** — 빠른 affect 위치만으로 충분하지 않을 때 몸·상황·의미를 추가로 살펴본다.
Quick과 Deep은 **같은 EmotionSession**에 속하고, **두 affect를 모두 보존한다.**
변화 자체를 개선이나 정확도 상승으로 **평가하지 않는다.**

**Synthesis** — 현재까지의 가장 중요한 다음 개발 목표.
`A를 골랐고 B를 썼습니다` 나열을 넘어서되, **임의의 심리적 원인을 만들어내는 해석으로 가지 않는다.**
목표: *처음 앱을 열었을 때보다 사용자가 자신의 경험을 한 문장이라도 더 잘 설명하거나, 더 좋은 질문 하나를 갖게 하는 것.*

---

## 5. 지금까지 구현된 주요 변화

- Quick Check / Deep Reflection 구조
- Quick → Deep을 **하나의 EmotionSession으로 통합** (reopen)
- local-first persistence, v1 → v2 migration
- Quick affect와 Deep affect 별도 보존
- `잘 모르겠음` 자동 대리선택 버그 제거
- `가까운 말이 없음`을 정상 경로로
- Quick Check progress bar 제거
- step-level micro feedback
- deterministic synthesis v1 + synthesis feedback
- progressive vocabulary disclosure, neighbor 구조, custom word 입력
- vocabulary 15 → 44 → **58** (pleasant 30 / unpleasant 28)
- 밝은 연두 중심 theme, accessibility contrast/focus 정리
- 조사 오류 수정 (`활성됨로` → `활성됨으로`)
- **연속형 2D affect pad** (Quick/Deep 공용), storage v3, boundary blending
- **`contextDependent`** — 양쪽 어디서든 제시되는 맥락 의존 표현
- **synthesis v2** — 관찰 / 연결 / 모르는 것 / 질문, 단서 2개 미만이면 해석하지 않음
- **norm audit 도구** — 외부 자료를 복제하지 않고 coverage만 조사

| commit | 내용 |
|---|---|
| `581dd97` | Phase 1 — 조사 오류, 눈금 라벨 |
| `c1d54fe` | 이 문서 |
| `5a53735` | Phase 2 — continuous affect pad, storage v3 |
| `7ebd1ba` | Phase 3 — vocabulary 58, contextDependent, norm contract |
| `1b52b4c` | Phase 4 — synthesis v2 |
| `e6ead92` | Phase 5 — norm audit |

---

## 6. 사용자 테스트에서 발견된 문제

**A. Affect representation** — Deep Affect는 실제로 1~5 척도였고, Quick도 연속 좌표를 받은 뒤 내부에서 5단계 → 3구간으로 떨어뜨리고 있었다. 사용자는 연속 공간이 아니라 **몇 개의 칸 중 하나를 고르는 경험**을 했다.

**B. Vocabulary imbalance** — 44개 중 pleasant 16 / unpleasant 28 / mixed 0. 특히 **self-transcendent 영역이 거의 비어 있다.** 부정정서는 당분간 더 늘리지 않는다.

**C. Synthesis depth** — 안전하지만 description에 가깝다. `관찰한 것 → 연결 → 아직 알기 어려운 것 → 다음 질문` 구조로 발전시키되 **과잉해석을 경계한다.**

---

## 7. 이번 사이클의 결정

### Decision A — Affect Pad
Quick과 Deep 모두 **같은 연속형 2D valence × activation pad**를 사용한다.
차이는 측정도구가 아니라 prompt에만 둔다.

- Quick: `지금은 어느 쪽에 가까운가요?`
- Deep: `조금 더 살펴본 지금은 어느 쪽에 가까운가요?`

저장은 `{ valence: number, activation: number }` (0..1). **숫자는 사용자에게 표시하지 않는다.**
third axis는 아직 추가하지 않는다.

### Decision B — Boundary blending (provisional)
empirical norm이 연결되기 전까지의 **잠정** candidate exploration 장치로만 허용한다.

- 과학적인 감정 좌표로 설명하지 않는다.
- 단어 사이 실제 심리적 거리를 의미하지 않는다.
- 개인 감정을 판정하지 않는다.
- **provisional임을 코드와 문서에 명시한다.**
- empirical norm이 준비되면 **교체 가능해야 한다.**

categorical band 사이의 딱딱한 경계를 완화하는 임시 장치일 뿐이다.

### Decision C — Korean empirical norms
VA-KOR audit을 진행하되:

- 외부 데이터를 **repository에 복제하지 않는다.**
- 우선 현재 vocabulary와의 **매칭 coverage만** 조사한다.
- 단어별 **출처를 구분**한다.
- 서로 다른 원 연구의 척도가 동일하다고 **가정하지 않는다.**
- MIT repository license가 **원자료 전체의 재배포 권리를 자동 보장한다고 가정하지 않는다.**

audit 결과를 본 뒤 실제 사용 여부를 **별도로** 결정한다.

### Decision D — Vocabulary
기존 36~48개 제한은 제품 규칙에서 **제거**한다.
이번 단계에서는 약 **55~60개**를 provisional practical range로 본다.
숫자를 채우는 것이 목적이 아니라 **빈 정서 영역을 보완**하는 것이 목적이다.

- 설렘 → 독립 단어
- 호기심 → 독립 단어
- 연결감 → 독립 단어
- 성취감 → 우선 뿌듯함의 alias / neighbor

`contextDependent: true`는 경외감 · 놀라움 · 감동 · 연민 등에 사용할 수 있다.
이는 "mixed emotion이라는 **본질적 분류**"가 아니라, 맥락에 따라 valence 경험이 달라질 수 있으므로
**고정 판정을 피하라는 UI metadata**다.

### Decision E — Synthesis

허용:
- 사용자가 직접 선택한 두 정보가 **수렴한다는 사실**
- Quick과 Deep에서 표현이 **달라졌다는 사실**
- 여러 다른 표현을 **동시에 골랐다는 사실**
- context가 현재/기억/예상 중 무엇인지

금지:
- 원인 추론 · 타인의 의도 · 성격 · attachment · 진단
- **valence/arousal → 접근/회피 방향 추론**
- "더 정확해졌다" 같은 개선 판정

**두 개 이상의 독립적인 단서가 있을 때만** tentative meaning을 생성한다.
근거가 부족하면 `지금 기록만으로는 연결해볼 만한 정보가 충분하지 않습니다.`라고 말하고 **질문만** 제시한다.

---

## 8. 구현 순서

**Phase 2~5 완료.** 아래는 기록으로 남긴다.

| Phase | 내용 |
|---|---|
| 2 ✅ | Continuous 2D Affect Pad — Quick/Deep 동일 pad, storage v3, 1~5 값 migration, provisional boundary blending |
| 3 ✅ | Vocabulary balance — positive/self-transcendent/context-dependent 보완, `contextDependent`, norm data contract |
| 4 ✅ | Synthesis v2 — observed / meaning / unknown / questions |
| 5 ✅ | Korean norm audit — VA-KOR local audit script, 외부 원자료 커밋 없음, coverage·source·variability만 보고 |

각 Phase는 **별도 commit**으로 남기고, 각 Phase마다 테스트 · `tsc` · `build`를 통과시킨다.
**storage migration 전에 기존 v2 기록을 깨뜨리지 않는 테스트를 먼저 작성한다.**

**Granularity Coach v2 완료** — 첫 세트 `짜증 ↔ 억울함 ↔ 답답함`.
단어보다 **appraisal을 먼저** 묻고, 그 뒤에만 단어를 보여준다.
데이터에 `appraisal → word` 매핑을 **두지 않아** answer key가 구조적으로 불가능하다.

**두 번째 세트 완료** — `평온 ↔ 안도 ↔ 만족`. 셋 다 저활성이라 각성이 섞이지 않고
평가 차이(해소 / 충족 / 압박 없음)만 남는다. 첫 세트(전부 고활성 불쾌)와 대칭이다.

**최소 History + Follow-up 완료** — 랜딩 → `지난 기록 보기`. 해석·점수·pattern 없음.
Response를 고른 기록에만 "해봤나요 / 도움이 됐나요"를 묻고, `아니요`도 정상 답이다.
이 데이터로 추천이나 개인화를 만들지 않는다.

**다음 후보**: 세 번째 coach 세트 `감사 ↔ 감동 ↔ 경외감`(self-transcendent).

---

## 9. North-star QA

새 기능을 평가할 때의 기준 질문. 기술 지표가 아니라 **이 질문들**로 판단한다.

| 영역 | 질문 |
|---|---|
| **Quick** | 일기를 쓰지 않고도 10~30초 안에 내 상태를 표현할 수 있는가? |
| **Vocabulary** | 내 경험과 가까운 말이 없다는 느낌이 줄어드는가? *동시에* 단어가 많아져서 오히려 찾기 어려워지지는 않는가? |
| **Granularity** | 비슷해 보이던 두 표현의 차이를 상황 속에서 조금 더 구별할 수 있게 되었는가? |
| **Deep Reflection** | 더 깊이 들어가는 과정이 정말 필요할 때만 열리는가? |
| **Synthesis** | 마지막 화면을 읽은 뒤, 처음 앱을 열었을 때보다 내 경험을 **한 문장이라도 더 잘 설명하거나 더 좋은 질문 하나를 갖게** 되었는가? |

---

## 10. 구현하지 않기로 한 것 (의도적)

- AI / LLM synthesis
- 얼굴·음성 감정 인식, automatic emotion diagnosis
- third affect axis
- personality / attachment 해석
- mDES 요인구조를 taxonomy로 고정
- Pattern view
- **clinical layer** — 반복되는 고통·기능저하를 다루고 싶다면
  `self-monitoring → optional validated screening → professional assessment`로
  **별도 설계**한다. EmotionSession의 결과를 우울증·불안장애·성격 진단으로
  변환하지 않는다. 이번 범위가 아니다.
- validated screening scale, AI recommendation, 자동 처방
- 위기·자해 위험 판별기 ([SAFETY.md](SAFETY.md) 참조 — keyword matching으로 위험도를 추정하지 않는다)
- streak / 알림 / gamification
