/**
 * Global Error Handler & Retry Utilities (BUS-102)
 */

const { logger } = require('./logger');

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

/**
 * Global Express error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal server error';
    
    logger.error('API Error', {
        message: err.message,
        code: err.code,
        statusCode,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });
    
    res.status(statusCode).json({
        error: {
            message,
            code: err.code || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

/**
 * Async route wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Exponential backoff retry for external API calls
 */
async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        retryCondition = (error) => true
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries || !retryCondition(error)) {
                throw error;
            }
            
            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = delay * 0.1 * Math.random();
            
            logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
                error: error.message,
                nextRetryIn: `${Math.round(delay + jitter)}ms`
            });
            
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
    }
    
    throw lastError;
}

/**
 * Not found handler
 */
const notFoundHandler = (req, res, next) => {
    next(new APIError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
};

module.exports = {
    APIError,
    globalErrorHandler,
    asyncHandler,
    withRetry,
    notFoundHandler
};
