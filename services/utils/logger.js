/**
 * Winston Logger Configuration (BUS-108)
 */

const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        if (stack) {
            log += `\n${stack}`;
        }
        return log;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'leadcatch-api' },
    transports: [
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // Error log file
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });
    
    next();
};

module.exports = { logger, requestLogger };
