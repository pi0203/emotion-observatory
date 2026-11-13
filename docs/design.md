# 감정 관찰실 화면 규칙 (design.md)

언제 읽나: 색·글꼴·여백·단추·화면 문구를 손볼 때. 값의 기준은 app/globals.css와 app/fonts.ts다. 이 파일과 코드가 다르면 코드가 맞다.
안전 규칙은 이 파일에 옮기지 않는다. 위기·중단·안내는 SAFETY.md와 PRODUCT_SPEC §9·§10을 따른다. (SAFETY.md:1, PRODUCT_SPEC.md:1064, 1152)

각 줄 끝 괄호가 출처(파일:줄)다. 「시험이 지킴」은 그 규칙을 어기면 실패하는 시험이다.
작성일 2026-11-13, main e791a8f 기준.

## 1. 화면이 하는 일
- 복잡성을 없애지 않고, 복잡성에 도달하는 순서를 설계한다. (PRODUCT_SPEC.md:1847)
- 첫 화면은 질문 하나, 한 화면은 한 과제. (PRODUCT_SPEC.md:1851-1852)
- 깊은 개념은 필요할 때만, 전체 감정 어휘는 「더 보기」 뒤에. (PRODUCT_SPEC.md:1853-1854)
- 기록·패턴은 지금 하는 성찰과 떼어 둔다. 첫 화면에 대시보드 밀도를 두지 않는다. (PRODUCT_SPEC.md:1855-1856)
- 여백은 넉넉하게, 장식 부품보다 글자 위계가 먼저. (PRODUCT_SPEC.md:1857-1858)
- 하는 일, 하지 않는 일, 묻는 이유, 멈출 때, 개인정보를 화면에서 분명히 말한다. (PRODUCT_SPEC.md:1929-1934)
- 영화 미학 출처는 영감일 뿐, 안전 안내를 숨기거나 늦추는 데 쓰지 않는다. (PRODUCT_SPEC.md:1912-1914)

## 2. 틀
- 첫 화면, 지난 기록, 기록 상세에는 홈페이지 머리말·메뉴·꼬리말. (docs/DESIGN_ALIGNMENT.md:235, app/globals.css:285) 시험이 지킴: tests/design-shell.test.tsx
- 풀이 중 화면은 앱 이름, 「한 단계 뒤로」, 「그만하기」, 진행 막대만. (docs/DESIGN_ALIGNMENT.md:236) 시험이 지킴: tests/design-shell.test.tsx
- 그만했을 때는 최소 틀. (docs/DESIGN_ALIGNMENT.md:237) 시험이 지킴: tests/design-shell.test.tsx
- 틀의 색은 --site-* 토큰만 쓴다(홈페이지 값). 앱 색이 틀을 다시 칠하지 않는다. (app/globals.css:286-287, 32-35)
- 틀의 링크는 24x24px 이상. (app/globals.css:287)
- 로고 글자 「Eunchan Joe」만 Instrument Serif 400, 1.3rem, 자간 .01em. (app/fonts.ts:12-14, app/globals.css:62, 295, 302) 시험이 지킴: tests/design-fonts.test.ts, tests/design-shell.test.tsx

## 3. 색
- 팔레트: 옅은 파랑 바탕에 코랄 한 점(2026-10-12 본인 결정). (app/globals.css:5)
  - PRODUCT_SPEC §19의 옛 형광 연두 표는 기록으로만 남아 있다. 화면은 파랑. (PRODUCT_SPEC.md §19 Palette)
- 파랑은 누르는 것, 진행 막대, 고른 항목의 바탕, 구역 이름에. (app/globals.css:7-8)
- 코랄은 고른 항목 아래 3px 선에만. 글자·넓은 면에는 쓰지 않는다. 접힘 제목 앞 작은 색 점은 단계 색이고 코랄이 아니다. (app/globals.css:8-9, docs/DESIGN_ALIGNMENT.md:370) 시험이 지킴: tests/design-tokens-contrast.test.ts:171
- 주요 값: --accent #4A5C9A, --ink #1B2340, --muted #47506E, --paper #E5EAF4, --card #F6F8FC. (app/globals.css:15, 21-22, 25-26) 시험이 지킴: tests/design-tokens-contrast.test.ts:148
- 고른 항목 아래 선 --pick-underline #FF7A52. (app/globals.css:31) 시험이 지킴: tests/design-tokens-contrast.test.ts:148
- 조작 요소 경계는 --line-strong #7884A8(paper 위 3.07:1). 구분선은 --line #C5CEE3. (app/globals.css:23-24)
- 예시 구역 바탕 --warm #ECF0F7은 노랑·코랄 없이 차분한 파랑 기운. (app/globals.css:27)
- 기록 출처 세 색(mine·app·later)은 선 모양(실선·점선·이중선)과 글 라벨을 함께 쓴다. (app/globals.css:42-46, PRODUCT_SPEC.md:1672)
- 단계마다 바탕(blue·lilac·mint·peach·butter·mist). 바뀌는 것은 --paper, --card, --line뿐. (docs/DESIGN_ALIGNMENT.md:367, app/globals.css:533-538)
- 색은 단계를 따르고 답을 따르지 않는다. (docs/DESIGN_ALIGNMENT.md:368)
- 붉은 경고색은 쓰지 않는다. 위기 카드에도 경고색·아이콘 없음. (app/globals.css:49, 193) 시험이 지킴: tests/crisis-card.test.tsx:120-131
- 낱말 카드에 감정마다 색을 주지 않는다. (app/globals.css:360)
- 바탕색 고르기(2026-11-13): 파랑(기본)·세이지·블러시·라일락, 같은 토큰 이름에 다른 값. (app/globals.css:13-14, 68-89)
  - docs/DESIGN_ALIGNMENT.md §9(2026-10-11 감사)는 바탕 고르기 단추를 가져오지 않는다고 적었다. 지금 코드는 고르기가 있다. (docs/DESIGN_ALIGNMENT.md:336)
