const { RACE_CONFIG, RACE_MODES } = require('../constants/raceConstants');

const isValidString = (str) => typeof str === 'string' && str.trim().length > 0;

module.exports = {
  validateAccessKey(accessKey, interfaceType) {
    if (!isValidString(accessKey) || !isValidString(interfaceType)) {
      return false;
    }

    const keyVar = `${interfaceType.toUpperCase()}_KEY`;
    return accessKey === process.env[keyVar];
  },

  validateRaceSession(race) {
    if (!race) {
      return { isValid: false, message: 'Race data is required' };
    }

    if (race.drivers && race.drivers.length > RACE_CONFIG.MAX_DRIVERS) {
      return {
        isValid: false,
        message: `Maximum ${RACE_CONFIG.MAX_DRIVERS} drivers allowed`,
      };
    }

    return { isValid: true };
  },

  validateRaceMode(mode) {
    return Object.values(RACE_MODES).includes(mode);
  },

  validateDriver(driver) {
    if (!isValidString(driver.name)) {
      return { isValid: false, message: 'Driver name is required' };
    }

    return { isValid: true };
  },
};
