import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mockUser from '../data/mockUser'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(mockUser.email)
  const [name, setName] = useState(mockUser.name)
  const [role, setRole] = useState(mockUser.role)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = '登入 · 嗓音檢測平台'
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus('')
    setTimeout(() => {
      onLogin?.({ email, name, role })
      setStatus('已登入')
      navigate('/dashboard', { replace: true })
      setLoading(false)
    }, 200)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">嗓音檢測分析平台</div>
        <p className="auth-sub">請先登入以繼續操作</p>
        <form className="form-grid" onSubmit={handleSubmit} style={{ maxWidth: '420px' }}>
          <label>
            <span>姓名</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="研究助理" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </label>
          <label>
            <span>角色</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="研究員 / 助理" />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? '登入中…' : '登入'}
            </button>
            {status && <span className="status-pill">{status}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
