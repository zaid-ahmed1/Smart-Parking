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
  onBack: () => void
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

function SpotDetailsPanel({ spot, lotName, onBack }: SpotDetailsPanelProps) {
  const status = statusConfig[spot.status]

  return (
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
    </div>
  )
}

export default SpotDetailsPanel
