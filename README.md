# 감정 관찰실

몸의 상태·상황·의미·감정 개념을 구별해보는 local-first self-monitoring web app입니다.
감정을 판정하지 않고, 구별할 수 있는 선택지를 넓히는 것이 목적입니다.

빠르게 시작하고, 필요할 때만 깊어집니다.

```text
Quick Check (10~30초)        기본 진입
  affect 한 번 탭 → 가까울 수도 있는 말 3~5개 → 여기까지
    ├─ Granularity Coach     선택 · 상황 예시로 비슷한 말을 비교
    └─ Deep Reflection       선택 · Body → Affect → Context → Meaning → Emotion → Outcome
```

한 순간의 관찰은 깊이와 무관하게 **하나의 기록**입니다. Quick Check를 마친 뒤 더 들여다보기로
하면 같은 기록을 이어서 씁니다. 두 번의 affect 평가는 서로 덮어쓰지 않고 함께 남습니다.

감정 후보는 연구·검토 전의 임시 UI fixture이며, 앱은 사용자의 “진짜 감정”을 추론하거나 진단하지 않습니다.
기록은 이 기기의 localStorage에만 저장되며, 암호화된 저장소가 아닙니다.

설계 원칙과 데이터 모델은 [PRODUCT_SPEC.md](PRODUCT_SPEC.md), 안전 경계는 [SAFETY.md](SAFETY.md)를 참고하세요.

## Run

```bash
npm install
npm run dev
```
