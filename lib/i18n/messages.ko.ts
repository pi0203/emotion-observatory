/**
 * Korean wording for the app, grouped by screen and by feature.
 *
 * Every value must match what the screen showed before the move, character for
 * character. Format: `{name}` is a parameter, `{~name|A/B}` is a Korean
 * particle chosen by the last syllable of `name` (lib/i18n/format.ts).
 * In rich messages `\n` is a line break and `<b>...</b>` is emphasis.
 *
 * Some values are also written into records as the user's own choice (the
 * escape words in `emotion.escapes` and `coach.escapes`). Records keep the words
 * the user saw, so changing one of those values changes what new records hold,
 * not what old ones say.
 */
export const ko = {
  /** The page title and description in <head>, for this language's root layout and the 404 page. */
  meta: {
    title: "감정 관찰실",
    description: "몸, 상황, 의미를 천천히 구별해보는 자기관찰 도구",
    shareImageAlt: "감정 관찰실: 지금의 경험을 조금 더 알아보기. 감정을 맞히는 검사가 아닌 자기관찰 도구.",
  },
  /** The homepage frame on the landing and record screens (docs/DESIGN_ALIGNMENT.md §5). */
  shell: {
    skipToContent: "본문으로 건너뛰기",
    siteNav: "홈페이지 메뉴",
    owner: "조은찬",
    otherLanguage: "English",
  },
  common: {
    appName: "감정 관찰실",
    next: "다음",
    skip: "건너뛰기",
    stop: "그만하기",
    stepBack: "← 한 단계 뒤로",
    stepBackShort: "← 뒤로",
    progress: "진행 {step}",
    unsure: "잘 모르겠음",
    notChosen: "고르지 않음",
    // a step the person skipped: their choice to leave it, not a missing record
    leftEmpty: "비워 둠",
    backToStart: "처음으로 돌아가기",
    ownWordsPlaceholder: "내 말로 적기",
    provisionalNote: "임시 단어 모음 · 스스로 고른 표현만 기록됩니다",
    helpLink: "도움받을 수 있는 곳",
    helpShort: "도움",
    /** The same line at the foot of the records list and of a record (2026-11-05); opens the help card. */
    helpLine: "힘들 때 연락할 수 있는 곳",
    close: "닫기",
    saveFailed: "이 브라우저에 기록을 저장하지 못하고 있습니다. 저장 공간이 가득 찼거나 브라우저가 저장을 막고 있을 수 있습니다. 계속할 수는 있지만, 이 화면을 닫으면 지금 기록은 남지 않습니다. 지난 기록 화면에서 오래된 기록을 파일로 내보내고 지우면 공간이 생깁니다.",
    quoted: "“{value}”",
    listSeparator: ", ",
  },
  landing: {
    /** The drawing under the buttons (2026-11-05): the 답답함 example from 「왜 감정을 조금 더 자세히 살펴볼까요?」, as one word that splits in two. */
    split: {
      word: "답답해",
      tired: "지쳐서 답답함",
      tiredNeed: "쉬는 게 필요할 때",
      stuck: "할 말이 막혀 답답함",
      stuckNeed: "말을 정리하는 게 필요할 때",
      line: "좋은지 싫은지 잘 몰라도 괜찮아요. 이쯤이라고 눌러 두면, 쌓인 점들이 내 쪽을 보여 줘요.",
    },
    // the one-way-in title and subtitle (owner kept the proposed wording, 2026-10-30)
    title: "이름 붙이기 전에, 지금 느껴지는 것을 그대로 남겨 둡니다.",
    lede: "맞히는 검사가 아닙니다. 1분이면 됩니다.",
    /** The one way in: the quick look. The slower look opens from inside it. */
    start: "지금 기록",
    resume: "지난 기록 이어하기",
    records: "지난 기록",
    storageNote: "기록은 이 브라우저에만 저장되고 암호화되지 않습니다. 같은 기기와 브라우저를 쓰는 사람은 볼 수 있으니 공용 기기에서는 주의해 주세요. 브라우저 데이터를 지우면 함께 사라집니다.",
    storageManage: "기록 보기·지우기",
    draftConfirm: {
      title: "이어하던 기록이 있습니다",
      body: "새로 시작하면 이어하던 기록은 지워집니다. 이어서 하거나, 지우고 새로 시작하거나, 그대로 두고 돌아갈 수 있습니다.",
      resume: "이어서 하기",
      discard: "이어하던 기록을 지우고 새로 시작",
      cancel: "취소",
    },
  },
  crisis: {
    title: "긴급 지원 및 위기 상담 안내",
    /** First line of the card: emergency numbers in bold, no warning colour or icon (owner, 2026-10-13). */
    emergency: "몸을 다쳤거나 지금 당장 위험하다면 <b>119</b>(구급) 또는 <b>112</b>(경찰)에 바로 연락하세요.",
    intro: "이야기를 나눌 사람이 필요하다면, 24시간 열려 있는 상담 전화가 있습니다.",
    lifeline109: "자살예방상담전화 (24시간)",
    num109: "109",
    mental1577: "정신건강 위기상담전화 (24시간)",
    num1577: "1577-0199",
    youth1388: "청소년상담전화 (9~24세)",
    num1388: "1388",
    /** Where each line goes. Numbers checked by the owner against official sources on 2026-10-13 (SAFETY.md). */
    href109: "tel:109",
    href1577: "tel:1577-0199",
    href1388: "tel:1388",
    /** 119 and 112 on their own, as the terms (/terms 제8조) dial them; the emergency line above carries the same numbers (tests/terms.test.tsx). */
    num119: "119",
    num112: "112",
    href119: "tel:119",
    href112: "tel:112",
  },
  /** Below the landing buttons: what the tool is, the studies behind it (docs/EVIDENCE_CHAIN.md), and common questions. */
  about: {
    title: "이 도구에 대하여",
    what: "지금의 경험을 몸 · 상황 · 중요했던 것 · 표현으로 나누어 살펴보는 자기관찰 도구입니다. 빠르게 살펴보기는 화면을 한 번 누르고 가까운 말을 고르는 두 단계, 천천히 살펴보기는 몸에서 시작해 표현까지 가는 여섯 단계입니다.",
    not: "의료 도구나 위기 상담 도구가 아니고, 감정에 점수를 매기거나 판정하지 않습니다. <b>감정 구별이나 정신건강을 나아지게 한다는 효과는 아직 검증되지 않았습니다.</b>",
    refsSummary: "참고한 연구 6편",
    refsIntro: "앱의 생각이 연구로 어디까지 뒷받침되는지 정리했습니다. 연구마다 나온 것과 한계를 함께 적었습니다.",
    refsChecked: "마지막 확인 {year}. {month}. {day}. 연구마다 출판 상태와 정정 · 철회 표시를 Crossref에서 다시 확인했습니다.",
    checkedOn: "확인 {year}. {month}. {day}.",
    found: "나온 것",
    limit: "한계",
    refsClosing: "<b>이 앱을 직접 시험한 연구는 아직 없습니다.</b> 이 앱처럼 가끔, 10~30초씩 쓰는 방식은 위 어느 연구보다도 훨씬 적게 쓰는 것입니다. 위 연구들은 앱의 생각이 어디쯤 서 있는지 보여 줄 뿐입니다.",
    doiLink: "원문",
    atlasLead: "몸과 뇌가 감정과 어떻게 이어지는지, 교과서와 연구가 어디까지 말하고 어디서 의견이 갈리는지는 만든 사람의 홈페이지에 따로 모으고 있습니다(작업 중).",
    atlasLink: "뇌 지도",
    refs: {
      vedernikova: {
        cite: "Vedernikova, Kuppens, & Erbas (2021). From knowledge to differentiation. Frontiers in Psychology.",
        kind: "무작위 대조 실험 · 원문 확인",
        found: "성인 120명이 5일 동안 하루 15분쯤 감정 12개의 뜻과 그 감정이 생기는 상황을 읽었습니다. 지리를 배운 비교 집단과 달리 부정 감정을 구별하는 정도가 늘었고, 1개월 뒤에도 유지됐습니다.",
        limit: "가상 상황에 점수를 매기는 방식으로 쟀고, 배운 감정과 잰 감정이 같았습니다. 우울 같은 다른 지표의 결과는 일관되지 않았습니다.",
      },
      widdershoven: {
        cite: "Widdershoven 외 (2019). Effect of self-monitoring through experience sampling on emotion differentiation in depression. Journal of Affective Disorders, 244.",
        kind: "무작위 실험 · 저자 원고 확인",
        found: "우울증 치료 중인 79명 가운데 6주 동안 하루 10번씩 기록한 사람들에게서, 기록하지 않은 사람들보다 부정 감정 구별이 늘었습니다.",
        limit: "평균 150번쯤 기록했고 매주 연구자를 만났습니다. 기록의 어느 부분이 변화를 만들었는지는 알 수 없습니다.",
      },
      hoemann: {
        cite: "Hoemann, Barrett, & Quigley (2021). Emotional granularity increases with intensive ambulatory assessment. Frontiers in Psychology, 12.",
        kind: "비교 집단 없음 · 원문 확인",
        found: "건강한 성인 50명이 2주쯤 하루 9번 가까이 기록한 뒤 긍정 · 부정 감정 구별이 모두 늘었습니다.",
        limit: "비교 집단이 없어 기록 때문인지 알 수 없습니다. 저자들은 부정적인 경험에 주의를 더 기울이면 반추가 늘 수 있다는 가능성도 적었습니다.",
      },
      fugate: {
        cite: "Fugate 외 (2026). The effects of teaching emotion words on emotional granularity, emotion regulation/dysregulation, and satisfaction with life. bioRxiv.",
        kind: "동료심사 전 프리프린트 · 원문 확인",
        found: "95명이 14일 동안 하루 한 단어씩 감정 단어의 뜻과 쓰임을 배웠지만, 감정 구별에 뚜렷한 변화가 없었습니다. 이 앱의 단어 탐색과 가장 닮은 연구입니다.",
        limit: "배운 단어를 자기 경험에 대어 보는 단계가 없었습니다. 아직 심사를 거치지 않았습니다.",
      },
      dejonckheere: {
        cite: "Dejonckheere 외 (2019). Complex affect dynamics add limited information to the prediction of psychological well-being. Nature Human Behaviour, 3(5).",
        kind: "기존 자료 1,777명 재분석 · 심사 전 원고 확인",
        found: "감정을 구별하는 정도와 우울의 관계는 상당 부분 평균 기분과 겹쳤습니다. 평균 기분을 함께 고려하면 더해지는 설명은 작았습니다.",
        limit: "한 시점의 자료라 원인과 결과를 말하지 못합니다. 그래서 이 앱의 효과를 따질 때는 평균 기분을 함께 봐야 합니다.",
      },
      thompson: {
        cite: "Thompson, Springstein, & Boden (2021). Gaining clarity about emotion differentiation. Social and Personality Psychology Compass, 15.",
        kind: "리뷰 · 원문 확인",
        found: "감정 구별을 재는 흔한 방법이, 여러 감정을 동시에 느끼는 것을 낮은 구별로 셀 수 있다고 지적했습니다.",
        limit: "이 앱은 여러 표현을 함께 고르는 것을 자연스럽게 봅니다. 연구의 지표를 이 앱에 그대로 옮길 수 없는 이유입니다.",
      },
    },
    previewSummary: "어떤 질문이 나오나요 · 미리 보기",
    previewIntro: "시작하기 전에 어떤 화면이 나오는지 볼 수 있습니다. 어느 화면에서든 ‘그만하기’를 누를 수 있고, 맞는 답이 없으면 고르지 않아도 됩니다.",
    previewQuick: "빠르게 살펴보기 · 2단계",
    previewDeep: "조금 더 천천히 살펴보기 · 6단계",
    faqSummary: "자주 묻는 질문",
    faq: {
      ai: {
        q: "AI가 내 감정을 분석하나요?",
        a: "아니요. 마지막 요약은 미리 정해 둔 규칙에 따라 내가 고른 것만 다시 정리합니다. 적은 내용을 AI에 보내지 않고, AI가 감정을 추론하지도 않습니다. 이 앱을 만드는 과정에서 AI 도구의 도움을 받은 것과는 별개입니다.",
      },
      judge: {
        q: "감정을 맞혀 주나요?",
        a: "아니요. 앱은 무엇이 ‘진짜 감정’인지 판정하지 않고, 점수도 매기지 않습니다. 단어는 출발점일 뿐이고, 이름은 직접 고르거나 내 말로 적습니다.",
      },
      storage: {
        q: "기록은 어디에 저장되나요?",
        a: "지금 쓰는 브라우저 안에만 저장됩니다. 적은 내용은 서버로 보내지 않습니다. 브라우저 데이터를 지우면 함께 사라지고, 암호화된 저장소는 아닙니다. 지난 기록 화면에서 파일로 내보내거나(원하면 암호로 잠가서) 모두 지울 수 있습니다. Safari에서는 이 사이트를 7일 넘게 쓰지 않으면(Safari를 쓴 날만 셉니다) 브라우저가 기록을 지울 수 있습니다. 오래 두려면 가끔 파일로 내보내 주세요.",
      },
      maker: {
        q: "만든 사람이 내 기록을 볼 수 있나요?",
        a: "아니요. 이 앱은 적은 내용을 어디에도 보내지 않아서 만든 사람도 볼 수 없습니다. 방문 통계, 광고, 추적 쿠키도 쓰지 않습니다. 다만 사이트를 올려 둔 호스팅 업체(Vercel)는 여느 웹사이트처럼 접속 기록(IP 주소, 브라우저 종류, 시각)을 처리합니다. 그 기록에 앱에 적은 내용은 들어 있지 않습니다.",
      },
      often: {
        q: "얼마나 자주 해야 하나요?",
        a: "정해진 횟수는 없습니다. 쓰지 않는 날도 괜찮습니다. 몇 번을 써야 도움이 되는지는 연구로도 아직 모릅니다.",
      },
      worse: {
        q: "하다가 더 복잡해지거나 불편해지면요?",
        a: "언제든 ‘그만하기’를 누르면 됩니다. 생각을 계속 되짚는 것이 오히려 힘들게 할 때도 있습니다. 마지막 단계에서 ‘더 불편해짐’이라고 남길 수도 있습니다.",
      },
      body: {
        q: "몸에서 아무것도 느껴지지 않으면요?",
        a: "그것도 괜찮습니다. 이 단계는 건너뛰어도 됩니다.",
      },
      effect: {
        q: "효과가 있나요?",
        a: "아직 모릅니다. 감정을 구별하는 연습 뒤에 구별하는 정도가 늘었다는 연구는 있지만, 그것이 삶에 도움이 되는지, 이 앱으로도 그런지는 확인되지 않았습니다.",
      },
    },
  },
  whyThis: {
    summary: "왜 감정을 조금 더 자세히 살펴볼까요?",
    enough: "“기분이 좋다 / 나쁘다” 정도로 충분한 순간도 많습니다. 늘 자세히 볼 필요는 없습니다.",
    distinguish: "다만 때로는 비슷해 보이는 경험을 조금 더 구별해보면, 지금 무엇이 필요한지 고르는 데 도움이 되기도 합니다. 같은 답답함이라도 쉬는 것이 필요할 때와, 하고 싶은 말을 정리하는 것이 필요할 때가 다르기 때문입니다.",
    research: "감정을 세밀하게 구별하는 정도(emotional granularity)는 여러 연구에서 정서조절이나 일상 기능과 관련되어 있다고 보고되었습니다. 다만 <b>granularity 자체가 건강을 보장하지도, 정신건강을 재는 지표도 아닙니다.</b> 대부분 상관 연구이고, 이 앱의 효과를 검증한 것도 아닙니다.",
    principle: "목표는 최대한 세밀하게 분석하는 것이 아니라, <b>지금 무엇을 할지 정하는 데 필요한 만큼만</b> 구별하는 것입니다.",
  },
  whyWords: {
    summary: "감정 이름에도 하나의 정답이 있을까요?",
    shaped: "우리가 감정을 표현하는 방식은 몸의 느낌과 상황뿐 아니라, 살아온 경험과 언어, 관계와 문화의 영향을 받습니다. 같은 경험도 사람이나 공동체에 따라 조금 다르게 나누고 부를 수 있어요.",
    notJudging: "그래서 이 앱은 당신의 ‘진짜 감정’을 찾아내려 하지 않습니다. 대신 지금 경험을 이해하는 데 도움이 되는 말을 함께 찾아봅니다. 여기 있는 단어들은 완전한 목록이 아니라 <b>출발점</b>이고, <b>내 말로 적는 것이 예외가 아니라 정상적인 길</b>입니다.",
    principle: "언어를 가로질러 비교적 널리 통하는 것은 <b>불쾌함–유쾌함</b>과 <b>가라앉음–활성됨</b> 같은 넓은 방향입니다. 반면 그 안을 어떤 단어로 나누는지는 언어와 문화에 따라 달라질 수 있습니다. 그래서 이 앱은 방향은 함께 짚어보고, <b>이름은 당신이 고릅니다.</b>",
    deeperSummary: "조금 더: 감정이 사회적으로 만들어진다는 말",
    deeperReal: "감정이 사회적으로 구성된다는 것은 감정이 가짜라는 뜻이 아닙니다. 한 과학적 관점에서는 몸과 뇌의 변화가 실제로 존재하면서도, 사람들이 공유하고 배운 감정 개념이 그 경험에 의미와 기능을 부여한다고 봅니다.",
    deeperMoney: "화폐의 가치가 종이의 물리적 성질만으로 설명되지 않지만 실제로 우리 삶에서 작동하는 것과 비슷한 비유를 생각해볼 수 있습니다.",
    deeperOpen: "다만 이것은 <b>하나의 이론적 입장이고</b>, 감정이 얼마나 보편적이고 얼마나 문화적으로 구성되는지는 <b>여전히 연구 중</b>입니다.",
  },
  affectPad: {
    top: "에너지가 올라온 느낌",
    bottom: "가라앉은 느낌",
    left: "불쾌함",
    right: "유쾌함",
    ariaLabel: "불쾌함과 유쾌함, 가라앉음과 활성됨 사이에서 현재 경험에 가까운 곳 선택. 방향키로도 움직일 수 있습니다.",
  },
  /** Coarse words for a stored 0..1 position, low to high. The number itself is never shown. */
  affectBands: {
    quickValence: ["불쾌함 쪽", "조금 불쾌함 쪽", "중간", "조금 유쾌함 쪽", "유쾌함 쪽"],
    quickActivation: ["가라앉은 느낌", "조금 가라앉은 느낌", "중간", "에너지가 올라온 느낌", "에너지가 많이 올라온 느낌"],
    valence: ["매우 불쾌", "불쾌", "중간", "유쾌", "매우 유쾌"],
    activation: ["가라앉음", "조금 가라앉음", "중간", "활성됨", "많이 활성됨"],
  },
  contextSource: {
    event: "실제 사건",
    memory: "기억",
    anticipation: "예상",
    thought: "생각",
  },
  entry: {
    title: "지금 이 경험을\n조금 들여다보고 싶나요?",
    lede: "서두르지 않아도 됩니다.\n지금은 생각을 더 하지 않는 편이 낫다면 기록하지 않아도 됩니다.",
    observe: "조금 살펴보고 싶어요",
    unsure: "잘 모르겠어요",
    stop: "지금은 그만 생각하고 싶어요",
    resumeTitle: "이어 쓰지 않은 기록이 있어요",
    resumeBody: "이전 진행 상황을 이 기기에서 불러옵니다.",
    resume: "이어하기",
  },
  entryMini: {
    eyebrow: "짧은 확인",
    title: "지금 몸은 어떤 쪽에\n가까운가요?",
    lede: "그리고 이것을 생각하는 것이 지금 도움이 될 것 같나요?",
    yes: "조금 살펴보는 것이 도움될 것 같아요",
    unsure: "잘 모르겠어요",
    no: "지금은 도움이 되지 않을 것 같아요",
  },
  quickAffect: {
    basis: "지금 이 순간을 기준으로",
    step: "빠른 확인",
    title: "지금은 어느 쪽에 가까운가요?",
    hint: "정확한 좌표를 고를 필요 없이, ‘이쯤’이라고 느껴지는 곳을 한 번 눌러보세요.",
    /** As much an answer as a spot on the pad: the record ends here, finished (2026-10-30). */
    unknown: "아직 모르겠다",
  },
  words: {
    more: "비슷한 표현 더 보기",
    similar: "비슷한 표현",
    mine: "내가 적은 말",
    meaningLabel: "‘{label}’은 지금 나에게 어떤 느낌을 담고 있나요?",
    optional: "(선택)",
    meaningPlaceholder: "적지 않아도 됩니다",
    notListed: "여기 없는 말이 더 가깝다면",
    add: "추가",
    startingPoint: "이 목록은 완전한 목록이 아니라 출발점입니다. 내 말로 적는 것도 똑같이 정상적인 길이에요.",
    // before 단어 보기, on both word steps (owner kept the proposed wording, 2026-10-30)
    beforeTitle: "지금 느낌을 내 말로 적는다면?",
    beforeHint: "적지 않아도 됩니다. 단어 목록은 원하면 볼 수 있습니다.",
    reveal: "단어 보기",
    // under each picked list word that has dictionary expressions, after 단어 보기 (owner's decision 2026-11-01);
    // the source line is drawn once under them (docs/vocab-sources/EXPRESSIONS_2026_11_01.md)
    alsoSaidAs: "이렇게도 말해요",
    expressionSource: "표준국어대사전에 실린 표현이에요.",
  },
  quickCandidates: {
    basis: "방금 누른 곳을 기준으로",
    step: "가능한 표현",
    title: "지금 경험을 표현할 때 가까울 수도 있는 말입니다.",
    hint: "감정을 판정하는 결과가 아닙니다. 여러 개를 골라도 되고, 맞지 않으면 고르지 않아도 됩니다.",
    /** Shown only after a spot in the unpleasant, high-energy corner (lib/quick-check PAUSE_LINE_CORNER). */
    pause: "지금은 여기까지만 남겨도 됩니다.",
    decline: {
      "none-close": "가까운 말이 없음",
      unsure: "잘 모르겠음",
    },
    declined: {
      "none-close": "가까운 말이 없다고 기록했습니다. 이대로 끝내도 되고, 천천히 더 살펴봐도 됩니다.",
      unsure: "잘 모르겠다고 기록했습니다. 이대로 끝내도 되고, 천천히 더 살펴봐도 됩니다.",
    },
    finish: "여기까지",
    coach: "표현 사이의 차이 살펴보기",
    deep: "조금 더 천천히 들여다보기",
    coachNote: "예시 상황으로 해보는 짧은 연습입니다. 지금 고른 표현은 그대로 남습니다. 예시는 일부 후보에만 준비되어 있습니다.",
    context: {
      // one optional line under the second step (owner's decision 2026-10-30)
      label: "무슨 일이 있었나요",
      hint: "일어난 일만 적어도 됩니다. 뜻은 나중에 붙여도 됩니다.",
    },
  },
  coach: {
    step: "예시로 연습하기",
    notice: "<b>예시 상황으로 해보는 표현 연습입니다.</b> 당신의 실제 일이나 지금 감정을 기록하는 단계가 아니고, 앞에서 고른 내 표현은 바뀌지 않습니다.",
    leave: "예시 연습 그만하고 요약으로",
    exampleZone: "예시 상황",
    mineZone: "내 선택",
    noSetTitle: "아직 비교해볼 세트가 없습니다.",
    noSetHint: "고른 표현에 맞는 예시가 아직 준비되지 않았습니다.",
    appraisalHint: "같은 예시라도 사람마다, 또 어떤 관계와 상황인지에 따라 눈에 들어오는 것이 다를 수 있어요. 정답을 맞히는 문제가 아닙니다.",
    appraisalPickNote: "여러 개를 골라도 되고, 하나도 고르지 않아도 됩니다.",
    ownAppraisalLabel: "이 예시에서 눈에 띈 다른 것을 내 말로 적기",
    ownAppraisalPlaceholder: "예: 대답을 기다리는 시간이 길었다",
    wordsTitle: "이 예시에서 가까울 수 있는 표현이 있나요?",
    wordsHint: "아래 표현에는 순서나 정답이 없습니다. 이 세 가지가 이 예시를 나누는 유일한 방법도 아니어서, 다른 말을 직접 적는 것도 똑같은 선택입니다.",
    recap: "눈에 띈 것 · {observations}",
    wordsGroup: "이 예시에서 가까울 수 있는 표현",
    ownWordLabel: "내 말로 표현하기",
    ownWordPlaceholder: "예: 김이 새는 느낌",
    wordsPickNote: "여러 개를 골라도, 하나도 고르지 않아도 됩니다.",
    noteEyebrow: "예시로 연습하기 · 짧은 참고",
    noteTitle: "단어는 정답표가 아니라\n살펴보는 도구입니다.",
    noteAside: "참고 설명",
    resultZone: "예시 연습 결과",
    observationsFromExample: "예시에서 눈에 띈 것",
    observationsUnknown: "이 단계에서 고른 관찰",
    expressionsFromExample: "예시에 가까울 수 있는 표현",
    expressionsUnknown: "이 단계에서 고른 표현",
    footnoteFromExample: "예시 연습의 결과입니다. 앞에서 고른 내 표현을 바꾸지 않고, 요약에도 쓰이지 않습니다.",
    footnoteUnknown: "이 기록이 예시 연습으로 저장되었는지는 확인할 수 없습니다. 앞에서 고른 내 표현을 바꾸지 않고, 요약에도 쓰이지 않습니다.",
    backToSummary: "요약으로 돌아가기",
    /** Offered beside every set's own words and stored as picked. */
    escapes: {
      several: "여러 개",
      none: "어느 것도 아님",
      unsure: "잘 모르겠음",
    },
    appraisalEscapes: {
      none: "어느 것도 아니다.",
      unsure: "잘 모르겠다.",
    },
  },
  quickSummary: {
    eyebrow: "빠른 확인",
    title: "여기까지 살펴보았습니다.",
    affect: "전체적인 느낌",
    words: "가까웠던 말",
    granularity: "더 살펴본 표현",
    contrast: "상황 속 차이",
    footnote: "이것은 감정의 판정이 아니라, 지금 경험을 표현해볼 수 있는 작은 단서입니다.",
    deep: "조금 더 천천히 들여다보기",
    support: "그래서 지금 무엇이 필요할지 살펴보기",
  },
  body: {
    basis: "지금 이 순간 몸에서 알아차린 것만",
    step: "몸",
    title: "먼저, 몸에서는 무엇이 느껴지나요?",
    // under the title: stopping is fine, and 그만하기 is already in the top bar (2026-10-30)
    pause: "몸을 살피는 게 불편하면 여기서 멈춰도 됩니다. 멈춘 기록도 그대로 남습니다.",
    hint: "감정 이름을 찾기 전에 지금 몸에서 알아차릴 수 있는 것부터 봅니다. 자세를 고쳐 앉을 필요는 없습니다. 지금 이 순간 알아차린 것이면 충분합니다.",
    more: "다른 몸의 느낌 보기",
    customLabel: "다른 느낌이 있다면 적어도 됩니다",
    customPlaceholder: "예: 손이 차가움",
  },
  affect: {
    basis: "지금 이 순간을 기준으로",
    step: "전체적인 느낌",
    title: "조금 더 살펴본 지금은 어느 쪽에 가까운가요?",
    hint: "빠른 확인에서 표시한 곳이 먼저 놓여 있습니다. 그대로 두어도 되고 옮겨도 됩니다.",
    hintFresh: "지금에 가장 가까운 곳을 한 번 눌러 주세요. 잘 모르겠으면 건너뛰어도 됩니다.",
  },
  context: {
    basis: "떠오른 일 하나만",
    step: "상황",
    title: "무슨 일이 있었나요?",
    hint: "사실만 간단히 적어도 충분합니다.",
    placeholder: "지금 떠오르는 일을 적어보세요",
    privacyHint: "다른 사람의 이름은 ‘친구’, ‘팀장’처럼 바꿔 적어도 됩니다. 기록은 이 기기에 남고, 파일로 내보내면 그 파일에도 그대로 들어갑니다.",
    sourceQuestion: "이것은 무엇에 가까운가요?",
  },
  meaning: {
    basis: "그 일이 있던 순간을 기준으로",
    step: "중요했던 것",
    title: "그 순간 무엇이 중요했던 것 같나요?",
    hint: "정답을 찾는 질문이 아닙니다. 가까운 것을 골라도, 잘 모르겠다고 해도 됩니다.",
  },
  emotion: {
    basis: "지금까지 적은 경험을 기준으로",
    step: "가까운 표현",
    title: "지금까지 적은 경험에 가까운 단어가 있나요?",
    hint: "이 단어들은 정답이 아니라, 지금 경험을 표현해보는 임시 후보입니다.",
    /** Stored as picked words, next to the offered ones. */
    escapes: {
      several: "여러 개",
      unsure: "잘 모르겠음",
    },
  },
  outcome: {
    basis: "처음 시작했을 때와 비교해서",
    step: "도움 여부",
    title: "처음보다 지금 경험이 조금 더 분명해졌나요?",
    hint: "더 복잡해지거나 불편해졌다면 그렇게 알려주어도 됩니다.",
    clarity: {
      much_clearer: "많이 더 분명해짐",
      clearer: "조금 더 분명해짐",
      same: "비슷함",
      more_complex: "더 복잡해짐",
      more_distressed: "더 불편해짐",
    },
    usefulnessQuestion: "이 기록은 지금 도움이 되었나요?",
    usefulness: {
      helpful: "도움됨",
      unsure: "잘 모르겠음",
      unhelpful: "도움되지 않음",
    },
    notePlaceholder: "덧붙이고 싶은 한 줄 (선택)",
  },
  summary: {
    eyebrow: "이번 기록에서",
    title: "여기까지 살펴보았습니다.",
    quickAffect: "처음 빠른 확인",
    body: "몸",
    affect: "전체적인 느낌",
    context: "상황",
    concerns: "중요했던 것",
    words: "가까웠던 말",
    footnote: "감정의 정답을 찾은 것이 아니라, 지금 경험을 표현할 수 있는 몇 가지 단서를 남겼습니다.",
    support: "그래서 지금 무엇이 필요할까요?",
  },
  synthesisSection: {
    title: "지금까지의 경험을\n이렇게 정리해볼 수 있어요",
    observed: "관찰한 것",
    meaning: "연결해서 생각해볼 수 있는 것",
    unknown: "아직 알기 어려운 것",
    questions: "다음에 생각해볼 질문",
    fitQuestion: "이 설명이 지금 경험과 얼마나 맞나요?",
    fit: {
      close: "꽤 맞아요",
      partly: "일부만 맞아요",
      unsure: "잘 모르겠어요",
    },
    correctionPlaceholder: "지금 경험을 내 말로 다시 적어보세요",
    correct: "내 말로 고쳐보기",
    keep: "이 기록에 남기기",
    cancel: "취소",
  },
  /** Sentences the summary builds from the user's own entries (lib/synthesis.ts). */
  synthesis: {
    lead: "당신이 고른 내용을 연결하면 이렇게 정리해볼 수 있습니다.",
    caveat: "이것은 해석이나 진단이 아니라, 당신이 고른 내용을 이어 붙이고 그 사이의 관계만 짚은 것입니다. 맞지 않으면 아래에서 고쳐 쓸 수 있습니다.",
    notEnough: "지금 기록만으로는 연결해볼 만한 정보가 충분하지 않습니다.",
    observed: {
      quickAffect: "빠른 확인에서 전체적인 느낌을 {text}{~text|으로/로} 표시했습니다.",
      body: "몸에서는 {list}{~last|을/를} 알아차렸다고 적었습니다.",
      deepAffect: "전체적인 느낌은 {text} 쪽으로 표시했습니다.",
      context: "상황으로는 “{event}”라고 적었고, 이것은 {source}에 가깝다고 표시했습니다.",
      concerns: "그때 중요했던 것으로는 {list}{~last|을/를} 골랐습니다.",
      emotion: "지금 경험에 가까운 말로는 {list}{~last|을/를} 골랐습니다.",
      quickEmotion: "가까운 말로는 {list}{~last|을/를} 골랐습니다.",
      declined: {
        "none-close": "제시된 후보에는 가까운 말이 없다고 표시했습니다.",
        unsure: "제시된 후보에는 잘 모르겠다고 표시했습니다.",
      },
      affectBeforeAfter: "처음 빠른 확인에서는 {quick} 쪽이었고, 조금 더 살펴본 뒤에는 {deep}{~deep|으로/로} 표시했습니다.",
    },
    meaning: {
      concernOverlap: "고른 표현과 그때 중요했다고 한 것이 모두 ‘{tags}’ 쪽을 가리킵니다. 같은 곳을 두 번 짚은 셈입니다.",
      wordsShifted: "빠르게 봤을 때는 {quick}, 자세히 본 뒤에는 {deep}{~deepLast|을/를} 골랐습니다. 같은 순간을 두 번 다르게 표현해본 셈입니다.",
      severalKinds: "{words}처럼 한 갈래로 묶이지 않는 표현을 함께 골랐습니다. 여러 결이 같이 있는 경험일 수 있습니다.",
      notHappeningNow: "이 기록은 지금 벌어지고 있는 일이 아니라 {source}에 대한 것이라고 표시했습니다.",
    },
    unknown: {
      noContext: "어떤 일이 있었는지는 이 기록에 적히지 않았습니다.",
      noConcern: "그 순간 무엇이 중요했는지는 아직 적히지 않았습니다.",
      contextDependent: "{list}{~last|을/를} 상황에 따라 다르게 경험되는 표현입니다. 지금 어느 쪽에 가까운지는 이 기록만으로 정해지지 않습니다.",
      affectUnknown: "전체적인 느낌은 잘 모르겠다고 표시했습니다.",
    },
    questions: {
      concern: "그 순간 가장 중요했던 것은 무엇이었나요?",
      context: "무슨 일이 있었는지 한 줄로 적는다면 어떻게 될까요?",
      compare: "{first}과 {second} 중 어느 쪽이 조금 더 가까웠나요?",
      changed: "빠르게 봤을 때와 지금 사이에 무엇이 달라졌을까요?",
      body: "그때 몸에서는 무엇이 느껴졌나요?",
      sameWord: "비슷한 상황에서도 {word}이라는 말을 쓰나요?",
      fallback: "지금 이것을 살펴보는 것이 도움이 되었나요?",
    },
  },
  need: {
    step: "지금 필요한 것",
    title: "지금 가장 필요한 방향은 어느 쪽에 가까운가요?",
    hint: "앱이 정해주지 않습니다. 하나를 골라보고, 다른 쪽이 궁금하면 언제든 바꿔도 됩니다.",
    routeDeep: "조금 더 천천히 살펴보기",
    routeCoach: "비슷한 표현의 차이를 살펴보기",
    routeNone: "고른 표현에 맞는 상황 비교가 아직 준비되지 않았습니다. 다른 방향을 눌러보셔도 됩니다.",
    exit: "그대로 두어도 됩니다. 여기서 마쳐도 기록은 남습니다.",
    varies: "같은 경험이라도 필요한 것은 그때그때 다를 수 있습니다. 편안하거나 벅찬 경험이라면 문제를 풀기보다 머물러 느끼는 쪽이 맞을 수도 있습니다.",
    backToSummary: "← 요약으로 돌아가기",
    finish: "여기까지",
  },
  talkToSomeone: {
    question: "이 경험을 사람에게 말해 볼 생각이 있나요?",
    hint: "답하지 않아도 됩니다. 어느 답이든 괜찮고, 나중에 바꿔도 됩니다.",
    answers: {
      yes: "예",
      no: "아니오",
      "not-yet": "아직",
    },
    saved: "이 기록에 남겨 두었습니다.",
    recordLabel: "사람에게 말해 볼 생각",
  },
  /** A second question in the same form, under talkToSomeone (owner's decision 2026-10-30). Kept and shown back only. */
  underlyingFeeling: {
    question: "이 느낌 아래에 다른 느낌이 먼저 있었나요?",
    hint: "답하지 않아도 됩니다. 어느 답이든 괜찮습니다.",
    answers: {
      yes: "있었다",
      no: "없었다",
      unsure: "모르겠다",
    },
    noteLabel: "어떤 느낌이었나요",
    saved: "이 기록에 남겨 두었습니다.",
    recordLabel: "아래에 먼저 있던 느낌",
    noteRecordLabel: "그 느낌",
  },
  records: {
    eyebrow: "지난 기록",
    title: "이전에 적은 것들",
    empty: "아직 남긴 기록이 없습니다.",
    // a record with no name yet is not missing anything (owner kept the proposed wording, 2026-10-30)
    namesNotYet: "이름은 아직",
    needLine: "필요했던 방향 · {label}",
    responsesLine: "해보기로 한 것 · {labels}",
    backToStart: "← 처음으로",
    /** The strip of the last 14 days above the list (2026-10-30). No counts, no 안 한 날. */
    days: {
      title: "최근 14일",
      today: "오늘",
      goTo: "{date} 기록으로 가기",
    },
    /** 기록 옮기기와 지우기, folded into one line (2026-11-05). */
    manage: "기록 관리",
    /** 내 지도 under the strip (2026-11-05): one point per record with a spot, nothing counted. */
    map: {
      title: "내 지도",
      open: "{when} 기록 열기",
    },
    /** How far a record went. Derived from what it holds, never stored. */
    depth: {
      quick: "빠른 확인",
      "quick+deep": "빠른 확인 + 자세히",
      deep: "자세히",
    },
    /** `formatWhen`: the numbers come from Intl in the record's time zone. */
    when: "{year}. {month}. {day}  {hour}:{minute}",
    /** `formatDay`: the day a later name was given. */
    day: "{month}/{day}",
  },
  /** Export, import and delete-all, at the foot of the records screen (lib/record-transfer.ts). */
  recordTransfer: {
    title: "기록 옮기기와 지우기",
    intro: "로그인 없이 다른 기기로 기록을 옮기거나 따로 보관할 때 씁니다. 모든 처리는 이 기기의 브라우저 안에서만 일어납니다.",
    exportNote: "암호를 정하지 않으면, 내보낸 파일에는 적은 내용이 그대로 들어 있고 암호화되지 않습니다.",
    exportShareNote: "파일을 다른 사람에게 보내면 그 사람도 적은 내용을 모두 읽을 수 있습니다. 기록에 다른 사람 이야기가 있다면 한 번 더 생각해 주세요.",
    exportScope: "완료한 기록과 중단한 기록 {count}개를 내보냅니다. 작성 중인 기록은 넣지 않습니다.",
    export: "파일로 내보내기",
    exportEmpty: "내보낼 기록이 없습니다.",
    exported: "파일 {name}을 내려받았습니다.",
    import: "파일에서 가져오기",
    importFileLabel: "가져올 기록 파일 고르기",
    importSummary: "이 파일에는 기록이 {total}개 있습니다. 그중 이미 이 기기에 있는 기록은 {duplicates}개이고, 기록 모양이 아닌 항목은 {invalid}개입니다.",
    importRule: "이미 있는 기록은 그대로 두고, 새 기록 {add}개만 더합니다.",
    importNothingNew: "더할 새 기록이 없습니다. 아무것도 바꾸지 않았습니다.",
    importConfirm: "가져오기",
    importCancel: "취소",
    imported: "기록 {added}개를 가져왔습니다. 이미 있던 기록 {duplicates}개와 모양이 맞지 않는 항목 {invalid}개는 건너뛰었습니다.",
    importCancelled: "가져오기를 취소했습니다. 아무것도 바꾸지 않았습니다.",
    errors: {
      "too-large": "파일이 너무 큽니다. 5MB까지 가져올 수 있습니다. 아무것도 저장하지 않았습니다.",
      "not-json": "파일을 읽을 수 없습니다. 내용이 깨졌거나 JSON 파일이 아닙니다. 아무것도 저장하지 않았습니다.",
      "unknown-format": "감정 관찰실에서 내보낸 기록 파일이 아닙니다. 아무것도 저장하지 않았습니다.",
      "unsupported-version": "이 앱이 아직 읽을 수 없는 판의 기록 파일입니다. 아무것도 저장하지 않았습니다.",
      "no-records": "파일 안에 기록 목록이 없습니다. 아무것도 저장하지 않았습니다.",
      unreadable: "파일을 여는 중에 문제가 생겼습니다. 아무것도 저장하지 않았습니다.",
    },
    lock: {
      legend: "암호로 잠그기 (선택)",
      hint: "암호를 정하면 내보낸 파일이 잠겨, 그 암호를 아는 사람만 열 수 있습니다. 비워 두면 지금처럼 잠그지 않고 내보냅니다.",
      passphrase: "암호 (8자 이상)",
      confirm: "암호 한 번 더",
      warning: "암호를 잊으면 이 파일은 누구도 열 수 없습니다. 만든 사람도 열 수 없습니다. 암호는 어디에도 저장되지 않습니다.",
      tooShort: "암호는 8자 이상이어야 합니다.",
      mismatch: "두 번 적은 암호가 다릅니다.",
      exportLocked: "암호로 잠가 내보내기",
      locking: "파일을 잠그는 중입니다…",
      exported: "암호로 잠근 파일 {name}을 내려받았습니다.",
      failed: "파일을 잠그지 못했습니다. 아무것도 내려받지 않았습니다.",
      unlockQuestion: "암호로 잠긴 기록 파일입니다. 내보낼 때 정한 암호를 적어 주세요.",
      unlockLabel: "파일 암호",
      unlock: "열기",
      unlocking: "파일을 여는 중입니다…",
      unlockCancel: "취소",
      errors: {
        "wrong-passphrase": "암호가 맞지 않거나 파일이 손상되었습니다. 아무것도 저장하지 않았습니다.",
        damaged: "잠긴 파일의 모양이 맞지 않습니다. 아무것도 저장하지 않았습니다.",
        "unsupported-version": "이 앱이 아직 열 수 없는 판의 잠긴 파일입니다. 아무것도 저장하지 않았습니다.",
      },
    },
    deleteAll: "이 기기의 기록 모두 지우기",
    deleteAllConfirmTitle: "이 기기의 기록을 모두 지울까요?",
    deleteAllConfirmBody: "완료한 기록, 중단한 기록, 작성 중인 기록을 모두 이 기기에서 지웁니다. 지운 기록은 되돌릴 수 없습니다. 지우기 전에 위의 「파일로 내보내기」로 파일을 받아 둘 수 있습니다.",
    deleteAllConfirm: "모두 지우기",
    deleteAllCancel: "취소",
    deletedAll: "이 기기의 기록을 모두 지웠습니다.",
  },
  recordDetail: {
    /** The one button that shows the source labels and how far the record went (2026-11-05). */
    sourcesShow: "어디서 온 줄인지 보기",
    sourcesHide: "어디서 온 줄인지 접기",
    /** Under a line, when the record just before had the same one (2026-11-05). Side by side only: no comparing word. */
    previous: "지난번 ({date}): {value}",
    depth: "살펴본 정도",
    quickAffect: "빠른 확인",
    deepAffect: "자세히 본 뒤",
    personalMeaning: "‘{label}’은",
    context: "상황",
    quickContext: "그때 일어난 일",
    need: "필요했던 방향",
    responses: "해보기로 한 것",
    body: "몸",
    concerns: "중요했던 것",
    /** The label under each line: where it came from (2026-10-30). Never colour alone. */
    source: {
      pressed: "직접 누름",
      wrote: "직접 씀",
      skipped: "직접 건너뜀",
      picked: "목록에서 고름",
      pickedAfterReveal: "단어 보기 뒤 고름",
      sentence: "좌표를 앱이 말로 바꿈",
      depth: "앱이 셈",
    },
    addedOn: "{date} 덧붙임",
    /** The names layer: the words of the moment first, then each name given later, by day (2026-10-30). */
    names: {
      title: "이름",
      add: "+ 오늘 이름 붙이기",
      fieldLabel: "오늘 붙이는 이름",
      save: "붙이기",
      cancel: "취소",
      hint: "지금 붙인 이름은 오늘 날짜와 함께 아래에 더해집니다. 그때 고른 말은 그대로 남습니다.",
    },
    legend: {
      title: "줄마다 어디서 온 것인지",
      mine: "직접 고르거나 적은 것",
      app: "앱이 계산하거나 바꾼 것",
      later: "나중에 덧붙인 것",
    },
    followUpTitle: "그 뒤에는 어땠나요",
    triedQuestion: "그때 골랐던 것을 실제로 해봤나요?",
    helpedQuestion: "조금이라도 도움이 됐나요?",
    followUpCaveat: "평가가 아닙니다. “아니요”도 그대로 정상적인 답입니다. 이 답으로 방법을 추천하거나 점수를 매기지 않습니다.",
    backToList: "← 목록으로",
    toStart: "처음으로",
    tried: {
      yes: "해봤어요",
      partly: "일부만 해봤어요",
      no: "아니요",
    },
    helped: {
      yes: "도움이 됐어요",
      somewhat: "조금은요",
      no: "아니요",
      unsure: "잘 모르겠어요",
    },
  },
  worsened: {
    eyebrow: "여기까지",
    title: "더 불편해졌다고\n남겨 주셨습니다",
    lede: "여기서 더 살펴보지 않아도 됩니다. 이번에는 이렇게 마쳐도 괜찮습니다.",
    finish: "여기서 마치기",
    kept: "남긴 기록은 ‘지난 기록 보기’에서 확인하거나 지울 수 있습니다.",
    showHelp: "도움받을 수 있는 곳 보기",
  },
  stopped: {
    eyebrow: "여기까지",
    title: "지금은 더 살펴보지\n않아도 됩니다.",
    lede: "경험에서 조금 거리를 두는 것도 선택입니다. 이 기록은 완료된 기록이 아니라, 중단한 기록으로 이 기기에 남습니다.",
    home: "기록실로 돌아가기",
    delete: "이 기록을 지우기",
    entryNote: "물 한 잔, 잠깐 걷기, 다른 일로 주의를 옮기기처럼 지금 가능한 것을 선택해보세요.",
  },
  stopModal: {
    eyebrow: "잠깐 확인할게요",
    title: "지금 더 생각하는 것이\n도움이 되고 있나요?",
    body: "여기까지 알아차린 것으로 충분할 수 있습니다.",
    keepGoing: "계속 살펴보기",
    stop: "여기서 그만하기",
  },
} as const;

