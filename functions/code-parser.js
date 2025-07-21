/**
 * Code Parser
 * Parses and analyzes code changes from pull requests
 */

const path = require('path');

class CodeParser {
    constructor() {
        this.supportedLanguages = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.cs': 'csharp',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.sql': 'sql',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.less': 'less'
        };
    }

    /**
     * Parse pull request changes into structured format
     */
    parsePullRequestChanges(changes) {
        const parsedChanges = {
            files: [],
            summary: {
                totalFiles: 0,
                addedLines: 0,
                deletedLines: 0,
                modifiedFiles: 0,
                addedFiles: 0,
                deletedFiles: 0
            },
            languages: new Set(),
            riskFactors: []
        };

        if (!changes || !changes.changes) {
            return parsedChanges;
        }

        for (const change of changes.changes) {
            const fileInfo = this.parseFileChange(change);
            parsedChanges.files.push(fileInfo);
            
            parsedChanges.summary.totalFiles++;
            parsedChanges.summary.addedLines += fileInfo.linesAdded;
            parsedChanges.summary.deletedLines += fileInfo.linesDeleted;
            
            if (fileInfo.changeType === 'add') {
                parsedChanges.summary.addedFiles++;
            } else if (fileInfo.changeType === 'delete') {
                parsedChanges.summary.deletedFiles++;
            } else {
                parsedChanges.summary.modifiedFiles++;
            }
            
            if (fileInfo.language) {
                parsedChanges.languages.add(fileInfo.language);
            }
            
            this.identifyRiskFactors(fileInfo, parsedChanges.riskFactors);
        }

        parsedChanges.languages = Array.from(parsedChanges.languages);
        return parsedChanges;
    }

    /**
     * Parse individual file change
     */
    parseFileChange(change) {
        const fileInfo = {
            path: change.item?.path || '',
            fileName: '',
            extension: '',
            language: '',
            changeType: this.getChangeType(change),
            linesAdded: 0,
            linesDeleted: 0,
            isBinary: false,
            content: null,
            hunks: []
        };

        if (fileInfo.path) {
            fileInfo.fileName = path.basename(fileInfo.path);
            fileInfo.extension = path.extname(fileInfo.path).toLowerCase();
            fileInfo.language = this.supportedLanguages[fileInfo.extension] || 'unknown';
        }

        if (change.sourceServerItem && change.modifiedDate) {
            fileInfo.linesAdded = change.linesAdded || 0;
            fileInfo.linesDeleted = change.linesDeleted || 0;
        }

        fileInfo.isBinary = this.isBinaryFile(fileInfo.extension);

        return fileInfo;
    }

    /**
     * Determine change type from Azure DevOps change object
     */
    getChangeType(change) {
        if (change.changeType) {
            const changeType = change.changeType.toLowerCase();
            if (changeType.includes('add')) return 'add';
            if (changeType.includes('delete')) return 'delete';
            if (changeType.includes('edit') || changeType.includes('modify')) return 'modify';
            if (changeType.includes('rename')) return 'rename';
        }
        return 'modify'; // default
    }

    /**
     * Check if file is binary based on extension
     */
    isBinaryFile(extension) {
        const binaryExtensions = [
            '.exe', '.dll', '.so', '.dylib',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.tar', '.gz', '.rar', '.7z',
            '.mp3', '.mp4', '.avi', '.mov', '.wmv',
            '.bin', '.dat', '.db', '.sqlite'
        ];
        return binaryExtensions.includes(extension);
    }

    /**
     * Identify potential risk factors in file changes
     */
    identifyRiskFactors(fileInfo, riskFactors) {
        if (this.isConfigurationFile(fileInfo.path)) {
            riskFactors.push({
                type: 'configuration_change',
                severity: 'medium',
                file: fileInfo.path,
                description: 'Configuration file modified'
            });
        }

        if (this.isDatabaseMigration(fileInfo.path)) {
            riskFactors.push({
                type: 'database_migration',
                severity: 'high',
                file: fileInfo.path,
                description: 'Database migration file detected'
            });
        }

        if (this.isSecuritySensitive(fileInfo.path)) {
            riskFactors.push({
                type: 'security_sensitive',
                severity: 'high',
                file: fileInfo.path,
                description: 'Security-sensitive file modified'
            });
        }

        if (fileInfo.linesAdded + fileInfo.linesDeleted > 500) {
            riskFactors.push({
                type: 'large_change',
                severity: 'medium',
                file: fileInfo.path,
                description: `Large change: ${fileInfo.linesAdded + fileInfo.linesDeleted} lines`
            });
        }
    }

    /**
     * Check if file is a configuration file
     */
    isConfigurationFile(filePath) {
        const configPatterns = [
            /\.config$/i,
            /\.ini$/i,
            /\.env$/i,
            /\.properties$/i,
            /appsettings.*\.json$/i,
            /web\.config$/i,
            /app\.config$/i,
            /package\.json$/i,
            /requirements\.txt$/i,
            /Dockerfile$/i,
            /docker-compose.*\.ya?ml$/i
        ];
        
        return configPatterns.some(pattern => pattern.test(filePath));
    }

    /**
     * Check if file is a database migration
     */
    isDatabaseMigration(filePath) {
        const migrationPatterns = [
            /migrations?\//i,
            /migrate\//i,
            /\.migration\./i,
            /\d{4}_\d{2}_\d{2}_.*\.sql$/i,
            /\d+_.*\.sql$/i
        ];
        
        return migrationPatterns.some(pattern => pattern.test(filePath));
    }

    /**
     * Check if file is security-sensitive
     */
    isSecuritySensitive(filePath) {
        const securityPatterns = [
            /auth/i,
            /security/i,
            /crypto/i,
            /password/i,
            /token/i,
            /certificate/i,
            /\.key$/i,
            /\.pem$/i,
            /\.crt$/i
        ];
        
        return securityPatterns.some(pattern => pattern.test(filePath));
    }

    /**
     * Extract code context around specific lines
     */
    extractCodeContext(content, lineNumber, contextLines = 3) {
        if (!content) return null;
        
        const lines = content.split('\n');
        const startLine = Math.max(0, lineNumber - contextLines - 1);
        const endLine = Math.min(lines.length, lineNumber + contextLines);
        
        return {
            startLine: startLine + 1,
            endLine: endLine,
            lines: lines.slice(startLine, endLine),
            targetLine: lineNumber
        };
    }

    /**
     * Analyze code complexity (basic implementation)
     */
    analyzeComplexity(content, language) {
        if (!content) return { score: 0, factors: [] };
        
        const complexity = {
            score: 0,
            factors: []
        };
        
        const lines = content.split('\n');
        
        let cyclomaticComplexity = 1; // Base complexity
        let nestingLevel = 0;
        let maxNesting = 0;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
                continue;
            }
            
            const decisionPoints = (trimmedLine.match(/\b(if|else|while|for|switch|case|catch|&&|\|\|)\b/g) || []).length;
            cyclomaticComplexity += decisionPoints;
            
            const openBraces = (trimmedLine.match(/\{/g) || []).length;
            const closeBraces = (trimmedLine.match(/\}/g) || []).length;
            nestingLevel += openBraces - closeBraces;
            maxNesting = Math.max(maxNesting, nestingLevel);
        }
        
        complexity.score = cyclomaticComplexity;
        
        if (cyclomaticComplexity > 10) {
            complexity.factors.push('High cyclomatic complexity');
        }
        
        if (maxNesting > 4) {
            complexity.factors.push('Deep nesting detected');
        }
        
        if (lines.length > 100) {
            complexity.factors.push('Large file size');
        }
        
        return complexity;
    }
}

module.exports = CodeParser;
