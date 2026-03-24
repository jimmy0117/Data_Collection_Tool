import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { API_BASE, authedFetch, fetchRespondents } from '../utils/api'

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

function AdminDashboardPage() {
  const [subjectCount, setSubjectCount] = useState(0)
  const [checkedCount, setCheckedCount] = useState(0)
  const [questionnaireCount, setQuestionnaireCount] = useState(0)
  const [recordingCount, setRecordingCount] = useState(0)
  const [signatureCount, setSignatureCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setStatus('')
      try {
        const respondents = await fetchRespondents()
        setSubjectCount(respondents.length)
        setCheckedCount(respondents.filter((subject) => (subject.subject_status || 'TEST') === 'CHECKED').length)

        if (respondents.length === 0) {
          setCheckedCount(0)
          setQuestionnaireCount(0)
          setRecordingCount(0)
          setSignatureCount(0)
          return
        }

        const records = await Promise.all(
          respondents.map(async (subject) => {
            const res = await authedFetch(`${API_BASE}/admin/respondents/${subject.id}/records/`)
            if (!res.ok) throw new Error('subject records fetch failed')
            return res.json()
          }),
        )

        const questionnaireTotal = records.reduce((sum, item) => sum + (Array.isArray(item.questionnaires) ? item.questionnaires.length : 0), 0)
        const recordingTotal = records.reduce((sum, item) => sum + (Array.isArray(item.recording_sessions) ? item.recording_sessions.length : 0), 0)
        const signatureTotal = records.reduce((sum, item) => sum + (Array.isArray(item.signatures) ? item.signatures.length : 0), 0)

        setQuestionnaireCount(questionnaireTotal)
        setRecordingCount(recordingTotal)
        setSignatureCount(signatureTotal)
      } catch (err) {
        console.error(err)
        setStatus('管理員儀表板資料載入失敗')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="panel">
      <section className="hero">
        <div>
          <div className="hero-eyebrow">管理員儀表板</div>
          <h1 className="hero-title">總覽</h1>
          <p className="hero-sub">集中查看受測者數量與問卷/錄音/同意書累計狀態。</p>
        </div>
        <div className="hero-time">
          <div className="time-label">系統狀態</div>
          <div className="time-value">ADMIN</div>
        </div>
      </section>

      {loading && <div className="placeholder-desc">載入中…</div>}
      {!loading && status && <div className="placeholder-desc">{status}</div>}

      <div className="grid stats">
        <StatCard title="受測者帳號" value={subjectCount} hint="目前已建立受測者" />
        <StatCard title="已檢驗完成" value={checkedCount} hint="狀態為 CHECKED" />
        <StatCard title="問卷作答總數" value={questionnaireCount} hint="所有受測者累計" />
        <StatCard title="錄音流程總數" value={recordingCount} hint="所有受測者累計" />
        <StatCard title="同意書簽署總數" value={signatureCount} hint="所有受測者累計" />
      </div>

      <section>
        <div className="section-title">快捷操作</div>
        <div className="grid actions">
          <ActionCard title="受測者管理" desc="新增受測者與查看清單" to="/admin/subjects" />
          <ActionCard title="代簽同意書" desc="協助指定受測者簽署" to="/admin/consents" />
          <ActionCard title="代填問卷" desc="協助指定受測者填寫" to="/admin/questionnaires" />
          <ActionCard title="代收錄音" desc="協助指定受測者錄音" to="/admin/recordings" />
        </div>
      </section>
    </div>
  )
}

export default AdminDashboardPage
