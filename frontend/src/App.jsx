import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import PageShell from './layout/PageShell'
import DashboardPage from './pages/DashboardPage'
import QuestionnairesPage from './pages/QuestionnairesPage'
import QuestionnaireRecordsPage from './pages/QuestionnaireRecordsPage'
import RecordingPage from './pages/RecordingPage'
import ConsentPage from './pages/ConsentPage'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import mockUser from './data/mockUser'

const SESSION_KEY = 'sessionUser'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const saved = window.localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch (err) {
        console.warn('invalid session cache')
      }
    }
  }, [])

  const handleLogin = (payload) => {
    const next = {
      name: payload.name || mockUser.name,
      email: payload.email || mockUser.email,
      role: payload.role || mockUser.role,
    }
    setUser(next)
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  }

  const handleLogout = () => {
    setUser(null)
    window.localStorage.removeItem(SESSION_KEY)
  }

  return (
    <BrowserRouter>
      {user ? (
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
