import { NavLink } from 'react-router-dom'
import '../App.css'

const navItems = [
  { path: '/dashboard', label: '儀表板' },
  { path: '/consents', label: '資料授權' },
  { path: '/questionnaires', label: '問卷填寫' },
  { path: '/recordings', label: '錄音收案' },
  { path: '/questionnaire-records', label: '作答紀錄' },
  { path: '/account', label: '帳號管理' },
]

function PageShell({ user, onLogout, children }) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-nav">
          <div className="brand">
            <span className="brand-mark">喉</span>
            <div>
              <div className="brand-name">嗓音檢測分析平台</div>
              <div className="brand-sub">研究用 Version0.4</div>
            </div>
          </div>
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                <span className="bullet" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="user-chip">
          <div className="avatar">{(user?.username || user?.name || 'U')?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.username || user?.name || 'User'}</div>
            <div className="user-role">{user?.role || '角色'}</div>
          </div>
          {onLogout && (
            <button type="button" className="ghost-btn logout-btn" onClick={onLogout}>
              登出
            </button>
          )}
        </div>
      </header>

      <div className="shell-body">
        <main className="content">{children}</main>
      </div>
    </div>
  )
}

export default PageShell
