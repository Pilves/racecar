const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation Error',
            details: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            message: 'Authentication Error',
            details: err.message
        });
    }

    // Default server error
    res.status(500).json({
        message: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' 
            ? err.message 
            : undefined
    });
};

module.exports = errorHandler;