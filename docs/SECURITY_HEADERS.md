# 응답 헤더와 공격 표면 (2026-10-19)

기록이 서버가 아니라 각자의 브라우저(localStorage)에만 있으므로, 이 앱에서 공격자가 노릴 수 있는 것은 하나다:
**이 origin에서 실행되는 스크립트가 기록을 읽어 다른 곳으로 보내는 것.** 아래 설정은 그 길을 좁힌다. 설정은 `next.config.ts`의 `headers()`에 있다.

| 헤더 | 값 | 막는 것 |
|---|---|---|
| `Content-Security-Policy` `connect-src 'self'` | 자기 origin만 | 스크립트가 끼어들어도 기록을 외부 서버로 보낼 수 없다. 앱은 원래 네트워크 요청을 하지 않는다 |
| `Content-Security-Policy` `frame-ancestors 'self' https://eunchanjoe.vercel.app` | 이 사이트와 홈페이지만 | 다른 사이트가 이 앱을 투명하게 겹쳐 놓고 버튼을 누르게 하는 것(clickjacking). 홈페이지 통합 선택지를 열어 두기 위해 홈페이지는 허용 |
| `Content-Security-Policy` `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | | 플러그인 삽입, `<base>` 바꿔치기, 폼을 다른 곳으로 제출 |
| `X-Content-Type-Options` | `nosniff` | 브라우저가 파일 내용을 보고 스크립트로 추측 실행하는 것 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | DOI·상담 전화 링크를 누를 때 상대 사이트에 경로가 넘어가는 것(origin만 전달) |
| `Permissions-Policy` | 카메라·마이크·위치·결제·USB 끔 | 쓰지 않는 기기 기능을 명시적으로 닫음 |
| `X-Frame-Options` | `SAMEORIGIN` | `frame-ancestors`를 모르는 오래된 브라우저용 보조 |
| `X-Powered-By` | 제거 | 프레임워크 버전 힌트 |

## 일부러 하지 않은 것

- **nonce 기반 strict CSP.** 요청마다 nonce를 만들려면 첫 화면을 미리 만들어 둘 수 없고(dynamic rendering) 매 요청을 서버에서 그린다. 지금은 `script-src 'self' 'unsafe-inline'`으로 Next의 hydration 인라인 스크립트를 허용한다. 서버 저장(로그인 Phase 2)을 붙이는 시점에 다시 본다.
- **개발 서버**에서는 `'unsafe-eval'`과 `ws:`를 더한다. React 디버그 정보와 HMR이 필요하다. 운영에는 들어가지 않는다.

## 함께 고친 것

- Next.js 16.3.5 → 16.4.2. 개발 서버 MCP 엔드포인트 정보 노출, SSG 캐시 오염, `next/og` RCE 등 7건의 advisory가 16.3.8 미만에 해당했다(`npm audit`, 2026-10-19).
- 직접 적는 칸에 길이 상한을 두었다(`lib/limits.ts`: 단어 500, 한 줄 1,000, 서술 4,000자). 상한이 없으면 한 번의 붙여넣기로 저장 공간이 차거나 화면이 깨졌다. 2026-10-31에 40/200/1,000자에서 올렸다. 「내 말로 적기」에서 40자가 문장을 잘랐기 때문이다. 직접 칠 때는 닿지 않고, 통째 붙여넣기만 막는 안전망이다.
- localStorage 쓰기가 거부될 때(용량 초과, 저장 차단) 앱이 멈추지 않고 "저장하지 못하고 있습니다" 안내를 보인다(`lib/storage.ts`의 `writeJson`, `common.saveFailed`).

## 남아 있는 것

- `vitest` 2.x의 advisory(개발 전용: UI 서버 파일 읽기, path traversal). 운영 코드에 들어가지 않는다. vitest 5로 올리는 것은 별도 작업.
- 기록은 여전히 암호화되지 않는다. 같은 기기·브라우저를 쓰는 사람은 볼 수 있다. 화면의 안내 그대로다.
