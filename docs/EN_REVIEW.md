# 영어 문장 검토 목록

본인이 읽고 정할 영어 문장을 한 줄씩 올린다. 상태는 「검토 전」 → 「확인」(그대로) 또는 「고침」(바꾼 문장을 옆에 적음).
2026-10-19의 전체 검토는 [EN_REVIEW_2026_10_19.md](EN_REVIEW_2026_10_19.md)에 따로 있다.

- 화면에서는 검토 전 문장이 있는 칸 끝에 작은 한 줄 「Draft, not yet reviewed by the author.」가 붙는다(`enOnly.draftNote`, `.draft-note`). 영어 화면에만 나온다.
- 한 칸의 문장을 모두 확인하면, 그 칸의 `draftNote`를 빼고 이 표의 상태를 바꾼다. 시험 `tests/en-landing-drafts.test.tsx`가 표와 화면을 함께 본다.

## 2026-11-10 · 영어 첫 화면에 새로 둔 세 칸 (초안)

한국어 첫 화면에만 있던 세 가지를 영어에도 두었다. 뜻은 한국어와 같게 했고, 새 주장이나 약속은 더하지 않았다. 더한 것은 「한국어로 된 쪽」이라는 사실 하나뿐이다(단어 목록과 뇌 지도는 한국어만 있다).

| # | 칸 | 키 | 한국어 | 영어 초안 | 상태 |
|---|---|---|---|---|---|
| 1 | 공통 | `enOnly.draftNote` | (없음, 영어에만) | Draft, not yet reviewed by the author. | 검토 전 |
| 2 | 상담·수련 칸 | `enOnly.practitioner.summary` | 상담·수련 현장에서 보시는 분께 | For those using this in counseling or clinical training | 검토 전 |
| 3 | 상담·수련 칸 | `enOnly.practitioner.lines[0]` | 이 도구는 성인이 스스로 쓰는 자기관찰 도구입니다. 상담에서 함께 쓰신다면, 내담자가 자기 기기에서 직접 고르고 적게 해 주세요. 기록을 대신 적거나 평가 자료로 쓰도록 만들지 않았습니다. | This is a self-observation tool for adults to use on their own. If you use it in counseling, please have the client choose and write on their own device. It was not made for someone else to fill in an entry for them or to be used as assessment material. | 검토 전 |
| 4 | 상담·수련 칸 | `enOnly.practitioner.lines[1]` | 적은 내용은 이 기기 밖 어디로도 보내지지 않습니다. 기관의 공용 기기에서 썼다면 마친 뒤 「지난 기록」에서 「이 기기의 기록 모두 지우기」를 눌러 주세요. | Nothing written here is sent anywhere off this device. If it was used on a shared device at an institution, please go to “Past entries” afterward and press “Delete all entries on this device.” | 검토 전 |
| 5 | 상담·수련 칸 | `enOnly.practitioner.lines[2]` | 두 사람 이상이 함께 쓸 때는 한 사람에 기기 하나를 권합니다. 한 화면에서 함께 고르면, 내 느낌보다 옆 사람의 반응에 맞춰 고르게 되기 쉽습니다. | When two or more people use it together, one device per person is recommended. Choosing together on one screen, it is easy to end up choosing by the other person’s reaction rather than your own feeling. | 검토 전 |
| 6 | 상담·수련 칸 | `enOnly.practitioner.mailBefore` | 단어 목록, 문장, 안전 안내에서 개선이 필요한 곳이 있으면 (메일 주소) | If the word list, the wording or the safety information needs improving anywhere, please write to (mail address) | 검토 전 |
| 7 | 상담·수련 칸 | `enOnly.practitioner.mailAfter` | 으로 알려 주세요. 내담자 정보나 사례는 적지 말아 주세요. | . Please do not include client information or case details. | 검토 전 |
| 8 | 단어 목록 링크 | `enOnly.practitioner.wordsLink` | 단어 목록 보기 → | See the word list (in Korean) → | 검토 전 |
| 9 | 뇌 지도 줄 | `about.atlasLead` | 몸과 뇌가 감정과 어떻게 이어지는지, 교과서와 연구가 어디까지 말하고 어디서 의견이 갈리는지는 만든 사람의 홈페이지에 따로 모으고 있습니다(작업 중). | How the body and brain relate to emotion, what textbooks and studies say and where they disagree, is collected on the maker’s homepage (in Korean, a work in progress). | 검토 전 |
| 10 | 뇌 지도 줄 | `about.atlasLink` | 뇌 지도 | Brain map | 검토 전 |

### 고를 때 본 것

- 2: 「수련」은 상담·임상 수련(수련생)으로 읽어 clinical training으로 했다. 「보시는 분」은 화면을 보는 사람이 아니라 현장에서 일하는 사람이라 using this in으로 했다.
- 4: 단추 이름은 영어 화면의 실제 이름(`landing.records` 「Past entries」, `records.deleteAll` 「Delete all entries on this device」)을 그대로 썼다.
- 5: 2026-11-10 사용자 의견으로 한국어부터 바꿈.
- 6–7: 한국어처럼 메일 주소가 두 조각 사이에 링크로 들어간다. 주소는 한국어와 같은 것을 쓴다(`koOnly.practitioner.mailAddress`).
- 8: /words 쪽이 한국어뿐이라 (in Korean)을 더했다. 링크에는 `hrefLang="ko"`를 달았다(꼬리말의 약관 링크와 같은 방식).
- 9–10: 2026-11-05에 써 두고 화면에 내지 않았던 문장이다(커밋 46145b5). 이번에 처음 화면에 나온다. 뇌 지도 링크에도 `hrefLang="ko"`를 달았다.
