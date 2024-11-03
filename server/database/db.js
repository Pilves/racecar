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
                        return;
                    }
                    console.log('Connected to SQLite database');
                    this.initialize().then(resolve).catch(reject);
                }
            );
        });
    }

    async initialize() {
        const queries = [
            // Races table with all required fields
            `CREATE TABLE IF NOT EXISTS races (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT NOT NULL DEFAULT 'upcoming',
                mode TEXT NOT NULL DEFAULT 'safe',
                startTime INTEGER,
                duration INTEGER DEFAULT 600000,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
                CHECK (status IN ('upcoming', 'in_progress', 'finished')),
                CHECK (mode IN ('safe', 'hazard', 'danger', 'finish'))
            )`,

            // Drivers table with validation constraints
            `CREATE TABLE IF NOT EXISTS drivers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                race_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                carNumber INTEGER NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (race_id) REFERENCES races(id),
                UNIQUE(race_id, name),
                UNIQUE(race_id, carNumber),
                CHECK (carNumber BETWEEN 1 AND 8)
            )`,

            // Lap times table with validation
            `CREATE TABLE IF NOT EXISTS lap_times (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                race_id INTEGER NOT NULL,
                carNumber INTEGER NOT NULL,
                lapNumber INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (race_id) REFERENCES races(id)
            )`
        ];

        for (const query of queries) {
            await this.run(query);
        }

        // Create indexes for performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_races_status ON races(status)',
            'CREATE INDEX IF NOT EXISTS idx_drivers_race ON drivers(race_id)',
            'CREATE INDEX IF NOT EXISTS idx_laptimes_race ON lap_times(race_id)',
            'CREATE INDEX IF NOT EXISTS idx_laptimes_car ON lap_times(race_id, carNumber)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }
    }

    // Helper for running queries with promises
    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    // Helper for getting single row
    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Helper for getting multiple rows
    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Proper cleanup
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new Database();