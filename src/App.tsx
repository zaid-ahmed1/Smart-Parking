import { useState, type FormEvent, type ChangeEvent } from 'react'
import './App.css'

type AuthPage = 'login' | 'signup'

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

const API_BASE_URL = 'http://localhost:3000'

function App() {
  const [page, setPage] = useState<AuthPage>('signup')
  const [signupData, setSignupData] = useState<SignupData>(initialSignupData)
  const [loginData, setLoginData] = useState<LoginData>(initialLoginData)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        setMessage('Login successful. Welcome back!')
        setLoginData(initialLoginData)
      }
    } catch (err) {
      setError('Unable to reach the server. Please start the backend first.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#eff8ff] px-4 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-5">
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