/**
 * Wording that exists only in Korean, outside the shared Messages shape, so no
 * English key is asked for: the links to the terms page, which is Korean only
 * for now (lib/terms.ts). The English screen does not show them. Mirrors
 * `enOnly` in messages.en.ts.
 */
export const koOnly = {
  /**
   * 첫 화면 제목 「감정 관찰실」 바로 아래 작은 줄 (2026-11-10). 별칭 이쯤은 좌표판의 힌트 「‘이쯤’이라고 느껴지는 곳」에서 왔다(2026-11-05).
   * 전에는 제목 위 표지 「이쯤 · 감정 관찰실」이었고, 앱 이름이 제목이 되면서 별칭만 남았다. 영어에는 없다.
   */
  alias: "이쯤",
  /** In the footer, after eunchanjoe.vercel.app. */
  termsLink: "이용약관",
  /** In the footer, after 이용약관 (2026-11-02). */
  privacyLink: "개인정보 처리방침",
  /** After the answer to 「기록은 어디에 저장되나요?」. */
  termsStorageLink: "자세히: 이용약관 제6조",
  /**
   * 「이 도구에 대하여」 안, 「참고한 연구」 다음 접힌 칸 (2026-11-02, 작성자 확인 전 문구).
   * 근거: docs/FIELD_NOTES_2026-11-02.md. 영어는 따로 쓴다(docs/I18N_PLAN.md).
   * 마지막 줄의 메일 주소는 `mailBefore` 와 `mailAfter` 사이에 링크로 들어간다.
   */
  practitioner: {
    summary: "상담·수련 현장에서 보시는 분께",
    lines: [
      "이 도구는 성인이 스스로 쓰는 자기관찰 도구입니다. 상담에서 함께 쓰신다면, 내담자가 자기 기기에서 직접 고르고 적게 해 주세요. 기록을 대신 적거나 평가 자료로 쓰도록 만들지 않았습니다.",
      "적은 내용은 이 기기 밖 어디로도 보내지지 않습니다. 기관의 공용 기기에서 썼다면 마친 뒤 「지난 기록」에서 「이 기기의 기록 모두 지우기」를 눌러 주세요.",
      "두 사람 이상이 함께 쓸 때는 한 사람에 기기 하나를 권합니다. 한 화면에서 함께 고르면, 내 느낌보다 옆 사람의 반응에 맞춰 고르게 되기 쉽습니다.",
    ],
    mailBefore: "단어 목록, 문장, 안전 안내에서 개선이 필요한 곳이 있으면 ",
    mailAddress: "a5897@icloud.com",
    mailAfter: "으로 알려 주세요. 내담자 정보나 사례는 적지 말아 주세요.",
    /** 칸 바로 아래, /words 로 가는 링크 (2026-11-02). 기록 흐름 안에는 두지 않는다. */
    wordsLink: "단어 목록 보기 →",
  },
  /** /words, 단어 목록 쪽 (2026-11-02, 작성자 확인 전 문구). `{count}`는 단어 수로 채운다. */
  words: {
    title: "감정 관찰실의 단어 목록",
    intro: "감정 관찰실에서 쓰는 단어 {count}개를 한곳에 모았습니다. 완전한 목록이 아니라 출발점이고, 맞는 말이 없으면 내 말로 적는 것이 정상적인 길입니다. 단어 아래의 힌트는 그 감정의 정의가 아니라, 비슷한 단어와 견줘 볼 때 쓸 수 있는 실마리입니다. 이 목록은 아직 연구와 검토를 거치는 중입니다.",
    aliases: "비슷하게: {words}",
    hints: "이럴 때 쓰기도 해요",
    neighbors: "견줘 볼 말",
    print: "인쇄하기",
  },
} as const;

/**
 * The shape every language's messages must have: the same keys, a string where
 * Korean has a string and a list where Korean has a list. An English file will
 * be checked against this when it is written (docs/I18N_PLAN.md, stage C).
 */
type Widen<T> = T extends string ? string : T extends readonly string[] ? readonly string[] : { readonly [K in keyof T]: Widen<T[K]> };
export type Messages = Widen<typeof ko>;
