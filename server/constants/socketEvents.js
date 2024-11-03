const SOCKET_EVENTS = {
    // Connection events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',

    // Race lifecycle events
    RACE_CREATED: 'raceCreated',
    RACE_UPDATED: 'raceUpdated',
    RACE_STARTED: 'raceStarted',
    RACE_ENDED: 'raceEnded',
    RACE_MODE_CHANGED: 'raceModeChanged',
    RACE_TIMER_UPDATE: 'raceTimerUpdate',

    // Driver events
    DRIVER_ADDED: 'driverAdded',
    DRIVER_REMOVED: 'driverRemoved',

    // Lap events
    LAP_RECORDED: 'lapRecorded',
    FASTEST_LAP_UPDATE: 'fastestLapUpdate',

    // Display events
    LEADERBOARD_UPDATE: 'leaderboardUpdate',
    NEXT_RACE_UPDATE: 'nextRaceUpdate',
    FLAG_STATUS_UPDATE: 'flagStatusUpdate',

    // Client events (from frontend to backend)
    CLIENT: {
        JOIN_RACE: 'joinRace',
        RECORD_LAP: 'recordLap',
        CHANGE_RACE_MODE: 'changeRaceMode',
        REQUEST_RACE_STATE: 'requestRaceState'
    }
};

module.exports = SOCKET_EVENTS;