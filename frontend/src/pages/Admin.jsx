import { useEffect, useState } from 'react'

import AdminDashboard from './AdminDashboard'
import AdminLogin from './AdminLogin'
import { api, getToken } from '../lib/api'

export default function Admin() {
  const [username, setUsername] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      setChecked(true)
      return
    }
    api
      .me()
      .then((u) => setUsername(u.username))
      .catch(() => setUsername(null))
      .finally(() => setChecked(true))
  }, [])

  if (!checked)
    return (
      <div className="empty" style={{ paddingTop: 120 }}>
        <div className="spin" />
      </div>
    )

  return username ? (
    <AdminDashboard username={username} onLogout={() => setUsername(null)} />
  ) : (
    <AdminLogin onAuth={setUsername} />
  )
}
