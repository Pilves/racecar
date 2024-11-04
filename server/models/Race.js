const db = require('../db/db');
const { RACE_STATUS, RACE_MODES, RACE_CONFIG } = require('../constants/raceConstants');
const { ValidationError } = require('../middleware/validations');

class RaceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'RaceError';
    this.status = status;
  }
}

class Race {
  static async create(raceData = {}) {
    const { name = null, scheduledTime = null } = raceData;

    try {
      await db.beginTransaction();

      // Check if there's an active race
      const activeRace = await this.findActiveRace();
      if (activeRace) {
        throw new RaceError('Cannot create new race while another is active', 409);
      }

      const query = `
                INSERT INTO races (
                    name,
                    scheduled_time,
                    status,
                    mode,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, strftime('%s','now'), strftime('%s','now'))
            `;

      const result = await db.run(query, [
        name,
        scheduledTime,
        RACE_STATUS.UPCOMING,
        RACE_MODES.SAFE
      ]);

      await db.commit();
      return this.findById(result.lastID);
    } catch (error) {
      await db.rollback();
      throw this.handleError(error);
    }
  }

  static async findById(id) {
    try {
      const query = `
                SELECT 
                    r.*,
                    json_group_array(DISTINCT json_object(
                        'id', d.id,
                        'name', d.name,
                        'carNumber', d.carNumber,
                        'createdAt', d.created_at
                    )) as drivers,
                    json_group_array(DISTINCT json_object(
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

      const race = await db.get(query, [id]);
      if (!race) {
        throw new RaceError('Race not found', 404);
      }

      return this.formatRaceData(race);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  static async findActiveRace() {
    try {
      const query = `
                SELECT id FROM races
                WHERE status IN (?, ?)
                ORDER BY created_at DESC
                LIMIT 1
            `;

      const race = await db.get(query, [
        RACE_STATUS.UPCOMING,
        RACE_STATUS.IN_PROGRESS
      ]);

      return race ? this.findById(race.id) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  static async update(id, data) {
    try {
      await db.beginTransaction();

      const race = await this.findById(id);
      if (!race) {
        throw new RaceError('Race not found', 404);
      }

      const allowedUpdates = ['name', 'status', 'mode', 'scheduledTime'];
      const updates = Object.keys(data)
        .filter(key => allowedUpdates.includes(key))
        .map(key => `${this.toSnakeCase(key)} = ?`);

      if (updates.length === 0) {
        throw new ValidationError('No valid update fields provided');
      }

      const query = `
                UPDATE races
                SET ${updates.join(', ')}, updated_at = strftime('%s','now')
                WHERE id = ?
            `;

      const values = [
        ...Object.keys(data)
          .filter(key => allowedUpdates.includes(key))
          .map(key => data[key]),
        id
      ];

      await db.run(query, values);
      await db.commit();

      return this.findById(id);
    } catch (error) {
      await db.rollback();
      throw this.handleError(error);
    }
  }

  static async addDriver(raceId, driverData) {
    try {
      await db.beginTransaction();

      const race = await this.findById(raceId);
      if (!race) {
        throw new RaceError('Race not found', 404);
      }

      if (race.status !== RACE_STATUS.UPCOMING) {
        throw new RaceError('Cannot add drivers to an active or finished race', 400);
      }

      const drivers = await this.getDrivers(raceId);
      if (drivers.length >= RACE_CONFIG.MAX_DRIVERS) {
        throw new RaceError(`Maximum of ${RACE_CONFIG.MAX_DRIVERS} drivers allowed`, 400);
      }

      // Assign car number if not provided
      if (!driverData.carNumber) {
        driverData.carNumber = this.getNextAvailableCarNumber(drivers);
      }

      const query = `
                INSERT INTO drivers (
                    race_id,
                    name,
                    carNumber,
                    created_at
                ) VALUES (?, ?, ?, strftime('%s','now'))
            `;

      const result = await db.run(query, [
        raceId,
        driverData.name,
        driverData.carNumber
      ]);

      await db.commit();

      return {
        id: result.lastID,
        ...driverData
      };
    } catch (error) {
      await db.rollback();
      throw this.handleError(error);
    }
  }

  static async removeDriver(raceId, driverId) {
    try {
      await db.beginTransaction();

      const race = await this.findById(raceId);
      if (!race) {
        throw new RaceError('Race not found', 404);
      }

      if (race.status !== RACE_STATUS.UPCOMING) {
        throw new RaceError('Cannot remove drivers from an active or finished race', 400);
      }

      const result = await db.run(
        'DELETE FROM drivers WHERE race_id = ? AND id = ?',
        [raceId, driverId]
      );

      if (result.changes === 0) {
        throw new RaceError('Driver not found', 404);
      }

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw this.handleError(error);
    }
  }

  static async recordLap(raceId, carNumber, timestamp) {
    try {
      await db.beginTransaction();

      const race = await this.findById(raceId);
      if (!race) {
        throw new RaceError('Race not found', 404);
      }

      if (race.status !== RACE_STATUS.IN_PROGRESS) {
        throw new RaceError('Race is not in progress', 400);
      }

      const driver = race.drivers.find(d => d.carNumber === carNumber);
      if (!driver) {
        throw new RaceError('Car not found in race', 404);
      }

      const previousLaps = await this.getDriverLaps(raceId, carNumber);
      const lapNumber = previousLaps.length + 1;
      const duration = this.calculateLapDuration(previousLaps, timestamp);

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

      const result = await db.run(query, [
        raceId,
        carNumber,
        lapNumber,
        timestamp,
        duration
      ]);

      await db.commit();

      return {
        id: result.lastID,
        raceId,
        carNumber,
        lapNumber,
        timestamp,
        duration
      };
    } catch (error) {
      await db.rollback();
      throw this.handleError(error);
    }
  }

  static async getLeaderboard(raceId) {
    try {
      const query = `
                SELECT 
                    d.carNumber,
                    d.name as driverName,
                    COUNT(lt.id) as totalLaps,
                    MIN(lt.duration) as bestLap,
                    AVG(lt.duration) as avgLap,
                    json_group_array(lt.duration) as lapTimes
                FROM drivers d
                LEFT JOIN lap_times lt ON d.race_id = lt.race_id 
                    AND d.carNumber = lt.carNumber
                WHERE d.race_id = ?
                GROUP BY d.carNumber, d.name
                ORDER BY totalLaps DESC, bestLap ASC
            `;

      const results = await db.all(query, [raceId]);
      return results.map(row => ({
        ...row,
        lapTimes: JSON.parse(row.lapTimes).filter(Boolean),
        avgLap: row.avgLap ? parseFloat(row.avgLap.toFixed(3)) : null
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Helper methods
  static getNextAvailableCarNumber(drivers) {
    const usedNumbers = new Set(drivers.map(d => d.carNumber));
    for (let i = 1; i <= RACE_CONFIG.MAX_DRIVERS; i++) {
      if (!usedNumbers.has(i)) return i;
    }
    throw new RaceError('No available car numbers', 400);
  }

  static calculateLapDuration(previousLaps, currentTimestamp) {
    if (previousLaps.length === 0) return 0;
    const lastLap = previousLaps[previousLaps.length - 1];
    return currentTimestamp - lastLap.timestamp;
  }

  static formatRaceData(race) {
    const formatted = {
      ...race,
      drivers: JSON.parse(race.drivers).filter(d => d.id !== null),
      lapTimes: new Map()
    };

    const lapTimes = JSON.parse(race.lapTimes)
      .filter(lt => lt.id !== null);

    for (const lap of lapTimes) {
      if (!formatted.lapTimes.has(lap.carNumber)) {
        formatted.lapTimes.set(lap.carNumber, []);
      }
      formatted.lapTimes.get(lap.carNumber).push(lap);
    }

    delete formatted.lap_times;
    return formatted;
  }

  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  static handleError(error) {
    if (error instanceof RaceError || error instanceof ValidationError) {
      return error;
    }

    if (error.code === 'SQLITE_CONSTRAINT') {
      return new ValidationError('Database constraint violation');
    }

    console.error('Race model error:', error);
    return new RaceError('An unexpected error occurred');
  }
}

module.exports = Race;
