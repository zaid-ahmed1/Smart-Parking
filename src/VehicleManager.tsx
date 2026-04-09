import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { type Vehicle } from './SessionDurationModal'

const API_BASE_URL = 'http://localhost:3000'

const emptyForm = { licensePlate: '', make: '', model: '', nickname: '' }

interface VehicleManagerProps {
  userId: number
}

function vehicleLabel(v: Vehicle) {
  if (v.nickname) return v.nickname
  const nameparts = [v.make, v.model].filter(Boolean).join(' ')
  return nameparts || v.license_plate
}

export default function VehicleManager({ userId }: VehicleManagerProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/vehicles?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setVehicles(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  function handleFormChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!form.licensePlate.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...form }),
      })
      const body = await res.json()
      if (!res.ok) {
        setFormError(body.error || 'Unable to save vehicle.')
      } else {
        setVehicles((prev) => [body, ...prev])
        setForm(emptyForm)
        setShowForm(false)
      }
    } catch {
      setFormError('Unable to reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setVehicles((prev) => prev.filter((v) => v.id !== id))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Saved vehicles</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">My vehicles</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setFormError(null) }}
            className="flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add vehicle
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">New vehicle</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-slate-600 mb-1 block">License plate *</span>
              <input
                type="text"
                name="licensePlate"
                value={form.licensePlate}
                onChange={handleFormChange}
                placeholder="ABC 123"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 mb-1 block">Make</span>
              <input
                type="text"
                name="make"
                value={form.make}
                onChange={handleFormChange}
                placeholder="Toyota"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 mb-1 block">Model</span>
              <input
                type="text"
                name="model"
                value={form.model}
                onChange={handleFormChange}
                placeholder="Corolla"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-slate-600 mb-1 block">Nickname</span>
              <input
                type="text"
                name="nickname"
                value={form.nickname}
                onChange={handleFormChange}
                placeholder="My car"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
              />
            </label>
          </div>
          {formError && (
            <p className="text-xs text-rose-600">{formError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(null) }}
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.licensePlate.trim()}
              className="flex-1 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save vehicle'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : vehicles.length === 0 && !showForm ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-400">No saved vehicles yet.</p>
          <p className="mt-1 text-xs text-slate-300">Add one above to speed up checkout.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {vehicles.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base">🚗</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{vehicleLabel(v)}</p>
                <p className="text-xs text-slate-400 truncate">{v.license_plate}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(v.id)}
                disabled={deletingId === v.id}
                className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                aria-label="Remove vehicle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
