import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import './App.css'
import LotMap from './LotMap'
import VehicleManager from './VehicleManager'
import { useNotifications, type AppNotification, type NotificationType } from './useNotifications'

const API_BASE_URL = 'http://localhost:3000'

type AuthPage = 'login' | 'signup'
type AuthView = 'parking' | 'alerts' | 'profile'

const typeIcon: Record<NotificationType, string> = {
  payment: '💳',
  expiry: '⏰',
  ev_disconnect: '⚡',
}

const typeBg: Record<NotificationType, string> = {
  payment: 'bg-emerald-100',
  expiry: 'bg-amber-100',
  ev_disconnect: 'bg-sky-100',
}

function timeAgo(date: Date) {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

interface SignupData {
  email: string
  firstName: string
  middleName: string
  lastName: string
  dob: string
  phone: string
  password: string
}

interface LoginData {
  email: string
  password: string
}

const initialSignupData: SignupData = {
  email: '',
  firstName: '',
  middleName: '',
  lastName: '',
  dob: '',
  phone: '',
  password: '',
}

const initialLoginData: LoginData = {
  email: '',
  password: '',
}

function App() {
  const [page, setPage] = useState<AuthPage>('signup')
  const [signupData, setSignupData] = useState<SignupData>(initialSignupData)
  const [loginData, setLoginData] = useState<LoginData>(initialLoginData)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [view, setView] = useState<AuthView>('parking')

  const { notifications, toasts, notify, markAllRead, clearOne, clearAll, unreadCount, requestPermission } = useNotifications()
  // Tracks which (sessionId, threshold) pairs have already fired, e.g. "42-5", "42-expired"
  const notifiedExpiry = useRef(new Set<string>())

  // Request browser notification permission when user logs in
  useEffect(() => {
    if (authenticated) requestPermission()
  }, [authenticated, requestPermission])

  // Poll active sessions every 30s and fire expiry warnings at 30, 15, 5, 1 min and expiry
  useEffect(() => {
    if (!authenticated || !userId) return

    const THRESHOLDS = [30, 15, 5, 1] // minutes, checked largest-first

    const checkSessions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sessions/active?userId=${userId}`)
        if (!res.ok) return
        const sessions: { id: number; minutes_left: number; spot_label: string; lot_name: string }[] = await res.json()

        for (const s of sessions) {
          const minsLeft = s.minutes_left
          const label = `Spot ${s.spot_label} at ${s.lot_name}`

          // Expired
          if (minsLeft <= 0 && !notifiedExpiry.current.has(`${s.id}-expired`)) {
            notifiedExpiry.current.add(`${s.id}-expired`)
            // Mark all thresholds done so they don't fire after expiry
            THRESHOLDS.forEach((t) => notifiedExpiry.current.add(`${s.id}-${t}`))
            notify('expiry', 'Parking session expired', `${label} has expired.`)
            continue
          }

          // Threshold warnings — fire only the largest un-notified threshold crossed
          for (const t of THRESHOLDS) {
            const key = `${s.id}-${t}`
            if (minsLeft <= t && !notifiedExpiry.current.has(key)) {
              notifiedExpiry.current.add(key)
              const minsDisplay = Math.ceil(minsLeft)
              notify(
                'expiry',
                'Parking session expiring soon',
                `${label} — ${minsDisplay} minute${minsDisplay === 1 ? '' : 's'} remaining.`
              )
              break // one notification per session per poll
            }
          }
        }
      } catch {
        // non-critical
      }
    }

    checkSessions()
    const interval = setInterval(checkSessions, 30000)
    return () => clearInterval(interval)
  }, [authenticated, userId, notify])

  function handleBooked({ lotName, spotLabel, feeAmount, isEv }: { lotName: string; spotLabel: string; feeAmount: number; isEv: boolean }) {
    const feeStr = feeAmount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
    notify('payment', 'Payment confirmed', `Spot ${spotLabel} at ${lotName} booked for ${feeStr}.`)
    if (isEv) {
      setTimeout(() => {
        notify('ev_disconnect', 'EV charger disconnected', `The charger at spot ${spotLabel} has been disconnected. Please check your vehicle.`)
      }, 30000)
    }
  }

  const switchPage = (nextPage: AuthPage) => {
    setPage(nextPage)
    setMessage(null)
    setError(null)
  }

  const handleSignupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setSignupData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setLoginData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })
      const body = await response.json()

      if (!response.ok) {
        setError(body.error || 'Signup failed.')
      } else {
        setMessage('Account created successfully. You may now log in.')
        setSignupData(initialSignupData)
        setPage('login')
      }
    } catch (err) {
      setError('Unable to reach the server. Please start the backend first.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })
      const body = await response.json()

      if (!response.ok) {
        setError(body.error || 'Login failed.')
      } else {
        setAuthenticated(true)
        setUserId(body.userId ?? null)
        setMessage('Login successful. Welcome back!')
        setLoginData(initialLoginData)
      }
    } catch (err) {
      setError('Unable to reach the server. Please start the backend first.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthenticated(false)
    setUserId(null)
    setPage('login')
    setView('parking')
    setMessage(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-[#eff8ff] px-4 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
        {authenticated ? (
          <section className="space-y-6 pb-24">
            {/* Toast notifications — fixed top of screen */}
            {toasts.length > 0 && (
              <div className="fixed top-4 left-3 right-3 z-[999] mx-auto max-w-md space-y-2 pointer-events-none">
                {toasts.map((t) => (
                  <div
                    key={t.id}
                    className="toast-enter flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-xl"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${typeBg[t.type]}`}>
                      {typeIcon[t.type]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{t.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{t.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'parking' && (
              <>
                <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Smart Parking</p>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">Live Spot Map</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                    View real-time availability for campus parking lots. Colour-coded spots update automatically so you always know which spaces are free, taken, EV-ready, or accessible.
                  </p>
                </div>
                <LotMap userId={userId} onBooked={handleBooked} />
              </>
            )}

            {view === 'alerts' && (
              <>
                <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Smart Parking</p>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Alerts</h1>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white/95 shadow-sm overflow-hidden">
                  {notifications.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <p className="text-sm text-slate-400">No notifications yet.</p>
                      <p className="mt-1 text-xs text-slate-300">Booking confirmations and session alerts will appear here.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {notifications.map((n: AppNotification) => (
                        <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.read ? '' : 'bg-slate-50'}`}>
                          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${typeBg[n.type]}`}>
                            {typeIcon[n.type]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                            <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{n.body}</p>
                            <p className="mt-1 text-xs text-slate-400">{timeAgo(n.timestamp)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => clearOne(n.id)}
                            className="mt-0.5 shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
                            aria-label="Dismiss"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {view === 'profile' && (
              <>
                <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Smart Parking</p>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">Account settings</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                    Review your session details and securely sign out when you are finished.
                  </p>
                </div>

                {userId !== null && <VehicleManager userId={userId} />}

                <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-950">Current session</h2>
                    <p className="text-sm text-slate-600">You are signed in to the Smart Parking application. Signing out will remove your session and redirect you to the login screen.</p>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="font-medium text-slate-900">Active session</p>
                      <p className="mt-1 text-slate-600">Authenticated on this device.</p>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}

            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
              <div className="mx-auto flex max-w-[960px] items-center justify-around px-4 py-2">
                <button
                  type="button"
                  onClick={() => setView('parking')}
                  className={`flex flex-col items-center gap-1 px-6 py-2 text-xs font-semibold transition ${view === 'parking' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" y1="3" x2="9" y2="18" />
                    <line x1="15" y1="6" x2="15" y2="21" />
                  </svg>
                  Parking
                  {view === 'parking' && <span className="h-1 w-1 rounded-full bg-slate-950" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('alerts'); markAllRead() }}
                  className={`relative flex flex-col items-center gap-1 px-6 py-2 text-xs font-semibold transition ${view === 'alerts' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                  Alerts
                  {view === 'alerts' && <span className="h-1 w-1 rounded-full bg-slate-950" />}
                </button>

                <button
                  type="button"
                  onClick={() => setView('profile')}
                  className={`flex flex-col items-center gap-1 px-6 py-2 text-xs font-semibold transition ${view === 'profile' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profile
                  {view === 'profile' && <span className="h-1 w-1 rounded-full bg-slate-950" />}
                </button>
              </div>
            </nav>
          </section>
        ) : (
          <section className="auth-card">
            <div className="auth-card-decor" />
            <div className="px-6 pt-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Smart Parking</p>
                  <h1 className="auth-title">
                    {page === 'signup' ? 'Create an' : 'Welcome'}
                    <span className="block">account</span>
                  </h1>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-500 shadow-sm">
                  Mobile
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                {page === 'signup'
                  ? 'Sign up with email, name, birthday, phone, and password to save your parking preferences across devices.'
                  : 'Log in with your email and password to continue your Smart Parking journey.'}
              </p>
            </div>

            <div className="space-y-4 px-6 pb-6 pt-5">
              <div className="auth-chip-list">
                <div className="auth-chip">
                  <span className="auth-chip-label">Secure</span>
                  <strong>Encrypted data</strong>
                </div>
                <div className="auth-chip">
                  <span className="auth-chip-label">Fast</span>
                  <strong>Quick access</strong>
                </div>
                <div className="auth-chip">
                  <span className="auth-chip-label">Unified</span>
                  <strong>One profile</strong>
                </div>
              </div>

              <div className="auth-tab-group">
                <button
                  type="button"
                  onClick={() => switchPage('signup')}
                  className={`auth-tab ${page === 'signup' ? 'auth-tab-active' : ''}`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchPage('login')}
                  className={`auth-tab ${page === 'login' ? 'auth-tab-active' : ''}`}
                >
                  Log in
                </button>
              </div>

              {message ? (
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                  {error}
                </div>
              ) : null}

              <div className="rounded-[40px] border border-slate-200 bg-white p-5 shadow-sm">
                {page === 'signup' ? (
                  <form onSubmit={handleSignupSubmit} className="grid gap-4">
                    <label className="block">
                      <span className="auth-field-label">Email</span>
                      <input
                        type="email"
                        name="email"
                        value={signupData.email}
                        onChange={handleSignupChange}
                        required
                        className="auth-input"
                      />
                    </label>

                    <label className="block">
                      <span className="auth-field-label">Phone</span>
                      <input
                        type="tel"
                        name="phone"
                        value={signupData.phone}
                        onChange={handleSignupChange}
                        required
                        className="auth-input"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="auth-field-label">First name</span>
                        <input
                          type="text"
                          name="firstName"
                          value={signupData.firstName}
                          onChange={handleSignupChange}
                          required
                          className="auth-input"
                        />
                      </label>
                      <label className="block">
                        <span className="auth-field-label">Middle name</span>
                        <input
                          type="text"
                          name="middleName"
                          value={signupData.middleName}
                          onChange={handleSignupChange}
                          className="auth-input"
                        />
                      </label>
                      <label className="block">
                        <span className="auth-field-label">Last name</span>
                        <input
                          type="text"
                          name="lastName"
                          value={signupData.lastName}
                          onChange={handleSignupChange}
                          required
                          className="auth-input"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="auth-field-label">Date of birth</span>
                        <input
                          type="date"
                          name="dob"
                          value={signupData.dob}
                          onChange={handleSignupChange}
                          required
                          className="auth-input"
                        />
                      </label>
                      <label className="block">
                        <span className="auth-field-label">Password</span>
                        <input
                          type="password"
                          name="password"
                          value={signupData.password}
                          onChange={handleSignupChange}
                          required
                          autoComplete="new-password"
                          className="auth-input"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="auth-button"
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="grid gap-4">
                    <label className="block">
                      <span className="auth-field-label">Email</span>
                      <input
                        type="email"
                        name="email"
                        value={loginData.email}
                        onChange={handleLoginChange}
                        required
                        className="auth-input"
                      />
                    </label>

                    <label className="block">
                      <span className="auth-field-label">Password</span>
                      <input
                        type="password"
                        name="password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        required
                        autoComplete="current-password"
                        className="auth-input"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="auth-button"
                    >
                      {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="rounded-[32px] border border-slate-200 bg-white/90 px-6 py-5 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span>Built for the Smart Parking mobile-first aesthetic.</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.32em] text-slate-500">Clean</span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
