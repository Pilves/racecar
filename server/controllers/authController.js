const jwt = require('jsonwebtoken');
const { validateAccessKey } = require('../utils/validationUtils');

class AuthController {
    async authenticate(req, res) {
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
            res.status(500).json({ 
                message: 'Authentication failed' 
            });
        }
    }
}

module.exports = new AuthController();