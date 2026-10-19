# PROJECT CONTEXT — 감정 관찰실

> **작업을 이어받는 사람이 가장 먼저 읽는 문서.**
> 개별 대화 기록 없이 이 저장소만 보고도 제품 맥락을 복원할 수 있도록 유지한다.
>
> - 여기: **왜 이렇게 만들고 있는가**, 사용자 여정, 현재 결정, 다음 순서
> - [PRODUCT_SPEC.md](PRODUCT_SPEC.md): 화면·데이터 모델·state machine·copy 규칙의 상세 명세
> - [SAFETY.md](SAFETY.md): 안전 경계와 의도적으로 구현하지 않은 것
> - [docs/NORMS.md](docs/NORMS.md): 한국어 valence/arousal norm을 연결하기 전에 확인할 것
> - [docs/EMOTION_CULTURE.md](docs/EMOTION_CULTURE.md): 감정 어휘와 문화 — Barrett의 관점 / cross-cultural 증거 / 아직 논쟁 중인 것을 구분해 기록
> - [docs/EVIDENCE_CHAIN.md](docs/EVIDENCE_CHAIN.md): 이 앱이 필요한가 — 근거 사슬 A~E와 원문 검토 결과
> - [docs/AESTHETIC_SOURCES.md](docs/AESTHETIC_SOURCES.md): 설계 영감과 가설의 출처(영화 미학 등). 효과의 근거가 아니다
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
> **감정 어휘는 보편적 정답표가 아니라 출발 어휘다.**

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

### Cultural humility

어휘는 **자연에 존재하는 감정의 완전한 목록도, 한국인의 taxonomy도, 진단 분류도 아니다.**
탐색을 돕는 **출발 어휘**다. 두 극단을 모두 피한다 — "감정에 문화와 무관한 고정된 본질이
있다"도, "감정에는 아무 공통 구조도 없다"도 아니다.

- 넓은 공통성은 **affect의 두 축** 쪽에 있을 수 있다 (Jackson et al. 2019). 이 결과는
  현재 구조와 **양립하며 경험적 배경을 제공하지만**, pad 자체의 측정타당도를 검증한 것은 아니다.
  축 표현은 `불쾌함 ↔ 유쾌함` · `가라앉음 ↔ 활성됨`으로 통일한다 —
  `편안함`은 저활성 의미를 품어 두 축이 겹친다.
- 그 안을 **어떤 단어로 나누는지**는 문화·언어·경험에 따라 달라질 수 있다.
- 개인에게 어느 의미가 맞는지는 **문화적 평균으로 결정하지 않는다.**
- **국적·민족·종교·성별을 묻지도 추론하지도 않는다.** cultural fit score를 만들지 않는다.
- 사용자가 가져온 말은 **예외가 아니라 일반 항목**이다 (`personalMeaning`).

근거와 한계: [docs/EMOTION_CULTURE.md](docs/EMOTION_CULTURE.md)

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
04 GRANULARITY COACH    예시 상황으로 비슷한 표현 사이의 차이를 연습 (내 기록에 합치지 않음)
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
지금은 **적어 둔 예시 상황으로 하는 연습**이다. 사용자의 실제 사건이나 지금 감정을 기록하지 않고,
예시에서 고른 표현은 개인 기록·요약에 합치지 않는다 (2026-10-10, [PRODUCT_SPEC §5.0](PRODUCT_SPEC.md)).
자기 경험으로 하는 Coach는 설계 제안으로만 남겨 두었다.

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
- **비계/대체와 나이 입장 (2026-10-19)** — 두 논문과 관련 연구 확인, PRODUCT_SPEC §2 「나이」, §17 「Scaffold constraints」(제안) ([docs/EVIDENCE_CHAIN.md §6](docs/EVIDENCE_CHAIN.md))
- **talkv.me 대조 보완 (2026-10-19)** — 모든 단계에서 위기 카드 한 번에 열기, 다른 사람 이름·파일 공유 안내, 「만든 사람이 볼 수 있나요」 FAQ, 「아무것도 보내지 않는다」 테스트 ([docs/BENCHMARK_TALKV_2026_10_19.md](docs/BENCHMARK_TALKV_2026_10_19.md))
- **공개 화면 보완 (2026-10-19)** — 보안 응답 헤더, Next 16.4.2, 입력 길이 상한, 저장 실패 안내, 파비콘·OG 이미지·robots·sitemap, 랜딩의 단계 미리 보기 ([docs/SECURITY_HEADERS.md](docs/SECURITY_HEADERS.md), [docs/BENCHMARK_JEEPEDIA_2026_10_19.md](docs/BENCHMARK_JEEPEDIA_2026_10_19.md))

