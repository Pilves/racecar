const { RACE_DURATION } = require('../constants/raceConstants');

const timeUtils = {
    getRaceDuration() {
        return process.env.NODE_ENV === 'development'
            ? RACE_DURATION.DEVELOPMENT
            : RACE_DURATION.PRODUCTION;
    },

    formatTimer(timeInMs) {
        const minutes = Math.floor(timeInMs / 60000);
        const seconds = Math.floor((timeInMs % 60000) / 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    formatLapTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
    },

    calculateTimeRemaining(startTime, duration) {
        const elapsed = Date.now() - startTime;
        return Math.max(0, duration - elapsed);
    }
};

module.exports = timeUtils;