/**
 * Unit Tests for Logger
 */

const { Logger, logger } = require('../../functions/logger');
const fs = require('fs');
const path = require('path');

describe('Logger', () => {
    let testLogger;
    let testLogFile;

    beforeEach(() => {
        testLogFile = path.join(__dirname, 'test.log');
        testLogger = new Logger({
            level: 'debug',
            format: 'json',
            logFile: testLogFile,
            enableConsole: false
        });
    });

    afterEach(() => {
        if (fs.existsSync(testLogFile)) {
            fs.unlinkSync(testLogFile);
        }
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            const defaultLogger = new Logger();
            expect(defaultLogger.level).toBe('info');
            expect(defaultLogger.format).toBe('json');
            expect(defaultLogger.enableConsole).toBe(true);
        });

        test('should initialize with custom options', () => {
            const customLogger = new Logger({
                level: 'debug',
                format: 'text',
                enableConsole: false
            });
            expect(customLogger.level).toBe('debug');
            expect(customLogger.format).toBe('text');
            expect(customLogger.enableConsole).toBe(false);
        });

        test('should create log directory if it does not exist', () => {
            const logDir = path.join(__dirname, 'logs');
            const logFile = path.join(logDir, 'test.log');
            
            new Logger({ logFile });
            
            expect(fs.existsSync(logDir)).toBe(true);
            
            if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            if (fs.existsSync(logDir)) fs.rmdirSync(logDir);
        });
    });

    describe('log levels', () => {
        test('should respect log level filtering', () => {
            const warnLogger = new Logger({
                level: 'warn',
                logFile: testLogFile,
                enableConsole: false
            });

            warnLogger.debug('debug message');
            warnLogger.info('info message');
            warnLogger.warn('warn message');
            warnLogger.error('error message');

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line);

            expect(logLines).toHaveLength(2);
            expect(logLines[0]).toContain('WARN');
            expect(logLines[1]).toContain('ERROR');
        });

        test('should log all levels when set to debug', () => {
            testLogger.debug('debug message');
            testLogger.info('info message');
            testLogger.warn('warn message');
            testLogger.error('error message');

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line);

            expect(logLines).toHaveLength(4);
        });
    });

    describe('log formatting', () => {
        test('should format logs as JSON', () => {
            testLogger.info('test message', { key: 'value' });

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logEntry = JSON.parse(logContent.trim());

            expect(logEntry).toHaveProperty('timestamp');
            expect(logEntry).toHaveProperty('level', 'INFO');
            expect(logEntry).toHaveProperty('message', 'test message');
            expect(logEntry).toHaveProperty('key', 'value');
        });

        test('should format text logs correctly', () => {
            const textLogger = new Logger({
                level: 'info',
                format: 'text',
                logFile: testLogFile,
                enableConsole: false
            });

            textLogger.info('test message', { key: 'value' });

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: test message/);
            expect(logContent).toContain('{"key":"value"}');
        });
    });

    describe('error handling', () => {
        test('should handle Error objects in metadata', () => {
            const error = new Error('Test error');
            testLogger.error('Error occurred', { error });

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logEntry = JSON.parse(logContent.trim());

            expect(logEntry.error).toHaveProperty('name', 'Error');
            expect(logEntry.error).toHaveProperty('message', 'Test error');
            expect(logEntry.error).toHaveProperty('stack');
        });
    });

    describe('child logger', () => {
        test('should create child logger with context', () => {
            const childLogger = testLogger.child({ requestId: '123' });
            childLogger.info('test message');

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logEntry = JSON.parse(logContent.trim());

            expect(logEntry).toHaveProperty('requestId', '123');
            expect(logEntry).toHaveProperty('message', 'test message');
        });
    });

    describe('specialized logging methods', () => {
        test('should log API calls correctly', () => {
            testLogger.logApiCall('GET', '/api/test', 200, 150);

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logEntry = JSON.parse(logContent.trim());

            expect(logEntry.method).toBe('GET');
            expect(logEntry.endpoint).toBe('/api/test');
            expect(logEntry.statusCode).toBe(200);
            expect(logEntry.duration).toBe('150ms');
        });

        test('should log webhook processing correctly', () => {
            testLogger.logWebhook('pullrequest.created', 123, 'success', 250);

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logEntry = JSON.parse(logContent.trim());

            expect(logEntry.eventType).toBe('pullrequest.created');
            expect(logEntry.pullRequestId).toBe(123);
            expect(logEntry.status).toBe('success');
            expect(logEntry.duration).toBe('250ms');
        });

        test('should log analysis results correctly', () => {
            testLogger.logAnalysis(456, 5, 7.5, 3000);

            const logContent = fs.readFileSync(testLogFile, 'utf8');
            const logEntry = JSON.parse(logContent.trim());

            expect(logEntry.pullRequestId).toBe(456);
            expect(logEntry.filesCount).toBe(5);
            expect(logEntry.riskScore).toBe(7.5);
            expect(logEntry.duration).toBe('3000ms');
        });
    });

    describe('default logger instance', () => {
        test('should export default logger instance', () => {
            expect(logger).toBeInstanceOf(Logger);
        });
    });
});