| commit | 내용 |
|---|---|
| `581dd97` | Phase 1 — 조사 오류, 눈금 라벨 |
| `c1d54fe` | 이 문서 |
| `5a53735` | Phase 2 — continuous affect pad, storage v3 |
| `7ebd1ba` | Phase 3 — vocabulary 58, contextDependent, norm contract |
| `1b52b4c` | Phase 4 — synthesis v2 |
| `e6ead92` | Phase 5 — norm audit |
| `4b8eb8f` | Body 범위, 뒤로 가기, 이유 설명, 대응 고르기 |
| `28378a8` | Need → Response 분기, Coach v2, body snapshot |
| `62c4e67` | 긍정 Coach 세트, 최소 History, 후속 확인 |
| `7fd9a38` | 어휘를 정답표가 아닌 출발 어휘로 (cultural humility) |
| `8d497d7` | 근거가 뒷받침하는 것과 검증하는 것을 구분 |
| `c59cd93` | storage 절을 v4로 갱신 |
| `2358107` | Vercel 운영 배포 (§11) |

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

**남은 일** (2026-09-30 기준, 권장 순서):

1. 결정 사항을 문서에 옮기기 — 이 갱신으로 완료 (§11, §12)
2. Entry gate 다듬기 — gate 자체는 구현되어 있다 ([PRODUCT_SPEC §3](PRODUCT_SPEC.md)).
   남은 것은 "지금 맞는 순간인가"를 **사용자가 스스로 고르는** 선택지를 보완하는 일이다 (§12)
3. 근거 사슬 검토 — B 마무리(2026-10-06). 앱의 핵심 설계 둘은 효과가 확인된 방식의 반대라기보다 **아무도 시험하지 않은 자리**에 있고, 병목은 측정이다 ([docs/EVIDENCE_CHAIN.md](docs/EVIDENCE_CHAIN.md)). 다음은 앱이 무엇을 재면 효과로 볼지 정하는 일(본인 검토 중). 효과 검증 연구 설계 초안은 그 뒤에 (§12)
4. 로그인 — Phase 0부터 (§11)
5. 세 번째 coach 세트 `감사 ↔ 감동 ↔ 경외감`(self-transcendent), `bodyRecheck` 흐름,
   빵 비유 시각화(`/proto/bread` 후보)
6. 안전·임상 층 — 임상가 검토가 생길 때까지 [SAFETY.md](SAFETY.md)의 질문 목록 이상으로 진행하지 않는다

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
- validated screening scale을 **입구 선별용으로** 쓰는 것 (효과 검증용은 별개 — §12), AI recommendation, 자동 처방
- 위기·자해 위험 판별기 ([SAFETY.md](SAFETY.md) 참조 — keyword matching으로 위험도를 추정하지 않는다)
- streak / 알림 / gamification

---

## 11. 배포와 계정 방향

**운영 배포 (2026-09-27)** — 수업용. private GitHub 저장소 + Vercel,
https://emotion-observatory.vercel.app . `main`에 푸시하면 다시 배포된다. (2026-10-11: 이 저장소의 git 작성자 이메일을 noreply로 설정한 뒤 main 푸시가 운영 배포로 이어진 것이 관찰됨. main 푸시는 곧 공개 배포다. 영어 화면은 reviewStatus가 draft인 동안 운영에서 꺼져 있다.)

- 로그인이 없다. 기록은 **각자 브라우저의 localStorage에만** 남고 서버로 보내지 않는다.
- 따라서 기기나 브라우저를 바꾸면 이전 기록이 보이지 않는다. 브라우저 데이터를 지우면 사라진다.

**로그인 방향 A (본인 결정)** — [PRODUCT_SPEC](PRODUCT_SPEC.md)의 "Explicitly NOT MVP: login"은
MVP 범위를 말한 것이고, MVP 이후의 방향은 아래와 같다.

- **게스트 사용을 유지한다.** 로그인은 기록을 기기 사이에 잇고 싶은 사람의 선택이다.
- 로그인은 **이메일 6자리 코드**부터. 비밀번호·소셜 로그인은 그다음 문제다. (2026-10-11: 수업 채널(A)의 로그인 방식은 Google 먼저다. 이메일 6자리 코드는 일반 사용자 계정(B)의 후보로 유지한다.)
- 로그인 전 이 기기에 쌓인 기록은 **가져올지 반드시 묻는다.** 자동으로 옮기거나 지우지 않는다.
- 공유는 **개별 기록 읽기 전용**부터. 자유서술·`personalMeaning`·관계 관련 내용은 기본 제외.

