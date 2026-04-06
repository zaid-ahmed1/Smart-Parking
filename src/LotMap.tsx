import { useEffect, useState, useRef } from 'react'
import SpotDetailsPanel from './SpotDetailsPanel'
import InteractiveMap from './InteractiveMap'

const API_BASE_URL = 'http://localhost:3000'

type SpotStatus = 'free' | 'taken'

type RawSpot = Omit<Spot, 'status'> & {
  status: 'free' | 'taken' | 'ev'
  ev?: number
}

interface Spot {
  id: number
  label: string
  row: number
  col: number
  status: SpotStatus
  accessible: number
  ev: number
}

interface Lot {
  id: number
  name: string
  description: string
  rows: number
  cols: number
  latitude?: number
  longitude?: number
}

interface LotDetails extends Lot {
  spots: Spot[]
}

const statusStyles: Record<SpotStatus, string> = {
  free: 'bg-emerald-100 border-emerald-400 text-emerald-900',
  taken: 'bg-rose-100 border-rose-400 text-rose-900',
}



function buildSummary(spots: Spot[]) {
  return {
    free: spots.filter((spot) => spot.status === 'free').length,
    taken: spots.filter((spot) => spot.status === 'taken').length,
    ev: spots.filter((spot) => spot.ev === 1).length,
    accessible: spots.filter((spot) => spot.accessible === 1).length,
  }
}

const buildingLocations = [
  { aliases: ['main', 'main campus'], label: 'Main Campus', coords: [51.0766, -114.1323] as [number, number] },
  { aliases: ['science', 'science complex'], label: 'Science Complex', coords: [51.0772, -114.1338] as [number, number] },
  { aliases: ['business', 'business school'], label: 'Business School', coords: [51.0751, -114.1312] as [number, number] },
  { aliases: ['residence', 'residences', 'residence halls'], label: 'Residence', coords: [51.0785, -114.1328] as [number, number] },
  { aliases: ['athletics', 'athletic'], label: 'Athletics', coords: [51.0748, -114.1342] as [number, number] },
  { aliases: ['engineering', 'engineering building', 'eeel'], label: 'Engineering', coords: [51.0768, -114.1355] as [number, number] },
  { aliases: ['health', 'health sciences'], label: 'Health Sciences', coords: [51.0798, -114.1318] as [number, number] },
  { aliases: ['veterinary', 'veterinary medicine'], label: 'Veterinary Medicine', coords: [51.0775, -114.1298] as [number, number] },
  { aliases: ['foothills', 'foothills campus'], label: 'Foothills Campus', coords: [51.0722, -114.1268] as [number, number] },
  { aliases: ['research', 'research park', 'ict'], label: 'Research Park', coords: [51.0805, -114.1302] as [number, number] },
]

function getDistanceSquared([latA, lonA]: [number, number], [latB, lonB]: [number, number]) {
  const latDelta = latA - latB
  const lonDelta = lonA - lonB
  return latDelta * latDelta + lonDelta * lonDelta
}

function findClosestLots(lots: Lot[], coords: [number, number]) {
  return [...lots]
    .filter((lot) => lot.latitude !== undefined && lot.longitude !== undefined)
    .sort((a, b) => {
      const aDistance = getDistanceSquared([a.latitude!, a.longitude!], coords)
      const bDistance = getDistanceSquared([b.latitude!, b.longitude!], coords)
      return aDistance - bDistance
    })
}

function getSearchResults(lots: Lot[], searchTerm: string) {
  const query = searchTerm.trim().toLowerCase()
  if (!query) {
    return lots
  }

  const buildingMatch = buildingLocations.find((building) =>
    building.aliases.some((alias) => query.includes(alias))
  )

  if (buildingMatch) {
    return findClosestLots(lots, buildingMatch.coords)
  }

  return lots.filter(
    (lot) =>
      lot.name.toLowerCase().includes(query) ||
      lot.description.toLowerCase().includes(query)
  )
}

function LotMap() {
  const [lots, setLots] = useState<Lot[]>([])
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null)
  const [lotDetails, setLotDetails] = useState<LotDetails | null>(null)
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const lotMapRef = useRef<HTMLDivElement>(null)
  const initialLoadRef = useRef(true)

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
        const normalizedSpots = (details.spots as RawSpot[]).map((spot) => ({
          ...spot,
          ev: spot.ev ?? (spot.status === 'ev' ? 1 : 0),
          status: spot.status === 'ev' ? 'free' : spot.status,
        }))
        setLotDetails({ ...details, spots: normalizedSpots })
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

  // Scroll to lot map when a lot is selected (but not on initial load)
  useEffect(() => {
    if (selectedLotId !== null && lotMapRef.current && !initialLoadRef.current) {
      // Small delay to ensure the lot details have loaded
      setTimeout(() => {
        lotMapRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
    }
    // Mark that we've done the initial load
    if (initialLoadRef.current && selectedLotId !== null) {
      initialLoadRef.current = false
    }
  }, [selectedLotId])

  const counts = lotDetails ? buildSummary(lotDetails.spots) : null

  const filteredLots = getSearchResults(lots, searchTerm)

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
    <div className="space-y-6">
      <InteractiveMap
        lots={lots}
        selectedLotId={selectedLotId}
        onLotSelect={setSelectedLotId}
      />

      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm" ref={lotMapRef}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {lotDetails ? lotDetails.name : 'Parking lot'}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {lotDetails?.description ?? 'Select a lot on the map or from the list below to view the layout and availability.'}
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
        ) : loading ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Loading latest availability…
          </div>
        ) : lotDetails ? (
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
                    {spot.ev ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-lg">⚡</span>
                    ) : spot.accessible ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-lg">♿</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-4 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-slate-950 mb-3">Legend</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-4 w-4 rounded-full bg-emerald-400 ring-1 ring-emerald-500/20" />
                  <span className="text-sm text-slate-600">Free space</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-4 w-4 rounded-full bg-rose-400 ring-1 ring-rose-500/20" />
                  <span className="text-sm text-slate-600">Taken space</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[0.65rem] text-white">⚡</span>
                  <span className="text-sm text-slate-600">EV charging</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[0.65rem] text-white">♿</span>
                  <span className="text-sm text-slate-600">Accessible spot</span>
                </div>
              </div>
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
            Choose a lot from the list below or the map to view the layout and availability.
          </div>
        )}
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search lots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
          />

          <div className="grid gap-3">
            {filteredLots.map((lot) => (
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
            {!filteredLots.length && lots.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No lots match your search.
              </div>
            )}
            {!lots.length && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Loading parking lots…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LotMap
