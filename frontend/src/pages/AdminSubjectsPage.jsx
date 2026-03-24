import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { API_BASE, authedFetch, fetchRespondents } from '../utils/api'

function AdminSubjectsPage() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [listStatus, setListStatus] = useState('')
  const [createStatus, setCreateStatus] = useState('')
  const [resettingId, setResettingId] = useState(null)
  const [checkingId, setCheckingId] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', name: '' })

  const loadSubjects = async () => {
    setLoading(true)
    setListStatus('')
    try {
      const data = await fetchRespondents()
      setSubjects(data)
      if (!data.length) setListStatus('目前沒有受測者帳號')
    } catch (err) {
      console.error(err)
      setListStatus('受測者清單載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  const handleCreate = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setCreateStatus('請填寫受測者帳號與初始密碼')
      return
    }
    setCreating(true)
    setCreateStatus('')
    try {
      const res = await authedFetch(`${API_BASE}/admin/respondents/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          name: form.name.trim(),
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'create failed')
      }
      setForm({ username: '', password: '', name: '' })
      setCreateStatus('受測者帳號已建立')
      await loadSubjects()
    } catch (err) {
      console.error(err)
      setCreateStatus('建立受測者失敗，請確認帳號是否重複')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (subject) => {
    const newPassword = window.prompt(`請輸入 ${subject.username} 的新密碼`)
    if (newPassword === null) return

    setResettingId(subject.id)
    setListStatus('')
    try {
      const res = await authedFetch(`${API_BASE}/admin/respondents/${subject.id}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'reset failed')
      }
      setListStatus(`${subject.username} 的密碼已重設`)
    } catch (err) {
      console.error(err)
      setListStatus(`重設 ${subject.username} 密碼失敗`)
    } finally {
      setResettingId(null)
    }
  }

  const handleMarkChecked = async (subject) => {
    setCheckingId(subject.id)
    setListStatus('')
    try {
      const res = await authedFetch(`${API_BASE}/admin/respondents/${subject.id}/mark-checked/`, {
        method: 'POST',
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'mark checked failed')
      }
      setListStatus(`${subject.username} 已標記為 CHECKED`)
      await loadSubjects()
    } catch (err) {
      console.error(err)
      setListStatus(`標記 ${subject.username} 為 CHECKED 失敗`)
    } finally {
      setCheckingId(null)
    }
  }

  const handleRestoreDone = async (subject) => {
    setRestoringId(subject.id)
    setListStatus('')
    try {
      const res = await authedFetch(`${API_BASE}/admin/respondents/${subject.id}/mark-done/`, {
        method: 'POST',
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'restore done failed')
      }
      setListStatus(`${subject.username} 已復原為 DONE`)
      await loadSubjects()
    } catch (err) {
      console.error(err)
      setListStatus(`復原 ${subject.username} 為 DONE 失敗`)
    } finally {
      setRestoringId(null)
    }
  }

  const checkedSubjects = subjects.filter((subject) => (subject.subject_status || 'TEST') === 'CHECKED')
  const activeSubjects = subjects.filter((subject) => (subject.subject_status || 'TEST') !== 'CHECKED')

  return (
    <>
      <div className="panel">
        <h2>受測者管理</h2>
        <p>管理員可建立受測者帳號，並進入代填問卷、代收錄音或查看紀錄。</p>

        <section style={{ marginTop: '12px' }}>
          <div className="form-actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 0 }}>
            <h3 style={{ margin: 0 }}>受測者清單</h3>
            <button type="button" className="ghost-btn" onClick={loadSubjects} disabled={loading}>
              {loading ? '載入中…' : '重新整理清單'}
            </button>
          </div>
          {!loading && listStatus && <div className="status-pill" style={{ marginTop: '8px' }}>{listStatus}</div>}
          {loading && <div className="placeholder-desc">載入中…</div>}
          {!loading && activeSubjects.length === 0 && <div className="placeholder-desc">沒有資料</div>}
          {!loading && activeSubjects.length > 0 && (
            <div className="clip-list">
              {activeSubjects.map((subject) => {
                const status = subject.subject_status || 'TEST'
                return (
                <div key={subject.id} className="clip-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <span className={`status-pill ${status === 'DONE' || status === 'CHECKED' ? 'ok' : ''}`} style={{ marginBottom: '6px' }}>
                      {status}
                    </span>
                    <div className="clip-title">{subject.name || subject.username}</div>
                    <div className="clip-sub">username：{subject.username}</div>
                    <div className="clip-sub">建立時間：{subject.date_joined ? new Date(subject.date_joined).toLocaleString() : '未知'}</div>
                  </div>
                  <div className="consent-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {status === 'DONE' && (
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={checkingId === subject.id}
                        onClick={() => handleMarkChecked(subject)}
                      >
                        {checkingId === subject.id ? '確認中…' : '已確認'}
                      </button>
                    )}
                    <button type="button" className="ghost-btn" disabled={resettingId === subject.id} onClick={() => handleResetPassword(subject)}>
                      {resettingId === subject.id ? '重設中…' : '重設密碼'}
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => navigate(`/admin/consents?subject=${subject.id}`)}>
                      代簽同意書
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => navigate(`/admin/questionnaires?subject=${subject.id}`)}>
                      代填問卷
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => navigate(`/admin/recordings?subject=${subject.id}`)}>
                      代收錄音
                    </button>
                    <NavLink className="nav-link" to={`/admin/subjects/${subject.id}/records`}>
                      <span className="bullet" />
                      查看紀錄
                    </NavLink>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <h3 style={{ marginTop: 0 }}>已完成清單</h3>
        <p className="placeholder-desc">此處僅顯示 CHECKED 狀態受測者，可復原為 DONE 狀態。</p>
        {checkedSubjects.length === 0 ? (
          <div className="placeholder-desc">目前沒有 CHECKED 狀態受測者</div>
        ) : (
          <div className="clip-list">
            {checkedSubjects.map((subject) => (
              <div key={`checked-${subject.id}`} className="clip-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <span className="status-pill ok" style={{ marginBottom: '6px' }}>CHECKED</span>
                  <div className="clip-title">{subject.name || subject.username}</div>
                  <div className="clip-sub">username：{subject.username}</div>
                </div>
                <div className="consent-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={restoringId === subject.id}
                    onClick={() => handleRestoreDone(subject)}
                  >
                    {restoringId === subject.id ? '復原中…' : '復原為 DONE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: '16px' }}>
        <h3 style={{ marginTop: 0 }}>建立受測者帳號</h3>
        <div className="form-grid" style={{ maxWidth: '700px', marginTop: '8px' }}>
          <label>
            <span>受測者帳號（username）*</span>
            <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
          </label>
          <label>
            <span>初始密碼 *</span>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </label>
          <label>
            <span>顯示姓名（選填）</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <div className="form-actions">
            <button type="button" onClick={handleCreate} disabled={creating}>
              {creating ? '建立中…' : '新增受測者'}
            </button>
            {createStatus && <span className="status-pill">{createStatus}</span>}
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminSubjectsPage
