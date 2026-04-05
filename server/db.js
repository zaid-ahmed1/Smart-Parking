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

export async function initDb() {
    await new Promise((resolve, reject) => {
        db.run(
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
      )`,
            (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(undefined)
                }
            }
        )
    })
}
