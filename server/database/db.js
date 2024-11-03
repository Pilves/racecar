const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'racetrack.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Initialize database tables
const initDb = () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS races (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT DEFAULT 'upcoming',
            startTime INTEGER,
            mode TEXT DEFAULT 'safe',
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

    db.serialize(() => {
        queries.forEach(query => {
            db.run(query, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                }
            });
        });
    });
};

// Helper function to run queries with promises
const run = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const get = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = {
    db,
    initDb,
    run,
    get,
    all
};