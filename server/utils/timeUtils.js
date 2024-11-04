const { RACE_DURATION } = require('../constants/raceConstants');

const formatTime = (timeInMs, format = 'mm:ss') => {
  const minutes = Math.floor(timeInMs / 60000);
  const seconds = Math.floor((timeInMs % 60000) / 1000);
  const milliseconds = Math.floor((timeInMs % 1000) / 10);

  switch (format) {
    case 'mm:ss':
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    case 'mm:ss.ff':
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
    default:
      throw new Error(`Unsupported time format: ${format}`);
  }
};

module.exports = {
  getRaceDuration() {
    return process.env.NODE_ENV === 'development'
      ? RACE_DURATION.DEVELOPMENT
      : RACE_DURATION.PRODUCTION;
  },

  formatTimer(timeInMs) {
    return formatTime(timeInMs, 'mm:ss');
  },

  formatLapTime(timeInMs) {
    return formatTime(timeInMs, 'mm:ss.ff');
  },

  calculateTimeRemaining(startTime, duration) {
    const elapsedTime = Date.now() - startTime;
    return Math.max(0, duration - elapsedTime);
  },
};
