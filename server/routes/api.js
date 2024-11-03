const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const raceController = require('../controllers/raceController');
const authMiddleware = require('../middleware/authMiddleware');

// Authentication Route
router.post('/auth', authController.authenticate);

// Race Routes
router.get('/race', raceController.getCurrentRace);
router.post('/race', authMiddleware.authenticateJWT, raceController.createRace);
router.post('/race/:raceId/driver', authMiddleware.authenticateJWT, raceController.addDriver);
router.delete('/race/:raceId/driver/:driverId', authMiddleware.authenticateJWT, raceController.removeDriver);
router.post('/race/:raceId/start', authMiddleware.authenticateJWT, raceController.startRace);
router.post('/race/:raceId/mode', authMiddleware.authenticateJWT, raceController.changeRaceMode);
router.post('/race/:raceId/lap', authMiddleware.authenticateJWT, raceController.recordLap);
router.post('/race/:raceId/end', authMiddleware.authenticateJWT, raceController.endRace);

module.exports = router;
