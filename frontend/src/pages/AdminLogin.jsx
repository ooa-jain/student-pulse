import { useState } from 'react'

import Decor from '../components/Decor'
import { Icon } from '../lib/icons'
import { api, setToken } from '../lib/api'

export default function AdminLogin({ onAuth }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const res = await api.login(username, password)
      setToken(res.access_token)
      onAuth(res.username)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Decor />
      <div className="login-shell">
        <form className="login-card" onSubmit={submit}>
          <div className="eyebrow">
            <Icon name="shield" /> AI PULSE · CONTROL ROOM
          </div>
          <h2>Admin sign-in</h2>
          <p className="s">Office of Academics · JAIN (Deemed-to-be University)</p>

          <div className="field">
            <label className="fl" htmlFor="u">
              <Icon name="user" /> USERNAME
            </label>
            <input
              id="u"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="fl" htmlFor="p">
              <Icon name="lock" /> PASSWORD
            </label>
            <input
              id="p"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && <p className="err">{err}</p>}

          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Checking…' : 'Enter dashboard'} <Icon name="arrow" />
          </button>
        </form>
      </div>
    </>
  )
}
