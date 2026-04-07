import { NavLink } from 'react-router-dom'
import '../App.css'

const navItems = [
  { path: '/admin/dashboard', label: '儀表板' },
  { path: '/admin/subjects', label: '受測者管理' },
  { path: '/admin/consents', label: '代簽同意書' },
  { path: '/admin/questionnaires', label: '代填問卷' },
  { path: '/admin/recordings', label: '代收錄音' },
]

function AdminShell({ user, onLogout, children }) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-nav">
          <div className="brand">
            <span className="brand-mark">喉</span>
            <div>
              <div className="brand-name">嗓音檢測分析平台</div>
              <div className="brand-sub">管理員介面 Version0.4</div>
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
          <div className="avatar">A</div>
          <div>
            <div className="user-name">{user?.username || 'admin'}</div>
            <div className="user-role">管理員</div>
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

export default AdminShell
