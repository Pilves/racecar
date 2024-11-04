const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const RaceController = require('../controllers/raceController');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const { raceValidation } = require('../middleware/validations');

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: Date.now() });
});

// Auth routes
router.post('/auth', validateRequest(raceValidation.auth), AuthController.authenticate);
router.get('/auth/validate', authenticateJWT, AuthController.validateToken);
router.post('/auth/refresh', authenticateJWT, AuthController.refreshToken);
router.post('/auth/logout', authenticateJWT, AuthController.logout);

// Race Management Routes
// Front Desk Operations
router.route('/races')
  .get(
    authenticateJWT,
    requireRole(['front-desk', 'race-control']),
    RaceController.listRaces,
  )
  .post(
    authenticateJWT,
    requireRole('front-desk'),
    raceValidation.createRace, // Validation rules for creating a race
    validateRequest,
    RaceController.createRace,
  );

router.get(
  '/races/current',
  authenticateJWT,
  RaceController.getCurrentRace,
);

router.route('/races/:raceId')
  .get(
    authenticateJWT,
    RaceController.getRaceById,
  )
  .put(
    authenticateJWT,
    requireRole('front-desk'),
    validateRequest(raceValidation.updateRace),
    RaceController.updateRace,
  )
  .delete(
    authenticateJWT,
    requireRole('front-desk'),
    RaceController.deleteRace,
  );

// Driver Management
router.route('/races/:raceId/drivers')
  .get(
    authenticateJWT,
    RaceController.getDrivers,
  )
  .post(
    authenticateJWT,
    requireRole('front-desk'),
    validateRequest(raceValidation.addDriver),
    RaceController.addDriver,
  );

router.route('/races/:raceId/drivers/:driverId')
  .delete(
    authenticateJWT,
    requireRole('front-desk'),
    RaceController.removeDriver,
  )
  .put(
    authenticateJWT,
    requireRole('front-desk'),
    validateRequest(raceValidation.updateDriver),
    RaceController.updateDriver,
  );

// Race Control Operations
router.put(
  '/races/:raceId/start',
  authenticateJWT,
  requireRole('race-control'),
  RaceController.startRace,
);

router.put(
  '/races/:raceId/end',
  authenticateJWT,
  requireRole('race-control'),
  RaceController.endRace,
);

router.put(
  '/races/:raceId/mode',
  authenticateJWT,
  requireRole('race-control'),
  validateRequest(raceValidation.changeMode),
  RaceController.changeRaceMode,
);

// Lap Time Recording
router.route('/races/:raceId/laps')
  .get(
    authenticateJWT,
    RaceController.getLaps,
  )
  .post(
    authenticateJWT,
    requireRole('lap-line-tracker'),
    validateRequest(raceValidation.recordLap),
    RaceController.recordLap,
  );

// Race Statistics
router.get(
  '/races/:raceId/stats',
  authenticateJWT,
  RaceController.getRaceStats,
);

router.get(
  '/races/:raceId/leaderboard',
  authenticateJWT,
  RaceController.getLeaderboard,
);

// Error handling
router.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.url}`,
  });
});

router.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Internal server error';

  res.status(status).json({
    error: err.name || 'ServerError',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = router;
