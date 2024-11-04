const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const stack = process.env.NODE_ENV === 'production' ? undefined : err.stack;

    res.status(statusCode).json({
        message,
        stack
    });
};

module.exports = errorHandler;
