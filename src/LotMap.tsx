import { useEffect, useState } from 'react'
import SpotDetailsPanel from './SpotDetailsPanel'

const API_BASE_URL = 'http://localhost:3000'

type SpotStatus = 'free' | 'taken' | 'ev'

interface Spot {
  id: number
  label: string
  row: number
  col: number
  status: SpotStatus
  accessible: number
}

interface Lot {
  id: number
  name: string
  description: string
  rows: number
  cols: number
}

interface LotDetails extends Lot {
  spots: Spot[]
}

const statusStyles: Record<SpotStatus, string> = {
  free: 'bg-emerald-100 border-emerald-400 text-emerald-900',
  taken: 'bg-rose-100 border-rose-400 text-rose-900',
  ev: 'bg-sky-100 border-sky-400 text-sky-900',
}



function buildSummary(spots: Spot[]) {
  return {
    free: spots.filter((spot) => spot.status === 'free').length,
    taken: spots.filter((spot) => spot.status === 'taken').length,
    ev: spots.filter((spot) => spot.status === 'ev').length,
    accessible: spots.filter((spot) => spot.accessible === 1).length,
  }
}

function LotMap() {
  const [lots, setLots] = useState<Lot[]>([])
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null)
  const [lotDetails, setLotDetails] = useState<LotDetails | null>(null)
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLots = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lots`)
        if (!response.ok) {
          throw new Error('Unable to load lots')
        }
        const lotsData: Lot[] = await response.json()
        setLots(lotsData)
        if (lotsData.length && selectedLotId === null) {
          setSelectedLotId(lotsData[0].id)
        }
      } catch (err) {
        setError('Unable to load parking lots. Please start the backend server and refresh.')
      }
    }

    loadLots()
  }, [])

  useEffect(() => {
    if (selectedLotId === null) {
      return
    }

    let interval: number | undefined

    const loadLot = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/lots/${selectedLotId}`)
        if (!response.ok) {
          throw new Error('Unable to load lot data')
        }

        const details: LotDetails = await response.json()
        setLotDetails(details)
      } catch (err) {
        setError('Unable to refresh parking map data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadLot()
    interval = window.setInterval(loadLot, 5000)

    return () => {
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [selectedLotId])

  const counts = lotDetails ? buildSummary(lotDetails.spots) : null

  if (selectedSpot && lotDetails) {
    return (
      <SpotDetailsPanel
        spot={selectedSpot}
        lotName={lotDetails.name}
        onBack={() => setSelectedSpot(null)}
      />
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-950">Available lots</h2>
          <p className="text-sm leading-6 text-slate-600">Choose a lot to view its real-time spot map.</p>
        </div>

        <div className="grid gap-3">
          {lots.map((lot) => (
            <button
              key={lot.id}
              type="button"
              onClick={() => setSelectedLotId(lot.id)}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                lot.id === selectedLotId
                  ? 'border-slate-900 bg-slate-950 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{lot.name}</span>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-600">{lot.rows}×{lot.cols}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{lot.description}</p>
            </button>
          ))}
          {!lots.length && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading parking lots…
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Legend</h3>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-4 w-4 rounded-full bg-emerald-400 ring-1 ring-emerald-500/20" />
              <span className="text-sm text-slate-600">Free space</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-4 w-4 rounded-full bg-rose-400 ring-1 ring-rose-500/20" />
              <span className="text-sm text-slate-600">Taken space</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-4 w-4 rounded-full bg-sky-400 ring-1 ring-sky-500/20" />
              <span className="text-sm text-slate-600">EV charging</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[0.65rem] text-white">♿</span>
              <span className="text-sm text-slate-600">Accessible spot</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {lotDetails ? lotDetails.name : 'Parking spot map'}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {lotDetails?.description ?? 'Select a lot to inspect its current availability.'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Refreshes every 5s
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Loading latest availability…
          </div>
        )}

        {lotDetails ? (
          <>
            <div className="grid gap-2 py-4" style={{ gridTemplateColumns: `repeat(${lotDetails.cols}, minmax(0, 1fr))` }}>
              {lotDetails.spots.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => setSelectedSpot(spot)}
                  className={`min-h-[96px] overflow-hidden rounded-[28px] border p-3 text-left text-xs font-semibold transition hover:opacity-80 hover:shadow-md ${statusStyles[spot.status]}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-950">
                      {spot.label}
                    </span>
                    {spot.accessible ? (
                      <span className="text-base">♿</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Free spaces</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{counts?.free ?? 0}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">EV spaces</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{counts?.ev ?? 0}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Accessible spots</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{counts?.accessible ?? 0}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Choose a lot on the left to view available spots.
          </div>
        )}
      </section>
    </div>
  )
}

export default LotMap
