# 벤치마크: 지피디아 불면 자가진단 페이지 (2026-10-19)

비교 대상: https://jeepedia.com/psychology-test/insomnia-ais/ (8문항 선별 도구 페이지).
이 앱과 목적이 다르다(저쪽은 점수·구간, 이쪽은 판정 없는 탐색). 그래서 **점수 구간·결과 공유 URL·"함께 보기" 검사 목록은 가져오지 않았다** (PROJECT_CONTEXT §10, §12).

## 저쪽에 있고 이쪽에도 이미 있던 것

첫 화면 상단의 저장 안내("이 기기에만 저장"), 비의료 고지, 위기 연락처 카드(109 · 1577-0199 · 1388), "이 검사에 대하여"와 참고 문헌(각 연구의 한계까지), 자주 묻는 질문.

## 저쪽에 있고 이쪽에 없어서 가져온 것

| 저쪽 | 이쪽에 넣은 것 |
|---|---|
| 문항 8개 미리 보기 | 「어떤 질문이 나오나요 · 미리 보기」 — 빠르게 2단계, 천천히 6단계의 실제 질문을 각 단계가 쓰는 같은 문구에서 가져와 보여준다 (`PREVIEW_QUICK`, `PREVIEW_DEEP`) |
| OG 이미지·canonical·robots·sitemap | `app/opengraph-image.png`(1200×630, 앱 색과 글꼴), `app/icon.svg`(파비콘), `app/robots.ts`, `app/sitemap.ts`, `metadataBase`와 canonical. 링크를 카카오톡 등에 붙일 때 미리보기가 생긴다 |

## 이쪽이 더 나은 것 (유지)

- 글꼴을 자기 서버에서 낸다(저쪽은 jsDelivr CDN에서 받아 방문 사실이 제3자에 남는다).
- 보안 응답 헤더(저쪽은 없음). [SECURITY_HEADERS.md](SECURITY_HEADERS.md).
- 참고 문헌에 "무엇을 밝혔나"뿐 아니라 "어디까지만 말할 수 있나"를 함께 적는다.

## 가져오지 않은 것과 이유

- **점수와 구간.** 이 앱은 측정 도구가 아니다(P3, §12).
- **결과 페이지 URL에 총점 넣기.** 공유할 결과가 없고, URL에 기록이 들어가면 주소창·히스토리·리퍼러로 샌다.
- **JSON-LD `MedicalWebPage`.** 의료 페이지가 아니다. 구조화 데이터는 나중에 `WebApplication` 정도로만 검토.
- **"함께 보기" 다른 검사 목록.** 검사 목록이 없다.

## 개발 환경에서 발견한 것

- Node 25+에서는 `localStorage` 전역이 `--localstorage-file` 없이 `undefined`로 존재해 vitest의 jsdom이 자기 Storage를 넣지 못한다 → 테스트 152개 실패. `vitest.config.ts`에서 워커에 `--no-experimental-webstorage`를 넘겨 해결(플래그를 아는 Node에서만).
- 프로젝트 폴더 이름의 따옴표(`Thinking 'bout emotion`)가 Next의 webpack metadata 로더를 깨뜨린다(경로를 작은따옴표 문자열에 그대로 넣음). Turbopack(기본)과 Vercel에서는 문제없다. 로컬에서 `--webpack`으로 빌드할 일이 있으면 따옴표 없는 경로에서 한다.
