"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./bread.module.css";

/*
 * A design thought experiment around one theoretical position's metaphor
 * (Barrett's constructed emotion view). It never settles a feeling: each
 * example shows a few expressions that could be close, next to "잘 모르겠음",
 * and the body choices never decide the words. Hidden from production builds
 * by page.tsx.
 */

type BreadPreset = {
  id: string;
  name: string;
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
  appraisal: string; // 이 예시에서 중요할 수 있는 것
  /** Expressions that could be close in this example. Never one answer. */
  closeWords: string[];
  breadType: string;
  narrative: string;
};

const SCENARIOS: Record<string, ContextScenario> = {
  speech: {
    id: "speech",
    title: "중요한 발표 직전",
    environment: "수백 명의 청중 앞에서 실수를 용납할 수 없는 평가 상황",
    appraisal: "실패에 대한 위협, 자존감과 평가가 걸려 있음",
    closeWords: ["긴장", "불안", "설렘"],
    breadType: "바짝 마르고 단단한 크래커",
    narrative:
      "이 관점에서는 뛰는 심장과 가쁜 숨이 '평가받는 자리'라는 맥락과 만나면, 위협에 대비하는 신호로 이해될 수 있다고 봅니다.",
  },
  rollercoaster: {
    id: "rollercoaster",
    title: "롤러코스터 꼭대기",
    environment: "놀이공원의 안전장치에 고정되어 하강하기 3초 전",
    appraisal: "안전이 보장된 상황에서의 자발적 모험, 짜릿함의 추구",
    closeWords: ["설렘", "두려움", "즐거움"],
    breadType: "버터 향 가득하고 바삭한 크루아상",
    narrative:
      "예시를 위해 발표 직전과 비슷한 몸 상태로 가정했습니다. 실제 신체 반응은 사람과 상황에 따라 다릅니다. 이 관점에서는 '안전한 놀이'라는 맥락이 같은 두근거림을 다르게 이해하게 할 수 있다고 봅니다.",
  },
  unfairness: {
    id: "unfairness",
    title: "동료의 부당한 성과 가로채기",
    environment: "내가 밤새 작업한 결과물을 동료가 자기 성과로 발표하는 회의실",
    appraisal: "나의 영역과 공정성이 침해당함, 불합리한 피해",
    closeWords: ["억울함", "화남", "답답함"],
    breadType: "산미가 강하고 거칠게 부풀어 오른 사워도우",
    narrative:
      "이 관점에서는 몸의 열감과 긴장이 '공정성이 침해되었다'는 의미와 만나면, 그 상황에 맞서려는 경험으로 이해될 수 있다고 봅니다.",
  },
  quiet_night: {
    id: "quiet_night",
    title: "비 오는 늦은 밤 서재",
    environment: "혼자 따뜻한 조명 아래 책을 읽으며 차를 마시는 시간",
    appraisal: "어떤 요구도 없음, 안전하고 온전한 나의 시간",
    closeWords: ["평온", "안도", "편안함"],
    breadType: "부드럽고 푹신한 밀크 식빵",
    narrative:
      "이 관점에서는 느린 호흡과 풀린 몸이 '쉬어도 되는 시간'이라는 맥락과 만나면, 내려앉는 경험으로 이해될 수 있다고 봅니다.",
  },
  solitude: {
    id: "solitude",
    title: "인적이 끊긴 낯선 방",
    environment: "연락할 사람 없이 혼자 며칠째 방 안에 머무는 상태",
    appraisal: "사회적 연결의 단절, 무기력감, 세상과의 거리",
    closeWords: ["외로움", "허전함", "평온"],
    breadType: "수분이 날아가 묵직하고 푸석한 호밀빵",
    narrative:
      "예시를 위해 서재 장면과 비슷하게 가라앉은 몸 상태로 가정했습니다. 실제 신체 반응은 사람과 상황에 따라 다릅니다. 이 관점에서는 '연결이 끊겼다'는 의미가 더해지면 같은 몸 상태도 다르게 이해될 수 있다고 봅니다.",
  },
};

