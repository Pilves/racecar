const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Race = require('../models/Race'); // Make sure this path is correct

// Authentication middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// Auth endpoint
router.post('/auth', async (req, res) => {
    try {
        const { accessKey, interfaceType } = req.body;

        // Add delay for failed attempts
        if (!validateAccessKey(accessKey, interfaceType)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return res.status(401).json({
                message: 'Invalid access key'
            });
        }

        const token = jwt.sign(
            { interfaceType },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
});

// Get current race
router.get('/race/current', authenticateJWT, async (req, res) => {
    try {
        const race = await Race.getCurrentRace();
        res.json(race || { drivers: [] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get current race' });
    }
});

// Add driver to current race
router.post('/race/current/driver', authenticateJWT, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: 'Valid driver name is required' });
        }

        let race = await Race.getCurrentRace();
        if (!race) {
            race = await Race.create();
        }

        const driver = await Race.addDriver(race.id, name.trim());
        res.status(201).json(driver);
    } catch (error) {
        console.error('Add driver error:', error);
        res.status(500).json({ message: 'Failed to add driver' });
    }
});

// Remove driver from current race
router.delete('/race/current/driver/:driverId', authenticateJWT, async (req, res) => {
    try {
        const { driverId } = req.params;
        await Race.removeDriver(parseInt(driverId));
        res.json({ message: 'Driver removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove driver' });
    }
});

// Token validation endpoint
router.get('/auth/validate', authenticateJWT, (req, res) => {
    res.json({ valid: true });
});

// Helper function to validate access keys
function validateAccessKey(key, interfaceType) {
    switch (interfaceType) {
        case 'front-desk':
            return key === process.env.RECEPTIONIST_KEY;
        case 'lap-line-tracker':
            return key === process.env.OBSERVER_KEY;
        case 'race-control':
            return key === process.env.SAFETY_KEY;
        default:
            return false;
    }
}

module.exports = router;