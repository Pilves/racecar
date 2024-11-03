const RACE_MODES = {
    SAFE: 'safe',
    HAZARD: 'hazard',
    DANGER: 'danger',
    FINISH: 'finish'
};

const RACE_STATUS = {
    UPCOMING: 'upcoming',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished'
};

const RACE_DURATION = {
    DEVELOPMENT: 60000,  // 1 minute
    PRODUCTION: 600000   // 10 minutes
};

const RACE_CONFIG = {
    MAX_DRIVERS: 8,
    MIN_DRIVERS: 1
};

module.exports = {
    RACE_MODES,
    RACE_STATUS,
    RACE_DURATION,
    RACE_CONFIG
};
