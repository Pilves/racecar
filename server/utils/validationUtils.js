const { RACE_CONFIG, RACE_MODES } = require('../constants/raceConstants');

const validationUtils = {
    validateAccessKey(accessKey, interfaceType) {
        if (!accessKey || !interfaceType) return false;

        switch (interfaceType) {
            case 'front-desk':
                return accessKey === process.env.RECEPTIONIST_KEY;
            case 'lap-line-tracker':
                return accessKey === process.env.OBSERVER_KEY;
            case 'race-control':
                return accessKey === process.env.SAFETY_KEY;
            default:
                return false;
        }
    },

    validateRaceSession(race) {
        if (!race) {
            return { isValid: false, message: 'Race data is required' };
        }

        if (race.drivers && race.drivers.length > RACE_CONFIG.MAX_DRIVERS) {
            return { 
                isValid: false, 
                message: `Maximum ${RACE_CONFIG.MAX_DRIVERS} drivers allowed` 
            };
        }

        return { isValid: true };
    },

    validateRaceMode(mode) {
        return Object.values(RACE_MODES).includes(mode);
    },

    validateDriver(driver) {
        if (!driver.name || typeof driver.name !== 'string') {
            return { 
                isValid: false, 
                message: 'Driver name is required' 
            };
        }

        if (driver.name.trim().length === 0) {
            return { 
                isValid: false, 
                message: 'Driver name cannot be empty' 
            };
        }

        return { isValid: true };
    }
};

module.exports = validationUtils;