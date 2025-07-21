/**
 * Centralized Logging System
 * Provides structured logging with multiple output formats and levels
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.level = options.level || process.env.LOG_LEVEL || 'info';
        this.format = options.format || process.env.LOG_FORMAT || 'json';
        this.logFile = options.logFile || process.env.LOG_FILE;
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = !!this.logFile;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.currentLevel = this.levels[this.level] || this.levels.info;
        
        if (this.enableFile) {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }

    /**
     * Log message with specified level
     */
    log(level, message, meta = {}) {
        if (this.levels[level] > this.currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
        };

        if (meta.error && meta.error instanceof Error) {
            logEntry.error = {
                name: meta.error.name,
                message: meta.error.message,
                stack: meta.error.stack
            };
        }

        if (this.enableConsole) {
            this.writeToConsole(level, logEntry);
        }

        if (this.enableFile) {
            this.writeToFile(logEntry);
        }
    }

    /**
     * Write log entry to console
     */
    writeToConsole(level, logEntry) {
        const output = this.format === 'json' 
            ? JSON.stringify(logEntry)
            : this.formatText(logEntry);

        switch (level) {
            case 'error':
                console.error(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            case 'debug':
                console.debug(output);
                break;
            default:
                console.log(output);
        }
    }

    /**
     * Write log entry to file
     */
    writeToFile(logEntry) {
        const output = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.logFile, output);
    }

    /**
     * Format log entry as text
     */
    formatText(logEntry) {
        const { timestamp, level, message, ...meta } = logEntry;
        let output = `[${timestamp}] ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            output += ` | ${JSON.stringify(meta)}`;
        }
        
        return output;
    }

    /**
     * Log error message
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * Log warning message
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * Log info message
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * Log debug message
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * Create child logger with additional context
     */
    child(context = {}) {
        const childLogger = new Logger({
            level: this.level,
            format: this.format,
            logFile: this.logFile,
            enableConsole: this.enableConsole
        });
        
        const originalLog = childLogger.log.bind(childLogger);
        childLogger.log = (level, message, meta = {}) => {
            originalLog(level, message, { ...context, ...meta });
        };
        
        return childLogger;
    }

    /**
     * Log request details
     */
    logRequest(req, res, duration) {
        this.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress
        });
    }

    /**
     * Log Azure DevOps API call
     */
    logApiCall(method, endpoint, statusCode, duration, error = null) {
        const meta = {
            method,
            endpoint,
            statusCode,
            duration: `${duration}ms`
        };

        if (error) {
            meta.error = error;
            this.error('Azure DevOps API call failed', meta);
        } else {
            this.info('Azure DevOps API call', meta);
        }
    }

    /**
     * Log webhook processing
     */
    logWebhook(eventType, pullRequestId, status, duration, error = null) {
        const meta = {
            eventType,
            pullRequestId,
            status,
            duration: `${duration}ms`
        };

        if (error) {
            meta.error = error;
            this.error('Webhook processing failed', meta);
        } else {
            this.info('Webhook processed', meta);
        }
    }

    /**
     * Log AI analysis
     */
    logAnalysis(pullRequestId, filesCount, riskScore, duration, error = null) {
        const meta = {
            pullRequestId,
            filesCount,
            riskScore,
            duration: `${duration}ms`
        };

        if (error) {
            meta.error = error;
            this.error('AI analysis failed', meta);
        } else {
            this.info('AI analysis completed', meta);
        }
    }
}

const defaultLogger = new Logger();

module.exports = {
    Logger,
    logger: defaultLogger
};
