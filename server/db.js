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
        cols INTEGER NOT NULL
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
        FOREIGN KEY (lot_id) REFERENCES lots(id)
      )`
    )

    const existingLot = await dbGet('SELECT COUNT(*) AS count FROM lots')
    if (!existingLot || !existingLot.count) {
        const mainLot = await dbRun(
            `INSERT INTO lots (name, description, rows, cols) VALUES (?, ?, ?, ?)`,
            ['Main Campus Lot', 'Parking near the main campus buildings with quick access to classrooms and services.', 4, 6]
        )

        const garageLot = await dbRun(
            `INSERT INTO lots (name, description, rows, cols) VALUES (?, ?, ?, ?)`,
            ['East Garage Lot', 'Three-level garage with EV charging and reserved accessible spaces.', 3, 4]
        )

        const mainLotId = mainLot.lastID
        const garageLotId = garageLot.lastID

        const spots = [
            [mainLotId, 'A1', 1, 1, 'free', 0],
            [mainLotId, 'A2', 1, 2, 'taken', 0],
            [mainLotId, 'A3', 1, 3, 'ev', 0],
            [mainLotId, 'A4', 1, 4, 'free', 0],
            [mainLotId, 'A5', 1, 5, 'taken', 0],
            [mainLotId, 'A6', 1, 6, 'free', 0],
            [mainLotId, 'B1', 2, 1, 'free', 0],
            [mainLotId, 'B2', 2, 2, 'free', 0],
            [mainLotId, 'B3', 2, 3, 'free', 0],
            [mainLotId, 'B4', 2, 4, 'taken', 0],
            [mainLotId, 'B5', 2, 5, 'ev', 0],
            [mainLotId, 'B6', 2, 6, 'free', 0],
            [mainLotId, 'C1', 3, 1, 'free', 0],
            [mainLotId, 'C2', 3, 2, 'free', 0],
            [mainLotId, 'C3', 3, 3, 'free', 1],
            [mainLotId, 'C4', 3, 4, 'taken', 1],
            [mainLotId, 'C5', 3, 5, 'free', 0],
            [mainLotId, 'C6', 3, 6, 'free', 0],
            [mainLotId, 'D1', 4, 1, 'taken', 0],
            [mainLotId, 'D2', 4, 2, 'free', 0],
            [mainLotId, 'D3', 4, 3, 'free', 0],
            [mainLotId, 'D4', 4, 4, 'ev', 0],
            [mainLotId, 'D5', 4, 5, 'free', 0],
            [mainLotId, 'D6', 4, 6, 'free', 0],
            [garageLotId, 'A1', 1, 1, 'free', 1],
            [garageLotId, 'A2', 1, 2, 'ev', 0],
            [garageLotId, 'A3', 1, 3, 'taken', 0],
            [garageLotId, 'A4', 1, 4, 'free', 0],
            [garageLotId, 'B1', 2, 1, 'free', 0],
            [garageLotId, 'B2', 2, 2, 'taken', 0],
            [garageLotId, 'B3', 2, 3, 'ev', 0],
            [garageLotId, 'B4', 2, 4, 'free', 0],
            [garageLotId, 'C1', 3, 1, 'free', 0],
            [garageLotId, 'C2', 3, 2, 'free', 1],
            [garageLotId, 'C3', 3, 3, 'free', 0],
            [garageLotId, 'C4', 3, 4, 'taken', 0],
        ]

        for (const spot of spots) {
            await dbRun(
                `INSERT INTO spots (lot_id, label, row, col, status, accessible) VALUES (?, ?, ?, ?, ?, ?)`,
                spot,
            )
        }
    }
}