const PRESETS: BreadPreset[] = [
  {
    id: "high_arousal_compare",
    name: "비교 1: 비슷하게 가정한 들뜬 몸",
    ingredients: { heart: "fast", breathing: "rapid", tension: "tense", temperature: "warm", valence: -0.2, activation: 0.8 },
    contextId: "speech",
  },
  {
    id: "low_arousal_compare",
    name: "비교 2: 비슷하게 가정한 가라앉은 몸",
    ingredients: { heart: "slow", breathing: "deep", tension: "relaxed", temperature: "cool", valence: 0.5, activation: -0.7 },
    contextId: "quiet_night",
  },
];

/** The same example label the Coach uses: a visible word, not a colour. */
function ExampleLabel({ children = "예시" }: { children?: React.ReactNode }) {
  return <span className={styles.exampleLabel}>{children}</span>;
}

/** A few expressions side by side, with room for another word and for not knowing. */
function CloseWords({ words }: { words: string[] }) {
  return <>
    <ul className={styles.wordList}>
      {words.map((word) => <li key={word} className={styles.wordItem}>{word}</li>)}
      <li className={styles.wordItem}>잘 모르겠음</li>
    </ul>
    <p className={styles.wordNote}>여기 없는 다른 말이 더 가까울 수도 있습니다. 여러 말이 함께 가까울 수도 있습니다.</p>
  </>;
}

