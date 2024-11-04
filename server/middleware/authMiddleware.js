const jwt = require('jsonwebtoken');

// Define valid interface types and their corresponding env key names
const INTERFACE_TYPES = {
  'front-desk': 'RECEPTIONIST_KEY',
  'lap-line-tracker': 'OBSERVER_KEY',
  'race-control': 'SAFETY_KEY',
};

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AuthError('Authorization header missing');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthError('Token missing from Authorization header');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.interfaceType || !INTERFACE_TYPES[decoded.interfaceType]) {
        throw new AuthError('Invalid interface type', 403);
      }

      // Add user and interface info to request
      req.user = decoded;
      req.interfaceType = decoded.interfaceType;

      // Add timestamp for request tracking
      req.authTime = Date.now();

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AuthError('Token expired');
      }
      if (jwtError.name === 'JsonWebTokenError') {
        throw new AuthError('Invalid token');
      }
      throw jwtError;
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({
        error: error.name,
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'AuthenticationError',
      message: 'An unexpected error occurred during authentication',
    });
  }
};

const requireRole = (allowedRoles) => {
  if (!Array.isArray(allowedRoles)) {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    try {
      if (!req.user || !req.interfaceType) {
        throw new AuthError('Authentication required', 401);
      }

      if (!allowedRoles.includes(req.interfaceType)) {
        throw new AuthError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          403,
        );
      }

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({
          error: error.name,
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'AuthorizationError',
        message: 'An unexpected error occurred during authorization',
      });
    }
  };
};

const validateInterfaceAccess = (interfaceType, accessKey) => {
  if (!INTERFACE_TYPES[interfaceType]) {
    return false;
  }

  const expectedKey = process.env[INTERFACE_TYPES[interfaceType]];
  return expectedKey && accessKey === expectedKey;
};

const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  attempts: new Map(),

  check(ip) {
    const now = Date.now();
    const attempts = this.attempts.get(ip) || [];

    // Clean up old attempts
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(ip, recentAttempts);
    return true;
  },

  reset(ip) {
    this.attempts.delete(ip);
  },
};

module.exports = {
  authenticateJWT,
  requireRole,
  validateInterfaceAccess,
  rateLimit,
  INTERFACE_TYPES,
};
