// 코어 루브릭 core-2 — 기관 심사 웹앱과 교사 자가점검 스킬이 같은 기준을 쓴다.
// 항목 정의의 정본은 skill/edusafe/rules/items.json 하나다 (스킬 배포본에 그대로 들어가는 파일).
// 이 모듈은 그 정본을 읽어 웹앱 심사 형태로 바꾸고, 심사 화면에만 필요한 정보
// (기능 플래그 적용 조건·보호 수준·법적 무게·쉬운 설명)를 항목 id 단위로 덧붙인다.
// - type: 정본 중요도 high = 필수(미충족 시 불합격 후보), medium·low = 점수 항목
// - aiVerifiable: 정본 판정 방식이 교사 답변(teacher)뿐이면 심사자 수동 판정, 아니면 AI 판정 초안
// - category: 정본 카테고리 번호(1~9)를 웹앱 분류 키로
// when: null(모든 앱) | 기능 플래그명(꺼져 있으면 자동 '해당없음')
// level: 보호 수준 기준선 소속(L0/L1/L2)
import core from '../../skill/edusafe/rules/items.json' with { type: 'json' }

export const RUBRIC_VERSION = core.rubric_version

export const FEATURES = {
  studentFacing: { label: '학생이 직접 사용하는 화면이 있다', short: '학생 대면', gates: '학생 대면 보호 항목' },
  collectsPersonalInfo: { label: '학생·학부모 개인정보를 수집한다', short: '개인정보 수집', gates: '개인정보 보호선 L1' },
  collectsSensitiveInfo: { label: '민감정보(건강·상담·성적 상세)를 다룬다', short: '민감정보', gates: '민감·공정성 보호선 L2' },
  hasAssessmentOrCompetition: { label: '평가·점수·랭킹·경쟁 기능이 있다', short: '평가·경쟁', gates: '공정성 항목 + L2' },
  handlesRealData: { label: '학생 실데이터(명단·성적 파일)를 다룬다', short: '실데이터 취급', gates: '실데이터 보호 + L1' },
  showsAiOutput: { label: 'AI가 생성한 내용을 화면에 보여준다', short: 'AI 출력', gates: 'AI 투명성 항목' },
  isLearningContent: { label: '교과 학습을 목적으로 하는 콘텐츠다', short: '학습 콘텐츠', gates: '교육 적절성 항목' },
}

export function featureProfile(features = {}) {
  const active = Object.entries(FEATURES).filter(([k]) => features[k]).map(([, v]) => v.short)
  return active.length > 0 ? active.join(' · ') : '해당 기능 없음 (공통 기준만 적용)'
}

const CATEGORY_KEYS = {
  1: 'collect', 2: 'access', 3: 'secrets', 4: 'thirdparty', 5: 'display',
  6: 'code', 7: 'notice', 8: 'safety', 9: 'education',
}

// 분류 이름도 정본에서 — "수집 — 무엇을 모으나" 의 앞부분
export const CATEGORIES = Object.fromEntries(
  core.categories.map((c) => [CATEGORY_KEYS[c.number], c.title.split(' — ')[0]]),
)

export const AUTHORITY_LABELS = {
  law: '법률',
  notice: '고시·훈령',
  guidance: '공식 권고',
  practice: '모범 사례',
}

