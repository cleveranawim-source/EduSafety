import { useState } from 'react'
import ReviewMode from './components/ReviewMode.jsx'
import ReviewLedger from './components/ReviewLedger.jsx'
import AboutPage from './components/AboutPage.jsx'
import SkillPage from './components/SkillPage.jsx'
import SecurityAuditPage from './components/SecurityAuditPage.jsx'

// 순서가 곧 흐름이다 — 교사가 먼저 스스로 점검하고(스킬), 그다음 심사를 받는다.
// 세 도구는 앱의 일생(만들 때·인증할 때·운영할 때)에 하나씩이고, 도구마다 색이 고정이다.
const TABS = [
  { key: 'about', icon: '🏠', label: '소개', tone: 'home' },
  { key: 'skill', icon: '🧰', label: '스킬', note: '만들 때, 거울', tone: 'skill' },
  { key: 'review', icon: '⚖️', label: '심사', note: '인증할 때, 저울', tone: 'review' },
  { key: 'security', icon: '🔎', label: 'URL 검사', note: '운영할 때, 검진', tone: 'url' },
  { key: 'ledger', icon: '📚', label: '심사 기록', tone: 'home' },
]

export default function App() {
  const [view, setView] = useState('about')

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="logo" onClick={() => setView('about')}>
          <span className="logo-mark" aria-hidden="true">🛡️</span>
          <span className="logo-text">
            <strong>에듀 세이프</strong>
            <span className="logo-sub">교사 제작 앱 심사·검수 시스템</span>
          </span>
        </button>
        <nav className="tabs" aria-label="주 메뉴">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              className={`tab tone-${t.tone}${view === t.key ? ' active' : ''}`}
              aria-pressed={view === t.key}
              onClick={() => setView(t.key)}
            >
              <span className="tab-icon" aria-hidden="true">{t.icon}</span>
              <span className="tab-text">
                <span className="tab-label">{t.label}</span>
                {t.note && <small className="tab-note">{t.note}</small>}
              </span>
            </button>
          ))}
        </nav>
      </header>

      {/* 앱 화면은 어두운 유리 패널, 인쇄해 제출하는 문서(보고서·요청서·검사 결과)만 흰 종이 */}
      <main className="main">
        {view === 'about' ? (
          <AboutPage onStart={() => setView('review')} onGo={setView} />
        ) : (
          <div className={`sheet tone-${TABS.find((t) => t.key === view)?.tone || 'home'}`}>
            {view === 'skill' && <SkillPage />}
            {view === 'review' && <ReviewMode />}
            {view === 'security' && <SecurityAuditPage />}
            {view === 'ledger' && <ReviewLedger />}
          </div>
        )}
      </main>

      <footer className="footer">
        에듀 세이프 — AI 판정은 초안이며 최종 판정 권한은 심사자에게 있습니다. · 도전형 해커톤 출품작 (팀 「우매함의 봉우리」 — 덕수고 김용훈, 증산중 서호성, 명지중 이승열)
      </footer>
    </div>
  )
}
