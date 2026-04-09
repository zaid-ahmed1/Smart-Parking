import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'

const API_BASE_URL = 'http://localhost:3000'
const RATE_PER_HOUR = 2.5
const emptyVehicleForm = { licensePlate: '', make: '', model: '', nickname: '' }

interface Spot {
  id: number
  label: string
}

export interface Vehicle {
  id: number
  license_plate: string
  make: string | null
  model: string | null
  nickname: string | null
}

interface PaymentMethod {
  id: number
  token: string
  cardBrand: string
  last4: string
  expiryMonth: number
  expiryYear: number
}

export interface PaymentPayload {
  paymentMethodId?: number
  newCard?: {
    cardNumber: string
    expiryMonth: number
    expiryYear: number
    cardholderName: string
  }
}

interface SessionDurationModalProps {
  spot: Spot
  lotName: string
  userId: number | null
  hours: number
  minutes: number
  onHoursChange: (h: number) => void
  onMinutesChange: (m: number) => void
  onConfirm: (payload: PaymentPayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: string | null
  vehicles: Vehicle[]
  selectedVehicleId: number | null
  onVehicleSelect: (id: number | null) => void
  onVehicleAdded: (vehicle: Vehicle) => void
}

function formatFee(fee: number) {
  return fee.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
}

function SessionDurationModal({
  spot,
  lotName,
  userId,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  onConfirm,
  onCancel,
  isSubmitting,
  error,
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  onVehicleAdded,
}: SessionDurationModalProps) {
  // Vehicle inline-add state
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null)

