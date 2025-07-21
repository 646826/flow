/**
 * Centralized Error Handling System
 * Provides consistent error handling across all components
 */

const { logger } = require('./logger');

class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = {}) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

class AzureDevOpsError extends AppError {
    constructor(message, statusCode = 500, details = {}) {
        super(message, statusCode, 'AZURE_DEVOPS_ERROR', details);
        this.name = 'AzureDevOpsError';
    }
}

class AIAnalysisError extends AppError {
    constructor(message, details = {}) {
        super(message, 500, 'AI_ANALYSIS_ERROR', details);
        this.name = 'AIAnalysisError';
    }
}

class WebhookError extends AppError {
    constructor(message, statusCode = 400, details = {}) {
        super(message, statusCode, 'WEBHOOK_ERROR', details);
        this.name = 'WebhookError';
    }
}

class ErrorHandler {
    /**
     * Handle operational errors
     */
    static handleError(error, context = {}) {
        logger.error('Error occurred', {
            error,
            context,
            stack: error.stack
        });

        if (error.isOperational) {
            return {
                success: false,
                error: {
                    message: error.message,
                    code: error.code,
                    statusCode: error.statusCode,
                    details: error.details
                }
            };
        }

        return {
            success: false,
            error: {
                message: 'An unexpected error occurred',
                code: 'INTERNAL_ERROR',
                statusCode: 500
            }
        };
    }

    /**
     * Async error wrapper
     */
    static asyncHandler(fn) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                throw error;
            }
        };
    }

    /**
     * Retry mechanism with exponential backoff
     */
    static async retry(fn, options = {}) {
        const {
            maxAttempts = 3,
            initialDelay = 1000,
            maxDelay = 10000,
            backoffFactor = 2,
            retryCondition = () => true
        } = options;

        let lastError;
        let delay = initialDelay;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                logger.warn('Operation failed, retrying', {
                    attempt,
                    maxAttempts,
                    error: error.message,
                    nextDelay: delay
                });

                if (attempt === maxAttempts || !retryCondition(error)) {
                    break;
                }

                await this.sleep(delay);
                delay = Math.min(delay * backoffFactor, maxDelay);
            }
        }

        throw lastError;
    }

    /**
     * Circuit breaker implementation
     */
    static createCircuitBreaker(options = {}) {
        const {
            failureThreshold = 5,
            recoveryTimeout = 60000,
            monitoringPeriod = 60000
        } = options;

        let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        let failureCount = 0;
        let lastFailureTime = null;
        let successCount = 0;

        return async (fn) => {
            if (state === 'OPEN') {
                if (Date.now() - lastFailureTime >= recoveryTimeout) {
                    state = 'HALF_OPEN';
                    successCount = 0;
                    logger.info('Circuit breaker transitioning to HALF_OPEN');
                } else {
                    throw new AppError('Circuit breaker is OPEN', 503, 'CIRCUIT_BREAKER_OPEN');
                }
            }

            try {
                const result = await fn();
                
                if (state === 'HALF_OPEN') {
                    successCount++;
                    if (successCount >= 3) {
                        state = 'CLOSED';
                        failureCount = 0;
                        logger.info('Circuit breaker transitioning to CLOSED');
                    }
                }

                return result;
            } catch (error) {
                failureCount++;
                lastFailureTime = Date.now();

                if (state === 'HALF_OPEN' || failureCount >= failureThreshold) {
                    state = 'OPEN';
                    logger.warn('Circuit breaker transitioning to OPEN', {
                        failureCount,
                        threshold: failureThreshold
                    });
                }

                throw error;
            }
        };
    }

    /**
     * Timeout wrapper
     */
    static withTimeout(fn, timeoutMs = 30000) {
        return async (...args) => {
            return Promise.race([
                fn(...args),
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new AppError(`Operation timed out after ${timeoutMs}ms`, 408, 'TIMEOUT'));
                    }, timeoutMs);
                })
            ]);
        };
    }

    /**
     * Validate required fields
     */
    static validateRequired(data, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, {
                missingFields: missing
            });
        }
    }

    /**
     * Validate webhook signature
     */
    static validateWebhookSignature(payload, signature, secret) {
        const crypto = require('crypto');
        
        if (!signature) {
            throw new WebhookError('Missing webhook signature');
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        const providedSignature = signature.replace('sha256=', '');

        if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        )) {
            throw new WebhookError('Invalid webhook signature', 401);
        }
    }

    /**
     * Sleep utility
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Express error middleware
     */
    static expressErrorHandler(error, req, res, next) {
        const errorResponse = ErrorHandler.handleError(error, {
            method: req.method,
            url: req.url,
            body: req.body,
            headers: req.headers
        });

        res.status(errorResponse.error.statusCode || 500).json(errorResponse);
    }

    /**
     * Unhandled rejection handler
     */
    static setupGlobalErrorHandlers() {
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', {
                reason,
                promise
            });
            process.exit(1);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', { error });
            process.exit(1);
        });
    }
}

module.exports = {
    ErrorHandler,
    AppError,
    ValidationError,
    AzureDevOpsError,
    AIAnalysisError,
    WebhookError
};
