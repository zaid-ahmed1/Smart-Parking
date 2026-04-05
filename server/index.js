import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.sqlite')
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const PORT = process.env.PORT || 4000

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173']

const app = express()
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Failed to open SQLite database:', err)
        process.exit(1)
    }
})

const runAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err)
            resolve(this)
        })
    })

const getAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err)
            resolve(row)
        })
    })

await runAsync(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    dob TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)

const createToken = (user) =>
    jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '7d',
    })

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing authentication token.' })
    }

    const token = authHeader.split(' ')[1]
    try {
        const payload = jwt.verify(token, JWT_SECRET)
        req.user = payload
        next()
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' })
    }
}

app.get('/api/health', (_req, res) => {
    res.send({ status: 'ok' })
})

app.post('/api/signup', async (req, res) => {
    const { email, password, dob, phone } = req.body
    if (!email || !password || !dob || !phone) {
        return res.status(400).json({ message: 'Email, password, date of birth, and phone are required.' })
    }

    try {
        const existing = await getAsync('SELECT id FROM users WHERE email = ?', [email])
        if (existing) {
            return res.status(400).json({ message: 'An account with that email already exists.' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const createdAt = new Date().toISOString()
        const result = await runAsync(
            'INSERT INTO users (email, password, dob, phone, created_at) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, dob, phone, createdAt],
        )

        const user = {
            id: result.lastID,
            email,
            dob,
            phone,
            createdAt,
        }

        const token = createToken(user)
        return res.json({ token, user })
    } catch (error) {
        console.error('Signup error:', error)
        return res.status(500).json({ message: 'Unable to create account.' })
    }
})

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' })
    }

    try {
        const user = await getAsync('SELECT * FROM users WHERE email = ?', [email])
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' })
        }

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password.' })
        }

        const token = createToken(user)
        return res.json({ token, user: { email: user.email, dob: user.dob, phone: user.phone, createdAt: user.created_at } })
    } catch (error) {
        console.error('Login error:', error)
        return res.status(500).json({ message: 'Unable to sign in.' })
    }
})

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const user = await getAsync('SELECT email, dob, phone, created_at FROM users WHERE email = ?', [req.user.email])
        if (!user) {
            return res.status(404).json({ message: 'User not found.' })
        }
        return res.json({ user: { email: user.email, dob: user.dob, phone: user.phone, createdAt: user.created_at } })
    } catch (error) {
        console.error('Profile error:', error)
        return res.status(500).json({ message: 'Unable to load profile.' })
    }
})

app.listen(PORT, () => {
    console.log(`Smart Parking API listening on http://localhost:${PORT}`)
})
