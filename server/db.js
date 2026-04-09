import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databasePath = path.join(__dirname, 'db.sqlite')

export const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
        console.error('Failed to open SQLite database:', err)
        process.exit(1)
    }
})

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

export async function initDb() {
    await dbRun(
        `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        dob TEXT NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    )

    await dbRun(
        `CREATE TABLE IF NOT EXISTS lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        rows INTEGER NOT NULL,
        cols INTEGER NOT NULL,
        latitude REAL,
        longitude REAL
      )`
    )

    await dbRun(
        `CREATE TABLE IF NOT EXISTS spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lot_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        status TEXT NOT NULL,
        accessible INTEGER NOT NULL DEFAULT 0,
        ev INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (lot_id) REFERENCES lots(id)
      )`
    )

    const ensureColumn = async (table, name, definition) => {
        try {
            await dbRun(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
        } catch (err) {
            // ignore if the column already exists
        }
    }

    await dbRun(
        `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        license_plate TEXT NOT NULL,
        make TEXT,
        model TEXT,
        nickname TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    )

    await dbRun(
        `CREATE TABLE IF NOT EXISTS parking_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        lot_id INTEGER NOT NULL,
        spot_id INTEGER NOT NULL,
        vehicle_id INTEGER,
        duration_hours INTEGER NOT NULL DEFAULT 0,
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        total_minutes INTEGER NOT NULL,
        fee_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (lot_id) REFERENCES lots(id),
        FOREIGN KEY (spot_id) REFERENCES spots(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )`
    )

    await ensureColumn('lots', 'latitude', 'REAL')
    await ensureColumn('lots', 'longitude', 'REAL')
    await ensureColumn('spots', 'ev', 'INTEGER NOT NULL DEFAULT 0')
    await ensureColumn('parking_sessions', 'vehicle_id', 'INTEGER REFERENCES vehicles(id)')

    const parkingLots = [
        {
            name: 'Lot 1 - Main Campus',
            description: 'Central parking lot near the main campus buildings and Taylor Family Digital Library.',
            rows: 6,
            cols: 8,
            latitude: 51.0766,
            longitude: -114.1323,
            evCount: 8,
            accessibleCount: 6,
        },
        {
            name: 'Lot 2 - Science Complex',
            description: 'Parking near the science buildings and Earth Sciences department.',
            rows: 5,
            cols: 7,
            latitude: 51.0772,
            longitude: -114.1338,
            evCount: 6,
            accessibleCount: 4,
        },
        {
            name: 'Lot 3 - Business School',
            description: 'Convenient parking for Haskayne School of Business and adjacent buildings.',
            rows: 4,
            cols: 6,
            latitude: 51.0751,
            longitude: -114.1312,
            evCount: 5,
            accessibleCount: 3,
        },
        {
            name: 'Lot 4 - Residence',
            description: 'Parking near student residences and dining facilities.',
            rows: 5,
            cols: 5,
            latitude: 51.0785,
            longitude: -114.1328,
            evCount: 5,
            accessibleCount: 3,
        },
        {
            name: 'Lot 5 - Athletics',
            description: 'Parking for the Jack Simpson Gymnasium and athletic facilities.',
            rows: 4,
            cols: 5,
            latitude: 51.0748,
            longitude: -114.1342,
            evCount: 4,
            accessibleCount: 3,
        },
        {
            name: 'Lot 6 - Engineering',
            description: 'Parking near the Schulich School of Engineering and IT buildings.',
            rows: 5,
            cols: 6,
            latitude: 51.0768,
            longitude: -114.1355,
            evCount: 6,
            accessibleCount: 4,
        },
        {
            name: 'Lot 7 - Health Sciences',
            description: 'Parking for the Cumming School of Medicine and health sciences facilities.',
            rows: 4,
            cols: 5,
            latitude: 51.0798,
            longitude: -114.1318,
            evCount: 4,
            accessibleCount: 3,
        },
        {
            name: 'Lot 8 - Veterinary Medicine',
            description: 'Parking near the Faculty of Veterinary Medicine and WCVM buildings.',
            rows: 3,
            cols: 5,
            latitude: 51.0775,
            longitude: -114.1298,
            evCount: 3,
            accessibleCount: 2,
        },
        {
            name: 'Lot 9 - Foothills Campus',
            description: 'Parking at the Foothills Campus medical complex.',
            rows: 4,
            cols: 6,
            latitude: 51.0722,
            longitude: -114.1268,
            evCount: 5,
            accessibleCount: 4,
        },
        {
            name: 'Lot 10 - Research Park',
            description: 'Parking near the University Research Park and innovation facilities.',
            rows: 3,
            cols: 4,
            latitude: 51.0805,
            longitude: -114.1302,
            evCount: 3,
            accessibleCount: 2,
        },
    ]

    const existingLots = await dbAll('SELECT name FROM lots')
    const existingNames = new Set(existingLots.map((row) => row.name))

    // Delete all existing lots to start fresh
    await dbRun('DELETE FROM spots')
    await dbRun('DELETE FROM lots')

    const generateSpots = (lotId, rows, cols, evCount, accessibleCount) => {
        const spots = []
        const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const total = rows * cols
        const evIndexes = new Set()

        for (let idx = 0; idx < evCount; idx += 1) {
            evIndexes.add(idx * 3 % total)
        }

        const accessibleIndexes = new Set()
        for (let idx = 0; idx < accessibleCount; idx += 1) {
            accessibleIndexes.add((idx * 4 + 1) % total)
        }

        for (let r = 1; r <= rows; r += 1) {
            for (let c = 1; c <= cols; c += 1) {
                const position = (r - 1) * cols + (c - 1)
                const label = `${rowLetters[r - 1]}${c}`
                const isEv = evIndexes.has(position)
        const status = position % 4 === 0 ? 'taken' : 'free'
        const accessible = accessibleIndexes.has(position) ? 1 : 0
        spots.push([lotId, label, r, c, status, accessible, isEv ? 1 : 0])
            }
        }

        return spots
    }

    for (const lot of parkingLots) {
        await dbRun(
            `INSERT INTO lots (name, description, rows, cols, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`,
            [lot.name, lot.description, lot.rows, lot.cols, lot.latitude, lot.longitude],
        )

        const lotRow = await dbGet('SELECT id FROM lots WHERE name = ?', [lot.name])
        if (!lotRow) continue

        const lotId = lotRow.id
        const spots = generateSpots(lotId, lot.rows, lot.cols, lot.evCount, lot.accessibleCount)
        for (const spot of spots) {
            await dbRun(
                `INSERT INTO spots (lot_id, label, row, col, status, accessible, ev) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                spot,
            )
        }
    }
}
