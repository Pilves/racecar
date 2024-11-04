const { RACE_MODES, RACE_CONFIG } = require('../constants/raceConstants');
const { INTERFACE_TYPES } = require('./authMiddleware');
const { body } = require('express-validator');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

// Helper functions for validation
const validateString = (value, fieldName, { min = 1, max = 255, required = true } = {}) => {
  if (!value && required) {
    throw new ValidationError(`${fieldName} is required`);
  }
  if (value && typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (value && (value.length < min || value.length > max)) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
  }
  return value ? value.trim() : value;
};

const validateNumber = (value, fieldName, { min, max, required = true } = {}) => {
  if (!value && required) {
    throw new ValidationError(`${fieldName} is required`);
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be no more than ${max}`);
  }
  return num;
};

// Validation schemas
const raceValidation = {
  auth: [
    body('accessKey')
      .trim()
      .notEmpty()
      .withMessage('Access key is required')
      .isLength({ min: 8, max: 64 })
      .withMessage('Access key must be between 8 and 64 characters'),
    body('interfaceType')
      .trim()
      .notEmpty()
      .withMessage('Interface type is required')
      .custom((value) => {
        if (!INTERFACE_TYPES[value]) {
          throw new Error('Invalid interface type');
        }
        return true;
      }),
  ],

  createRace: (data) => {
    const { name, scheduledTime } = data;
    return {
      name: validateString(name, 'Race name', { max: 100 }),
      scheduledTime: validateNumber(scheduledTime, 'Scheduled time', {
        min: Date.now(),
        required: false,
      }),
    };
  },

  updateRace: (data) => {
    const { name, status } = data;
    return {
      name: validateString(name, 'Race name', { max: 100, required: false }),
      status: validateString(status, 'Race status', {
        required: false,
        validate: (value) => {
          if (value && !['upcoming', 'in_progress', 'finished'].includes(value)) {
            throw new ValidationError('Invalid race status');
          }
          return value;
        },
      }),
    };
  },

  addDriver: (data) => {
    const { name, carNumber } = data;
    return {
      name: validateString(name, 'Driver name', { min: 2, max: 50 }),
      carNumber: validateNumber(carNumber, 'Car number', {
        min: 1,
        max: RACE_CONFIG.MAX_DRIVERS,
        required: false,
      }),
    };
  },

  updateDriver: (data) => {
    const { name, carNumber } = data;
    return {
      name: validateString(name, 'Driver name', { min: 2, max: 50, required: false }),
      carNumber: validateNumber(carNumber, 'Car number', {
        min: 1,
        max: RACE_CONFIG.MAX_DRIVERS,
        required: false,
      }),
    };
  },

  recordLap: (data) => {
    const { carNumber, timestamp, duration } = data;
    return {
      carNumber: validateNumber(carNumber, 'Car number', { min: 1, max: RACE_CONFIG.MAX_DRIVERS }),
      timestamp: validateNumber(timestamp, 'Timestamp', { min: 0 }),
      duration: validateNumber(duration, 'Duration', { min: 0, required: false })
    };
  },

  changeMode: (data) => {
    const { mode } = data;
    return {
      mode: validateString(mode, 'Race mode', {
        validate: (value) => {
          if (!RACE_MODES[value.toUpperCase()]) {
            throw new ValidationError('Invalid race mode');
          }
          return value.toLowerCase();
        },
      }),
    };
  },
};

// Validation middleware
const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = schema(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'ValidationError',
          message: error.message
        });
      }
      next(error);
    }
  };
};

// Param validation middleware
const validateParams = (paramConfigs) => {
  return (req, res, next) => {
    try {
      for (const [param, config] of Object.entries(paramConfigs)) {
        const value = req.params[param];
        if (config.type === 'number') {
          req.params[param] = validateNumber(value, param, config.options);
        } else if (config.type === 'string') {
          req.params[param] = validateString(value, param, config.options);
        }
      }
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'ValidationError',
          message: error.message,
        });
      }
      next(error);
    }
  };
};

module.exports = {
  ValidationError,
  validateRequest,
  validateParams,
  raceValidation,
};
