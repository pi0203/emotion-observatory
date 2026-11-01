# 감정 어휘와 문화 — 제품 결정의 근거

이 문서는 앱이 감정 어휘를 **보편적 정답표가 아니라 탐색용 출발 어휘**로 다루는 이유를
남긴다. 특정 이론을 채택하기 위한 문서가 아니라, **어디까지가 근거이고 어디부터가
논쟁인지** 구분해 두기 위한 문서다.

> 인용의 서지사항은 아래에 적은 그대로이며, **DOI·페이지는 원문에서 다시 확인한 뒤**
> 외부에 인용하기를 권한다. 이 문서는 제품 결정의 근거 기록이지 문헌 검토가 아니다.

---

## 0. 세 층을 섞지 않는다

| 층 | 무엇인가 | 제품에서의 취급 |
|---|---|---|
| **Barrett의 관점** | 하나의 이론적 입장 | 아이디어를 얻되 **정답으로 구현하지 않는다** |
| **Cross-cultural 증거** | 여러 팀이 수렴하는 관찰 | 설계와 **양립하는지** 확인하는 데 쓴다 |
| **논쟁 중** | 아직 정해지지 않은 것 | UI와 문서에서 **불확실성을 표시한다** |

### 근거의 강도를 뭉개지 않는다

이 문서에서 두 수준을 구별해 쓴다.

| 수준 | 쓰는 표현 | 뜻 |
|---|---|---|
| 약함 | **양립한다 / 경험적 배경을 제공한다** (supports, is consistent with) | 우리 설계와 어긋나지 않고 그 방향을 뒷받침하는 관찰이 있다 |
| 강함 | **검증했다 / 입증했다 / 정당화한다** (validates, proves, justifies) | 그 연구가 **바로 그 대상**을 직접 검증했다 |

**이 앱의 어떤 설계 요소도 강한 수준으로 뒷받침되지 않는다.** affect pad, 어휘 73개(2026-11-01 기준),
boundary blending, synthesis 규칙 중 그 자체의 측정타당도가 검증된 것은 없다.
문헌은 **방향이 어긋나지 않는지** 확인하는 데만 쓴다.

### source type을 섞지 않는다

같은 강도의 근거처럼 나란히 묶지 않는다.

| 출처 | 종류 |
|---|---|
| Barrett 2012 / 2017 | **constructionist theoretical account** — 이론적 입장 |
| Jackson et al. 2019 | **large cross-linguistic empirical study** — 대규모 언어 간 경험 연구 |
| Gendron et al. 2014 | **specific cross-cultural perception experiment** — 특정 지각 실험 |
| Elfenbein & Ambady 2002 | **meta-analysis** — 기존 연구들의 메타분석 |
| Tsai 2007 | **theory / review** — ideal affect 이론과 개관 |
| De Leersnyder et al. | **cultural-fit empirical studies** — 경험 연구들 |
| Lindquist et al. 2022 | **Perspective / cultural evolutionary framework** — 관점 논문·틀 |

이론적 입장(Barrett, Tsai)과 경험 연구(Jackson, Gendron, De Leersnyder), 메타분석
(Elfenbein & Ambady), 관점 논문(Lindquist)은 **말할 수 있는 것의 범위가 서로 다르다.**

---

## 1. Barrett — social reality

> **source type: constructionist theoretical account (이론적 입장)**

**Barrett, L. F. (2012). Emotions are real. *Emotion*, 12(3), 413–429.**
https://doi.org/10.1037/a0027555

**Barrett, L. F. (2017). The theory of constructed emotion: An active inference
account of interoception and categorization.**

### 무엇을 보여주는가
- Barrett은 **감정이 허구라고 주장하지 않는다.** 몸·얼굴·목소리·뇌의 물리적 변화는 실재한다.
- 공유되고 학습된 개념 지식이 그 변화에 **물리적 성질만으로는 갖지 못하는 심리적 기능과
  의미**를 부여할 수 있다고 본다.
- 그래서 그녀의 이론에서 감정은 *socially constructed이면서 biologically evident*하다.
- 화폐 비유: 종이의 분자구조가 가치를 만들지 않지만, 공유된 사회적 기능을 통해 돈은
  실제 삶에서 작동한다. 이 비유는 **"감정은 가짜다"가 아니라**, 실재에는 관찰자와 무관한
  물리적 실재와 공유된 개념·기능을 통해 성립하는 실재가 **모두 있을 수 있다**는 것을
  설명하기 위해서만 쓴다.

### 무엇을 보여주지 않는가
- 정서과학의 **합의가 아니다.** 하나의 연구 프로그램의 입장이다.
- "감정에는 생물학적 신호가 없다"를 뜻하지 **않는다.**
- 개인에게 어떤 감정 개념이 맞는지를 결정해주지 **않는다.**

### 제품 결정과 양립하는 것
- 감정 단어를 **정답이 아니라 탐색 도구**로 제시하는 것.
- 사용자가 고른 것을 앱이 뒤집지 않는 것.

