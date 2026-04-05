import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

const API_BASE = ''

type User = {
  email: string
  dob: string
  phone: string
  createdAt: string
}

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('smart_parking_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }

    setStatus('Restoring your session...')
    fetch(`${API_BASE}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error((await res.json()).message || 'Session expired')
        }
        return res.json()
      })
      .then((data) => {
        setUser(data.user)
        setStatus('')
      })
      .catch(() => {
        localStorage.removeItem('smart_parking_token')
        setToken('')
        setUser(null)
        setStatus('Please sign in to continue.')
      })
  }, [token])

  const saveToken = (newToken: string) => {
    localStorage.setItem('smart_parking_token', newToken)
    setToken(newToken)
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setDob('')
    setPhone('')
  }

  const handleApiError = async (res: Response) => {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || res.statusText || 'Unknown error')
  }

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Creating account...')
    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, dob, phone }),
      })
      if (!res.ok) await handleApiError(res)
      const data = await res.json()
      saveToken(data.token)
      setUser(data.user)
      setStatus('Welcome! Your account is ready.')
      resetForm()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to sign up')
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Signing in...')
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) await handleApiError(res)
      const data = await res.json()
      saveToken(data.token)
      setUser(data.user)
      setStatus('Signed in successfully.')
      resetForm()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to sign in')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <h1>Smart Parking</h1>
          <p>Persistent login across devices with secure signup and login.</p>
        </div>

        {status && <div className="status-message">{status}</div>}

        {user ? (
          <div className="profile-card">
            <h2>Account Overview</h2>
            <div className="profile-item">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="profile-item">
              <span>Date of Birth</span>
              <strong>{user.dob}</strong>
            </div>
            <div className="profile-item">
              <span>Phone</span>
              <strong>{user.phone}</strong>
            </div>
            <div className="profile-item">
              <span>Account created</span>
              <strong>{new Date(user.createdAt).toLocaleString()}</strong>
            </div>
          </div>
        ) : (
          <div>
            <div className="auth-switch">
              <button
                className={authMode === 'login' ? 'active' : ''}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </button>
              <button
                className={authMode === 'signup' ? 'active' : ''}
                type="button"
                onClick={() => setAuthMode('signup')}
              >
                Create Account
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <label>
                  Email address
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
                </label>
                <label>
                  Password
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
                </label>
                <button className="primary-button" type="submit">
                  Sign In
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignup}>
                <label>
                  Email address
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
                </label>
                <label>
                  Password
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required />
                </label>
                <label>
                  Date of birth
                  <input value={dob} onChange={(event) => setDob(event.target.value)} type="date" required />
                </label>
                <label>
                  Phone number
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" required />
                </label>
                <button className="primary-button" type="submit">
                  Create Account
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
