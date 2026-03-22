import { useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

function QuestionnairesPage() {
  const [answers, setAnswers] = useState({ mood: '良好', feedback: '' })
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    setStatus('')
    try {
      const payload = {
        questionnaire_id: 'demo-onboarding-1',
        answers,
      }
      const res = await fetch(`${API_BASE}/questionnaires/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('submit failed')
      setStatus('已送出')
    } catch (err) {
      console.error(err)
      setStatus('提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel">
      <h2>問卷填寫</h2>
      <p>示意版問卷：提交後會儲存到後端。</p>

      <div className="form-grid" style={{ maxWidth: '640px' }}>
        <label>
          <span>今日狀態</span>
          <select value={answers.mood} onChange={(e) => setAnswers((p) => ({ ...p, mood: e.target.value }))}>
            <option value="良好">良好</option>
            <option value="普通">普通</option>
            <option value="需要支持">需要支持</option>
          </select>
        </label>
        <label>
          <span>意見回饋</span>
          <textarea
            rows={4}
            value={answers.feedback}
            onChange={(e) => setAnswers((p) => ({ ...p, feedback: e.target.value }))}
            placeholder="寫下任何想告訴研究團隊的想法"
          />
        </label>
        <div className="form-actions">
          <button type="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? '送出中…' : '送出問卷'}
          </button>
          {status && <span className="status-pill">{status}</span>}
        </div>
      </div>
    </div>
  )
}

export default QuestionnairesPage
