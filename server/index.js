import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db, initDb } from './db.js'

await initDb()

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const CLIENT_ORIGIN = 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const dbRun = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err)
            } else {
                resolve(this)
            }
        })
    })

const dbGet = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err)
            } else {
                resolve(row)
            }
        })
    })

const dbAll = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err)
            } else {
                resolve(rows)
            }
        })
    })

const cardBrandFromNumber = (number) => {
    if (number.startsWith('4')) return 'Visa'
    if (/^5[1-5]/.test(number)) return 'Mastercard'
    if (/^3[47]/.test(number)) return 'American Express'
    if (/^6(?:011|5)/.test(number)) return 'Discover'
    return 'Card'
}

const isValidCardNumber = (value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length < 12 || digits.length > 19) return false
    let sum = 0
    let shouldDouble = false
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let digit = Number(digits[i])
        if (shouldDouble) {
            digit *= 2
            if (digit > 9) digit -= 9
        }
        sum += digit
        shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
}

const isExpiredCard = (month, year) => {
    if (typeof month !== 'number' || typeof year !== 'number' || month < 1 || month > 12) {
        return true
    }
    const expiryDate = new Date(year, month - 1, 1)
    const now = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 1)
    return expiryDate <= now
}

const createPaymentToken = () => `pm_${crypto.randomBytes(12).toString('hex')}`

app.get('/payment-methods', async (req, res) => {
    try {
        const userId = Number(req.query.userId)
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' })
        }

        const methods = await dbAll(
            `SELECT id, token, card_brand AS cardBrand, last4, expiry_month AS expiryMonth, expiry_year AS expiryYear, created_at AS createdAt
             FROM payment_methods
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId],
        )

        return res.json(methods)
    } catch (error) {
        console.error('Error fetching payment methods:', error)
        return res.status(500).json({ error: 'Unable to load payment methods.' })
    }
})

app.get('/payments', async (req, res) => {
    try {
        const userId = Number(req.query.userId)
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' })
        }

        const payments = await dbAll(
            `SELECT p.id, p.amount, p.status, p.failure_reason AS failureReason, p.created_at AS createdAt,
                    pm.card_brand AS cardBrand, pm.last4,
                    ps.spot_id AS spotId, l.name AS lotName, ps.duration_hours AS hours, ps.duration_minutes AS minutes
             FROM payments p
             LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
             LEFT JOIN parking_sessions ps ON ps.fee_amount = p.amount AND ps.user_id = p.user_id AND ps.created_at = p.created_at
             LEFT JOIN lots l ON ps.lot_id = l.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [userId],
        )

        return res.json(payments)
    } catch (error) {
        console.error('Error fetching payment history:', error)
        return res.status(500).json({ error: 'Unable to load payment history.' })
    }
})

