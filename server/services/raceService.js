const Race = require('../models/Race');
const SocketService = require('../config/socket');
const { RACE_STATUS, RACE_MODES, RACE_DURATION } = require('../constants/raceConstants');
const timeUtils = require('../utils/timeUtils');
const validationUtils = require('../utils/validationUtils');

class RaceService {
    constructor() {
        this.activeTimers = new Map();
    }

    async getCurrentRace() {
        try {
            const race = await Race.getCurrentRace();
            return race || { status: RACE_STATUS.UPCOMING, drivers: [] };
        } catch (error) {
            throw new Error('Failed to get current race');
        }
    }

    async createRace() {
        try {
            const currentRace = await this.getCurrentRace();
            if (currentRace && currentRace.status !== RACE_STATUS.FINISHED) {
                throw new Error('Cannot create new race while another is active');
            }

            const race = await Race.create();
            SocketService.emit('raceCreated', race);
            return race;
        } catch (error) {
            throw new Error(`Failed to create race: ${error.message}`);
        }
    }

    async addDriver(raceId, name) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');
            if (race.status !== RACE_STATUS.UPCOMING) {
                throw new Error('Cannot add drivers to an active or finished race');
            }

            const validation = validationUtils.validateDriver({ name });
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            const driver = await Race.addDriver(raceId, name);
            SocketService.emit('driverAdded', { raceId, driver });
            return driver;
        } catch (error) {
            throw new Error(`Failed to add driver: ${error.message}`);
        }
    }

    async removeDriver(raceId, driverId) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');
            if (race.status !== RACE_STATUS.UPCOMING) {
                throw new Error('Cannot remove drivers from an active or finished race');
            }

            await Race.removeDriver(raceId, driverId);
            SocketService.emit('driverRemoved', { raceId, driverId });
        } catch (error) {
            throw new Error(`Failed to remove driver: ${error.message}`);
        }
    }

    async startRace(raceId) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');
            if (race.status !== RACE_STATUS.UPCOMING) {
                throw new Error('Race cannot be started');
            }
            if (!race.drivers || race.drivers.length === 0) {
                throw new Error('Cannot start race without drivers');
            }

            const duration = process.env.NODE_ENV === 'development'
                ? RACE_DURATION.DEVELOPMENT
                : RACE_DURATION.PRODUCTION;

            const updatedRace = await Race.update(raceId, {
                status: RACE_STATUS.IN_PROGRESS,
                mode: RACE_MODES.SAFE,
                startTime: Date.now(),
                duration
            });

            // Set up race timer
            this.setupRaceTimer(raceId, duration);

            SocketService.emit('raceStarted', {
                raceId,
                startTime: updatedRace.startTime,
                duration
            });

            return updatedRace;
        } catch (error) {
            throw new Error(`Failed to start race: ${error.message}`);
        }
    }

    setupRaceTimer(raceId, duration) {
        // Clear any existing timer
        if (this.activeTimers.has(raceId)) {
            clearTimeout(this.activeTimers.get(raceId));
        }

        // Set new timer
        const timer = setTimeout(async () => {
            try {
                await this.changeRaceMode(raceId, RACE_MODES.FINISH);
                this.activeTimers.delete(raceId);
            } catch (error) {
                console.error('Error in race timer:', error);
            }
        }, duration);

        this.activeTimers.set(raceId, timer);
    }

    async changeRaceMode(raceId, mode) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');
            if (race.status !== RACE_STATUS.IN_PROGRESS) {
                throw new Error('Cannot change mode of non-active race');
            }
            if (race.mode === RACE_MODES.FINISH) {
                throw new Error('Cannot change mode after finish');
            }
            if (!validationUtils.validateRaceMode(mode)) {
                throw new Error('Invalid race mode');
            }

            const updatedRace = await Race.update(raceId, { mode });
            SocketService.emit('raceModeChanged', { raceId, mode });
            return updatedRace;
        } catch (error) {
            throw new Error(`Failed to change race mode: ${error.message}`);
        }
    }

    async recordLap(raceId, carNumber, timestamp) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');
            if (race.status !== RACE_STATUS.IN_PROGRESS) {
                throw new Error('Cannot record lap for non-active race');
            }
            if (!race.drivers.some(d => d.carNumber === carNumber)) {
                throw new Error('Invalid car number');
            }

            const lapData = await Race.recordLap(raceId, carNumber, timestamp);
            SocketService.emit('lapRecorded', lapData);
            return lapData;
        } catch (error) {
            throw new Error(`Failed to record lap: ${error.message}`);
        }
    }

    async endRace(raceId) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');
            if (race.status !== RACE_STATUS.IN_PROGRESS) {
                throw new Error('Cannot end non-active race');
            }

            // Clear any active timer
            if (this.activeTimers.has(raceId)) {
                clearTimeout(this.activeTimers.get(raceId));
                this.activeTimers.delete(raceId);
            }

            const updatedRace = await Race.update(raceId, {
                status: RACE_STATUS.FINISHED,
                mode: RACE_MODES.FINISH
            });

            // Calculate final race statistics
            const raceStats = this.calculateRaceStats(race);

            SocketService.emit('raceEnded', {
                raceId,
                stats: raceStats
            });

            return {
                race: updatedRace,
                stats: raceStats
            };
        } catch (error) {
            throw new Error(`Failed to end race: ${error.message}`);
        }
    }

    calculateRaceStats(race) {
        const stats = {
            totalLaps: 0,
            fastestLap: {
                carNumber: null,
                driverName: null,
                time: Infinity
            },
            driverStats: {}
        };

        // Process each driver's laps
        race.drivers.forEach(driver => {
            const driverLaps = Array.from(race.lapTimes.get(driver.carNumber) || []);
            const lapTimes = driverLaps.map(lap => lap.duration).filter(Boolean);

            stats.driverStats[driver.carNumber] = {
                name: driver.name,
                totalLaps: driverLaps.length,
                fastestLap: Math.min(...lapTimes) || 0,
                averageLap: lapTimes.length ?
                    lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : 0
            };

            stats.totalLaps += driverLaps.length;

            // Update fastest lap if this driver has the fastest
            if (stats.driverStats[driver.carNumber].fastestLap < stats.fastestLap.time) {
                stats.fastestLap = {
                    carNumber: driver.carNumber,
                    driverName: driver.name,
                    time: stats.driverStats[driver.carNumber].fastestLap
                };
            }
        });

        return stats;
    }
}

module.exports = new RaceService();