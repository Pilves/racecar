const db = require('../config/database');
const { RACE_STATUS, RACE_MODES, RACE_CONFIG } = require('../constants/raceConstants');

class Race {
    static async create() {
        const query = `
            INSERT INTO races (
                status, 
                mode, 
                created_at, 
                updated_at
            ) VALUES (?, ?, strftime('%s','now'), strftime('%s','now'))
        `;

        try {
            const result = await db.run(query, [
                RACE_STATUS.UPCOMING,
                RACE_MODES.SAFE
            ]);
            return this.findById(result.lastID);
        } catch (error) {
            console.error('Error creating race:', error);
            throw error;
        }
    }

    static async findById(id) {
        const query = `
            SELECT 
                r.*,
                json_group_array(json_object(
                    'id', d.id,
                    'name', d.name,
                    'carNumber', d.carNumber
                )) as drivers,
                json_group_array(json_object(
                    'id', lt.id,
                    'carNumber', lt.carNumber,
                    'lapNumber', lt.lapNumber,
                    'timestamp', lt.timestamp,
                    'duration', lt.duration
                )) as lapTimes
            FROM races r
            LEFT JOIN drivers d ON r.id = d.race_id
            LEFT JOIN lap_times lt ON r.id = lt.race_id
            WHERE r.id = ?
            GROUP BY r.id
        `;

        try {
            const race = await db.get(query, [id]);
            if (!race) return null;

            // Parse JSON strings and format data
            race.drivers = JSON.parse(race.drivers).filter(d => d.id !== null);
            const lapTimesArray = JSON.parse(race.lapTimes).filter(lt => lt.id !== null);

            // Convert lap times array to Map grouped by car number
            race.lapTimes = new Map();
            lapTimesArray.forEach(lap => {
                if (!race.lapTimes.has(lap.carNumber)) {
                    race.lapTimes.set(lap.carNumber, []);
                }
                race.lapTimes.get(lap.carNumber).push(lap);
            });

            // Sort lap times for each car
            race.lapTimes.forEach(laps => {
                laps.sort((a, b) => a.timestamp - b.timestamp);
            });

            return race;
        } catch (error) {
            console.error('Error finding race:', error);
            throw error;
        }
    }

    static async getCurrentRace() {
        const query = `
            SELECT id FROM races 
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
        const allowedFields = ['status', 'mode', 'startTime', 'duration'];
        const updates = Object.entries(data)
            .filter(([key]) => allowedFields.includes(key))
            .map(([key]) => `${key} = ?`);

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

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
            SELECT id, name, carNumber 
            FROM drivers 
            WHERE race_id = ?
        `;

        try {
            return await db.all(query, [raceId]);
        } catch (error) {
            console.error('Error getting drivers:', error);
            throw error;
        }
    }

    static async addDriver(raceId, name) {
        // Get current drivers count
        const drivers = await this.getDrivers(raceId); // Now this should work
        if (drivers.length >= RACE_CONFIG.MAX_DRIVERS) {
            throw new Error('Maximum number of drivers reached');
        }

        // Find available car number
        const usedNumbers = new Set(drivers.map(d => d.carNumber));
        let carNumber = null;
        for (let i = 1; i <= RACE_CONFIG.MAX_DRIVERS; i++) {
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

    static async removeDriver(raceId, driverId) {
        const query = `
            DELETE FROM drivers 
            WHERE race_id = ? AND id = ?
        `;

        try {
            const result = await db.run(query, [raceId, driverId]);
            if (result.changes === 0) {
                throw new Error('Driver not found');
            }
        } catch (error) {
            console.error('Error removing driver:', error);
            throw error;
        }
    }

    static async recordLap(raceId, carNumber, timestamp) {
        // Validate race is active
        const race = await this.findById(raceId);
        if (!race || race.status !== RACE_STATUS.IN_PROGRESS) {
            throw new Error('Race is not in progress');
        }

        // Validate car exists in race
        if (!race.drivers.some(d => d.carNumber === carNumber)) {
            throw new Error('Car not found in race');
        }

        // Get car's previous laps
        const carLaps = Array.from(race.lapTimes.get(carNumber) || []);
        const lapNumber = carLaps.length + 1;

        // Calculate lap duration
        const duration = carLaps.length > 0
            ? timestamp - carLaps[carLaps.length - 1].timestamp
            : 0;

        const query = `
            INSERT INTO lap_times (
                race_id, 
                carNumber, 
                lapNumber, 
                timestamp, 
                duration,
                created_at
            ) VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
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

    static async getFastestLaps(raceId) {
        const query = `
            WITH RankedLaps AS (
                SELECT 
                    carNumber,
                    MIN(duration) as bestLap
                FROM lap_times
                WHERE race_id = ? AND duration > 0
                GROUP BY carNumber
            )
            SELECT 
                rl.carNumber,
                rl.bestLap as duration,
                d.name as driverName
            FROM RankedLaps rl
            JOIN drivers d ON d.race_id = ? AND d.carNumber = rl.carNumber
            ORDER BY rl.bestLap ASC
        `;

        try {
            return await db.all(query, [raceId, raceId]);
        } catch (error) {
            console.error('Error getting fastest laps:', error);
            throw error;
        }
    }

    static async getLeaderboard(raceId) {
        const query = `
            WITH DriverStats AS (
                SELECT 
                    d.carNumber,
                    d.name as driverName,
                    COUNT(lt.id) as totalLaps,
                    MIN(lt.duration) as bestLap,
                    AVG(lt.duration) as avgLap
                FROM drivers d
                LEFT JOIN lap_times lt ON d.race_id = lt.race_id 
                    AND d.carNumber = lt.carNumber
                WHERE d.race_id = ?
                GROUP BY d.carNumber, d.name
            )
            SELECT *
            FROM DriverStats
            ORDER BY totalLaps DESC, bestLap ASC
        `;

        try {
            return await db.all(query, [raceId]);
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }
}

module.exports = Race;