app.post('/payments', async (req, res) => {
    try {
        const { userId, lotId, spotId, hours, minutes, paymentMethodId, newCard } = req.body

        if (!userId || !lotId || !spotId) {
            return res.status(400).json({ error: 'userId, lotId, and spotId are required.' })
        }

        const durationHours = Math.max(0, Math.floor(Number(hours) || 0))
        const durationMinutes = Math.max(0, Math.min(59, Math.floor(Number(minutes) || 0)))
        const totalMinutes = durationHours * 60 + durationMinutes

        if (totalMinutes <= 0) {
            return res.status(400).json({ error: 'Duration must be greater than zero.' })
        }

        const feeAmount = parseFloat(((totalMinutes / 60) * RATE_PER_HOUR).toFixed(2))
        const createdAt = new Date().toISOString()

        const user = await dbGet('SELECT id FROM users WHERE id = ?', [userId])
        if (!user) {
            return res.status(404).json({ error: 'User not found.' })
        }

        const spot = await dbGet('SELECT id, status FROM spots WHERE id = ?', [spotId])
        if (!spot) {
            return res.status(404).json({ error: 'Spot not found.' })
        }
        if (spot.status === 'taken') {
            return res.status(409).json({ error: 'This spot has already been taken.' })
        }

        let selectedPaymentMethodId = paymentMethodId

        if (newCard) {
            const cardNumber = String(newCard.cardNumber || '').replace(/\D/g, '')
            const expiryMonth = Number(newCard.expiryMonth)
            let expiryYear = Number(newCard.expiryYear)

            // Normalize 2-digit years to 4-digit years
            if (expiryYear < 100) {
                expiryYear = 2000 + expiryYear
            }

            if (!newCard.cardholderName?.trim()) {
                return res.status(422).json({ error: 'Cardholder name is required.' })
            }
            if (!isValidCardNumber(cardNumber)) {
                return res.status(422).json({ error: 'Invalid card number.' })
            }
            if (isExpiredCard(expiryMonth, expiryYear)) {
                return res.status(422).json({ error: 'Card has expired.' })
            }

            const token = createPaymentToken()
            const brand = cardBrandFromNumber(cardNumber)
            const last4 = cardNumber.slice(-4)

            const savedCard = await dbRun(
                `INSERT INTO payment_methods (user_id, token, card_brand, last4, expiry_month, expiry_year, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, token, brand, last4, expiryMonth, expiryYear, createdAt],
            )
            selectedPaymentMethodId = savedCard.lastID
        }

        const isNewCard = !!newCard

        if (!selectedPaymentMethodId) {
            return res.status(400).json({ error: 'Please select a payment method or enter a new card.' })
        }

        const paymentMethod = await dbGet(
            `SELECT id, card_brand, last4, expiry_month, expiry_year
             FROM payment_methods
             WHERE id = ? AND user_id = ?`,
            [selectedPaymentMethodId, userId],
        )

        if (!paymentMethod) {
            return res.status(404).json({ error: 'Payment method not found.' })
        }
        if (isExpiredCard(paymentMethod.expiry_month, paymentMethod.expiry_year)) {
            return res.status(402).json({ error: 'Selected card has expired.' })
        }

        // Simulated authorization check. If the card fingerprint indicates an invalid test method, decline.
        if (paymentMethod.last4 === '0000') {
            const failureReason = 'Payment declined by issuer.'
            await dbRun(
                `INSERT INTO payments (user_id, payment_method_id, amount, status, failure_reason, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, paymentMethod.id, feeAmount, 'failed', failureReason, createdAt],
            )
            if (isNewCard) {
                await dbRun('DELETE FROM payment_methods WHERE id = ?', [selectedPaymentMethodId])
            }
            return res.status(402).json({ error: failureReason })
        }

        await dbRun(
            `INSERT INTO payments (user_id, payment_method_id, amount, status, failure_reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, paymentMethod.id, feeAmount, 'success', null, createdAt],
        )

        const sessionResult = await dbRun(
            `INSERT INTO parking_sessions (user_id, lot_id, spot_id, duration_hours, duration_minutes, total_minutes, fee_amount, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [userId, lotId, spotId, durationHours, durationMinutes, totalMinutes, feeAmount, createdAt],
        )

        await dbRun(`UPDATE spots SET status = 'taken' WHERE id = ?`, [spotId])

        return res.status(201).json({
            id: sessionResult.lastID,
            userId,
            lotId,
            spotId,
            durationHours,
            durationMinutes,
            totalMinutes,
            feeAmount,
            status: 'active',
            createdAt,
        })
    } catch (error) {
        console.error('Error processing payment:', error)
        return res.status(500).json({ error: 'Unable to process payment and create parking session.' })
    }
})

app.post('/signup', async (req, res) => {
    try {
        const { email, firstName, middleName, lastName, dob, phone, password } = req.body

        if (!email || !firstName || !lastName || !dob || !phone || !password) {
            return res.status(400).json({ error: 'Please provide all required fields.' })
        }

        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])
        if (existing) {
            return res.status(409).json({ error: 'An account with that email already exists.' })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const createdAt = new Date().toISOString()

        await dbRun(
            `INSERT INTO users (email, first_name, middle_name, last_name, dob, phone, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [email.toLowerCase(), firstName, middleName || '', lastName, dob, phone, passwordHash, createdAt]
        )

        return res.status(201).json({ message: 'Account created successfully.' })
    } catch (error) {
        console.error('Signup error:', error)
        return res.status(500).json({ error: 'Unable to create account.' })
    }
})

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' })
        }

        const user = await dbGet('SELECT id, password_hash FROM users WHERE email = ?', [email.toLowerCase()])
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' })
        }

        const validPassword = await bcrypt.compare(password, user.password_hash)
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' })
        }

        return res.json({ message: 'Login successful.', userId: user.id })
    } catch (error) {
        console.error('Login error:', error)
        return res.status(500).json({ error: 'Unable to log in.' })
    }
})

app.get('/lots', async (_req, res) => {
    try {
        const lots = await dbAll('SELECT id, name, description, rows, cols, latitude, longitude FROM lots ORDER BY id')
        return res.json(lots)
    } catch (error) {
        console.error('Error fetching lots:', error)
        return res.status(500).json({ error: 'Unable to load lots.' })
    }
})

app.get('/lots/:id', async (req, res) => {
    try {
        const lotId = Number(req.params.id)
        if (Number.isNaN(lotId)) {
            return res.status(400).json({ error: 'Invalid lot ID.' })
        }

        const lot = await dbGet('SELECT id, name, description, rows, cols, latitude, longitude FROM lots WHERE id = ?', [lotId])
        if (!lot) {
            return res.status(404).json({ error: 'Lot not found.' })
        }

        const spots = await dbAll(
            'SELECT id, label, row, col, status, accessible, ev FROM spots WHERE lot_id = ? ORDER BY row, col',
            [lotId],
        )

        return res.json({ ...lot, spots })
    } catch (error) {
        console.error('Error fetching lot details:', error)
        return res.status(500).json({ error: 'Unable to load lot details.' })
    }
})

app.get('/vehicles', async (req, res) => {
    try {
        const userId = Number(req.query.userId)
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' })
        }
        const vehicles = await dbAll(
            'SELECT id, license_plate, make, model, nickname, created_at FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        )
        return res.json(vehicles)
    } catch (error) {
        console.error('Error fetching vehicles:', error)
        return res.status(500).json({ error: 'Unable to load vehicles.' })
    }
})

app.post('/vehicles', async (req, res) => {
    try {
        const { userId, licensePlate, make, model, nickname } = req.body
        if (!userId || !licensePlate) {
            return res.status(400).json({ error: 'userId and licensePlate are required.' })
        }
        const createdAt = new Date().toISOString()
        const result = await dbRun(
            `INSERT INTO vehicles (user_id, license_plate, make, model, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, licensePlate.trim().toUpperCase(), make || null, model || null, nickname || null, createdAt]
        )
        return res.status(201).json({
            id: result.lastID,
            user_id: userId,
            license_plate: licensePlate.trim().toUpperCase(),
            make: make || null,
            model: model || null,
            nickname: nickname || null,
            created_at: createdAt,
        })
    } catch (error) {
        console.error('Error saving vehicle:', error)
        return res.status(500).json({ error: 'Unable to save vehicle.' })
    }
})

