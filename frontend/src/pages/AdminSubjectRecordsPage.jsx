import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE, authedFetch } from '../utils/api'

function AdminSubjectRecordsPage() {
  const { subjectId } = useParams()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('載入中…')
  const [loading, setLoading] = useState(true)

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
