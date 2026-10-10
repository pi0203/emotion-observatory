# 글, 어휘, 설계 문서의 라이선스

감정 관찰실의 글, 어휘, 설계 문서는 **크리에이티브 커먼즈 저작자표시 4.0 국제(CC BY 4.0)** 라이선스로 제공한다.
누구나 출처를 밝히면 복제, 배포, 수정, 2차적 이용을 할 수 있다(상업적 이용 포함).

- 공식 라이선스 전문: https://creativecommons.org/licenses/by/4.0/legalcode
- 출처 표시 예: "감정 관찰실 contributors, CC BY 4.0"

코드는 [MIT 라이선스](LICENSE)다. 저작권 표시("감정 관찰실 contributors")는 소유를 주장하기 위한 것이 아니라,
출처와 기여를 추적하고 라이선스 조건을 지키기 위한 표시다.

## 적용 범위

| 경로 | 라이선스 | 메모 |
|---|---|---|
| `docs/` 안의 문서 | CC BY 4.0 | 아래 「제외」를 볼 것 |
| 루트의 `*.md` 문서 (`README.md`, `PROJECT_CONTEXT.md`, `PRODUCT_SPEC.md`, `SAFETY.md`, `CONTRIBUTING.md`, 이 문서) | CC BY 4.0 | `AGENTS.md`, `CLAUDE.md`는 아래 「확인 필요」 |
| `data/*.json`의 문구와 어휘 | CC BY 4.0 | 감정 어휘, 몸 감각, 질문과 안내 문구, 예시 상황. 앱 코드가 이 파일을 읽어 쓰지만, 담긴 내용은 글과 어휘로 본다 |
| `.github/ISSUE_TEMPLATE/`의 안내 문구 | CC BY 4.0 | |
| `app/`, `lib/`, `tests/`, `scripts/` | MIT | 코드 안에 들어 있는 화면 문구와 시험 속 문구도 그 파일의 일부로 MIT를 따른다. 같은 문구가 문서에도 있으면 문서 쪽은 CC BY 4.0이다 |
| 설정 파일 (`package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vercel.json`) | MIT | |

MIT 원문은 "associated documentation files"를 소프트웨어에 포함한다. 이 저장소에서는 위 표에서 CC BY 4.0으로 적은 글과 어휘를 MIT가 아니라 CC BY 4.0으로 제공한다.

## 제외

- **인용한 원문:** 문서 안에 짧게 인용한 논문, 책, 인터뷰 문장은 원저작자에게 권리가 있다. CC BY 4.0은 이 저장소에서 새로 쓴 글에만 적용된다.
- **제3자 자료:** 의존성 패키지(`node_modules/`)는 각자의 라이선스를 따른다. [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)를 볼 것.
- **저장소에 넣지 않는 것:** 논문 PDF(`papers/`, 추적하지 않음), 외부 한국어 정서 점수 자료, 디자인 참고 이미지는 이 저장소에 없고 이 라이선스의 대상이 아니다.

## 확인 필요

- `AGENTS.md`의 본문은 Next.js 개발 도구(`next dev`)가 자동으로 써 넣는 문구다. 이 저장소에서 쓴 글이 아니므로 CC BY 4.0을 적용할 수 있는지 **확인 필요**. `CLAUDE.md`는 그 파일을 가리키는 한 줄이다.
- 이 저장소가 수업 과제나 학교 지원으로 만든 결과물에 해당하는 경우, 학교 규정이 라이선스 선택에 영향을 주는지 **확인 필요(공개를 막지는 않음)**. 확인 결과 고칠 것이 있으면 그때 고친다([docs/PUBLISHING_CHECKLIST.md](docs/PUBLISHING_CHECKLIST.md)).
