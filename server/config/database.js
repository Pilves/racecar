const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(
                path.join(__dirname, '../database/racetrack.db'),
                (err) => {
                    if (err) {
                        console.error('Database connection error:', err);
                        reject(err);
                    }
                    console.log('Connected to SQLite database');
                    this.initialize();
                    resolve();
                }
            );
        });
    }

    initialize() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS races (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT DEFAULT 'upcoming',
                mode TEXT DEFAULT 'safe',
                startTime INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,
            `CREATE TABLE IF NOT EXISTS drivers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                race_id INTEGER,
                name TEXT NOT NULL,
                carNumber INTEGER NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (race_id) REFERENCES races (id)
            )`,
            `CREATE TABLE IF NOT EXISTS lap_times (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                race_id INTEGER,
                carNumber INTEGER,
                lapNumber INTEGER,
                timestamp INTEGER,
                duration INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (race_id) REFERENCES races (id)
            )`
        ];

        queries.forEach(query => {
            this.db.run(query, err => {
                if (err) {
                    console.error('Database initialization error:', err);
                }
            });
        });
    }

    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();