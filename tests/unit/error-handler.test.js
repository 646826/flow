/**
 * Unit Tests for Error Handler
 */

const {
    ErrorHandler,
    AppError,
    ValidationError,
    AzureDevOpsError,
    AIAnalysisError,
    WebhookError
} = require('../../functions/error-handler');

describe('ErrorHandler', () => {
    describe('Custom Error Classes', () => {
        test('AppError should create error with correct properties', () => {
            const error = new AppError('Test message', 400, 'TEST_ERROR', { key: 'value' });
            
            expect(error.message).toBe('Test message');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('TEST_ERROR');
            expect(error.details).toEqual({ key: 'value' });
            expect(error.isOperational).toBe(true);
            expect(error.name).toBe('AppError');
        });

        test('ValidationError should inherit from AppError', () => {
            const error = new ValidationError('Validation failed', { field: 'email' });
            
            expect(error).toBeInstanceOf(AppError);
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.name).toBe('ValidationError');
        });

        test('AzureDevOpsError should inherit from AppError', () => {
            const error = new AzureDevOpsError('API failed', 500, { endpoint: '/api/test' });
            
            expect(error).toBeInstanceOf(AppError);
            expect(error.code).toBe('AZURE_DEVOPS_ERROR');
            expect(error.name).toBe('AzureDevOpsError');
        });

        test('AIAnalysisError should inherit from AppError', () => {
            const error = new AIAnalysisError('Analysis failed', { model: 'gpt-4' });
            
            expect(error).toBeInstanceOf(AppError);
            expect(error.code).toBe('AI_ANALYSIS_ERROR');
            expect(error.name).toBe('AIAnalysisError');
        });

        test('WebhookError should inherit from AppError', () => {
            const error = new WebhookError('Invalid signature', 401, { signature: 'invalid' });
            
            expect(error).toBeInstanceOf(AppError);
            expect(error.code).toBe('WEBHOOK_ERROR');
            expect(error.name).toBe('WebhookError');
        });
    });

    describe('handleError', () => {
        test('should handle operational errors correctly', () => {
            const error = new AppError('Test error', 400, 'TEST_ERROR', { key: 'value' });
            const result = ErrorHandler.handleError(error, { context: 'test' });

            expect(result.success).toBe(false);
            expect(result.error.message).toBe('Test error');
            expect(result.error.code).toBe('TEST_ERROR');
            expect(result.error.statusCode).toBe(400);
            expect(result.error.details).toEqual({ key: 'value' });
        });

        test('should handle non-operational errors safely', () => {
            const error = new Error('Internal error');
            error.isOperational = false;
            
            const result = ErrorHandler.handleError(error);

            expect(result.success).toBe(false);
            expect(result.error.message).toBe('An unexpected error occurred');
            expect(result.error.code).toBe('INTERNAL_ERROR');
            expect(result.error.statusCode).toBe(500);
        });
    });

    describe('validateRequired', () => {
        test('should pass validation for valid data', () => {
            const data = { name: 'test', email: 'test@example.com' };
            const requiredFields = ['name', 'email'];

            expect(() => {
                ErrorHandler.validateRequired(data, requiredFields);
            }).not.toThrow();
        });

        test('should throw ValidationError for missing fields', () => {
            const data = { name: 'test' };
            const requiredFields = ['name', 'email', 'phone'];

            expect(() => {
                ErrorHandler.validateRequired(data, requiredFields);
            }).toThrow(ValidationError);

            try {
                ErrorHandler.validateRequired(data, requiredFields);
            } catch (error) {
                expect(error.message).toContain('Missing required fields: email, phone');
                expect(error.details.missingFields).toEqual(['email', 'phone']);
            }
        });

        test('should handle null and empty string values', () => {
            const data = { name: '', email: null, phone: undefined };
            const requiredFields = ['name', 'email', 'phone'];

            expect(() => {
                ErrorHandler.validateRequired(data, requiredFields);
            }).toThrow(ValidationError);
        });
    });

    describe('validateWebhookSignature', () => {
        const secret = 'test-secret';
        const payload = 'test-payload';

        test('should validate correct signature', () => {
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            expect(() => {
                ErrorHandler.validateWebhookSignature(payload, `sha256=${expectedSignature}`, secret);
            }).not.toThrow();
        });

        test('should throw WebhookError for missing signature', () => {
            expect(() => {
                ErrorHandler.validateWebhookSignature(payload, null, secret);
            }).toThrow(WebhookError);
        });

        test('should throw WebhookError for invalid signature', () => {
            expect(() => {
                ErrorHandler.validateWebhookSignature(payload, 'sha256=invalid', secret);
            }).toThrow(WebhookError);
        });
    });

    describe('retry mechanism', () => {
        test('should succeed on first attempt', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');
            
            const result = await ErrorHandler.retry(mockFn);
            
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('should retry on failure and eventually succeed', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('Attempt 1'))
                .mockRejectedValueOnce(new Error('Attempt 2'))
                .mockResolvedValue('success');
            
            const result = await ErrorHandler.retry(mockFn, { maxAttempts: 3, initialDelay: 10 });
            
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        test('should fail after max attempts', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));
            
            await expect(
                ErrorHandler.retry(mockFn, { maxAttempts: 2, initialDelay: 10 })
            ).rejects.toThrow('Always fails');
            
            expect(mockFn).toHaveBeenCalledTimes(2);
        });

        test('should respect retry condition', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Non-retryable'));
            
            await expect(
                ErrorHandler.retry(mockFn, {
                    maxAttempts: 3,
                    initialDelay: 10,
                    retryCondition: () => false
                })
            ).rejects.toThrow('Non-retryable');
            
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('withTimeout', () => {
        test('should resolve before timeout', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');
            const wrappedFn = ErrorHandler.withTimeout(mockFn, 1000);
            
            const result = await wrappedFn();
            
            expect(result).toBe('success');
        });

        test('should timeout for slow operations', async () => {
            const mockFn = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve('success'), 200))
            );
            const wrappedFn = ErrorHandler.withTimeout(mockFn, 100);
            
            await expect(wrappedFn()).rejects.toThrow('Operation timed out after 100ms');
        });
    });

    describe('asyncHandler', () => {
        test('should handle successful async function', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');
            const wrappedFn = ErrorHandler.asyncHandler(mockFn);
            
            const result = await wrappedFn('arg1', 'arg2');
            
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        });

        test('should propagate errors from async function', async () => {
            const error = new Error('Async error');
            const mockFn = jest.fn().mockRejectedValue(error);
            const wrappedFn = ErrorHandler.asyncHandler(mockFn);
            
            await expect(wrappedFn()).rejects.toThrow('Async error');
        });
    });
});
