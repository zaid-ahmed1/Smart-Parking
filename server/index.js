import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
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
