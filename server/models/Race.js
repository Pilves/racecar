const db = require('../config/database');
const { RACE_STATUS } = require('../constants/raceConstants');

class Race {
    static async create() {
        const query = `
            INSERT INTO races (status, created_at, updated_at) 
            VALUES (?, strftime('%s','now'), strftime('%s','now'))
        `;
        
        try {
            const result = await db.run(query, [RACE_STATUS.UPCOMING]);
            return this.findById(result.lastID);
        } catch (error) {
            console.error('Error creating race:', error);
            throw error;
        }
    }

    static async findById(id) {
        const query = `
            SELECT * FROM races 
            WHERE id = ?
        `;
        
        try {
            const race = await db.get(query, [id]);
            if (!race) return null;

            const drivers = await this.getDrivers(id);
            const lapTimes = await this.getLapTimes(id);

            return {
                ...race,
                drivers,
                lapTimes: new Map(lapTimes.map(lap => [
                    lap.carNumber,
                    lapTimes.filter(l => l.carNumber === lap.carNumber)
                ]))
            };
        } catch (error) {
            console.error('Error finding race:', error);
            throw error;
        }
    }

    static async getCurrentRace() {
        const query = `
            SELECT * FROM races 
            WHERE status IN (?, ?) 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        
        try {
            const race = await db.get(query, [
                RACE_STATUS.UPCOMING, 
                RACE_STATUS.IN_PROGRESS
            ]);
            
            if (!race) return null;
            return this.findById(race.id);
        } catch (error) {
            console.error('Error getting current race:', error);
            throw error;
        }
    }

    static async update(id, data) {
        const allowedFields = ['status', 'mode', 'startTime'];
        const updates = Object.entries(data)
            .filter(([key]) => allowedFields.includes(key))
            .map(([key, value]) => `${key} = ?`);
        
        const query = `
            UPDATE races 
            SET ${updates.join(', ')}, updated_at = strftime('%s','now')
            WHERE id = ?
        `;
        
        try {
            const values = [...Object.values(data), id];
            await db.run(query, values);
            return this.findById(id);
        } catch (error) {
            console.error('Error updating race:', error);
            throw error;
        }
    }

    static async getDrivers(raceId) {
        const query = `
            SELECT * FROM drivers 
            WHERE race_id = ?
        `;
        
        try {
            return await db.all(query, [raceId]);
        } catch (error) {
            console.error('Error getting drivers:', error);
            throw error;
        }
    }

    static async getLapTimes(raceId) {
        const query = `
            SELECT * FROM lap_times 
            WHERE race_id = ?
            ORDER BY timestamp ASC
        `;
        
        try {
            return await db.all(query, [raceId]);
        } catch (error) {
            console.error('Error getting lap times:', error);
            throw error;
        }
    }

    static async addDriver(raceId, name) {
        // Check max drivers limit
        const drivers = await this.getDrivers(raceId);
        if (drivers.length >= 8) {
            throw new Error('Maximum number of drivers reached');
        }

        // Find available car number
        const usedNumbers = new Set(drivers.map(d => d.carNumber));
        let carNumber = null;
        for (let i = 1; i <= 8; i++) {
            if (!usedNumbers.has(i)) {
                carNumber = i;
                break;
            }
        }

        if (!carNumber) {
            throw new Error('No available car numbers');
        }

        const query = `
            INSERT INTO drivers (race_id, name, carNumber, created_at)
            VALUES (?, ?, ?, strftime('%s','now'))
        `;
        
        try {
            const result = await db.run(query, [raceId, name, carNumber]);
            return {
                id: result.lastID,
                raceId,
                name,
                carNumber
            };
        } catch (error) {
            console.error('Error adding driver:', error);
            throw error;
        }
    }

    static async recordLap(raceId, carNumber, timestamp) {
        const race = await this.findById(raceId);
        if (!race || race.status !== RACE_STATUS.IN_PROGRESS) {
            throw new Error('Race is not in progress');
        }

        const carLaps = Array.from(race.lapTimes.get(carNumber) || []);
        const lapNumber = carLaps.length + 1;
        const duration = carLaps.length > 0
            ? timestamp - carLaps[carLaps.length - 1].timestamp
            : 0;

        const query = `
            INSERT INTO lap_times (race_id, carNumber, lapNumber, timestamp, duration)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        try {
            const result = await db.run(query, [
                raceId, 
                carNumber, 
                lapNumber, 
                timestamp, 
                duration
            ]);
            
            return {
                id: result.lastID,
                raceId,
                carNumber,
                lapNumber,
                timestamp,
                duration
            };
        } catch (error) {
            console.error('Error recording lap:', error);
            throw error;
        }
    }
}

module.exports = Race;