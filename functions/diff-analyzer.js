/**
 * Diff Analyzer
 * Analyzes code differences and generates insights
 */

class DiffAnalyzer {
    constructor() {
        this.securityPatterns = this.initializeSecurityPatterns();
        this.performancePatterns = this.initializePerformancePatterns();
        this.qualityPatterns = this.initializeQualityPatterns();
    }

    /**
     * Analyze diff for security, performance, and quality issues
     */
    analyzeDiff(diffContent, fileInfo) {
        const analysis = {
            security: [],
            performance: [],
            quality: [],
            suggestions: [],
            riskScore: 0
        };

        if (!diffContent) {
            return analysis;
        }

        const diffLines = this.parseDiffLines(diffContent);
        
        for (const line of diffLines.added) {
            this.analyzeLineForSecurity(line, analysis.security, fileInfo);
            this.analyzeLineForPerformance(line, analysis.performance, fileInfo);
            this.analyzeLineForQuality(line, analysis.quality, fileInfo);
        }

        for (const line of diffLines.removed) {
            this.analyzeRemovedLine(line, analysis, fileInfo);
        }

        analysis.riskScore = this.calculateRiskScore(analysis);

        analysis.suggestions = this.generateSuggestions(analysis, fileInfo);

        return analysis;
    }

    /**
     * Parse diff content into added and removed lines
     */
    parseDiffLines(diffContent) {
        const lines = diffContent.split('\n');
        const added = [];
        const removed = [];
        const context = [];

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                added.push({
                    content: line.substring(1),
                    lineNumber: this.extractLineNumber(line)
                });
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                removed.push({
                    content: line.substring(1),
                    lineNumber: this.extractLineNumber(line)
                });
            } else if (!line.startsWith('@@') && !line.startsWith('diff')) {
                context.push({
                    content: line,
                    lineNumber: this.extractLineNumber(line)
                });
            }
        }

        return { added, removed, context };
    }

    /**
     * Extract line number from diff line (simplified)
     */
    extractLineNumber(line) {
        return 0;
    }

    /**
     * Analyze line for security vulnerabilities
     */
    analyzeLineForSecurity(line, securityIssues, fileInfo) {
        for (const pattern of this.securityPatterns) {
            if (pattern.regex.test(line.content)) {
                securityIssues.push({
                    type: pattern.type,
                    severity: pattern.severity,
                    description: pattern.description,
                    line: line.lineNumber,
                    content: line.content.trim(),
                    file: fileInfo.path,
                    suggestion: pattern.suggestion
                });
            }
        }
    }

    /**
     * Analyze line for performance issues
     */
    analyzeLineForPerformance(line, performanceIssues, fileInfo) {
        for (const pattern of this.performancePatterns) {
            if (pattern.regex.test(line.content)) {
                performanceIssues.push({
                    type: pattern.type,
                    severity: pattern.severity,
                    description: pattern.description,
                    line: line.lineNumber,
                    content: line.content.trim(),
                    file: fileInfo.path,
                    suggestion: pattern.suggestion
                });
            }
        }
    }

    /**
     * Analyze line for code quality issues
     */
    analyzeLineForQuality(line, qualityIssues, fileInfo) {
        for (const pattern of this.qualityPatterns) {
            if (pattern.regex.test(line.content)) {
                qualityIssues.push({
                    type: pattern.type,
                    severity: pattern.severity,
                    description: pattern.description,
                    line: line.lineNumber,
                    content: line.content.trim(),
                    file: fileInfo.path,
                    suggestion: pattern.suggestion
                });
            }
        }
    }

    /**
     * Analyze removed lines for context
     */
    analyzeRemovedLine(line, analysis, fileInfo) {
        const importantPatterns = [
            /error.handling/i,
            /validation/i,
            /security/i,
            /authentication/i,
            /authorization/i,
            /logging/i
        ];

        for (const pattern of importantPatterns) {
            if (pattern.test(line.content)) {
                analysis.suggestions.push({
                    type: 'removed_functionality',
                    severity: 'medium',
                    description: `Important functionality may have been removed: ${pattern.source}`,
                    file: fileInfo.path,
                    suggestion: 'Verify that this functionality is replaced or no longer needed'
                });
            }
        }
    }

    /**
     * Calculate overall risk score
     */
    calculateRiskScore(analysis) {
        let score = 0;
        
        for (const issue of analysis.security) {
            switch (issue.severity) {
                case 'critical': score += 4; break;
                case 'high': score += 3; break;
                case 'medium': score += 2; break;
                case 'low': score += 1; break;
            }
        }

        for (const issue of analysis.performance) {
            switch (issue.severity) {
                case 'critical': score += 3; break;
                case 'high': score += 2; break;
                case 'medium': score += 1; break;
                case 'low': score += 0.5; break;
            }
        }

        for (const issue of analysis.quality) {
            switch (issue.severity) {
                case 'critical': score += 2; break;
                case 'high': score += 1; break;
                case 'medium': score += 0.5; break;
                case 'low': score += 0.25; break;
            }
        }

        return Math.min(10, Math.round(score));
    }

    /**
     * Generate suggestions based on analysis
     */
    generateSuggestions(analysis, fileInfo) {
        const suggestions = [];

        if (analysis.security.length > 0) {
            suggestions.push({
                type: 'security_review',
                priority: 'high',
                description: 'Security review recommended due to potential vulnerabilities',
                action: 'Have a security expert review the changes'
            });
        }

        if (analysis.performance.length > 2) {
            suggestions.push({
                type: 'performance_testing',
                priority: 'medium',
                description: 'Performance testing recommended due to multiple performance concerns',
                action: 'Run performance tests before merging'
            });
        }

        if (analysis.quality.length > 5) {
            suggestions.push({
                type: 'code_refactoring',
                priority: 'low',
                description: 'Consider refactoring to improve code quality',
                action: 'Address code quality issues in a follow-up PR'
            });
        }

        return suggestions;
    }

    /**
     * Initialize security patterns
     */
    initializeSecurityPatterns() {
        return [
            {
                type: 'sql_injection',
                regex: /(?:select|insert|update|delete|drop|create|alter)\s+.*\+.*\$/i,
                severity: 'critical',
                description: 'Potential SQL injection vulnerability',
                suggestion: 'Use parameterized queries or prepared statements'
            },
            {
                type: 'hardcoded_secret',
                regex: /(?:password|secret|key|token|api_key)\s*[=:]\s*["'][^"']{8,}["']/i,
                severity: 'high',
                description: 'Hardcoded secret detected',
                suggestion: 'Move secrets to environment variables or secure configuration'
            },
            {
                type: 'xss_vulnerability',
                regex: /innerHTML|outerHTML|document\.write|eval\(/i,
                severity: 'high',
                description: 'Potential XSS vulnerability',
                suggestion: 'Use safe DOM manipulation methods or sanitize input'
            },
            {
                type: 'insecure_random',
                regex: /Math\.random\(\)|Random\(\)/i,
                severity: 'medium',
                description: 'Insecure random number generation',
                suggestion: 'Use cryptographically secure random number generator'
            },
            {
                type: 'weak_crypto',
                regex: /md5|sha1(?!256)|des(?!_ede3)/i,
                severity: 'medium',
                description: 'Weak cryptographic algorithm',
                suggestion: 'Use stronger cryptographic algorithms like SHA-256 or AES'
            }
        ];
    }

    /**
     * Initialize performance patterns
     */
    initializePerformancePatterns() {
        return [
            {
                type: 'inefficient_loop',
                regex: /for\s*\([^)]*\)\s*\{[^}]*\n.*\n.*\n.*\n.*\n.*\}/,
                severity: 'medium',
                description: 'Potentially inefficient loop detected',
                suggestion: 'Consider optimizing loop logic or using more efficient algorithms'
            },
            {
                type: 'blocking_operation',
                regex: /(?:sleep|wait|block|synchronous|sync)\s*\(/i,
                severity: 'medium',
                description: 'Blocking operation detected',
                suggestion: 'Consider using asynchronous alternatives'
            },
            {
                type: 'inefficient_query',
                regex: /select\s+\*\s+from|n\+1|nested\s+loop/i,
                severity: 'medium',
                description: 'Potentially inefficient database query',
                suggestion: 'Optimize query or add proper indexing'
            },
            {
                type: 'memory_leak',
                regex: /addEventListener|setInterval|setTimeout.*(?!clear)/i,
                severity: 'high',
                description: 'Potential memory leak',
                suggestion: 'Ensure proper cleanup of event listeners and timers'
            }
        ];
    }

    /**
     * Initialize quality patterns
     */
    initializeQualityPatterns() {
        return [
            {
                type: 'long_method',
                regex: /function\s+\w+\s*\([^)]*\)\s*\{(?:[^}]*\n){20,}/,
                severity: 'low',
                description: 'Long method detected',
                suggestion: 'Consider breaking down into smaller functions'
            },
            {
                type: 'magic_number',
                regex: /(?<![a-zA-Z_])\d{2,}(?![a-zA-Z_])/,
                severity: 'low',
                description: 'Magic number detected',
                suggestion: 'Consider using named constants'
            },
            {
                type: 'duplicate_code',
                regex: /(?:copy|duplicate|repeated)/i,
                severity: 'medium',
                description: 'Potential code duplication',
                suggestion: 'Extract common functionality into reusable functions'
            },
            {
                type: 'poor_naming',
                regex: /\b(?:temp|tmp|data|info|obj|var|item)\d*\b/i,
                severity: 'low',
                description: 'Poor variable naming',
                suggestion: 'Use more descriptive variable names'
            },
            {
                type: 'missing_error_handling',
                regex: /(?:fetch|axios|request|query).*(?!catch|try)/i,
                severity: 'medium',
                description: 'Missing error handling',
                suggestion: 'Add proper error handling for external calls'
            }
        ];
    }
}

module.exports = DiffAnalyzer;
