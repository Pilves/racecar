const Race = require('../models/Race');
const SocketService = require('../config/socket');
const { RACE_STATUS, RACE_DURATION } = require('../constants/raceConstants');

class RaceService {
    async getCurrentRace() {
        try {
            const race = await Race.getCurrentRace();
            return race || { status: RACE_STATUS.UPCOMING, drivers: [] };
        } catch (error) {
            throw new Error('Failed to get current race');
        }
    }

    async startRace(raceId) {
        try {
            const race = await Race.findById(raceId);
            if (!race) throw new Error('Race not found');

            const duration = process.env.NODE_ENV === 'development' 
                ? RACE_DURATION.DEVELOPMENT 
                : RACE_DURATION.PRODUCTION;

            const updatedRace = await Race.update(raceId, {
                status: RACE_STATUS.IN_PROGRESS,
                startTime: Date.now()
            });

            SocketService.emit('raceStarted', { 
                raceId, 
                startTime: updatedRace.startTime 
            });

            // Set timer for race end
            setTimeout(() => this.finishRace(raceId), duration);

            return updatedRace;
        } catch (error) {
            throw new Error('Failed to start race');
        }
    }


}