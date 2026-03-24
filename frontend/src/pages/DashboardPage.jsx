import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { API_BASE, authedFetch } from '../utils/api'

function StatCard({ title, value, hint }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
      <div className="stat-hint">{hint}</div>
    </div>
  )
}

function ActionCard({ title, desc, to }) {
  return (
    <NavLink to={to} className="action-card">
      <div>
        <div className="action-title">{title}</div>
        <div className="action-desc">{desc}</div>
      </div>
      <span className="arrow">→</span>
    </NavLink>
  )
}

function DashboardPage() {
  const totalConsents = 2
  const [signedConsents, setSignedConsents] = useState(0)
  const [questionnaireCount, setQuestionnaireCount] = useState(0)
  const [recordingCount, setRecordingCount] = useState(0)
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    const saved = window.localStorage.getItem('sessionUser')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setUserName(parsed?.user?.username || parsed?.user?.name || 'User')
      } catch (err) {
        console.warn('invalid session cache')
      }
    }

    authedFetch(`${API_BASE}/signatures/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setSignedConsents(data.length))
      .catch(() => setSignedConsents(0))

    authedFetch(`${API_BASE}/questionnaires/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setQuestionnaireCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setQuestionnaireCount(0))

    authedFetch(`${API_BASE}/recording-sessions/`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setRecordingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setRecordingCount(0))
  }, [])

  return (
    <div className="panel">
      <section className="hero">
        <div>
          <div className="hero-eyebrow">您好</div>
          <h1 className="hero-title">{userName}</h1>
          <p className="hero-sub">歡迎使用嗓音檢測分析平台，以下是您的個人概要。</p>
        </div>
        <div className="hero-time">
          <div className="time-label">目前狀態</div>
          <div className="time-value">TEST</div>
        </div>
      </section>

      <div className="grid stats">
        <StatCard
          title="資料授權與同意書"
          value={`${signedConsents}/${totalConsents}`}
          hint={signedConsents >= totalConsents ? '已完成簽署' : '尚未簽署完'}
        />
        <StatCard title="我的分析報告" value="0" hint="尚未建立報告" />
        <StatCard title="問卷作答次數" value={questionnaireCount} hint={questionnaireCount > 0 ? '已填寫問卷' : '等待填寫'} />
        <StatCard title="錄音上傳" value={recordingCount} hint={recordingCount > 0 ? '已完成錄音流程' : '尚未上傳'} />
      </div>

      <section>
        <div className="section-title">快捷操作</div>
        <div className="grid actions">
          <ActionCard title="資料授權" desc="先完成同意書簽署" to="/consents" />
          <ActionCard title="填寫問卷" desc="完成預設的篩檢問卷" to="/questionnaires" />
          <ActionCard title="開始錄音" desc="依指示錄製音檔" to="/recordings" />
          <ActionCard title="檢視報告" desc="查看您的耳相分析與睡眠評估" to="/dashboard" />
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
