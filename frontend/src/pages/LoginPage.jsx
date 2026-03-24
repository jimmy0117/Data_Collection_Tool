import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../utils/api'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = '登入 · 嗓音檢測平台'
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: email, password }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'login failed')
      }
      const data = await res.json()
      onLogin?.({
        name: data?.user?.name || '',
        username: data?.user?.username || '',
        email: data?.user?.email || email,
        role: data?.user?.role || '',
        token: data?.token || '',
      })
      setStatus('已登入')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      setStatus('登入失敗，請確認帳號密碼')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">嗓音檢測分析平台</div>
        <p className="auth-sub">請先登入以繼續操作</p>
        <form className="form-grid" onSubmit={handleSubmit} style={{ maxWidth: '420px' }}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="username"
            />
          </label>
          <label>
            <span>密碼</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              autoComplete="current-password"
            />
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
