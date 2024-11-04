const jwt = require('jsonwebtoken');
const { validateInterfaceAccess, rateLimit, INTERFACE_TYPES } = require('../middleware/authMiddleware');

class AuthenticationError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = status;
  }
}

const generateToken = (interfaceType) => jwt.sign(
  {
    interfaceType,
    timestamp: Date.now(),
  },
  process.env.JWT_SECRET,
  {
    expiresIn: '8h',
    algorithm: 'HS256',
  },
);

const authenticate = async (req, res) => {
  try {
    const { accessKey, interfaceType } = req.body;

    // Check if interface type is valid
    if (!INTERFACE_TYPES[interfaceType]) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid interface type',
      });
    }

    // Check rate limiting
    if (!rateLimit.check(req.ip)) {
      return res.status(429).json({
        error: 'RateLimitError',
        message: 'Too many login attempts. Please try again later',
      });
    }

    // Validate access key
    const isValidAccess = validateInterfaceAccess(interfaceType, accessKey);

    // Add artificial delay to prevent timing attacks
    await new Promise((resolve) => {setTimeout(resolve, 500)});

    if (!isValidAccess) {
      return res.status(401).json({
        error: 'AuthenticationError',
        message: 'Invalid access key',
      });
    }

    // Generate JWT token
    const token = generateToken(interfaceType);

    // Reset rate limit on successful authentication
    rateLimit.reset(req.ip);

    // Send response
    res.json({
      token,
      interfaceType,
      expiresIn: 28800, // 8 hours in seconds
      tokenType: 'Bearer',
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'AuthenticationError',
      message: 'An unexpected error occurred during authentication',
    });
  }
};

const validateToken = async (req, res) => {
  try {
    // Token is already validated by authenticateJWT middleware
    // Just return the current user info
    res.json({
      valid: true,
      user: {
        interfaceType: req.user.interfaceType,
        authenticatedAt: req.user.timestamp,
        tokenExpiry: req.user.exp,
      },
    });
  } catch (error) {
    res.status(401).json({
      error: 'ValidationError',
      message: 'Token validation failed',
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    // Generate new token with same interface type
    const token = generateToken(req.user.interfaceType);

    res.json({
      token,
      interfaceType: req.user.interfaceType,
      expiresIn: 28800,
      tokenType: 'Bearer',
    });
  } catch (error) {
    res.status(500).json({
      error: 'RefreshError',
      message: 'Failed to refresh token',
    });
  }
};

const logout = async (req, res) => {
  try {
    // In a more complex system, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      message: 'Successfully logged out',
    });
  } catch (error) {
    res.status(500).json({
      error: 'LogoutError',
      message: 'Failed to logout',
    });
  }
};

module.exports = {
  authenticate,
  validateToken,
  refreshToken,
  logout,
};