- 어두운 화면은 기기 설정만 따른다. 전환 단추 없음. (app/globals.css:92)
- 어두운 화면에서는 바탕 고르기를 감춘다. (app/globals.css:66, 132)
- 어두운 기기에서 /words를 인쇄하면 밝은 토큰으로 돌아간다. (app/globals.css:137-140)

## 4. 대비와 상태 표시
- 본문·보조 글자 4.5:1, 조작 요소 경계·초점 3:1. (PRODUCT_SPEC.md:1918, CONTRIBUTING.md:53) 시험이 지킴: tests/design-tokens-contrast.test.ts
- 밝은·어두운, 모든 단계 바탕과 고르기 바탕에서 시험이 토큰으로 계산한다. (tests/design-tokens-contrast.test.ts:6-11, app/globals.css:71, docs/DESIGN_ALIGNMENT.md:372)
- 선택 상태는 색만으로 알리지 않는다(✓가 상태를 알린다). (CONTRIBUTING.md:54, app/globals.css:29, 31)
- hover·focus·pressed를 모두 구분한다. 초점은 :focus-visible 2px 테두리. (PRODUCT_SPEC.md:1882, app/globals.css:154)
- 예시 구역 안의 작은 글자는 --muted 대신 --ink. (PRODUCT_SPEC.md:1905, app/globals.css:276-278)

## 5. 글꼴과 글자
- 글자와 조작 요소 Noto Sans KR 400, 제목 Noto Serif KR 400. 500은 싣지 않는다. (app/fonts.ts:3-6, 16-17) 시험이 지킴: tests/design-fonts.test.ts
- 글꼴은 빌드 때 받아 이 사이트에서 낸다. 방문자 브라우저가 Google에 닿지 않는다. (app/fonts.ts:7-9)
- 영어 화면도 같은 두 글꼴. 영어 전용 글꼴 없음. (app/fonts.ts:10) 시험이 지킴: tests/design-fonts.test.ts
- 크기 5단계: 13px(곁글, 모든 글자의 바닥), 14px, 16px, 1.6rem(구역 제목), clamp(2.25rem, 6vw, 3.2rem)(화면 제목). (app/globals.css:57-61) 시험이 지킴: tests/design-fonts.test.ts
- 제목은 굵기 400. (app/globals.css:172-173)
- 한글은 낱말 안에서 끊지 않고, 끊을 곳 없는 문자열은 어디서든 줄을 바꾼다. 제목은 balance. (app/globals.css:253-258, PRODUCT_SPEC.md:1888-1890)
- 전화번호는 줄을 넘기지 않는다. (app/globals.css:200)

## 6. 부품
- 주요 단추 최소 높이 52px, 모서리 12px. 작은 단추 38px. (app/globals.css:179, 189)
- 비상 안내 줄은 본문 색, 숫자만 굵게. (app/globals.css:193-195)
- 「도움」 링크는 모든 카드와 기록 맨 위의 같은 구석에. 카드 단추 안에 넣지 않는다. (app/globals.css:236)
- 「멈춰도 됩니다」 줄은 경고색 없는 보조 글자. (app/globals.css:175-176)
- Coach 세 구역(예시·내 선택·참고 설명)은 라벨과 경계로 구분한다. accent는 쓰지 않는다. (PRODUCT_SPEC.md:1896-1904)

## 7. 움직임
- 강제 대기, 자동 진행, 새 애니메이션을 넣지 않는다. (CONTRIBUTING.md:56)
- 움직임 줄이기 설정에서는 전환과 스크롤을 즉시로. (app/globals.css:262-265, PRODUCT_SPEC.md:1891)
- 단계 바탕이 바뀌는 0.5초 전환도 움직임 줄이기에서 끈다. (app/globals.css:539-540)

## 8. 홈페이지에서 가져오지 않는 것
- 꽃 무늬 배경과 풀꽃 띠, 3D 책장 같은 장식, 펼침·뒤집힘 효과. (docs/DESIGN_ALIGNMENT.md:332-335)

## 9. 화면 문구
- 말투: 차분하게, 임상적이지 않게, 가르치지 않게, 짧게, 허락을 구하며. (PRODUCT_SPEC.md:1815-1821)
- 피할 말: 「정상입니다」, 「감정을 통제하세요」, 「부정적인 감정」, 「당신은 ~형입니다」. (PRODUCT_SPEC.md:1823-1828)
- 영어판은 상담자 어투(「I notice …」)를 쓰지 않고 주어를 사용자가 적은 것에 둔다. (PRODUCT_SPEC.md:1830-1832)
- 쓰는 말: 「가까운 표현」, 「잘 모르겠음」, 「여기까지 해도 됩니다」. (PRODUCT_SPEC.md:1834-1839)