이것은 **이론적 입장과 어긋나지 않는다**는 뜻이지, 이 관점이 그 설계를 입증한다는
뜻이 아니다. 이론은 설계를 검증하지 않는다.

### 이 관점이 말하지 않는 것
- 이 관점을 앱의 교육 콘텐츠로 **가르치는 것.** micro-learning은 P7의 네 전제를 넘지 않는다.

---

## 2. Cross-cultural 증거

### Jackson et al. (2019). Emotion semantics show both cultural variation and universal structure. *Science*, 366, 1517–1522.
https://doi.org/10.1126/science.aaw8160

> **source type: large cross-linguistic empirical study**

**보여주는 것** — 2,474개 언어의 감정 의미망에 **상당한 문화·언어적 차이**가 있었다.
동시에 완전한 상대주의도 아니었고, 어족 전반에서 **valence와 activation이 의미망을
조직하는 중요한 공통 구조**로 나타났다.

**보여주지 않는 것** — 어느 언어의 감정 분류가 옳은지. 개인이 자기 언어의 평균대로
느끼는지. **그리고 어떤 2차원 self-report 도구의 측정타당도도 검증하지 않았다.**

**제품 결정과 양립하는 것** —

> Jackson et al.(2019)의 결과는 valence × activation을 **넓은 탐색의 출발점으로 사용하는
> 현재 구조와 양립하며 이에 경험적 배경을 제공한다. 다만 이 연구가 현재 affect pad 자체의
> 측정타당도를 검증한 것은 아니다.**

*좁히기는 축으로, 이름 붙이기는 사용자에게* 맡기는 구조가 이 관찰과 어긋나지 않는다는
뜻이다. 어휘 73개를 잠정적으로 두는 이유이기도 하다.

**용어** — 이 연구가 쓰는 말은 **hedonic valence**와 **physiological activation**이다.
앱의 `불쾌함 ↔ 유쾌함` · `가라앉음 ↔ 활성됨`은 이를 **쉬운 한국어로 옮긴 것**이지
같은 구성개념을 측정한다는 주장이 아니다. `편안함`은 저활성 의미를 함께 품어 두 축이
개념적으로 겹치므로 valence 축 표현으로 쓰지 않는다.

**말하지 않는 것** — 축이 감정을 결정한다는 것. 축은 후보를 좁힐 뿐이다.

### Gendron et al. (2014). Perceptions of emotion from facial expressions are not culturally universal.

> **source type: specific cross-cultural perception experiment** — 특정 표본·과제의 결과이며 일반화 범위가 넓지 않다

**보여주는 것** — 감정 개념 라벨이 표정 범주화에 영향을 줄 수 있다.
**양립하는 것** — 얼굴·신체 신호를 감정 판정에 쓰지 않는다는 결정(P7-4). 이 결정은
이 실험 하나가 아니라 P7의 네 전제에서 나온다.

### Elfenbein & Ambady (2002). On the universality and cultural specificity of emotion recognition: A meta-analysis.

> **source type: meta-analysis** — 개별 실험보다 넓지만, 포함된 연구들의 한계를 함께 물려받는다

**보여주는 것** — cross-cultural 인식은 우연 이상이지만, 같은 문화권에서 더 높은
**in-group advantage**가 있다.
**보여주지 않는 것** — 어느 쪽이 "진짜" 감정인지.
**양립하는 것** — 보편주의와 완전 상대주의 **양쪽 모두를 피하는** 중간 입장.

### Tsai (2007). Ideal affect: Cultural causes and behavioral consequences.

> **source type: theory / review** — 경험 연구들을 묶은 이론적 개관

**보여주는 것** — 문화마다 **이상적으로 가치 있게 여기는 정서 상태**가 다를 수 있다
(고각성 긍정 vs 저각성 긍정).
**양립하는 것** — 긍정 어휘에서 `신남·활기`(고각성)와 `평온·여유·충만함`(저각성)을
**둘 다** 갖추는 것. 한쪽만 두면 특정 이상을 기본값으로 삼는 셈이 된다.
**말하지 않는 것** — 개인에게 어느 쪽을 권하는 것.

### De Leersnyder, Kim, & Mesquita — emotional fit

> **source type: cultural-fit empirical studies**

**보여주는 것** — 한국을 포함한 연구에서 emotional fit이 문화적·상황적 맥락에 따라
well-being과 관련되었다.
**하지 않는 것** — **fit score.** 개인이 평균에 얼마나 맞는지를 재지 않는다.
"당신은 주변과 다르게 느낍니다" 같은 표현을 만들지 않는다.

### Lindquist et al. (2022). The cultural evolution of emotion. *Nature Reviews Psychology*.

> **source type: Perspective / cultural evolutionary framework** — 새 데이터가 아니라 틀을 제시하는 글이다

