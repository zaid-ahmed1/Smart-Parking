import { useState } from 'react'
import SessionDurationModal, { type Vehicle } from './SessionDurationModal'

const API_BASE_URL = 'http://localhost:3000'

type SpotStatus = 'free' | 'taken'

interface Spot {
  id: number
  label: string
  row: number
  col: number
  status: SpotStatus
  accessible: number
  ev: number
}

interface SpotDetailsPanelProps {
  spot: Spot
  lotName: string
  lotId: number
  userId: number | null
  onBack: (booked?: boolean) => void
}

const statusConfig: Record<SpotStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
  free: {
    label: 'Available',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    dot: 'bg-emerald-400',
  },
  taken: {
    label: 'Occupied',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    dot: 'bg-rose-400',
  },
}

function SpotDetailsPanel({ spot, lotName, lotId, userId, onBack }: SpotDetailsPanelProps) {
  const status = statusConfig[spot.status]

  const [showModal, setShowModal] = useState(false)
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [confirmedFee, setConfirmedFee] = useState<number>(0)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)

  const totalMinutes = hours * 60 + minutes

  async function openModal() {
    setHours(0)
    setMinutes(0)
    setBookingError(null)
    setSelectedVehicleId(null)
    if (userId) {
      try {
        const res = await fetch(`${API_BASE_URL}/vehicles?userId=${userId}`)
        if (res.ok) {
          const data: Vehicle[] = await res.json()
          setVehicles(data)
        }
      } catch {
        // non-critical — proceed without vehicles
      }
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setBookingError(null)
  }

  async function handleConfirm() {
    if (totalMinutes <= 0) return
    setIsSubmitting(true)
    setBookingError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lotId,
          spotId: spot.id,
          hours,
          minutes,
          vehicleId: selectedVehicleId,
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        setBookingError(body.error || 'Unable to book spot.')
      } else {
        setConfirmedFee(body.feeAmount)
        setShowModal(false)
        setBookingConfirmed(true)
      }
    } catch {
      setBookingError('Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (bookingConfirmed) {
    return (
      <div className="space-y-5">
        <div className="rounded-[32px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">{lotName}</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-emerald-900">Booking confirmed</h2>
          <p className="mt-3 text-sm text-emerald-800">
            Spot <strong>{spot.label}</strong> is reserved for{' '}
            {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}{hours === 0 && minutes === 0 && '—'}.
          </p>
          <div className="mt-4 rounded-[24px] border border-emerald-200 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Fee charged</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              {confirmedFee.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBack(true)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to map
        </button>
      </div>
    )
  }

  return (
    <>
      {showModal && (
        <SessionDurationModal
          spot={spot}
          lotName={lotName}
          hours={hours}
          minutes={minutes}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
          onConfirm={handleConfirm}
          onCancel={closeModal}
          isSubmitting={isSubmitting}
          error={bookingError}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleSelect={setSelectedVehicleId}
          userId={userId}
          onVehicleAdded={(v) => setVehicles((prev) => [v, ...prev])}
        />
      )}

      <div className="space-y-5">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to map
          </button>

          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{lotName}</p>
          <h2 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">Spot {spot.label}</h2>

          <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${status.bg} ${status.border} ${status.text}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Location</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Row</p>
                <p className="mt-1 text-3xl font-bold text-slate-950">{spot.row}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Column</p>
                <p className="mt-1 text-3xl font-bold text-slate-950">{spot.col}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Accessibility</p>
            <div className="mt-4 flex items-center gap-3">
              {spot.accessible ? (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xl text-white">♿</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Accessible spot</p>
                    <p className="text-sm text-slate-500">Designated for disabled users</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">—</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Standard spot</p>
                    <p className="text-sm text-slate-500">No accessibility designation</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Type</p>
          <div className="mt-4 flex items-center gap-3">
            {spot.ev ? (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-xl">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">EV Charging</p>
                  <p className="text-sm text-slate-500">Electric vehicle charging available</p>
                </div>
              </>
            ) : (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">🚗</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Standard</p>
                  <p className="text-sm text-slate-500">Regular parking spot</p>
                </div>
              </>
            )}
          </div>
        </div>

        {spot.status === 'free' && (
          <button
            type="button"
            onClick={openModal}
            className="w-full rounded-[32px] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 shadow-sm"
          >
            Book this spot
          </button>
        )}
      </div>
    </>
  )
}

export default SpotDetailsPanel
