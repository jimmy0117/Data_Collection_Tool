import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE, authedFetch } from '../utils/api'

function AdminSubjectRecordsPage() {
  const { subjectId } = useParams()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('載入中…')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setStatus('載入中…')
      try {
        const res = await authedFetch(`${API_BASE}/admin/respondents/${subjectId}/records/`)
        if (!res.ok) throw new Error('fetch failed')
        const payload = await res.json()
        setData(payload)
        setStatus('')
      } catch (err) {
        console.error(err)
        setStatus('載入受測者紀錄失敗')
      } finally {
        setLoading(false)
      }
    }
    if (subjectId) load()
  }, [subjectId])

  const handleDeleteQuestionnaire = async (submissionId) => {
    if (!subjectId) return
    const ok = window.confirm('確定要刪除此問卷紀錄嗎？')
    if (!ok) return

    setDeletingId(`q-${submissionId}`)
    setStatus('刪除中…')
    try {
      const res = await authedFetch(`${API_BASE}/admin/respondents/${subjectId}/questionnaires/${submissionId}/`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete failed')

      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          questionnaires: Array.isArray(prev.questionnaires)
            ? prev.questionnaires.filter((item) => String(item.id) !== String(submissionId))
            : [],
        }
      })
      setStatus('已刪除問卷紀錄')
    } catch (err) {
      console.error(err)
      setStatus('刪除問卷紀錄失敗')
    } finally {
      setDeletingId('')
    }
  }

  const handleDeleteRecordingSession = async (sessionId) => {
    if (!subjectId) return
    const ok = window.confirm('確定要刪除此錄音流程紀錄嗎？（同 session 片段也會刪除）')
    if (!ok) return

    setDeletingId(`r-${sessionId}`)
    setStatus('刪除中…')
    try {
      const res = await authedFetch(`${API_BASE}/admin/respondents/${subjectId}/recording-sessions/${sessionId}/`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete failed')

      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          recording_sessions: Array.isArray(prev.recording_sessions)
            ? prev.recording_sessions.filter((item) => String(item.id) !== String(sessionId))
            : [],
        }
      })
      setStatus('已刪除錄音紀錄')
    } catch (err) {
      console.error(err)
      setStatus('刪除錄音紀錄失敗')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="panel">
      <h2>受測者紀錄</h2>
      {loading && <div className="placeholder-desc">{status}</div>}
      {!loading && status && <div className="placeholder-desc">{status}</div>}
      {!loading && data && (
        <>
          <p>受測者：{data?.subject?.name || data?.subject?.username || '未知'}</p>
          <p className="placeholder-desc">username：{data?.subject?.username || '未知'}</p>

          <section style={{ marginTop: '14px' }}>
            <h3>問卷紀錄</h3>
            {Array.isArray(data.questionnaires) && data.questionnaires.length > 0 ? (
              <div className="clip-list">
                {data.questionnaires.map((item) => {
                  const responses = Array.isArray(item?.answers?.responses) ? item.answers.responses : []
                  return (
                    <div key={item.id} className="clip-row" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div className="clip-title">{item.questionnaire_id || '未命名問卷'}</div>
                        <div className="clip-sub">提交時間：{item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '未知'}</div>
                        <div className="clip-sub">操作者：{item.created_by_username || '受測者本人'}</div>
                      </div>
                      <div className="clip-actions" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        {responses.slice(0, 5).map((resp, idx) => (
                          <div key={`${item.id}-${idx}`} className="clip-sub">
                            {resp.question ? `${resp.question}：` : ''}{typeof resp.score === 'number' ? resp.score : resp.answer ?? ''}
                          </div>
                        ))}
                        {responses.length > 5 && <div className="clip-sub">… 其餘 {responses.length - 5} 題</div>}
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => handleDeleteQuestionnaire(item.id)}
                          disabled={deletingId === `q-${item.id}`}
                        >
                          {deletingId === `q-${item.id}` ? '刪除中…' : '刪除'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="placeholder-desc">目前沒有問卷紀錄</div>
            )}
          </section>

          <section style={{ marginTop: '14px' }}>
            <h3>錄音紀錄</h3>
            {Array.isArray(data.recording_sessions) && data.recording_sessions.length > 0 ? (
              <div className="clip-list">
                {data.recording_sessions.map((item) => (
                  <div key={item.id} className="clip-row">
                    <div>
                      <div className="clip-title">錄音流程</div>
                      <div className="clip-sub">Session ID：{item.session_id || '未知'}</div>
                      <div className="clip-sub">片段數：{item.clip_count ?? 0}</div>
                      <div className="clip-sub">建立時間：{item.created_at ? new Date(item.created_at).toLocaleString() : '未知'}</div>
                      <div className="clip-sub">操作者：{item.created_by_username || '受測者本人'}</div>
                    </div>
                    <div className="clip-actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => handleDeleteRecordingSession(item.id)}
                        disabled={deletingId === `r-${item.id}`}
                      >
                        {deletingId === `r-${item.id}` ? '刪除中…' : '刪除'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder-desc">目前沒有錄音紀錄</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default AdminSubjectRecordsPage
