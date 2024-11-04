const { RACE_STATUS } = require('../constants/raceConstants');

class RaceStatsService {
  constructor() {
    this.statsCache = new Map();
    this.cacheTimeout = 5000; // 5 seconds cache
  }

  async calculateRaceStats(race) {
    // Check cache first
    const cachedStats = this.getCachedStats(race.id);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = {
      raceId: race.id,
      status: race.status,
      startTime: race.startTime,
      duration: race.duration,
      totalLaps: 0,
      participantsCount: race.drivers.length,
      fastestLap: {
        driverName: null,
        carNumber: null,
        time: null,
        lapNumber: null
      },
      averageLapTime: null,
      driverStats: {},
      progressStats: {
        completedLaps: 0,
        dnf: 0,
        active: 0,
        finished: 0
      }
    };

    // Process each driver's statistics
    for (const driver of race.drivers) {
      const driverLaps = Array.from(race.lapTimes.get(driver.carNumber) || []);
      const driverStats = this.calculateDriverStats(driver, driverLaps);

      stats.driverStats[driver.carNumber] = driverStats;
      stats.totalLaps += driverStats.totalLaps;

      // Update fastest lap if applicable
      if (driverStats.fastestLap && (!stats.fastestLap.time || driverStats.fastestLap.time < stats.fastestLap.time)) {
        stats.fastestLap = {
          driverName: driver.name,
          carNumber: driver.carNumber,
          time: driverStats.fastestLap.time,
          lapNumber: driverStats.fastestLap.lapNumber
        };
      }

      // Update progress statistics
      this.updateProgressStats(stats.progressStats, driverStats);
    }

    // Calculate overall average lap time
    stats.averageLapTime = this.calculateOverallAverageLapTime(stats.driverStats);

    // Calculate consistency scores
    this.calculateConsistencyScores(stats);

    // Add rankings
    this.calculateRankings(stats);

    // Cache the results
    this.cacheStats(race.id, stats);

    return stats;
  }

  calculateDriverStats(driver, laps) {
    const stats = {
      driverId: driver.id,
      name: driver.name,
      carNumber: driver.carNumber,
      totalLaps: laps.length,
      fastestLap: null,
      averageLapTime: null,
      lastLapTime: null,
      lapTimes: [],
      consistency: null,
      status: this.determineDriverStatus(laps),
      progression: {
        improvement: 0,
        deterioration: 0
      }
    };

    if (laps.length > 0) {
      // Process lap times
      const validLapTimes = laps
        .filter(lap => lap.duration > 0)
        .map(lap => ({
          lapNumber: lap.lapNumber,
          time: lap.duration
        }));

      stats.lapTimes = validLapTimes;

      if (validLapTimes.length > 0) {
        // Find fastest lap
        const fastestLap = validLapTimes.reduce((fastest, current) =>
          !fastest || current.time < fastest.time ? current : fastest
        );
        stats.fastestLap = fastestLap;

        // Calculate average lap time
        const totalTime = validLapTimes.reduce((sum, lap) => sum + lap.time, 0);
        stats.averageLapTime = totalTime / validLapTimes.length;

        // Get last lap time
        stats.lastLapTime = validLapTimes[validLapTimes.length - 1].time;

        // Calculate consistency (standard deviation of lap times)
        stats.consistency = this.calculateConsistency(validLapTimes);

        // Calculate progression
        this.calculateProgression(stats, validLapTimes);
      }
    }

    return stats;
  }

  calculateConsistency(lapTimes) {
    if (lapTimes.length < 2) return null;

    const times = lapTimes.map(lap => lap.time);
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const squaredDiffs = times.map(time => Math.pow(time - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (times.length - 1);

    return Math.sqrt(variance);
  }

  calculateProgression(stats, lapTimes) {
    if (lapTimes.length < 2) return;

    for (let i = 1; i < lapTimes.length; i++) {
      const diff = lapTimes[i].time - lapTimes[i-1].time;
      if (diff < 0) {
        stats.progression.improvement++;
      } else if (diff > 0) {
        stats.progression.deterioration++;
      }
    }
  }

  calculateOverallAverageLapTime(driverStats) {
    let totalTime = 0;
    let totalLaps = 0;

    Object.values(driverStats).forEach(stats => {
      if (stats.averageLapTime) {
        totalTime += stats.averageLapTime * stats.totalLaps;
        totalLaps += stats.totalLaps;
      }
    });

    return totalLaps > 0 ? totalTime / totalLaps : null;
  }

  calculateConsistencyScores(stats) {
    const consistencyScores = Object.values(stats.driverStats)
      .filter(driver => driver.consistency !== null)
      .map(driver => ({
        carNumber: driver.carNumber,
        consistency: driver.consistency
      }));

    if (consistencyScores.length > 0) {
      // Sort by consistency (lower is better)
      consistencyScores.sort((a, b) => a.consistency - b.consistency);

      // Assign relative consistency scores (0-100)
      const worstConsistency = consistencyScores[consistencyScores.length - 1].consistency;
      consistencyScores.forEach(score => {
        const relativeScore = 100 * (1 - (score.consistency / worstConsistency));
        stats.driverStats[score.carNumber].consistencyScore = Math.round(relativeScore);
      });
    }
  }

  calculateRankings(stats) {
    const drivers = Object.values(stats.driverStats);

    // Sort by total laps (descending) and best lap time (ascending)
    drivers.sort((a, b) => {
      if (b.totalLaps !== a.totalLaps) return b.totalLaps - a.totalLaps;
      if (!a.fastestLap) return 1;
      if (!b.fastestLap) return -1;
      return a.fastestLap.time - b.fastestLap.time;
    });

    // Assign positions
    drivers.forEach((driver, index) => {
      stats.driverStats[driver.carNumber].position = index + 1;
    });
  }

  determineDriverStatus(laps) {
    if (laps.length === 0) return 'NOT_STARTED';
    const timeSinceLastLap = Date.now() - laps[laps.length - 1].timestamp;
    return timeSinceLastLap > 60000 ? 'INACTIVE' : 'ACTIVE'; // 1 minute threshold
  }

  updateProgressStats(progressStats, driverStats) {
    switch (driverStats.status) {
      case 'ACTIVE':
        progressStats.active++;
        break;
      case 'INACTIVE':
        progressStats.dnf++;
        break;
      case 'NOT_STARTED':
        break;
    }
    progressStats.completedLaps += driverStats.totalLaps;
  }

  getCachedStats(raceId) {
    const cached = this.statsCache.get(raceId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.stats;
    }
    return null;
  }

  cacheStats(raceId, stats) {
    this.statsCache.set(raceId, {
      stats,
      timestamp: Date.now()
    });
  }

  clearCache(raceId) {
    if (raceId) {
      this.statsCache.delete(raceId);
    } else {
      this.statsCache.clear();
    }
  }
}

module.exports = new RaceStatsService();