  // Payment state
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null)
  const [useNewCard, setUseNewCard] = useState(true)
  const [cardholderName, setCardholderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')

  const totalMinutes = hours * 60 + minutes
  const fee = (totalMinutes / 60) * RATE_PER_HOUR

  const hasValidNewCard =
    cardholderName.trim().length > 0 &&
    cardNumber.replace(/\D/g, '').length >= 12 &&
    Number(expiryMonth) >= 1 && Number(expiryMonth) <= 12 &&
    (expiryYear.trim().length === 4 || expiryYear.trim().length === 2)

  const canProceed =
    totalMinutes > 0 && (!useNewCard ? selectedMethodId !== null : hasValidNewCard)

  useEffect(() => {
    if (!userId) return
    fetch(`${API_BASE_URL}/payment-methods?userId=${userId}`)
      .then(async (res) => {
        if (!res.ok) return
        const body: PaymentMethod[] = await res.json()
        setSavedMethods(body)
        if (body.length > 0) {
          setUseNewCard(false)
          setSelectedMethodId(body[0].id)
        }
      })
      .catch(() => {})
  }, [userId])

  function handleHoursChange(e: ChangeEvent<HTMLInputElement>) {
    onHoursChange(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))
  }

  function handleMinutesChange(e: ChangeEvent<HTMLInputElement>) {
    onMinutesChange(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
  }

  function handleVehicleFormChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setVehicleForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSaveVehicle(e: FormEvent) {
    e.preventDefault()
    if (!vehicleForm.licensePlate.trim() || !userId) return
    setSavingVehicle(true)
    setVehicleFormError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...vehicleForm }),
      })
      const body = await res.json()
      if (!res.ok) {
        setVehicleFormError(body.error || 'Unable to save vehicle.')
      } else {
        onVehicleAdded(body)
        onVehicleSelect(body.id)
        setVehicleForm(emptyVehicleForm)
        setShowAddVehicle(false)
      }
    } catch {
      setVehicleFormError('Unable to reach the server.')
    } finally {
      setSavingVehicle(false)
    }
  }

  function handleConfirmClick() {
    if (!canProceed) return
    if (useNewCard) {
      const expiryYearNum = Number(expiryYear)
      onConfirm({
        newCard: {
          cardNumber,
          expiryMonth: Number(expiryMonth),
          expiryYear: expiryYearNum < 100 ? 2000 + expiryYearNum : expiryYearNum,
          cardholderName: cardholderName.trim(),
        },
      })
    } else if (selectedMethodId) {
      onConfirm({ paymentMethodId: selectedMethodId })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duration-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4 pb-20 sm:pb-4"
    >
      <div className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto touch-pan-y">

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{lotName}</p>
            <h2 id="duration-modal-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Book Spot {spot.label}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Set your duration, select a vehicle, then complete payment.</p>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Duration */}
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
              {!totalMinutes && (
                <p className="mt-2 text-xs text-amber-600 font-medium">Please set a duration to continue.</p>
              )}
            </div>

            {/* Vehicle selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Vehicle <span className="normal-case tracking-normal text-slate-300">(optional)</span>
                </p>
                {!showAddVehicle && (
                  <button
                    type="button"
                    onClick={() => { setShowAddVehicle(true); setVehicleFormError(null) }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    + Add new
                  </button>
                )}
              </div>

              {showAddVehicle ? (
                <form onSubmit={handleSaveVehicle} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <input type="text" name="licensePlate" value={vehicleForm.licensePlate} onChange={handleVehicleFormChange} placeholder="License plate *" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" name="make" value={vehicleForm.make} onChange={handleVehicleFormChange} placeholder="Make" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none" />
                    <input type="text" name="model" value={vehicleForm.model} onChange={handleVehicleFormChange} placeholder="Model" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none" />
                  </div>
                  <input type="text" name="nickname" value={vehicleForm.nickname} onChange={handleVehicleFormChange} placeholder="Nickname (optional)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none" />
                  {vehicleFormError && <p className="text-xs text-rose-600">{vehicleFormError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setShowAddVehicle(false); setVehicleForm(emptyVehicleForm); setVehicleFormError(null) }} className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                    <button type="submit" disabled={savingVehicle || !vehicleForm.licensePlate.trim()} className="flex-1 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed">{savingVehicle ? 'Saving…' : 'Save & select'}</button>
                  </div>
                </form>
              ) : vehicles.length === 0 ? (
                <p className="text-xs text-slate-400">No saved vehicles — add one above to link it to this session.</p>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((v) => {
                    const label = v.nickname || [v.make, v.model].filter(Boolean).join(' ') || v.license_plate
                    const isSelected = selectedVehicleId === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onVehicleSelect(isSelected ? null : v.id)}
                        className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isSelected ? 'border-slate-900 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${isSelected ? 'bg-white/10' : 'bg-slate-200'}`}>🚗</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{label}</p>
                          <p className={`text-xs truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{v.license_plate}</p>
                        </div>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-auto h-5 w-5 shrink-0 text-white">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Fee display */}
            <div className={`rounded-[24px] border p-4 transition-colors ${totalMinutes ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Estimated fee</p>
                  <p className={`mt-1 text-3xl font-bold tracking-tight ${totalMinutes ? 'text-emerald-900' : 'text-slate-400'}`}>
                    {totalMinutes ? formatFee(fee) : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Rate</p>
                  <p className="text-sm font-semibold text-slate-600">{formatFee(RATE_PER_HOUR)}/hr</p>
                  {totalMinutes > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m`}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Payment method</p>
                  <p className="mt-1 text-sm text-slate-600">Select a saved card or enter a new one.</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shrink-0">Tokenized</span>
              </div>

              {savedMethods.length > 0 && (
                <div className="space-y-2 mb-3">
                  {savedMethods.map((method) => (
                    <label key={method.id} className="flex cursor-pointer items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3">
                      <input
                        type="radio"
                        name="payment-method"
                        checked={!useNewCard && selectedMethodId === method.id}
                        onChange={() => { setUseNewCard(false); setSelectedMethodId(method.id) }}
                        className="h-4 w-4 text-slate-900"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{method.cardBrand} •••• {method.last4}</p>
                        <p className="text-xs text-slate-500">Expires {String(method.expiryMonth).padStart(2, '0')}/{String(method.expiryYear).slice(-2)}</p>
                      </div>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="payment-method"
                      checked={useNewCard}
                      onChange={() => { setUseNewCard(true); setSelectedMethodId(null) }}
                      className="h-4 w-4 text-slate-900"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Use a new card</p>
                      <p className="text-xs text-slate-500">Stored tokenized and masked.</p>
                    </div>
                  </label>
                </div>
              )}

              {(useNewCard || savedMethods.length === 0) && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Cardholder name</span>
                    <input type="text" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20" placeholder="Name on card" autoComplete="cc-name" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Card number</span>
                    <input type="text" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20" placeholder="4111 1111 1111 1111" autoComplete="cc-number" />
                    <p className="mt-1 text-xs text-slate-400">Test card: 4111 1111 1111 1111</p>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Expiry month</span>
                      <input type="text" inputMode="numeric" value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20" placeholder="MM" autoComplete="cc-exp-month" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Expiry year</span>
                      <input type="text" inputMode="numeric" value={expiryYear} onChange={(e) => setExpiryYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20" placeholder="YY or YYYY" autoComplete="cc-exp-year" />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">We never store full card numbers or CVV data. All saved cards remain tokenized and masked.</p>
                </div>
              )}
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
              onClick={handleConfirmClick}
              disabled={!canProceed || isSubmitting}
              className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing payment…' : 'Confirm payment'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default SessionDurationModal
