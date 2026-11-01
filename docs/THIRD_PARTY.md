# 제3자 자료

이 저장소가 쓰거나 언급하는 남의 자료와 그 조건. 확인한 것만 적고, 확인하지 못한 것은 "확인 필요"로 둔다.

## 1. 직접 의존성 (`package.json`)

확인 방법(2026-10-10): 설치된 `node_modules/<패키지>/package.json`의 `license` 필드를 읽었다.
이것은 각 패키지가 **스스로 밝힌 라이선스**이고, 하위 의존성 전체를 감사한 것은 아니다.

**앱 실행에 쓰는 것 (dependencies)**

| 패키지 | `package.json`의 범위 | 설치된 버전 | 밝힌 라이선스 |
|---|---|---|---|
| next | 16.3.5 | 16.3.5 | MIT |
| react | 19.2.0 | 19.2.0 | MIT |
| react-dom | 19.2.0 | 19.2.0 | MIT |

**개발과 시험에만 쓰는 것 (devDependencies)**

| 패키지 | `package.json`의 범위 | 설치된 버전 | 밝힌 라이선스 |
|---|---|---|---|
| @testing-library/jest-dom | ^6.6.3 | 6.9.1 | MIT |
| @testing-library/react | ^16.1.0 | 16.3.3 | MIT |
| @testing-library/user-event | ^14.5.2 | 14.6.7 | MIT |
| @types/node | ^22.10.2 | 22.20.4 | MIT |
| @types/react | ^19.0.2 | 19.3.0 | MIT |
| @types/react-dom | ^19.0.2 | 19.3.0 | MIT |
| jsdom | ^25.0.1 | 25.0.1 | MIT |
| typescript | ^5.7.2 | 5.9.3 | Apache-2.0 |
| vitest | ^2.1.8 | 2.1.9 | MIT |

- 하위 의존성(전이 의존성)의 라이선스: **확인 필요**. 배포되는 결과물에 어떤 하위 패키지가 들어가는지와 그 라이선스는 따로 조사하지 않았다.
- 의존성 패키지는 이 저장소에 포함하지 않는다(`node_modules/`는 추적하지 않는다). 설치할 때 각 패키지의 조건을 따른다.

## 2. 논문과 책

- 문서에 적은 논문과 책은 **참고 문헌**이다. 서지와 짧은 인용(쪽수 포함)만 적고, 원문을 재배포하지 않는다.
- 논문 PDF는 검토용으로 로컬 `papers/` 폴더에만 두며, 이 폴더는 추적하지 않는다(`.gitignore`). 커밋 이력에도 들어간 적이 없다([PUBLISHING_CHECKLIST.md](PUBLISHING_CHECKLIST.md)).
- 인용한 문장의 권리는 원저작자에게 있다. 이 저장소의 CC BY 4.0은 새로 쓴 글에만 적용된다([LICENSE-DOCS.md](../LICENSE-DOCS.md)).

## 3. 한국어 정서 점수 자료

- 한국어 감정 단어의 정서가(valence)와 각성(arousal) 평정 자료는 **현재 이 저장소에 포함되어 있지 않다.** 어휘의 `normStatus`는 모두 `"provisional"`이다([NORMS.md](NORMS.md)).
- `scripts/audit-norms.mjs`는 사용자가 따로 내려받은 파일을 로컬 경로로 읽어 겹치는 정도만 보고하며, 저장소에 아무것도 복사하지 않는다.
- 나중에 연결하려면 [NORMS.md](NORMS.md)의 확인 사항을 먼저 따른다. 통합 저장소의 라이선스가 원자료 재배포 권리를 보장하지 않으며, 원 연구마다 조건을 확인해야 한다.

## 4. 디자인 참고 자료

- 디자인 참고 이미지와 다른 서비스의 화면은 저장소에 넣지 않는다.
- 영화 미학 논문 등에서 얻은 설계 영감은 [AESTHETIC_SOURCES.md](AESTHETIC_SOURCES.md)에 출처로만 적는다.

## 5. 표준국어대사전(국립국어원)

- 쓰는 곳: 어휘의 `expressions` 칸([`data/emotions.ko.json`](../data/emotions.ko.json))과 단어 고르기 화면의 「이렇게도 말해요」(2026-11-01). 단어별 표현과 사전 위치는 [vocab-sources/EXPRESSIONS_2026_11_01.md](vocab-sources/EXPRESSIONS_2026_11_01.md)에 있다.
- 쓰는 것: 표현 이름과 사전 위치(표제어, 뜻 번호, word_no)만. 뜻풀이와 용례 문장은 옮기지 않는다.
- 라이선스: CC BY-SA 2.0 KR. 사전 누리집 「저작권 정책」에서 2026-11-01에 확인했다.
- 화면 표기: 「표준국어대사전에 실린 표현이에요.」

## 6. 몸 그림 (`public/body-figure/`, 2026-10-31, 2026-11-01 선화로 바꿈)

- 그림: BodyParts3D(© DBCLS, CC BY 4.0)와 MakeHuman(CC0) 3D 모형을 선으로 다시 그린 선화. 폐는 「숨과 자세」 3D 자료용으로 따로 만든 모형. 출처·라이선스·손본 것은 [BODY_FIGURE_SOURCES.md](BODY_FIGURE_SOURCES.md)에 있다.
- BodyParts3D 표기(CC BY 4.0): 「BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International」. 앱의 그림 아래에는 출처 줄과 CC BY 4.0 라이선스 링크를 둔다.
- 화면 출처 줄은 표기 문장을 글자 그대로 담는다(본인 2026-11-01). BodyParts3D 라이선스 페이지(https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html, 2025-02-27 갱신)가 이 문장으로 표기하라고 정했고, 고쳐 만든 것을 배포할 때도 정한 방식대로 표기하라고 적었기 때문이다.
- 파일 8장(체형 2 × 몸 1 + 장기 3), 투명 바탕 WebP. 실행 중에 바깥 주소를 부르지 않는다. 레이어·누르는 자리·기본값은 [`data/body-figure.json`](../data/body-figure.json)에 있다.
- 2026-10-31~11-01에 쓴 Mikael Häggström 그림(Wikimedia Commons, 퍼블릭 도메인)과 실사·단색 표현은 2026-11-01에 뺐다.
