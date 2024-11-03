const RaceService = require('../services/raceService');
const { validateRaceSession } = require('../utils/validationUtils');
const { RACE_STATUS } = require('../constants/raceConstants');

class RaceController {
    async getCurrentRace(req, res) {
        try {
            const race = await RaceService.getCurrentRace();
            res.json(race || { 
                status: RACE_STATUS.UPCOMING, 
                drivers: [] 
            });
        } catch (error) {
            console.error('Get current race error:', error);
            res.status(500).json({ 
                message: 'Failed to get current race' 
            });
        }
    }

    async createRace(req, res) {
        try {
            const validation = validateRaceSession(req.body);
            if (!validation.isValid) {
                return res.status(400).json({ 
                    message: validation.message 
                });
            }

            const race = await RaceService.createRace();
            res.status(201).json(race);
        } catch (error) {
            console.error('Create race error:', error);
            res.status(500).json({ 
                message: 'Failed to create race' 
            });
        }
    }

    async addDriver(req, res) {
        try {
            const { raceId } = req.params;
            const { name } = req.body;

            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ 
                    message: 'Valid driver name is required' 
                });
            }

            const driver = await RaceService.addDriver(
                parseInt(raceId), 
                name.trim()
            );
            res.status(201).json(driver);
        } catch (error) {
            console.error('Add driver error:', error);
            res.status(500).json({ 
                message: 'Failed to add driver' 
            });
        }
    }

    async removeDriver(req, res) {
        try {
            const { raceId, driverId } = req.params;
            await RaceService.removeDriver(
                parseInt(raceId), 
                parseInt(driverId)
            );
            res.json({ message: 'Driver removed successfully' });
        } catch (error) {
            console.error('Remove driver error:', error);
            res.status(500).json({ 
                message: 'Failed to remove driver' 
            });
        }
    }

    async startRace(req, res) {
        try {
            const { raceId } = req.params;
            const race = await RaceService.startRace(parseInt(raceId));
            res.json(race);
        } catch (error) {
            console.error('Start race error:', error);
            res.status(500).json({ 
                message: 'Failed to start race' 
            });
        }
    }

    async changeRaceMode(req, res) {
        try {
            const { raceId } = req.params;
            const { mode } = req.body;

            if (!mode) {
                return res.status(400).json({ 
                    message: 'Race mode is required' 
                });
            }

            const race = await RaceService.changeRaceMode(
                parseInt(raceId), 
                mode
            );
            res.json(race);
        } catch (error) {
            console.error('Change race mode error:', error);
            res.status(500).json({ 
                message: 'Failed to change race mode' 
            });
        }
    }

    async recordLap(req, res) {
        try {
            const { raceId } = req.params;
            const { carNumber, timestamp } = req.body;

            if (!carNumber || !timestamp) {
                return res.status(400).json({ 
                    message: 'Car number and timestamp are required' 
                });
            }

            const lapData = await RaceService.recordLap(
                parseInt(raceId),
                parseInt(carNumber),
                timestamp
            );
            res.json(lapData);
        } catch (error) {
            console.error('Record lap error:', error);
            res.status(500).json({ 
                message: 'Failed to record lap' 
            });
        }
    }

    async endRace(req, res) {
        try {
            const { raceId } = req.params;
            await RaceService.endRace(parseInt(raceId));
            res.json({ message: 'Race ended successfully' });
        } catch (error) {
            console.error('End race error:', error);
            res.status(500).json({ 
                message: 'Failed to end race' 
            });
        }
    }
}

module.exports = new RaceController();