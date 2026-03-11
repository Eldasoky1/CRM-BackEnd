/**
 * Error handling utilities for Express
 * Converted to TypeScript with proper type definitions
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';
import { APIErrorResponse } from '../types';

/**
 * Custom API Error class with status code
 */
export class APIError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
    err: Error | APIError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const statusCode = (err as APIError).statusCode || 500;
    const isOperational = (err as APIError).isOperational || false;

    // Log error details
    logger.error(`${err.message}`, {
        statusCode,
        path: req.path,
        method: req.method,
        stack: err.stack,
        isOperational
    });

    // Don't leak error details in production
    const response: APIErrorResponse = {
        error: process.env.NODE_ENV === 'production' && !isOperational
            ? 'An unexpected error occurred'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    };

    res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({
        error: `Route ${req.method} ${req.path} not found`
    });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
    const { maxRetries = 3, delay = 1000, backoff = 2 } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const waitTime = delay * Math.pow(backoff, attempt);

            logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} failed, waiting ${waitTime}ms`, {
                error: (error as Error).message
            });

            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
}
