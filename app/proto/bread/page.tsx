"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./bread.module.css";

// Preset configurations demonstrating how the SAME physical ingredients create DIFFERENT emotions
type BreadPreset = {
  id: string;
  name: string;
  subtitle: string;
  ingredients: {
    heart: "fast" | "moderate" | "slow";
    breathing: "rapid" | "deep" | "shallow";
    tension: "tense" | "relaxed";
    temperature: "warm" | "cool";
    valence: number; // -1 (불쾌) ~ +1 (유쾌)
    activation: number; // -1 (가라앉음) ~ +1 (활성됨)
  };
  contextId: string;
};

type ContextScenario = {
  id: string;
  title: string;
  environment: string;
  appraisal: string; // 무엇이 중요한가
  bakedEmotion: string;
  breadType: string;
  breadIcon: string;
  narrative: string;
};

const SCENARIOS: Record<string, ContextScenario> = {
  speech: {
    id: "speech",
    title: "중요한 발표 직전",
    environment: "수백 명의 청중 앞에서 실수를 용납할 수 없는 평가 상황",
    appraisal: "실패에 대한 위협, 자존감과 평가가 걸려 있음",
    bakedEmotion: "긴장과 불안 (Anxiety)",
    breadType: "바짝 마르고 단단한 크래커",
    breadIcon: "🥖",
    narrative:
      "뇌는 뛰는 심장과 가쁜 숨을 '위협에 대비해 즉각 도망치거나 방어해야 하는 신호'로 개념화합니다. 결과적으로 이 신체 경험은 '불안'이라는 빵으로 구워집니다.",
  },
  rollercoaster: {
    id: "rollercoaster",
    title: "롤러코스터 꼭대기",
    environment: "놀이공원의 안전장치에 고정되어 하강하기 3초 전",
    appraisal: "안전이 보장된 상황에서의 자발적 모험, 짜릿함의 추구",
    bakedEmotion: "짜릿함과 흥분 (Thrilled)",
    breadType: "버터 향 가득하고 바삭한 크루아상",
    breadIcon: "🥐",
    narrative:
      "심장 박동과 호흡, 각성 수준은 발표 직전과 물리적으로 거의 동일합니다. 하지만 '안전한 놀이'라는 맥락 덕분에 뇌는 이를 위협이 아닌 '흥분과 즐거움'으로 구성합니다.",
  },
  unfairness: {
    id: "unfairness",
    title: "동료의 부당한 성과 가로채기",
    environment: "내가 밤새 작업한 결과물을 동료가 자기 성과로 발표하는 회의실",
    appraisal: "나의 영역과 공정성이 침해당함, 불합리한 피해",
    bakedEmotion: "분노와 억울함 (Outrage)",
    breadType: "산미가 강하고 거칠게 부풀어 오른 사워도우",
    breadIcon: "🍞",
    narrative:
      "몸의 높은 열감과 근육 긴장이 '경계 침범과 불공정함'이라는 의미 평가와 만나 '분노/억울함'이라는 강렬한 방어 정서로 범주화됩니다.",
  },
  quiet_night: {
    id: "quiet_night",
    title: "비 오는 늦은 밤 서재",
    environment: "혼자 따뜻한 조명 아래 책을 읽으며 차를 마시는 시간",
    appraisal: "어떤 요구도 없음, 안전하고 온전한 나의 시간",
    bakedEmotion: "평온과 안도 (Peace & Relief)",
    breadType: "부드럽고 푹신한 밀크 식빵",
    breadIcon: "🥯",
    narrative:
      "낮은 심박수와 깊은 호흡, 편안한 근육 상태가 '휴식과 충족'이라는 맥락과 만나 몸과 마음이 완전히 내려앉는 '평온'을 빚어냅니다.",
  },
  solitude: {
    id: "solitude",
    title: "인적이 끊긴 낯선 방",
    environment: "연락할 사람 없이 혼자 며칠째 방 안에 머무는 상태",
    appraisal: "사회적 연결의 단절, 무기력감, 세상과의 거리",
    bakedEmotion: "외로움과 가라앉음 (Loneliness)",
    breadType: "수분이 날아가 묵직하고 푸석한 호밀빵",
    breadIcon: "🥨",
    narrative:
      "비슷하게 가라앉은 저각성 신체 신호이지만, '단절과 결핍'이라는 의미평가가 결합되면서 평온이 아닌 '외로움'이라는 그늘진 빵으로 완성됩니다.",
  },
};

