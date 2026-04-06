import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Lot {
  id: number
  name: string
  description: string
  rows: number
  cols: number
  latitude?: number
  longitude?: number
}

interface InteractiveMapProps {
  lots: Lot[]
  selectedLotId: number | null
  onLotSelect: (lotId: number) => void
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom parking lot icon
const parkingIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="16" rx="2" fill="#1f2937" stroke="#374151" stroke-width="2"/>
      <rect x="8" y="12" width="4" height="8" fill="#10b981"/>
      <rect x="14" y="12" width="4" height="8" fill="#ef4444"/>
      <rect x="20" y="12" width="4" height="8" fill="#3b82f6"/>
      <text x="16" y="28" text-anchor="middle" fill="#1f2937" font-family="Arial" font-size="10" font-weight="bold">P</text>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// User's location icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

// Component to handle map centering and user location
function MapController({ userLocation, lots, selectedLotId }: { userLocation: [number, number] | null, lots: Lot[], selectedLotId: number | null }) {
  const map = useMap()
  const hasCentered = useRef(false)

  useEffect(() => {
    if (hasCentered.current) {
      return
    }

    if (userLocation) {
      map.setView(userLocation, 15)
      hasCentered.current = true
    } else if (lots.length > 0) {
      // Center on the first lot with coordinates
      const lotWithCoords = lots.find(lot => lot.latitude && lot.longitude)
      if (lotWithCoords) {
        map.setView([lotWithCoords.latitude!, lotWithCoords.longitude!], 15)
        hasCentered.current = true
      }
    }
  }, [userLocation, lots, map])

  // Handle centering and zooming when a lot is selected
  useEffect(() => {
    if (selectedLotId !== null) {
      const selectedLot = lots.find(lot => lot.id === selectedLotId)
      if (selectedLot && selectedLot.latitude && selectedLot.longitude) {
        map.setView([selectedLot.latitude, selectedLot.longitude], 18, {
          animate: true,
          duration: 1
        })
      }
    }
  }, [selectedLotId, lots, map])

  return null
}

export default function InteractiveMap({ lots, selectedLotId, onLotSelect }: InteractiveMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    // Get user's current location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.warn('Could not get user location:', error)
          setLocationError('Unable to access your location. Please enable location services.')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      )
    } else {
      setLocationError('Geolocation is not supported by this browser.')
    }
  }, [])

  // Filter lots that have coordinates
  const lotsWithCoords = lots.filter(lot => lot.latitude && lot.longitude)

  // Default center (University of Calgary campus)
  const defaultCenter: [number, number] = [51.0766, -114.1323]
  const center = userLocation || (lotsWithCoords.length > 0 ? [lotsWithCoords[0].latitude!, lotsWithCoords[0].longitude!] : defaultCenter)

  return (
    <div className="h-96 w-full rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController userLocation={userLocation} lots={lotsWithCoords} selectedLotId={selectedLotId} />

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
                <br />
                <small>{userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Parking lot markers */}
        {lotsWithCoords.map((lot) => (
          <Marker
            key={lot.id}
            position={[lot.latitude!, lot.longitude!]}
            icon={parkingIcon}
            eventHandlers={{
              click: () => onLotSelect(lot.id),
            }}
          >
            <Popup>
              <div className="text-center">
                <strong>{lot.name}</strong>
                <br />
                <p className="text-sm text-slate-600 mt-1">{lot.description}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {lot.rows}×{lot.cols} spots
                </p>
                <button
                  onClick={() => onLotSelect(lot.id)}
                  className={`mt-2 px-3 py-1 text-xs rounded-full transition ${
                    lot.id === selectedLotId
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {lot.id === selectedLotId ? 'Selected' : 'Select Lot'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {locationError && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <strong>Location Notice:</strong> {locationError}
        </div>
      )}

      {lotsWithCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 bg-opacity-75">
          <div className="text-center text-slate-600">
            <div className="text-4xl mb-2">🗺️</div>
            <p>No parking lots with location data available</p>
          </div>
        </div>
      )}
    </div>
  )
}