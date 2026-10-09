// 검사 진행 표시 — 첫 화면의 심사 도장 고리가 그대로 진행 고리가 된다.
// 진행률을 아는 단계(파일 내려받기·묶음 분석)는 고리가 차오르고, 모르는 단계는 고리가 돈다.
const R = 34
const CIRCUMFERENCE = 2 * Math.PI * R

export default function ScanProgress({ title, steps = [], step = 0, percent = null, detail }) {
  const known = Number.isFinite(percent)
  const offset = known ? CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, percent)) / 100) : CIRCUMFERENCE * 0.7

  return (
    <div className="scan" role="status" aria-live="polite">
      <div className={known ? 'scan-ring' : 'scan-ring is-spinning'} aria-hidden="true">
        <svg viewBox="0 0 80 80">
          <circle className="scan-ring-track" cx="40" cy="40" r={R} />
          <circle className="scan-ring-arc" cx="40" cy="40" r={R} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} />
        </svg>
        <span className="scan-ring-label">{known ? `${percent}%` : `${Math.min(step + 1, steps.length || 1)}/${steps.length || 1}`}</span>
      </div>
      <div className="scan-body">
        <strong className="scan-title">{title}</strong>
        <ol className="scan-steps">
          {steps.map((label, i) => {
            const state = i < step ? 'is-done' : i === step ? 'is-active' : 'is-waiting'
            return (
              <li key={label} className={state}>
                <span className="scan-mark" aria-hidden="true">{i < step ? '✓' : ''}</span>
                <span>
                  {label}
                  {i === step && detail && <span className="scan-detail">{detail}</span>}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="hint">진행 중에는 이 화면을 닫거나 새로고침하지 마세요.</p>
      </div>
    </div>
  )
}
