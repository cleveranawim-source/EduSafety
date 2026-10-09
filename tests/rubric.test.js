import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { rubricItems, FEATURES, CATEGORIES, AUTHORITY_LABELS, featureProfile, REVIEW_FIELDS, RUBRIC_VERSION } from '../src/data/rubric.js'
import rules from '../src/data/securityRules.js'
import { MOE_CRITERIA } from '../src/data/moeCriteria.js'

const skill = JSON.parse(readFileSync('skill/edusafe/rules/items.json', 'utf8'))
const skillVersion = JSON.parse(readFileSync('skill/edusafe/rules/version.json', 'utf8'))

describe('단일 심사 기준 — 웹앱과 스킬이 같은 정본을 쓴다 (core-2)', () => {
  it('웹앱 항목 = 스킬 items.json 항목 (id·질문·필수 여부·분류가 그대로)', () => {
    expect(RUBRIC_VERSION).toBe('core-2')
    expect(skillVersion.rubric_version).toBe(RUBRIC_VERSION)
    expect(rubricItems.map((i) => i.id).sort()).toEqual(skill.items.map((i) => i.id).sort())
    for (const s of skill.items) {
      const w = rubricItems.find((i) => i.id === s.id)
      expect(w.question).toBe(s.question)
      expect(w.type).toBe(s.base_severity === 'high' ? 'required' : 'scored')
      expect(w.aiVerifiable).toBe(s.methods.some((m) => m !== 'teacher'))
    }
  })

  it('모든 항목에 심사 화면 정보(적용 조건·보호 수준·법적 무게·쉬운 설명)가 있고, 정본에 없는 항목 정보는 없다', () => {
    expect(Object.keys(REVIEW_FIELDS).sort()).toEqual(skill.items.map((i) => i.id).sort())
  })

  it('스캔 규칙·교육부 대조표가 가리키는 항목은 모두 정본에 있다', () => {
    const ids = new Set(skill.items.map((i) => i.id))
    expect(rules.filter((r) => r.ruleFor && !ids.has(r.ruleFor)).map((r) => r.id)).toEqual([])
    expect(MOE_CRITERIA.flatMap((c) => c.items).filter((id) => !ids.has(id))).toEqual([])
  })
})

describe('루브릭 무결성 (core-2)', () => {
  it('id 중복 없음, 총 42항목', () => {
    const ids = rubricItems.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(rubricItems.length).toBe(42)
  })

  it('모든 항목 필드 유효 (when·level·question·plain·authority·category 포함)', () => {
    for (const it of rubricItems) {
      expect(it.when === null || Object.keys(FEATURES).includes(it.when)).toBe(true)
      expect([null, 'L0', 'L1', 'L2']).toContain(it.level)
      expect(['required', 'scored']).toContain(it.type)
      expect(typeof it.aiVerifiable).toBe('boolean')
      expect(it.question.length).toBeGreaterThan(5)
      expect(it.plain.length).toBeGreaterThan(10)
      expect(Object.keys(AUTHORITY_LABELS)).toContain(it.authority)
      expect(Object.keys(CATEGORIES)).toContain(it.category)
    }
  })

  it('필수 15개 · 수동 7개 · 공통(무조건 적용) 15개', () => {
    expect(rubricItems.filter((i) => i.type === 'required').length).toBe(15)
    expect(rubricItems.filter((i) => !i.aiVerifiable).length).toBe(7)
    expect(rubricItems.filter((i) => i.when === null).length).toBe(15)
  })

  it('통합 반영 확인 — 이름 통일·흡수·승격', () => {
    const ids = new Set(rubricItems.map((i) => i.id))
    // 이름 통일 (스킬 이름 채택)
    expect(ids.has('S-injection')).toBe(true)
    expect(ids.has('S-xss')).toBe(false)
    expect(ids.has('S-abuse-limit')).toBe(true)
    expect(ids.has('R-third-party')).toBe(true)
    expect(ids.has('R-admin-ext')).toBe(false)
    // 흡수 (S-consent+S-notice → S-privacy-notice)
    expect(ids.has('S-privacy-notice')).toBe(true)
    expect(ids.has('S-consent')).toBe(false)
    expect(ids.has('S-notice')).toBe(false)
    // 코어 승격 8건
    for (const id of ['S-upload-exposure', 'S-password-storage', 'R-server-guard', 'S-name-exposure', 'S-api-overfetch', 'H-breach-ready', 'H-school-approval', 'S-teacher-gate']) {
      expect(ids.has(id)).toBe(true)
    }
    // 상 ↔ 필수 정렬 — core-2에서 한쪽이라도 필수로 본 항목은 필수
    expect(rubricItems.find((i) => i.id === 'S-sensitive').type).toBe('required')
    expect(rubricItems.find((i) => i.id === 'S-access').type).toBe('required')
    expect(rubricItems.find((i) => i.id === 'R-llm-input').type).toBe('required')
    // 스킬에서 들어온 5개 (core-1에서 2차 후보로 보류했던 항목)
    for (const id of ['S-signup-scope', 'S-auth-hardening', 'S-tracking', 'S-log-pii', 'S-rank-optout']) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('L0 공통 기본선은 조건 없이 모든 앱에 적용된다', () => {
    for (const it of rubricItems.filter((i) => i.level === 'L0')) {
      expect(it.when).toBe(null)
    }
  })

  it('공통 항목에 필수가 포함된다 — 기능이 하나도 없어도 최소선은 심사된다', () => {
    expect(rubricItems.some((i) => i.when === null && i.type === 'required')).toBe(true)
  })

  it('교육 적절성 분류는 수동 항목만 (사람 심사 영역)', () => {
    for (const it of rubricItems.filter((i) => i.category === 'education')) {
      expect(it.aiVerifiable).toBe(false)
    }
  })

  it('기능 프로파일 문자열 — 활성 기능 요약', () => {
    expect(featureProfile({ studentFacing: true, handlesRealData: true })).toBe('학생 대면 · 실데이터 취급')
    expect(featureProfile({})).toContain('공통 기준만')
  })
})