export default function BreadPrototype() {
  const [heart, setHeart] = useState<"fast" | "moderate" | "slow">("fast");
  const [breathing, setBreathing] = useState<"rapid" | "deep" | "shallow">("rapid");
  const [tension, setTension] = useState<"tense" | "relaxed">("tense");
  const [temperature, setTemperature] = useState<"warm" | "cool">("warm");
  const [valence, setValence] = useState<number>(-0.2);
  const [activation, setActivation] = useState<number>(0.8);

  const [currentContextId, setCurrentContextId] = useState<string>("speech");
  const [activePresetId, setActivePresetId] = useState<string>("high_arousal_compare");

  const currentScenario = SCENARIOS[currentContextId] ?? SCENARIOS.speech;

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

  // body descriptions only; none of them names a feeling
  const getHeartText = (val: string) => (val === "fast" ? "빠름 (쿵쾅거림)" : val === "moderate" ? "보통" : "느림");
  const getBreathingText = (val: string) => (val === "rapid" ? "가쁨 / 얕음" : val === "deep" ? "깊고 고름" : "약하고 잦음");
  const getTensionText = (val: string) => (val === "tense" ? "긴장됨 (목·어깨 굳음)" : "이완됨 (풀림)");
  const getTemperatureText = (val: string) => (val === "warm" ? "열감 / 상열감" : "서늘함");

  return (
    <div className={styles.container}>
      <nav className={styles.navBar}>
        <Link href="/" className={styles.backLink}>
          ← 감정 관찰실로 돌아가기
        </Link>
        <span className={styles.badge}>디자인 사고실험</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>빵 비유로 살펴보기</h1>
        <p className={styles.lead}>
          이 화면은 Lisa Feldman Barrett의 구성된 감정 이론이라는 <strong>하나의 이론적 입장에서 나온 비유</strong>를 옮긴 디자인 사고실험입니다.
          감정이 얼마나 보편적이고 얼마나 구성되는지는 여전히 연구 중입니다. 감정 관찰실은 이 이론을 최종 정답으로 구현하지 않습니다.
        </p>

        <div className={styles.metaphorQuote}>
          이 관점은 이렇게 비유합니다. 같은 밀가루와 물로도 반죽의 비율, 발효, 오븐의 온도, 레시피에 따라 바게트가 되기도 하고 크루아상이 되기도 합니다.
          <br /><br />
          그처럼 심장 박동이나 긴장 같은 몸의 상태도, 지금 처한 상황과 그 상황이 무엇을 뜻하는지(오븐과 레시피)에 따라 다른 경험으로 이해될 수 있다고 봅니다.
          이것은 비유이고, 몸과 감정의 관계를 설명하는 유일한 방법은 아닙니다.
        </div>
      </header>

      <section className={styles.presetSection}>
        <div className={styles.presetTitle}>비교해 볼 예시</div>
        <div className={styles.presetButtons}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`${styles.presetBtn} ${activePresetId === preset.id ? styles.presetBtnActive : ""}`}
              aria-pressed={activePresetId === preset.id}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => setActivePresetId("custom")}
            className={`${styles.presetBtn} ${activePresetId === "custom" ? styles.presetBtnActive : ""}`}
            aria-pressed={activePresetId === "custom"}
          >
            자유 조합 (직접 바꿔 보기)
          </button>
        </div>
      </section>

      <div className={styles.stageGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>STEP 1 · 기본 재료</span>
            <h2 className={styles.cardTitle}>예시로 가정한 몸의 상태</h2>
          </div>
          <p className={styles.wordNote}>
            예시를 위해 단순하게 가정한 값입니다. 실제 신체 반응은 사람과 상황에 따라 다릅니다.
            몸의 상태를 바꿔도 아래의 말은 바뀌지 않습니다. 몸의 상태만으로 감정을 정하지 않기 때문입니다.
          </p>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>심장 박동</span>
            <div className={styles.chipGroup}>
              {(["fast", "moderate", "slow"] as const).map((h) => (
                <button key={h} onClick={() => { setHeart(h); setActivePresetId("custom"); }} className={`${styles.chip} ${heart === h ? styles.chipActive : ""}`} aria-pressed={heart === h}>
                  {getHeartText(h)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>호흡</span>
            <div className={styles.chipGroup}>
              {(["rapid", "deep", "shallow"] as const).map((b) => (
                <button key={b} onClick={() => { setBreathing(b); setActivePresetId("custom"); }} className={`${styles.chip} ${breathing === b ? styles.chipActive : ""}`} aria-pressed={breathing === b}>
                  {getBreathingText(b)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>근육 긴장</span>
            <div className={styles.chipGroup}>
              {(["tense", "relaxed"] as const).map((t) => (
                <button key={t} onClick={() => { setTension(t); setActivePresetId("custom"); }} className={`${styles.chip} ${tension === t ? styles.chipActive : ""}`} aria-pressed={tension === t}>
                  {getTensionText(t)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ingredientGroup}>
            <span className={styles.ingredientLabel}>체온과 에너지</span>
            <div className={styles.chipGroup}>
              {(["warm", "cool"] as const).map((tp) => (
                <button key={tp} onClick={() => { setTemperature(tp); setActivePresetId("custom"); }} className={`${styles.chip} ${temperature === tp ? styles.chipActive : ""}`} aria-pressed={temperature === tp}>
                  {getTemperatureText(tp)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sliderControl}>
            <div className={styles.sliderRow}>
              <span>불쾌함 ↔ 유쾌함</span>
              <span>{valence < -0.2 ? "불쾌한 쪽" : valence > 0.2 ? "유쾌한 쪽" : "가운데"}</span>
            </div>
            <input type="range" min="-1" max="1" step="0.1" value={valence} aria-label="불쾌함과 유쾌함 사이" onChange={(e) => { setValence(parseFloat(e.target.value)); setActivePresetId("custom"); }} className={styles.rangeInput} />
          </div>

          <div className={styles.sliderControl}>
            <div className={styles.sliderRow}>
              <span>가라앉음 ↔ 활성됨</span>
              <span>{activation < -0.2 ? "가라앉은 쪽" : activation > 0.2 ? "활성된 쪽" : "가운데"}</span>
            </div>
            <input type="range" min="-1" max="1" step="0.1" value={activation} aria-label="가라앉음과 활성됨 사이" onChange={(e) => { setActivation(parseFloat(e.target.value)); setActivePresetId("custom"); }} className={styles.rangeInput} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardStep}>STEP 2 · 오븐과 레시피</span>
            <h2 className={styles.cardTitle}>예시 상황과 그 의미</h2>
          </div>

          <p className={styles.wordNote}>같은 몸의 상태를 두고, 어떤 예시 상황에 놓아 볼지 골라 보세요.</p>

          <div className={styles.scenarioList}>
            {Object.values(SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => { setCurrentContextId(scenario.id); setActivePresetId("custom"); }}
                className={`${styles.scenarioBtn} ${currentContextId === scenario.id ? styles.scenarioBtnActive : ""}`}
                aria-pressed={currentContextId === scenario.id}
              >
                <div className={styles.scenarioTitle}>{scenario.title}</div>
                <div className={styles.scenarioDesc}>{scenario.environment}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.ovenResult} aria-labelledby="bread-example-label">
        <ExampleLabel><span id="bread-example-label">예시 · {currentScenario.title}</span></ExampleLabel>
        <div className={styles.bakedTitleArea}>
          <h3>이 예시에서 가까울 수 있는 말</h3>
          <span className={styles.breadNameTag}>비유로 고른 빵: {currentScenario.breadType}</span>
        </div>
        <CloseWords words={currentScenario.closeWords} />

        <div className={styles.resultBreakdown}>
          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>예시로 가정한 몸의 상태</div>
            <div className={styles.breakdownVal}>
              심장 {getHeartText(heart)} · 호흡 {getBreathingText(breathing)} · {getTensionText(tension)}
            </div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>예시 상황</div>
            <div className={styles.breakdownVal}>{currentScenario.environment}</div>
          </div>

          <div className={styles.breakdownItem}>
            <div className={styles.breakdownLabel}>이 예시에서 중요할 수 있는 것</div>
            <div className={styles.breakdownVal}>{currentScenario.appraisal}</div>
          </div>
        </div>

        <div className={styles.explanationBox}>
          <strong>이 관점의 설명:</strong> {currentScenario.narrative}
        </div>
      </section>

      <section className={styles.comparisonSection}>
        <h2 className={styles.comparisonTitle}>비슷한 몸, 다른 상황</h2>
        <p className={styles.wordNote}>
          몸에는 정서와 관련된 정보와 일정한 규칙성이 있을 수 있습니다. 다만 단일 지표나 고정된 패턴으로 한 사람의 감정을 확정하지는 않습니다.
          아래 세 예시는 비슷한 들뜬 몸 상태를 가정하고, 상황에 따라 가까울 수 있는 말이 어떻게 달라질 수 있는지 나란히 놓은 것입니다.
        </p>

        <div className={styles.comparisonGrid}>
          {(["speech", "rollercoaster", "unfairness"] as const).map((id) => {
            const scenario = SCENARIOS[id];
            return (
              <div className={styles.comparisonCard} key={id}>
                <div className={styles.comparisonCardTitle}>
                  <ExampleLabel />
                  <span>{scenario.title}</span>
                </div>
                <div className={styles.comparisonCardBody}>
                  <strong>가까울 수 있는 말</strong>
                  <CloseWords words={scenario.closeWords} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className={styles.footerNotes}>
        <strong>이 화면에 대해:</strong><br />
        이 화면은 디자인 사고실험입니다. 빵 비유가 감정 관찰실의 화면 설계에 쓸모가 있는지 살펴보기 위한 시안이며, 사용자의 감정을 판정하지 않습니다.
        몸의 두근거림을 느낄 때 그것이 무엇인지 곧바로 정하지 않아도 된다는 생각을 비유로 옮겨 본 것입니다.
        이 화면이나 앱이 어떤 도움을 주는지는 검증되지 않았습니다.
      </footer>
    </div>
  );
}