const PRESETS: BreadPreset[] = [
  {
    id: "high_arousal_compare",
    name: "비교 실험 1: 똑같이 뛰는 심장 (고각성)",
    subtitle: "심장 박동과 가쁜 호흡이 발표장에선 '불안'이 되고, 놀이공원에선 '짜릿함'이 되는 이유",
    ingredients: {
      heart: "fast",
      breathing: "rapid",
      tension: "tense",
      temperature: "warm",
      valence: -0.2,
      activation: 0.8,
    },
    contextId: "speech",
  },
  {
    id: "low_arousal_compare",
    name: "비교 실험 2: 가라앉은 몸 (저각성)",
    subtitle: "느린 호흡과 이완된 몸이 서재에선 '평온'이 되고, 고립 상태에선 '외로움'이 되는 이유",
    ingredients: {
      heart: "slow",
      breathing: "deep",
      tension: "relaxed",
      temperature: "cool",
      valence: 0.5,
      activation: -0.7,
    },
    contextId: "quiet_night",
  },
];

export default function BreadPrototypePage() {
  // Physical ingredients state
  const [heart, setHeart] = useState<"fast" | "moderate" | "slow">("fast");
  const [breathing, setBreathing] = useState<"rapid" | "deep" | "shallow">("rapid");
  const [tension, setTension] = useState<"tense" | "relaxed">("tense");
  const [temperature, setTemperature] = useState<"warm" | "cool">("warm");
  const [valence, setValence] = useState<number>(-0.2);
  const [activation, setActivation] = useState<number>(0.8);

  // Context & Appraisal state
  const [currentContextId, setCurrentContextId] = useState<string>("speech");
  const [activePresetId, setActivePresetId] = useState<string>("high_arousal_compare");

  const currentScenario = SCENARIOS[currentContextId] ?? SCENARIOS.speech;

  // Handler to apply preset
  const handleSelectPreset = (preset: BreadPreset) => {
    setActivePresetId(preset.id);
    setHeart(preset.ingredients.heart);
    setBreathing(preset.ingredients.breathing);
    setTension(preset.ingredients.tension);
    setTemperature(preset.ingredients.temperature);
    setValence(preset.ingredients.valence);
    setActivation(preset.ingredients.activation);
    setCurrentContextId(preset.contextId);
  };

  const getHeartText = (val: string) => (val === "fast" ? "빠름 (쿵쾅거림)" : val === "moderate" ? "보통" : "느림 (차분함)");
  const getBreathingText = (val: string) => (val === "rapid" ? "가쁨 / 얕음" : val === "deep" ? "깊고 고름" : "약하고 잦음");
  const getTensionText = (val: string) => (val === "tense" ? "긴장됨 (목·어깨 굳음)" : "이완됨 (풀림)");
  const getTemperatureText = (val: string) => (val === "warm" ? "열감 / 상열감" : "서늘함 / 평온");

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.navBar}>
        <Link href="/" className={styles.backLink}>
          ← 감정 관찰실로 돌아가기
        </Link>
        <span className={styles.badge}>Conceptual Prototype</span>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>감정은 어떻게 구워지는가</h1>
        <p className={styles.lead}>
          밀가루와 물만으로 빵의 종류가 정해지지 않듯, 신체 감각만으로 어떤 감정인지 결정되지 않습니다.
          <br />
          Lisa Feldman Barrett의 구성된 감정 이론(Theory of Constructed Emotion) 속 <strong>빵 비유</strong>를 인터랙티브하게 체험해보세요.
        </p>

        <div className={styles.metaphorQuote}>
          “밀가루, 물, 효모, 소금이라는 단순한 물리적 재료가 있다고 해서 세상에 ‘빵’이라는 단일한 실체가 미리 정해져 존재하는 것은 아닙니다.
          반죽의 비율, 발효 환경, 오븐의 온도, 그리고 제빵사의 레시피에 따라 바게트가 되기도, 부드러운 크루아상이 되기도 합니다.
          <br /><br />
          <strong>우리의 감정도 마찬가지입니다.</strong> 심장 박동과 긴장감(기본 신체 재료)은 그 자체로 ‘불안’이나 ‘분노’가 아닙니다.
          지금 처한 상황과 맥락, 그리고 의미평가(오븐과 레시피)가 결합될 때 비로소 특정한 감정 경험으로 구워집니다.”
        </div>
      </header>

      {/* Presets Bar */}
      <section className={styles.presetSection}>
        <div className={styles.presetTitle}>비교 실험 프리셋</div>
        <div className={styles.presetButtons}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`${styles.presetBtn} ${activePresetId === preset.id ? styles.presetBtnActive : ""}`}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => setActivePresetId("custom")}
            className={`${styles.presetBtn} ${activePresetId === "custom" ? styles.presetBtnActive : ""}`}
          >
            자유 조합 모드 (직접 변경)
          </button>
        </div>
      </section>

      {/* Main Interactive Stage */}
      <div className={styles.stageGrid}>
        {/* Step 1: Raw Physical Ingredients */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>STEP 1 · 기본 재료</span>
            <h2 className={styles.cardTitle}>몸의 원재료 (Physical Core)</h2>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>💓 심장 박동</span>
            <div className={styles.chipGroup}>
              {(["fast", "moderate", "slow"] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setHeart(h);
                    setActivePresetId("custom");
                  }}
                  className={`${styles.chip} ${heart === h ? styles.chipActive : ""}`}
                >
                  {getHeartText(h)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>🫁 호흡 상태</span>
            <div className={styles.chipGroup}>
              {(["rapid", "deep", "shallow"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBreathing(b);
                    setActivePresetId("custom");
                  }}
                  className={`${styles.chip} ${breathing === b ? styles.chipActive : ""}`}
                >
                  {getBreathingText(b)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>⚡ 근육 긴장</span>
            <div className={styles.chipGroup}>
              {(["tense", "relaxed"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTension(t);
                    setActivePresetId("custom");
                  }}
                  className={`${styles.chip} ${tension === t ? styles.chipActive : ""}`}
                >
                  {getTensionText(t)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>🌡️ 체온 및 에너지</span>
            <div className={styles.chipGroup}>
              {(["warm", "cool"] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => {
                    setTemperature(tp);
                    setActivePresetId("custom");
                  }}
                  className={`${styles.chip} ${temperature === tp ? styles.chipActive : ""}`}
                >
                  {getTemperatureText(tp)}
                </button>
              ))}
            </div>
          </div>

          {/* Core Affect Sliders */}
          <div className={styles.sliderControl}>
            <div className={styles.sliderRow}>
              <span>정서가 (Valence)</span>
              <span>{valence < -0.2 ? "불쾌함" : valence > 0.2 ? "유쾌함" : "중립"} ({valence.toFixed(2)})</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={valence}
              onChange={(e) => {
                setValence(parseFloat(e.target.value));
                setActivePresetId("custom");
              }}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.sliderControl}>
            <div className={styles.sliderRow}>
              <span>각성도 (Activation)</span>
              <span>{activation < -0.2 ? "가라앉음" : activation > 0.2 ? "활성/들뜸" : "평온"} ({activation.toFixed(2)})</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={activation}
              onChange={(e) => {
                setActivation(parseFloat(e.target.value));
                setActivePresetId("custom");
              }}
              className={styles.rangeInput}
            />
          </div>
        </div>

        {/* Step 2: Oven & Recipe (Context & Appraisal) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>STEP 2 · 오븐과 레시피</span>
            <h2 className={styles.cardTitle}>상황과 의미평가 (Context & Appraisal)</h2>
          </div>

          <p style={{ fontSize: "14px", color: "var(--muted)", margin: "0 0 16px" }}>
            같은 신체 재료를 넣고 구울 오븐(상황 맥락)을 선택해보세요.
          </p>

          <div className={styles.scenarioList}>
            {Object.values(SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setCurrentContextId(scenario.id);
                  setActivePresetId("custom");
                }}
                className={`${styles.scenarioBtn} ${currentContextId === scenario.id ? styles.scenarioBtnActive : ""}`}
              >
                <div className={styles.scenarioTitle}>
                  {scenario.breadIcon} {scenario.title}
                </div>
                <div className={styles.scenarioDesc}>{scenario.environment}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3: The Baked Emotion Result */}
      <section className={styles.ovenResult}>
        <div className={styles.ovenHeader}>
          <span className={styles.breadIcon}>{currentScenario.breadIcon}</span>
          <div className={styles.bakedTitleArea}>
            <h3>구워져 나온 감정: {currentScenario.bakedEmotion}</h3>
            <span className={styles.breadNameTag}>비유 빵 유형: {currentScenario.breadType}</span>
          </div>
        </div>

        <div className={styles.resultBreakdown}>
          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>투입된 신체 재료 (Core Affect)</div>
            <div className={styles.breakdownVal}>
              심장 {getHeartText(heart)} · 호흡 {getBreathingText(breathing)} · {getTensionText(tension)}
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>오븐 환경 (상황 맥락)</div>
            <div className={styles.breakdownVal}>{currentScenario.environment}</div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>핵심 의미평가 (Appraisal)</div>
            <div className={styles.breakdownVal}>{currentScenario.appraisal}</div>
          </div>
        </div>

        <div className={styles.explanationBox}>
          <strong>구성의 원리:</strong> {currentScenario.narrative}
        </div>
      </section>

      {/* Comparison: Same Physical State, Different Emotion */}
      <section className={styles.comparisonSection}>
        <h2 className={styles.comparisonTitle}>💡 핵심 관찰: 왜 신체 지문(Fingerprint)이 아닐까요?</h2>
        <p style={{ color: "var(--muted)", fontSize: "15px", lineHeight: "1.7", margin: "0" }}>
          전통적 관점에서는 "심장이 뛰고 땀이 나면 = 불안"이라는 1:1 고정 지문(fingerprint)이 있다고 믿었습니다.
          그러나 빵 비유가 보여주듯, <strong>동일한 신체 각성</strong>도 맥락에 따라 전혀 다른 감정으로 구워집니다:
        </p>

        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <div className={styles.comparisonCardTitle}>
              <span>🥖 발표 전 크래커</span>
              <span style={{ fontSize: "12px", color: "var(--accent-ink)" }}>위협 평가</span>
            </div>
            <div className={styles.comparisonCardBody}>
              <strong>감정: 불안과 긴장</strong><br />
              심장이 빠르게 뛰는 물리적 각성을 뇌가 "실패할지 모른다"는 위협으로 해석하여 방어 반응을 구성합니다.
            </div>
          </div>

          <div className={styles.comparisonCard}>
            <div className={styles.comparisonCardTitle}>
              <span>🥐 롤러코스터 크루아상</span>
              <span style={{ fontSize: "12px", color: "var(--accent-ink)" }}>놀이/도전 평가</span>
            </div>
            <div className={styles.comparisonCardBody}>
              <strong>감정: 짜릿함과 스릴</strong><br />
              완벽히 동일한 심장 박동과 호흡이지만, "통제된 안전과 유희"라는 레시피가 더해져 즐거움으로 구성됩니다.
            </div>
          </div>

          <div className={styles.comparisonCard}>
            <div className={styles.comparisonCardTitle}>
              <span>🍞 부당한 대우 사워도우</span>
              <span style={{ fontSize: "12px", color: "var(--accent-ink)" }}>침해/공정성 평가</span>
            </div>
            <div className={styles.comparisonCardBody}>
              <strong>감정: 분노와 억울함</strong><br />
              동일한 고각성 상태가 "경계가 부당하게 침범당했다"는 appraisal을 만나 타인을 향한 저항으로 구워집니다.
            </div>
          </div>
        </div>
      </section>

      {/* Observatory Philosophy Connection */}
      <footer className={styles.footerNotes}>
        <strong>감정 관찰실이 이 비유를 품는 이유:</strong><br />
        몸의 떨림이나 두근거림을 느낄 때, "아, 나는 불안한 사람인가 보다"라고 곧바로 단정할 필요가 없습니다.
        신체 감각은 빵을 굽기 위한 <strong>'재료'</strong>일 뿐입니다.
        이 앱의 <strong>Quick Check</strong>에서 몸과 affect를 표시하고, <strong>Granularity Coach</strong>에서 상황 속 appraisal을 탐색하는 이유는
        자신이 어떤 오븐과 레시피로 감정을 굽고 있는지 알아차려, <strong>더 다양한 대처의 선택지(useful granularity)</strong>를 갖도록 돕기 위함입니다.
      </footer>
    </div>
  );
}
