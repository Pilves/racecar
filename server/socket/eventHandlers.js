const EVENTS = require('../constants/socketEvents');
const RaceService = require('../services/raceService');
const timeUtils = require('../utils/timeUtils');
const socketService = require('../services/socketService');

class EventHandlers {
    constructor() {
        this.raceTimers = new Map();
    }

    // Race lifecycle handlers
    async handleRaceStart(raceId) {
        try {
            const race = await RaceService.startRace(raceId);
            socketService.emit(EVENTS.RACE_STARTED, {
                raceId,
                startTime: race.startTime,
                duration: race.duration
            });

            // Start timer updates
            this.startRaceTimer(raceId, race.startTime, race.duration);
        } catch (error) {
            console.error('Race start error:', error);
        }
    }

    async handleRaceEnd(raceId) {
        try {
            const result = await RaceService.endRace(raceId);

            // Stop timer updates
            this.stopRaceTimer(raceId);

            // Emit race ended event with stats
            socketService.emit(EVENTS.RACE_ENDED, {
                raceId,
                stats: result.stats
            });

            // Update next race display
            const nextRace = await RaceService.getCurrentRace();
            if (nextRace) {
                socketService.emit(EVENTS.NEXT_RACE_UPDATE, nextRace);
            }
        } catch (error) {
            console.error('Race end error:', error);
        }
    }

    async handleModeChange(raceId, mode) {
        try {
            await RaceService.changeRaceMode(raceId, mode);
            socketService.emit(EVENTS.RACE_MODE_CHANGED, { raceId, mode });
            socketService.emit(EVENTS.FLAG_STATUS_UPDATE, { mode });
        } catch (error) {
            console.error('Mode change error:', error);
        }
    }

    // Timer management
    startRaceTimer(raceId, startTime, duration) {
        if (this.raceTimers.has(raceId)) {
            clearInterval(this.raceTimers.get(raceId));
        }

        const timer = setInterval(() => {
            const timeRemaining = timeUtils.calculateTimeRemaining(startTime, duration);

            socketService.emitToRace(raceId, EVENTS.RACE_TIMER_UPDATE, {
                raceId,
                timeRemaining,
                formatted: timeUtils.formatTimer(timeRemaining)
            });

            if (timeRemaining <= 0) {
                this.handleRaceEnd(raceId);
            }
        }, 1000);

        this.raceTimers.set(raceId, timer);
    }

    stopRaceTimer(raceId) {
        if (this.raceTimers.has(raceId)) {
            clearInterval(this.raceTimers.get(raceId));
            this.raceTimers.delete(raceId);
        }
    }

    // Lap recording handlers
    async handleLapRecorded(raceId, carNumber) {
        try {
            const lapData = await RaceService.recordLap(raceId, carNumber, Date.now());

            socketService.emit(EVENTS.LAP_RECORDED, lapData);

            // Update leaderboard
            const leaderboard = await RaceService.getLeaderboard(raceId);
            socketService.emit(EVENTS.LEADERBOARD_UPDATE, { raceId, leaderboard });

            // Check if it's a fastest lap
            const fastestLaps = await RaceService.getFastestLaps(raceId);
            if (fastestLaps[0].carNumber === carNumber) {
                socketService.emit(EVENTS.FASTEST_LAP_UPDATE, {
                    raceId,
                    carNumber,
                    lapTime: fastestLaps[0].duration
                });
            }
        } catch (error) {
            console.error('Lap recording error:', error);
        }
    }

    // Cleanup
    cleanup() {
        for (const timer of this.raceTimers.values()) {
            clearInterval(timer);
        }
        this.raceTimers.clear();
    }
}

module.exports = new EventHandlers();