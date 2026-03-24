import { useMemo, useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

const VHI_ITEMS = [
  '說話時會上氣不接下氣',
  '我的嗓音一天內有不同的變化',
  '大家會問我「你的聲音怎麼了」',
  '我的聲音聽起來沙啞、乾澀',
  '我覺得我必須要用力才能發出聲音',
  '我聲音的清晰度是無法預測、變化多端的',
  '我試著改變我的聲音使他聽起來不同',
  '說話使我感到吃力',
  '傍晚過後我的聲音聽起來更糟',
  '說話說到一半時、聲音會失控失聲',
]

function QuestionnairesPage() {
  const initialAnswers = useMemo(() => {
    const obj = {}
    VHI_ITEMS.forEach((_, idx) => { obj[idx] = '0' })
    obj.age = ''
    obj.gender = ''
    return obj
  }, [])

  const [answers, setAnswers] = useState(initialAnswers)
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    setStatus('')
    try {
      const payload = {
        questionnaire_id: 'vhi-10',
        answers: {
          age: answers.age || '',
          gender: answers.gender || '',
          responses: VHI_ITEMS.map((q, idx) => ({ question: q, score: Number(answers[idx] || 0) })),
        },
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
      <h2>VHI-10 嗓音障礙指標</h2>
      <p>請依目前狀況，為每題選擇嚴重程度 0（不嚴重）到 4（最嚴重）。</p>

      <div className="form-grid" style={{ maxWidth: '800px' }}>
        <label>
          <span>年齡</span>
          <input
            type="number"
            min="0"
            max="120"
            value={answers.age}
            onChange={(e) => setAnswers((p) => ({ ...p, age: e.target.value }))}
            placeholder="請輸入年齡"
          />
        </label>
        <label>
          <span>性別</span>
          <select value={answers.gender} onChange={(e) => setAnswers((p) => ({ ...p, gender: e.target.value }))}>
            <option value="">請選擇</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </label>
        {VHI_ITEMS.map((q, idx) => (
          <label key={q} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
            <span>{`${idx + 1}. ${q}`}</span>
            <div className="radio-row">
              {[0, 1, 2, 3, 4].map((n) => (
                <label key={n} className="radio-item">
                  <input
                    type="radio"
                    name={`vhi-${idx}`}
                    value={String(n)}
                    checked={answers[idx] === String(n)}
                    onChange={(e) => setAnswers((p) => ({ ...p, [idx]: e.target.value }))}
                  />
                  <span>{n}</span>
                </label>
              ))}
            </div>
          </label>
        ))}
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