순서:

| Phase | 사용자가 겪는 변화 | 상태 |
|---|---|---|
| 0 — storage seam | 없음. 저장 경로를 한 곳으로 모아 나중에 서버 저장을 붙일 자리를 만든다 | 완료 (2026-10-10): 어댑터 연결, 동기 방식 유지, 로그인과 서버 저장은 아직 없음 |
| 1 — OTP 로그인 | 이메일 코드로 로그인할 수 있다. 게스트는 그대로 | — |
| 2 — 계정 History | 로그인하면 다른 기기에서도 지난 기록이 보인다 | — |
| 3 — 게스트 기록 가져오기 | 이 기기의 기존 기록을 계정으로 옮길지 고른다 | — |

서버에 저장하는 순간 기록은 **지켜야 할 민감 정보**가 된다 ([SAFETY.md](SAFETY.md)).
본인 기록만 보이게 하는 접근 규칙은 표를 만들 때 함께 건다. 나중으로 미루지 않는다.

---

## 12. 누구에게, 언제 필요한가 (2026-09-30)

**질문:** 누가 이 도구가 필요하고 누가 아닌가?

**현재 판단:** "누가"보다 **"언제"**가 중요하다. 같은 사람도 어떤 순간에는 도움이 되고
어떤 순간(같은 생각이 계속 맴돌 때, 너무 격할 때)에는 아니다. 그래서 사람을 입구에서
분류하지 않고, 지금 맞는 순간인지 **사용자가 스스로 고르게** 한다
(Entry gate, P1, P6).

### 검증된 척도를 어디에 쓰는가

TAS-20, RDEES, DERS, RRS 같은 척도는 **어떤 특성을 잘 재는지**가 검증된 도구다.
"몇 점인 사람이 이 앱으로 이득을 보는지"를 검증한 것이 아니다.

| 목적 | 척도 사용 | 이유 |
|---|---|---|
| 입구에서 사람 거르기 | ✗ | 절단점은 다시 검증되지 않은 판단이 된다 · 점수가 낮은 사람이 오히려 핵심 대상일 수 있다 · 대부분 "평소"를 묻지 "지금"을 묻지 않는다 · 20~36문항은 10~30초 원칙과 맞지 않는다 · 점수로 분류하는 것이 "판정하지 않는다"와 충돌한다 |
| 앱 효과·부작용 검증 | ✅ | 사용 전후 비교(RDEES, K-DERS, TAS-20K) · 경험표집 기반 granularity 지표가 더 적합 · **반추가 늘지 않는지**를 따로 확인(K-RRS) |
| 임상적 위험 선별 | 별도 층에서만 | PHQ-2/GAD-2 등은 §10 clinical layer에 속한다. 임상가 설계가 전제다. 위기 문항은 묻는 순간 대응 책임이 생긴다 |

- 설문으로 잰 granularity와 경험표집으로 잰 granularity는 약하게만 일치한다는 보고가 있다.
  척도 점수가 이 앱이 다루는 능력을 그대로 대변한다고 보지 않는다.
- 척도 문항의 표현을 빌려 쓸 수는 있다. 다만 한 문항만 떼어 쓰면 **더 이상 검증된 도구가 아니므로**
  그렇게 주장하지 않는다.
- 척도마다 이용 조건이 다르다(저작권자·번안 연구자 허락이 필요할 수 있다). **실제로 쓰기 전에 척도별로 직접 확인한다.**

### 수업 실습 트랙과 다른 점

수업 실습 트랙의 일반 과제(척도 점수·해석 화면, 점수 변화 추이 그래프)와 이 프로젝트는 일부러 다르게 간다.

- **점수를 매기지 않는다.** 이 앱은 측정 도구가 아니라 탐색 도구다 (P3). 척도는 위 표처럼 효과 검증에만 쓴다.
- **추이 그래프를 만들지 않는다.** Pattern view는 §10에서 제외했다. History는 해석·점수 없이 기록만 보여준다.
- 대신 "무엇을 저장하지 않는가"와 "본인 것만 보이게 하는 규칙"은 트랙과 같은 원칙으로 따른다 (§11).
