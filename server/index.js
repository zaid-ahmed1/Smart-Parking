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

        return res.json({ message: 'Login successful.' })
    } catch (error) {
        console.error('Login error:', error)
        return res.status(500).json({ error: 'Unable to log in.' })
    }
})

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

app.listen(PORT, () => {
    console.log(`Smart Parking server listening on http://localhost:${PORT}`)
})
