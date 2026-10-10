# 감정 관찰실 효과 검증 연구 설계서 초안

> **문서 상태**: 초안 (Draft) — [PROJECT_CONTEXT.md §8 #3, §12](../PROJECT_CONTEXT.md) 및 [docs/EVIDENCE_CHAIN.md](EVIDENCE_CHAIN.md)의 후속 검토 문서.
> **연구 질문**: "감정을 판정하지 않고 탐색을 돕는 이 도구가 일반 사용자에게 실제로 감정 구별(Emotion Differentiation) 향상과 정서 조절에 도움이 되는가, 그리고 부작용(반추)은 없는가?"

---

## 0. 설계 원칙과 주의점

1. **「양립한다」와 「입증했다」를 분리한다**
   - 기존 문헌(Widdershoven 2019, Vedernikova 2021)은 일상 기록이나 교육이 부정 구별 지표를 높일 수 있음을 보여주었으나, **"10~30초의 자율적 탐색형 웹앱"**이 동일한 효과를 내는지는 검증된 바 없다.
   - 따라서 본 연구는 "이미 입증된 효과를 재현"하는 것이 아니라 **"가설적 개입 모델을 정밀하게 시험"**하는 탐색적-확증적 혼합 연구다.

2. **평균 기분과 변동성을 반드시 통제한다 (Dejonckheere 2019, Van der Gucht 2019)**
   - 감정 구별 지표(1 - ICC)는 평균 부정 정서(mean negative affect) 수준 및 분산과 높은 상관을 가진다.
   - 평균 부정 정서가 떨어지면 수학적으로 공분산 구조가 달라져 구별 지표가 변한 것처럼 보일 수 있다. 다수준 분석(Multilevel Modeling)에서 평균 수준을 반드시 공변인(covariate)으로 통제해야 한다.

3. **안전성(Iatrogenic effect)을 1차 관심사로 둔다 (Watkins 2008, SAFETY.md)**
   - 감정에 주의를 기울이고 성찰하는 행위는 특정 개인에게 **침투적 반추(rumination)**나 기분 악화를 유발할 위험이 있다.
   - 부작용 평가(K-RRS, 음성 정서 악화 여부)를 주 효과 분석과 동등한 중요도로 다룬다.

4. **앱 자체의 특성을 훼손하는 강제성 배제**
   - "하루 10회 강제 알림"식의 ESM은 이 앱의 제품 철학(P0: "빠르게 시작하고, 필요할 때만 깊어진다", "사용자가 스스로 결정")과 어긋난다.
   - 따라서 **평가(Measurement)를 위한 정규 ESM**과 **개입(Intervention)으로서의 앱 자율 사용**을 명확히 분리한다.

---

## 1. 연구 질문 (Research Questions) 및 가설

### RQ 1. 감정 구별성 (Emotion Differentiation)
- **가설 1a (부정 구별)**: 감정 관찰실 자율 사용 집단은 활성 대조군(단순 정서 기록군)에 비해 일상 경험표집(ESM)에서 평가된 부정 감정 구별성($1 - \text{ICC}_{\text{neg}}$)이 유의하게 향상될 것이다.
- **가설 1b (긍정 구별)**: 긍정 Coach 세트 및 어휘 탐색 경험을 통해 긍정 감정 구별성($1 - \text{ICC}_{\text{pos}}$) 또한 향상 경향을 보일 것이다. (단, 문헌상 긍정 구별은 변화가 둔감하므로 탐색적 검증)

### RQ 2. 정서 조절 및 안녕감 (Downstream Outcomes)
- **가설 2**: 개입 후 자기보고식 정서조절 곤란(K-DERS) 중 '정서 명확성 결여(Lack of Emotional Clarity)' 하위 척도 점수가 대조군 대비 유의하게 감소할 것이다.

### RQ 3. 부작용 및 반추 (Safety & Non-harm)
- **가설 3**: 개입 후 침투적 반추(K-RRS Brooding) 점수가 기저선 대비 증가하지 않을 것이다 (비열등성 검정 또는 불변성 확인).

### RQ 4. 사용 패턴과 생태학적 순간 효과 (Ecological Micro-outcomes)
- **질문 4**: Quick Check 세션 직후의 주관적 명료감("지금 내 상태를 설명할 말이 조금 더 분명해졌다")은 세션 빈도 및 깊이(Coach/Deep 진입 여부)와 어떻게 관련되는가?

---

## 2. 참가자 및 표본 설계

- **대상**: 만 19세 이상 성인 스마트폰/PC 사용자 (비임상 일반군)
- **선별 기준 (Inclusion / Exclusion)**:
  - 포함: 한국어 모국어 화자, 개인 기기 보유 및 웹 접속 가능자
  - 제외: 현재 정신과적 급성기 치료 중이거나 자살/자해 고위험군 (PHQ-9 20점 이상 또는 자살 문항 9번 1점 이상 시 안전 자원 안내 후 제외 — [SAFETY.md](../SAFETY.md) 프로토콜 준수)
- **표본 크기 산정 (Power Analysis)**:
  - 선행 연구(Widdershoven 2019의 $d \approx 0.40$, Vedernikova 2021의 $\eta_p^2 = .174$)를 감안하되, 디지털 자율 사용의 보수적 효과 크기($d = 0.30$) 가정.
  - $\alpha = .05$, 검정력 $(1 - \beta) = .80$, 탈락률 25% 감안 시 군당 70명, **총 140명** 목표.

---

## 3. 실험 설계 (Study Design)

무작위 대조군 사전-사후-추적 평가 설계 (Randomized Controlled Trial, RCT):

```text
[모집 및 기저선 설문]
        │
[1주차: Baseline ESM] (모든 참가자 동일한 1일 5회 정서 표집)
        │
   무작위 배정 (1:1)
   ┌────┴─────────────────────────────┐
   ▼                                  ▼
[실험군: 감정 관찰실 (Web App)]    [활성 대조군: Simple Affect Logger]
자율적 사용 권장 (최소 주 3회)     자율적 사용 권장 (Valence/Arousal 2축 점수만 기록)
   └────┬─────────────────────────────┘
        │ (3주간 개입 기간)
        │
[5주차: Post-intervention ESM] (1일 5회 정서 표집 + 사후 설문)
        │
[9주차: Follow-up] (4주 후 추적 설문: 정서 조절 및 자율 지속성)
```

### 처치 조건의 상세 비교
| 구분 | 실험군 (감정 관찰실) | 활성 대조군 (Simple Affect Logger) |
|---|---|---|
| 인터페이스 | Affect Pad $\rightarrow$ 어휘 탐색 $\rightarrow$ 선택적 Coach/Deep | 동일한 2D Affect Pad 좌표 찍기만 지원 |
| 정서 어휘 | 58개 감정 어휘 풀 점진적 노출 및 자가 표현 | 어휘 선택 없음 (순수 Affect 평가만) |
| 세분화 지원 | Granularity Coach (상황 예시 & Appraisal 관찰) | 제공 안 함 |
| 피드백 | Deterministic Synthesis (관찰 $\rightarrow$ 연결 $\rightarrow$ 질문) | "기록되었습니다" 단순 완료 화면 |

---

## 4. 측정 도구 및 변인

### A. 일상 경험표집 (ESM) 프로토콜 (1주차 & 5주차)
- **빈도**: 7일간 하루 5회 준무작위(semi-random) 알림 (오전 9시 ~ 오후 10시).
- **항목 (정서 경험 강도 1~7점 리커트)**:
  - **부정 정서 (8문항)**: 불안한, 화난, 짜증나는, 우울한, 슬픈, 답답한, 부끄러운, 억울한 (어휘 풀과 매핑)
  - **긍정 정서 (6문항)**: 평온한, 기쁜, 안도하는, 만족스러운, 감사한, 설레는
  - **상황 맥락**: 혼자 있음 / 타인과 있음, 주 활동 내용
- **Emotion Differentiation 지표 산출**:
  - 참가자별 급내상관(Intraclass Correlation, ICC)의 역산:
    $$\text{Differentiation} = 1 - \text{ICC}(3, k)$$
    (ICC는 일관성/절대일치도 모델 사용, 음수 산출 시 Fisher's $z$ 변환 또는 truncated score 적용 원칙 명시)
  - **부정 구별도(NED)** 및 **긍정 구별도(PED)**를 각각 독립적으로 산출.

### B. 표준화 설문 척도 (사전, 사후, 추적)
1. **한국어판 정서조절 곤란 척도 (K-DERS)**:
   - 총점 및 특히 '명확성(Lack of Emotional Clarity)', '인식(Lack of Emotional Awareness)' 하위 척도.
2. **한국어판 반추 반응 척도 (K-RRS)**:
   - 반성적 숙고(Reflection)와 침투적 반추(Brooding) 분리 측정. Brooding의 유의미한 상승이 없는지 확인.
3. **토론토 감정표현불능증 척도 (TAS-20K)**:
   - 감정 식별 곤란(DIF) 및 감정 서술 곤란(DDF) 변화 검토.

### C. 앱 내부 사용 로그 (수집 동의자 대상, 로컬 익명화 추출)
- 주당 Quick Check 완료 횟수
- Granularity Coach 및 Deep Reflection 진입 비율
- 직접 입력한 어휘(`personalMeaning`) 빈도

---

## 5. 통계 분석 계획 (Statistical Analysis Plan)

1. **주 분석 (Primary Analysis — NED & PED)**:
   - **다수준 모형 (Linear Mixed Models, LMM)** 사용:
     $$\text{EmotionRating}_{tij} = \beta_{0ij} + \beta_{1}(\text{Time}_{tij}) + \beta_{2}(\text{Group}_i) + \beta_{3}(\text{Time} \times \text{Group}) + \gamma(\text{MeanAffect}_{ij}) + e_{tij}$$
   - 반복 측정 내 감정 간 상관 구조 분석.
   - **핵심 점검**: 시점(Time) × 집단(Group) 상호작용 효과.
   - **통제 변인**: 개별 시점의 평균 정서 강도($\text{MeanAffect}$) 및 정서 가변성($SD$)을 필수 포함하여 Dejonckheere(2019) 아티팩트 통제.

2. **이차 분석 (Secondary Analysis — DERS, RRS)**:
   - 반복측정 변량분석(RM-ANOVA) 또는 ANCOVA(사전 점수 공변량 통제)로 사후 점수 비교.
   - K-RRS(반추)의 경우 비열등성 마진(Non-inferiority margin) 검토로 위해(harm) 없음 검증.

3. **용량-반응 관계 탐색 (Dose-Response Exploration)**:
   - 실험군 내에서 실제 앱 사용 횟수(Log count)가 구별성 향상 정도를 예측하는지 회귀분석 (Widdershoven 2019에서 비선형성이 관찰되었으므로 로그/비선형 모델 함께 검토).

---

## 6. 연구 윤리 및 안전 프로토콜 (Safety & Ethics)

1. **사전 동의**:
   - 본 연구는 감정 질환 치료제가 아니며, 자가 관찰 연습 도구임을 명시.
2. **이상 반응 및 위험 모니터링**:
   - ESM 응답 중 극심한 고통이나 위험 신호(부정 정서 극대화 지속) 발생 시, 안전 리소스(정신건강위기상담전화 1577-0199 등) 화면 팝업 연결.
   - 언제든지 위약금/불이익 없이 참여를 중단할 수 있는 철회권 보장.
3. **데이터 프라이버시**:
   - 연구용 ESM 데이터와 앱 내부 로컬 스토리지는 별개의 익명 연구 ID로 분리 관리.

---

## 7. 향후 추진 일정 (Roadmap)

- [ ] **1단계**: 연구계획서 기관생명윤리위원회(IRB) 심의 신청 준비
- [ ] **2단계**: ESM 수집용 가벼운 웹/모바일 알림 시스템 프로토타입 연결
- [ ] **3단계**: 파일럿 테스트 ($N = 10$, 1주간 feasibility 점검)
- [ ] **4단계**: 본 연구 실행 ($N = 140$)