**보여주는 것** — 감정 개념이 문화적으로 전달되고 변해왔다는 관점의 정리.
**양립하는 것** — 어휘를 **고정된 taxonomy가 아니라 바뀔 수 있는 목록**으로 두는 것.

---

## 3. 아직 논쟁 중인 것

- 감정이 **얼마나** 보편적이고 **얼마나** 문화적으로 구성되는가.
- Barrett의 강한 구성주의 해석을 정서과학이 받아들이는가 (Kreibig의 자율신경 특이성,
  Cowen & Keltner의 고차원 구조 등 반론이 있다 — PRODUCT_SPEC P7 참고).
- 문화 간 차이가 **개념**의 차이인가 **경험**의 차이인가.

→ UI와 문서는 이 불확실성을 **감추지 않고 표시한다.**

---

## 4. 어디에서도 쓰지 않는 표현

한쪽 극단:
- "감정은 허구다" · "감정은 실재하지 않는다" · "감정은 단지 언어일 뿐이다"
- "몸이나 뇌에는 감정과 관련된 정보가 없다"
- "모든 감정은 문화가 만든 것이다" · "모든 문화는 완전히 다른 감정을 갖는다"

반대 극단:
- "각 감정에는 보편적인 생물학적 본질이 있다"
- "emotion word마다 고정된 biological fingerprint가 있다"

개인 수준 추론:
- "한국인은 이렇게 느낀다" — 집단 평균은 개인의 좌표가 아니다.
- 국적·민족·종교·성별에 따른 감정 단어 추천.

---

## 5. 이 문서가 막는 것

- vocabulary를 **완전한 목록**처럼 제시하는 것
- 한국어 norm을 **한국인의 정답**처럼 쓰는 것 ([NORMS.md](NORMS.md))
- 사용자의 문화를 **자동 분류**하는 것
- cultural fit score, "한국형 감정" taxonomy

---

## 6. 한국어 대중서 쓰임 관찰 (2026-10-31)

연애·결혼 대중서 11권이 앱 단어를 느낌으로 쓰는지, 다른 뜻으로 쓰는지 읽은 기록(2차 보고서)이 [vocab-sources/](vocab-sources/)에 있다. 1차 보고서는 책 문장 인용이 많아 저장소 밖에 두었고, 2차가 1차를 대체한다. 이론도 경험 연구도 아닌 **약한 수준의 관찰**이며, 사용자의 말을 대표하지 않는다. 여기서 가져온 결정(분개→분노, 속상함·그리움·끌림·안정감 추가, 관계어 힌트 점검)과 가져오지 않은 것은 [vocab-sources/DECISIONS_2026_10_31.md](vocab-sources/DECISIONS_2026_10_31.md)에 있다.

## 7. 한국어 표현과 영어 대응 (2026-11-01)

「이렇게도 말해요」([vocab-sources/EXPRESSIONS_2026_11_01.md](vocab-sources/EXPRESSIONS_2026_11_01.md))를 넣으면서 본 것이다. 차이를 기록할 뿐, 「한국인만의 감정」을 주장하지 않는다(§4).

- **같은 「터지다」가 아니다** (표준국어대사전 「터지다」):
  - 「분통이 터지다」는 [Ⅰ]1「8」, 쌓인 감정이 밖으로 북받쳐 나온다.
  - 「속이 터지다」는 [Ⅰ]2「1」, 일이 뜻대로 안 되거나 걱정으로 속·가슴이 괴롭다.
  - 앞의 것은 분노 쪽, 뒤의 것은 답답함 쪽이다.
- **공식 영어 대역에서 보이는 차이** (국립국어원 한국어기초사전, 2026-11-01 열람, 대역어만 인용):
  - 한 말이 여러 영어 말로 갈림: 답답하다(stifling; suffocating / feeling heavy; feeling uneasy / dull; inflexible / stuffy; cramped / upset; worried), 울컥하다(burst into tears; be pissed off; fall into a rage)
  - 여러 말이 한 영어 말로 모임: 억울하다와 원통하다가 둘 다 feeling mortified; feeling chagrined. 「잘못 없이 피해를 입었다」는 부당함이 빠진다.
  - 방향이 어긋남: 서운하다 → sorry; remorseful (뉘우침 쪽)
  - 관용구는 직역됨: 속(이) 타다 → One's inside burns
- **화병**: DSM-IV(1994) 부록 I의 문화 관련 증후군에 「anger syndrome」으로 실렸다(권정혜 외 2008 [원문]이 APA 1994, pp.844–846을 인용, DSM 원전은 [미확인]). 한국어판은 1995년(하나의학사, 이근후 외 공역)이다. DSM-5에서의 위치는 보류. 앱은 화병을 감정 단어로 쓰지 않는다.
- **원칙**: 영어판은 한국어 표현을 번역해 넣지 않는다. 영어 어휘는 따로 쓴 목록이고 한국어와 짝짓지 않는다(기존 결정).
