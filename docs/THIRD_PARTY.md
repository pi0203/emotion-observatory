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
| @supabase/supabase-js (claude/login-sync 가지만, 2026-11-02) | ^2.118.0 | 2.118.0 | MIT |

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

## 6. 로그인 버튼의 로고 (claude/login-sync 가지만, 2026-11-02)

미리보기 가지의 「다른 기기에서도 보기」 버튼에 그리는 로고. 파일을 내려받지 않고 `app/login-logos.tsx`에 SVG 경로로 넣었다.
로고는 각 회사의 상표다. 모양의 출처와 별개로, 쓰는 방법은 각 회사의 로그인 버튼 안내를 따라야 한다.

| 로고 | 모양을 가져온 곳 | 조건 | 남은 일 |
|---|---|---|---|
| Google G (네 색) | Google 로그인 버튼(Sign in with Google)의 G 로고 경로. Claude가 기억으로 옮겨 적었고, 공식 파일과 대조하지 않았다 | 상표. Google 브랜딩 안내를 따름 | 확인 필요: Google이 내주는 버튼 자료와 대조 |
| 카카오 말풍선 | Simple Icons 13.21.0의 `kakaotalk` 아이콘 안쪽 말풍선 경로(CC0-1.0, `npm pack simple-icons@13`으로 확인) | 아이콘 자료는 CC0. 상표는 카카오의 것 | 확인 필요: 카카오 로그인 디자인 가이드의 공식 심볼로 바꾸기 |
| 네이버 N | Simple Icons 13.21.0의 `naver` 아이콘(CC0-1.0) | 아이콘 자료는 CC0. 상표는 네이버의 것 | 확인 필요: 네이버 로그인 버튼 공식 자료로 바꾸기(네이버 검수에서 버튼을 봄) |
| Apple | Simple Icons 13.21.0의 `apple` 아이콘(CC0-1.0) | 아이콘 자료는 CC0. 상표는 Apple의 것 | 확인 필요: Apple의 Sign in with Apple 버튼 자료로 바꾸기 |

버튼 색과 문구도 Claude가 기억하는 각 회사 안내를 따른 것이다(구글: 흰 바탕·회색 테두리, 카카오: #FEE500 바탕·검은 글자 85%, 네이버: #03C75A 바탕·흰 글자, Apple: 검은 바탕·흰 글자). 2026-11-02에 공식 안내 문서와 대조하지 않았다. 운영 공개 전에 각 회사의 현재 안내와 대조한다.

