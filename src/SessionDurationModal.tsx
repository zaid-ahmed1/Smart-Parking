const RATE_PER_HOUR = 2.5

interface Spot {
  id: number
  label: string
}

interface SessionDurationModalProps {
  spot: Spot
  lotName: string
  hours: number
  minutes: number
  onHoursChange: (h: number) => void
  onMinutesChange: (m: number) => void
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
  error: string | null
}

function formatFee(fee: number) {
  return fee.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
}

function SessionDurationModal({
  spot,
  lotName,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  onConfirm,
  onCancel,
  isSubmitting,
  error,
}: SessionDurationModalProps) {
  const totalMinutes = hours * 60 + minutes
  const fee = (totalMinutes / 60) * RATE_PER_HOUR
  const canProceed = totalMinutes > 0

  function handleHoursChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0))
    onHoursChange(val)
  }

  function handleMinutesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0))
    onMinutesChange(val)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duration-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4"
    >
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{lotName}</p>
          <h2 id="duration-modal-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Book Spot {spot.label}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Set your parking duration to calculate the fee.</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Duration inputs */}
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-3">Duration</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Hours</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={handleHoursChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-bold text-slate-950 text-center focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">hr</span>
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Minutes</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={handleMinutesChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-bold text-slate-950 text-center focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">min</span>
                </div>
              </label>
            </div>

            {!canProceed && (
              <p className="mt-2 text-xs text-amber-600 font-medium">
                Please set a duration to continue.
              </p>
            )}
          </div>

          {/* Fee display */}
          <div className={`rounded-[24px] border p-4 transition-colors ${canProceed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Estimated fee</p>
                <p className={`mt-1 text-3xl font-bold tracking-tight transition-colors ${canProceed ? 'text-emerald-900' : 'text-slate-400'}`}>
                  {canProceed ? formatFee(fee) : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Rate</p>
                <p className="text-sm font-semibold text-slate-600">{formatFee(RATE_PER_HOUR)}/hr</p>
                {canProceed && (
                  <p className="text-xs text-slate-400 mt-1">
                    {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canProceed || isSubmitting}
            className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionDurationModal
