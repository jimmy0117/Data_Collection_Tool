import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import PageShell from './layout/PageShell'
import AdminShell from './layout/AdminShell'
import DashboardPage from './pages/DashboardPage'
import QuestionnairesPage from './pages/QuestionnairesPage'
import QuestionnaireRecordsPage from './pages/QuestionnaireRecordsPage'
import RecordingPage from './pages/RecordingPage'
import ConsentPage from './pages/ConsentPage'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminSubjectsPage from './pages/AdminSubjectsPage'
import AdminSubjectRecordsPage from './pages/AdminSubjectRecordsPage'
const SESSION_KEY = 'sessionUser'

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setUser(parsed.user || null)
        setToken(parsed.token || '')
      } catch (err) {
        console.warn('invalid session cache')
      }
    }
  }, [])

  const handleLogin = (payload) => {
    const nextUser = {
      name: payload.name,
      username: payload.username,
      role: payload.role,
    }
    setUser(nextUser)
    setToken(payload.token || '')
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user: nextUser, token: payload.token || '' }))
  }

  const handleLogout = () => {
    setUser(null)
    setToken('')
    window.localStorage.removeItem(SESSION_KEY)
  }

  return (
    <BrowserRouter>
      {user ? (
        user?.role === 'admin' ? (
          <AdminShell user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
              <Route path="/admin/subjects/:subjectId/records" element={<AdminSubjectRecordsPage />} />
              <Route path="/admin/consents" element={<ConsentPage />} />
              <Route path="/admin/questionnaires" element={<QuestionnairesPage />} />
              <Route path="/admin/recordings" element={<RecordingPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AdminShell>
        ) : (
          <PageShell user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/questionnaires" element={<QuestionnairesPage />} />
              <Route path="/questionnaire-records" element={<QuestionnaireRecordsPage />} />
              <Route path="/recordings" element={<RecordingPage />} />
              <Route path="/consents" element={<ConsentPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </PageShell>
        )
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}

export default App
