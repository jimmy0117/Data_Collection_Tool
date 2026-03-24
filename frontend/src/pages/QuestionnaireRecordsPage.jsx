import { useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

function QuestionnaireRecordsPage() {
  const [qRecords, setQRecords] = useState([])
  const [rRecords, setRRecords] = useState([])
  const [qStatus, setQStatus] = useState('載入中…')
  const [rStatus, setRStatus] = useState('載入中…')
  const [loadingQ, setLoadingQ] = useState(true)
  const [loadingR, setLoadingR] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingSessionId, setDeletingSessionId] = useState(null)

  useEffect(() => {
    const loadQuestionnaires = async () => {
      setLoadingQ(true)
      setQStatus('載入中…')
      try {
        const res = await fetch(`${API_BASE}/questionnaires/`)
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        setQRecords(Array.isArray(data) ? data : [])
        setQStatus(!data || data.length === 0 ? '目前沒有問卷紀錄' : '')
      } catch (err) {
        console.error(err)
        setQStatus('問卷紀錄載入失敗，請稍後再試')
      } finally {
        setLoadingQ(false)
      }
    }

    const loadRecordings = async () => {
      setLoadingR(true)
      setRStatus('載入中…')
      try {
        const res = await fetch(`${API_BASE}/recording-sessions/`)
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        setRRecords(Array.isArray(data) ? data : [])
        setRStatus(!data || data.length === 0 ? '目前沒有錄音紀錄' : '')
      } catch (err) {
        console.error(err)
        setRStatus('錄音紀錄載入失敗，請稍後再試')
      } finally {
        setLoadingR(false)
      }
    }

    loadQuestionnaires()
    loadRecordings()
  }, [])

  const handleDeleteQuestionnaire = async (id) => {
    if (!id) return
    const ok = window.confirm('確定要刪除這筆問卷紀錄嗎？')
    if (!ok) return
    setDeletingId(id)
    try {
      const res = await fetch(`${API_BASE}/questionnaires/${id}/`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('delete failed')
      setQRecords((prev) => prev.filter((item) => item.id !== id))
      setQStatus((prev) => (prev || prev === '' ? prev : ''))
    } catch (err) {
      console.error(err)
      alert('刪除失敗，請稍後再試')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteRecording = async (id) => {
    if (!id) return
    const ok = window.confirm('確定要刪除這筆錄音紀錄嗎？相關片段也會一併刪除。')
    if (!ok) return
    setDeletingSessionId(id)
    try {
      const res = await fetch(`${API_BASE}/recording-sessions/${id}/`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('delete failed')
      setRRecords((prev) => prev.filter((item) => item.id !== id))
      setRStatus((prev) => (prev || prev === '' ? prev : ''))
    } catch (err) {
      console.error(err)
      alert('刪除失敗，請稍後再試')
    } finally {
      setDeletingSessionId(null)
    }
  }

  return (
    <div className="panel">
      <h2>作答與錄音紀錄</h2>
      <p>查看已提交的問卷與已完成的錄音流程。</p>

      <section style={{ marginBottom: '20px' }}>
        <h3>問卷紀錄</h3>
        {loadingQ && <div className="placeholder-desc">{qStatus}</div>}
        {!loadingQ && qStatus && <div className="placeholder-desc">{qStatus}</div>}
        {!loadingQ && qRecords.length > 0 && (
          <div className="clip-list">
            {qRecords.map((item) => {
              const submitted = item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '未知時間'
              const answers = item.answers || {}
              const responses = Array.isArray(answers.responses) ? answers.responses : []
              return (
                <div key={item.id} className="clip-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div className="clip-title">{item.questionnaire_id || '未命名問卷'}</div>
                    <div className="clip-sub">提交時間：{submitted}</div>
                    {answers.age && <div className="clip-sub">年齡：{answers.age}</div>}
                    {answers.gender && <div className="clip-sub">性別：{answers.gender}</div>}
                    {responses.length > 0 && (
                      <div className="clip-sub" style={{ marginTop: '6px' }}>
                        已回答 {responses.length} 題
                      </div>
                    )}
                  </div>
                  <div className="clip-actions" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    {responses.length > 0 && (
                      <>
                        {responses.slice(0, 5).map((resp, idx) => (
                          <div key={`${item.id}-r-${idx}`} className="clip-sub">
                            {resp.question ? `${resp.question}：` : ''}{typeof resp.score === 'number' ? resp.score : resp.answer ?? ''}
                          </div>
                        ))}
                        {responses.length > 5 && <div className="clip-sub">… 其餘 {responses.length - 5} 題</div>}
                      </>
                    )}
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={deletingId === item.id}
                      onClick={() => handleDeleteQuestionnaire(item.id)}
                    >
                      {deletingId === item.id ? '刪除中…' : '刪除問卷'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h3>錄音紀錄</h3>
        {loadingR && <div className="placeholder-desc">{rStatus}</div>}
        {!loadingR && rStatus && <div className="placeholder-desc">{rStatus}</div>}
        {!loadingR && rRecords.length > 0 && (
          <div className="clip-list">
            {rRecords.map((item) => {
              const created = item.created_at ? new Date(item.created_at).toLocaleString() : '未知時間'
              return (
                <div key={item.id} className="clip-row">
                  <div>
                    <div className="clip-title">錄音流程</div>
                    <div className="clip-sub">Session ID：{item.session_id || '未知'}</div>
                    <div className="clip-sub">片段數：{item.clip_count ?? 0}</div>
                    <div className="clip-sub">建立時間：{created}</div>
                  </div>
                  <div className="clip-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={deletingSessionId === item.id}
                      onClick={() => handleDeleteRecording(item.id)}
                    >
                      {deletingSessionId === item.id ? '刪除中…' : '刪除錄音'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default QuestionnaireRecordsPage