// 심사 화면 전용 정보 — 정본에 항목이 추가되면 여기 없어도 기본값으로 심사에 들어가고, 테스트가 누락을 알린다.
export const REVIEW_FIELDS = {
  // ── 1. 수집 — 무엇을 모으나 ──
  'R-rrn': { when: null, level: 'L0', authority: 'law',
    plain: '주민등록번호는 평생 바뀌지 않아 한 번 새면 되돌릴 수 없고, 법이 수집 자체를 금지합니다.' },
  'R-under14': { when: 'collectsPersonalInfo', level: 'L1', authority: 'law',
    plain: '만 14세 미만 학생의 개인정보는 보호자 동의 없이 모으면 안 됩니다(개인정보 보호법).' },
  'S-sensitive': { when: 'collectsSensitiveInfo', level: 'L2', authority: 'law',
    plain: '마음 기록은 성적보다 민감합니다 — 누구 것인지 모르게 다루거나 기기 밖으로 내보내지 않아야 해요.' },
  'S-minimal': { when: 'collectsPersonalInfo', level: 'L1', authority: 'law',
    plain: '덜 모을수록 안전합니다 — 닉네임으로 충분한 앱이 실명을 요구하면 감점입니다.' },
  // ── 2. 접근·권한 — 누가 무엇을 할 수 있나 ──
  'R-db-locked': { when: null, level: 'L0', authority: 'notice',
    plain: '데이터 창고 문이 열려 있으면 인터넷의 아무나 학생 기록을 지우거나 바꿀 수 있습니다.' },
  'S-access': { when: 'studentFacing', level: 'L1', authority: 'notice',
    plain: '내 일기장을 옆 반 친구가 열어볼 수 없어야 합니다 — 기록 사이에 칸막이가 있는지 봅니다.' },
  'R-impersonate': { when: 'studentFacing', level: 'L1', authority: 'notice',
    plain: '남의 일기를 읽는 것만큼, 남의 이름으로 쓰는 것도 막아야 합니다.' },
  'R-score-forge': { when: 'hasAssessmentOrCompetition', level: 'L2', authority: 'guidance',
    plain: '점수를 학생 기기가 계산해 그대로 저장하면 개발자 도구 몇 번으로 아무나 1등이 됩니다.' },
  'S-upload-exposure': { when: null, level: null, authority: 'notice',
    plain: '학생이 올린 파일 주소가 1.jpg, 2.jpg 식이면 남의 파일도 주소만 바꿔 열 수 있습니다.' },
  'S-password-storage': { when: null, level: null, authority: 'notice',
    plain: '비밀번호를 그대로 저장하면 DB가 한 번 뚫릴 때 모든 계정이 함께 뚫립니다.' },
  'R-server-guard': { when: null, level: null, authority: 'notice',
    plain: '문 앞 안내판(화면의 잠금)은 넘어가면 그만입니다 — 진짜 자물쇠는 서버 쪽에 있어야 해요.' },
  'S-teacher-gate': { when: null, level: null, authority: 'practice',
    plain: '코드에 적힌 관리자 비밀번호는 개발자 도구를 여는 학생 모두에게 공개된 것과 같습니다.' },
  'S-signup-scope': { when: 'studentFacing', level: 'L1', authority: 'notice',
    plain: '링크만 알면 누구나 들어와 우리 반 학생처럼 쓸 수 있다면, 낯선 사람이 학생 기록을 보거나 남길 수 있습니다.' },
  'S-auth-hardening': { when: 'studentFacing', level: 'L1', authority: 'notice',
    plain: '비밀번호를 끝없이 바꿔 넣어 볼 수 있거나 로그인이 한없이 유지되면, 남의 계정이 쉽게 뚫립니다.' },
  'S-api-overfetch': { when: null, level: null, authority: 'guidance',
    plain: '화면엔 이름만 보여도 응답에 연락처까지 실려 오면, 개발자 도구로 다 볼 수 있습니다.' },
  'S-write-guard': { when: null, level: null, authority: 'practice',
    plain: '초대형 낙서를 무한정 쓸 수 있으면 창고가 금방 찹니다 — 크기·형식 제한이 있는지 봅니다.' },
  // ── 3. 비밀·파일 노출 — 저장소·번들·히스토리에 뭐가 들어 있나 ──
  'R-secrets': { when: null, level: 'L0', authority: 'notice',
    plain: '비밀키를 코드에 적는 건 현관 앞에 열쇠를 붙여두는 것과 같습니다 — 누구든 주워 쓸 수 있어요.' },
  'R-admin-data': { when: 'handlesRealData', level: null, authority: 'law',
    plain: '명단 파일을 코드와 함께 올리면 공개 저장소에서 누구나 내려받을 수 있습니다.' },
  'S-answer-exposure': { when: 'hasAssessmentOrCompetition', level: 'L2', authority: 'guidance',
    plain: '정답이 앱 파일에 실려 오면 학생이 F12로 정답지를 통째로 열람할 수 있습니다.' },
  // ── 4. 제3자 전송·추적 — 데이터가 어디로 나가나 ──
  'R-third-party': { when: null, level: 'L2', authority: 'law',
    plain: '앱이 돌아가는 데 필요한 창고(호스팅)로 보내는 건 괜찮지만, 그 밖(분석·광고·외부 AI)으로 나가는 건 근거와 고지가 필요합니다.' },
  'R-llm-input': { when: 'studentFacing', level: 'L2', authority: 'law',
    plain: '학생이 쓴 글이 외부 AI로 나간다면 그 사실을 알리고, 개인정보를 쓰지 말라고 안내해야 합니다.' },
  'S-data-region': { when: 'collectsPersonalInfo', level: 'L1', authority: 'law',
    plain: '데이터가 어느 나라 서버에 있는지에 따라 적용되는 법이 달라집니다 — 정식 도입일수록 국내 저장이 안전합니다.' },
  'S-tracking': { when: 'studentFacing', level: null, authority: 'guidance',
    plain: '학생이 쓰는 앱에 광고·분석 추적 코드가 들어 있으면, 학생의 행동 기록이 광고 회사로 넘어갈 수 있습니다.' },
  // ── 5. 화면·로그 노출 — 눈에 어디까지 보이나 ──
  'S-name-exposure': { when: 'studentFacing', level: null, authority: 'guidance',
    plain: '교실 앞 화면에 이름과 점수가 함께 뜨는 순간, 그것은 반 전체에 공개된 개인정보입니다.' },
  'S-log-pii': { when: 'collectsPersonalInfo', level: 'L1', authority: 'law',
    plain: '콘솔이나 서버 기록에 학생 이름·연락처를 그대로 찍으면, 기록을 볼 수 있는 누구나 개인정보를 보게 됩니다.' },
  'S-shared-device': { when: 'studentFacing', level: 'L1', authority: 'guidance',
    plain: '학교 태블릿은 여럿이 씁니다 — 앞 사람의 기록이 다음 사람에게 보이면 안 돼요.' },
  'S-rank-optout': { when: 'hasAssessmentOrCompetition', level: null, authority: 'practice',
    plain: '순위표에 오르기 싫은 학생도 있습니다. 특정 학생을 빼거나 가릴 수 있어야 상처를 줄일 수 있어요.' },
  // ── 6. 코드 안전 ──
  'S-injection': { when: null, level: 'L0', authority: 'guidance',
    plain: '입력창에 글 대신 몰래 명령을 적어 앱이나 DB를 조종하는 고전적 공격이 통하는지 봅니다.' },
  'S-abuse-limit': { when: null, level: null, authority: 'practice',
    plain: '누군가 요청을 퍼부어 무료 한도를 바닥내면 수업 중에 앱이 멈춥니다.' },
  'S-https': { when: null, level: 'L0', authority: 'notice',
    plain: 'https는 편지를 봉투에 넣는 것 — http는 엽서라서 중간에서 누구나 읽을 수 있어요.' },
  // ── 7. 고지·보유·파기 — 알리고, 지키고, 지우나 ──
  'S-privacy-notice': { when: 'collectsPersonalInfo', level: 'L1', authority: 'law',
    plain: '무엇을, 왜, 언제까지 보관하고 문제가 생기면 누구에게 말하는지를 미리 알려야 합니다.' },
  'H-delete': { when: 'collectsPersonalInfo', level: 'L1', authority: 'law',
    plain: '보호자가 기록 삭제를 요구하면 실제로 지울 수 있어야 합니다 — 랭킹에 이름이 남으면 지운 게 아니에요.' },
  'H-2fa': { when: null, level: null, authority: 'notice',
    plain: '앱을 관리하는 계정이 뚫리면 앱 전체가 뚫립니다.' },
  'H-retention': { when: 'collectsPersonalInfo', level: null, authority: 'law',
    plain: '개인정보는 쓰임이 끝나면 지우는 것이 법의 원칙입니다 — 지울 계획이 있는지 봅니다.' },
  'H-breach-ready': { when: 'collectsPersonalInfo', level: null, authority: 'law',
    plain: '사고가 났을 때 무엇을 언제까지 해야 하는지 모르면, 사고보다 대응 지연이 더 큰 문제가 됩니다.' },
  'H-school-approval': { when: null, level: null, authority: 'law',
    plain: '학습지원 소프트웨어의 학교 도입은 학교운영위원회 심의를 거치도록 법이 정하고 있습니다(초·중등교육법 제29조의2).' },
  'S-ai-transparency': { when: 'showsAiOutput', level: null, authority: 'law',
    plain: 'AI가 만든 글·그림·판정에는 AI가 만들었다는 표시가 있어야 합니다(AI 기본법의 투명성).' },
  'S-ai-fallibility': { when: 'showsAiOutput', level: null, authority: 'guidance',
    plain: '학생이 AI의 채점·평가를 정답으로 믿지 않도록 안내가 필요합니다.' },
  // ── 8. 학생 안전 ──
  'R-crisis': { when: 'studentFacing', level: 'L2', authority: 'guidance',
    plain: '힘든 마음을 털어놓는 앱이라면, 위험 신호가 보일 때 어른에게 닿는 길을 안내해야 합니다.' },
  // ── 9. 교육 적절성 — 수업에 맞게 쓸 수 있나 ──
  'H-edu-fit': { when: 'isLearningContent', level: null, authority: 'guidance',
    plain: '기술이 아니라 교육의 눈으로, 학생을 줄 세우거나 낙인찍는 요소가 없는지 직접 써보고 판단합니다.' },
  'H-standards': { when: 'isLearningContent', level: null, authority: 'guidance',
    plain: '적어낸 수업 목표와 실제 활동이 맞는지 확인합니다.' },
  'H-usability': { when: 'isLearningContent', level: null, authority: 'practice',
    plain: '45분 수업에서 실제로 쓸 수 있는지 봅니다.' },
}

const DEFAULT_REVIEW = { when: null, level: null, authority: 'practice', plain: null }
const ORDER = { required: 0, scored: 1, manual: 2 }

export const rubricItems = core.items
  .map((item) => {
    const review = REVIEW_FIELDS[item.id] || DEFAULT_REVIEW
    return {
      id: item.id,
      type: item.base_severity === 'high' ? 'required' : 'scored',
      aiVerifiable: item.methods.some((m) => m !== 'teacher'),
      category: CATEGORY_KEYS[item.category],
      question: item.question,
      when: review.when,
      level: review.level,
      authority: review.authority,
      plain: review.plain || item.why_risky,
    }
  })
  // 화면 순서: 필수 → AI 판정 점수 항목 → 심사자 수동 항목 (같은 묶음 안에서는 정본의 카테고리 순)
  .map((item, index) => ({ item, index, group: item.type === 'required' ? ORDER.required : item.aiVerifiable ? ORDER.scored : ORDER.manual }))
  .sort((a, b) => a.group - b.group || a.index - b.index)
  .map(({ item }) => item)