app.delete('/vehicles/:id', async (req, res) => {
    try {
        const vehicleId = Number(req.params.id)
        const { userId } = req.body
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' })
        }
        const vehicle = await dbGet('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId])
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found.' })
        }
        await dbRun('DELETE FROM vehicles WHERE id = ?', [vehicleId])
        return res.json({ message: 'Vehicle removed.' })
    } catch (error) {
        console.error('Error deleting vehicle:', error)
        return res.status(500).json({ error: 'Unable to remove vehicle.' })
    }
})

app.get('/sessions/active', async (req, res) => {
    try {
        const userId = Number(req.query.userId)
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' })
        }
        const sessions = await dbAll(
            `SELECT ps.id, ps.total_minutes, ps.created_at, ps.fee_amount,
                    sp.label AS spot_label, sp.ev,
                    l.name AS lot_name
             FROM parking_sessions ps
             JOIN spots sp ON sp.id = ps.spot_id
             JOIN lots l ON l.id = ps.lot_id
             WHERE ps.user_id = ? AND ps.status = 'active'`,
            [userId]
        )
        const now = Date.now()
        const result = sessions.map((s) => {
            const expiresAt = new Date(s.created_at).getTime() + s.total_minutes * 60 * 1000
            const minutesLeft = (expiresAt - now) / 60000
            return { ...s, expires_at: new Date(expiresAt).toISOString(), minutes_left: minutesLeft }
        })
        return res.json(result)
    } catch (error) {
        console.error('Error fetching active sessions:', error)
        return res.status(500).json({ error: 'Unable to load active sessions.' })
    }
})

const RATE_PER_HOUR = 2.50

app.post('/sessions', async (req, res) => {
    try {
        const { userId, lotId, spotId, hours, minutes, vehicleId } = req.body

        if (!userId || !lotId || !spotId) {
            return res.status(400).json({ error: 'userId, lotId, and spotId are required.' })
        }

        const durationHours = Math.max(0, Math.floor(Number(hours) || 0))
        const durationMinutes = Math.max(0, Math.min(59, Math.floor(Number(minutes) || 0)))
        const totalMinutes = durationHours * 60 + durationMinutes

        if (totalMinutes <= 0) {
            return res.status(400).json({ error: 'Duration must be greater than zero.' })
        }

        const resolvedVehicleId = vehicleId ? Number(vehicleId) : null
        if (resolvedVehicleId) {
            const vehicle = await dbGet('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [resolvedVehicleId, userId])
            if (!vehicle) {
                return res.status(400).json({ error: 'Selected vehicle not found.' })
            }
        }

        const feeAmount = parseFloat(((totalMinutes / 60) * RATE_PER_HOUR).toFixed(2))
        const createdAt = new Date().toISOString()

        const spot = await dbGet('SELECT id, status FROM spots WHERE id = ?', [spotId])
        if (!spot) {
            return res.status(404).json({ error: 'Spot not found.' })
        }
        if (spot.status === 'taken') {
            return res.status(409).json({ error: 'This spot has already been taken.' })
        }

        const result = await dbRun(
            `INSERT INTO parking_sessions (user_id, lot_id, spot_id, vehicle_id, duration_hours, duration_minutes, total_minutes, fee_amount, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [userId, lotId, spotId, resolvedVehicleId, durationHours, durationMinutes, totalMinutes, feeAmount, createdAt]
        )

        await dbRun(`UPDATE spots SET status = 'taken' WHERE id = ?`, [spotId])

        return res.status(201).json({
            id: result.lastID,
            userId,
            lotId,
            spotId,
            vehicleId: resolvedVehicleId,
            durationHours,
            durationMinutes,
            totalMinutes,
            feeAmount,
            status: 'active',
            createdAt,
        })
    } catch (error) {
        console.error('Error creating session:', error)
        return res.status(500).json({ error: 'Unable to create parking session.' })
    }
})

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

app.listen(PORT, () => {
    console.log(`Smart Parking server listening on http://localhost:${PORT}`)
})
