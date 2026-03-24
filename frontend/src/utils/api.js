export const API_BASE = 'http://localhost:8000/api'

export const getSessionToken = () => {
  try {
    const saved = window.localStorage.getItem('sessionUser')
    if (!saved) return ''
    const parsed = JSON.parse(saved)
    return parsed?.token || ''
  } catch (err) {
    console.warn('invalid session cache')
    return ''
  }
}

export const getSessionUser = () => {
  try {
    const saved = window.localStorage.getItem('sessionUser')
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return parsed?.user || null
  } catch (err) {
    console.warn('invalid session cache')
    return null
  }
}

export const isAdminUser = () => {
  const user = getSessionUser()
  return user?.role === 'admin'
}

export const authHeaders = (headers = {}) => {
  const token = getSessionToken()
  if (!token) return { ...headers }
  return { ...headers, Authorization: `Token ${token}` }
}

export const authedFetch = (url, options = {}) => {
  const mergedHeaders = authHeaders(options.headers || {})
  return fetch(url, { ...options, headers: mergedHeaders })
}

export const fetchRespondents = async () => {
  const res = await authedFetch(`${API_BASE}/admin/respondents/`)
  if (!res.ok) throw new Error('無法載入受測者清單')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
