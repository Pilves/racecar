const Race = require('../models/Race');
const RaceStatsService = require('../services/raceStatsService');
const { RACE_STATUS } = require('../constants/raceConstants');
const socketService = require('../services/socketService');
const { ValidationError } = require('../middleware/validations');

class RaceController {
  // List all races with pagination and optional stats
  async listRaces(req, res) {
    try {
      const { page = 1, limit = 10, status, includeStats = false } = req.query;
      const offset = (page - 1) * limit;

      const races = await Race.findAll({
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      if (includeStats && races.data.length > 0) {
        const racesWithStats = await Promise.all(
          races.data.map(async race => ({
            ...race,
            stats: await RaceStatsService.calculateRaceStats(race)
          }))
        );
        races.data = racesWithStats;
      }

      res.json({
        data: races.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: races.total
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Get current active race with live statistics
  async getCurrentRace(req, res) {
    try {
      const race = await Race.findActiveRace();
      if (!race) {
        return res.json({
          status: RACE_STATUS.UPCOMING,
          drivers: [],
        });
      }

      const stats = await RaceStatsService.calculateRaceStats(race);
      res.json({ race, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Update driver information
  async updateDriver(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const driverId = parseInt(req.params.driverId);
      const updateData = req.validatedData;

      const driver = await Race.updateDriver(raceId, driverId, updateData);
      if (!driver) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Driver not found',
        });
      }

      const race = await Race.findById(raceId);
      const stats = await RaceStatsService.calculateRaceStats(race);

      socketService.emit('driverUpdated', {
        raceId,
        driver: this.sanitizeDriver(driver),
        stats,
      });

      res.json({ driver, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Get all drivers in a race
  async getDrivers(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const race = await Race.findById(raceId);
      if (!race) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Race not found',
        });
      }

      const drivers = await Race.getDrivers(raceId);
      res.json({ drivers });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Get all laps in a race
  async getLaps(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const race = await Race.findById(raceId);
      if (!race) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Race not found',
        });
      }

      const laps = await Race.getLaps(raceId);
      res.json({ laps });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Get specific race by ID with stats
  async getRaceById(req, res) {
    try {
      const race = await Race.findById(parseInt(req.params.raceId));
      if (!race) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Race not found'
        });
      }

      const stats = await RaceStatsService.calculateRaceStats(race);
      res.json({ race, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Create new race
  async createRace(req, res) {
    try {
      const raceData = req.validatedData;
      const race = await Race.create(raceData);

      socketService.emit('raceCreated', {
        race: this.sanitizeRace(race)
      });

      res.status(201).json(race);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Update race with stats recalculation
  async updateRace(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const updateData = req.validatedData;

      const race = await Race.update(raceId, updateData);
      const stats = await RaceStatsService.calculateRaceStats(race);

      // Clear stats cache for updated race
      RaceStatsService.clearCache(raceId);

      socketService.emit('raceUpdated', {
        race: this.sanitizeRace(race),
        stats
      });

      res.json({ race, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Delete race and clear stats
  async deleteRace(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      await Race.delete(raceId);

      // Clear stats cache for deleted race
      RaceStatsService.clearCache(raceId);

      socketService.emit('raceDeleted', { raceId });

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Add driver and update stats
  async addDriver(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const driverData = req.validatedData;

      const driver = await Race.addDriver(raceId, driverData);
      const race = await Race.findById(raceId);
      const stats = await RaceStatsService.calculateRaceStats(race);

      socketService.emit('driverAdded', {
        raceId,
        driver: this.sanitizeDriver(driver),
        stats
      });

      res.status(201).json({ driver, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Remove driver and update stats
  async removeDriver(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const driverId = parseInt(req.params.driverId);

      await Race.removeDriver(raceId, driverId);
      const race = await Race.findById(raceId);
      const stats = await RaceStatsService.calculateRaceStats(race);

      socketService.emit('driverRemoved', {
        raceId,
        driverId,
        stats
      });

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Start race with initial stats
  async startRace(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const race = await Race.update(raceId, {
        status: RACE_STATUS.IN_PROGRESS,
        startTime: Date.now()
      });

      const stats = await RaceStatsService.calculateRaceStats(race);

      socketService.emit('raceStarted', {
        race: this.sanitizeRace(race),
        stats
      });

      res.json({ race, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // End race with final stats
  async endRace(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const race = await Race.update(raceId, {
        status: RACE_STATUS.FINISHED,
        endTime: Date.now()
      });

      const stats = await RaceStatsService.calculateRaceStats(race);

      socketService.emit('raceEnded', {
        race: this.sanitizeRace(race),
        stats
      });

      res.json({ race, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Update race mode with stats
  async changeRaceMode(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const { mode } = req.validatedData;

      const race = await Race.update(raceId, { mode });
      const stats = await RaceStatsService.calculateRaceStats(race);

      socketService.emit('raceModeChanged', {
        raceId,
        mode,
        race: this.sanitizeRace(race),
        stats
      });

      res.json({ race, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Record lap with live stats update
  async recordLap(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const lapData = req.validatedData;

      const lap = await Race.recordLap(
        raceId,
        lapData.carNumber,
        lapData.timestamp
      );

      const race = await Race.findById(raceId);
      const stats = await RaceStatsService.calculateRaceStats(race);
      const leaderboard = await Race.getLeaderboard(raceId);

      socketService.emit('lapRecorded', {
        lap,
        stats,
        leaderboard
      });

      res.status(201).json({ lap, stats, leaderboard });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Get detailed race statistics
  async getRaceStats(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const race = await Race.findById(raceId);
      if (!race) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Race not found',
        });
      }

      const stats = await RaceStatsService.calculateRaceStats(race);
      res.json(stats);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Get real-time leaderboard with stats
  async getLeaderboard(req, res) {
    try {
      const raceId = parseInt(req.params.raceId);
      const race = await Race.findById(raceId);
      const [leaderboard, stats] = await Promise.all([
        Race.getLeaderboard(raceId),
        RaceStatsService.calculateRaceStats(race)
      ]);

      res.json({ leaderboard, stats });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Helper methods
  handleError(res, error) {
    console.error('Race controller error:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message
      });
    }

    const status = error.status || 500;
    const message = error.status ? error.message : 'Internal server error';

    res.status(status).json({
      error: error.name || 'ServerError',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  sanitizeRace(race) {
    const { lap_times, ...sanitizedRace } = race;
    return sanitizedRace;
  }

  sanitizeDriver(driver) {
    const { password, ...sanitizedDriver } = driver;
    return sanitizedDriver;
  }
}

module.exports = new RaceController();
