const BASE = import.meta.env.VITE_API_BASE || ''

const TOKEN_KEY = 'aipulse_admin_token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t) => {
  try {
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && auth) {
    setToken(null)
    throw new Error('Session expired — please sign in again.')
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') msg = data.detail
      else if (Array.isArray(data.detail)) msg = data.detail.map((d) => d.msg).join(', ')
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  meta: () => request('/api/meta'),
  pulse: () => request('/api/pulse'),
  submit: (payload) => request('/api/submit', { method: 'POST', body: payload }),
  login: (username, password) =>
    request('/api/admin/login', { method: 'POST', body: { username, password } }),
  me: () => request('/api/admin/me', { auth: true }),
  stats: () => request('/api/admin/stats', { auth: true }),
  responses: (params) =>
    request(`/api/admin/responses?${new URLSearchParams(params)}`, { auth: true }),
  remove: (id) => request(`/api/admin/responses/${id}`, { method: 'DELETE', auth: true }),
  exportUrl: (anonymise) =>
    `${BASE}/api/admin/export.csv?anonymise=${anonymise ? 'true' : 'false'}`,
}

export async function downloadCsv(anonymise) {
  const res = await fetch(api.exportUrl(anonymise), {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-pulse-${anonymise ? 'anonymised' : 'full'}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
