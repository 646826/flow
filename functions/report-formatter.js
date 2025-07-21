/**
 * Report Formatter
 * Formats analysis results into various output formats
 */

class ReportFormatter {
    constructor() {
        this.templates = this.initializeTemplates();
    }

    /**
     * Format complete analysis report
     */
    formatReport(analysisData, format = 'markdown') {
        switch (format.toLowerCase()) {
            case 'markdown':
                return this.formatMarkdownReport(analysisData);
            case 'json':
                return this.formatJsonReport(analysisData);
            case 'html':
                return this.formatHtmlReport(analysisData);
            case 'text':
                return this.formatTextReport(analysisData);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Format markdown report
     */
    formatMarkdownReport(data) {
        const sections = [];

        sections.push(this.formatMarkdownHeader(data));

        sections.push(this.formatMarkdownSummary(data));

        if (data.criticalIssues && data.criticalIssues.length > 0) {
            sections.push(this.formatMarkdownCriticalIssues(data.criticalIssues));
        }

        if (data.security && data.security.length > 0) {
            sections.push(this.formatMarkdownSecurityAnalysis(data.security));
        }

        if (data.performance && data.performance.length > 0) {
            sections.push(this.formatMarkdownPerformanceAnalysis(data.performance));
        }

        if (data.quality && data.quality.length > 0) {
            sections.push(this.formatMarkdownQualityAnalysis(data.quality));
        }

        if (data.suggestions && data.suggestions.length > 0) {
            sections.push(this.formatMarkdownSuggestions(data.suggestions));
        }

        if (data.metrics) {
            sections.push(this.formatMarkdownMetrics(data.metrics));
        }

        sections.push(this.formatMarkdownFooter(data));

        return sections.join('\n\n');
    }

    /**
     * Format markdown header
     */
    formatMarkdownHeader(data) {
        return `# 🔍 AI Code Review Report

**Repository:** ${data.repository || 'Unknown'}
**Pull Request:** #${data.pullRequestId || 'Unknown'}
**Branch:** ${data.sourceBranch || 'Unknown'} → ${data.targetBranch || 'Unknown'}
**Author:** ${data.author || 'Unknown'}
**Review Date:** ${new Date().toISOString().split('T')[0]}

---`;
    }

    /**
     * Format markdown summary
     */
    formatMarkdownSummary(data) {
        const riskLevel = this.getRiskLevel(data.riskScore || 0);
        const riskEmoji = this.getRiskEmoji(riskLevel);

        return `## 📊 Executive Summary

**Overall Risk Score:** ${riskEmoji} ${data.riskScore || 0}/10 (${riskLevel})
**Recommendation:** ${data.recommendation || 'Review required'}

### 📈 Change Statistics
- **Files Changed:** ${data.filesChanged || 0}
- **Lines Added:** +${data.linesAdded || 0}
- **Lines Removed:** -${data.linesRemoved || 0}
- **Languages:** ${(data.languages || []).join(', ') || 'Unknown'}

### 🎯 Issue Summary
- **Critical Issues:** ${(data.criticalIssues || []).length}
- **Security Concerns:** ${(data.security || []).length}
- **Performance Issues:** ${(data.performance || []).length}
- **Quality Issues:** ${(data.quality || []).length}`;
    }

    /**
     * Format markdown critical issues
     */
    formatMarkdownCriticalIssues(issues) {
        let section = '## ⚠️ Critical Issues\n\n';
        
        for (const issue of issues) {
            section += `### ${this.getSeverityEmoji(issue.severity)} ${issue.type}

**File:** \`${issue.file}\`${issue.line ? ` (Line ${issue.line})` : ''}
**Severity:** ${issue.severity}

${issue.description}

${issue.suggestion ? `**Suggested Fix:** ${issue.suggestion}` : ''}

${issue.content ? `\`\`\`\n${issue.content}\n\`\`\`` : ''}

---

`;
        }

        return section;
    }

    /**
     * Format markdown security analysis
     */
    formatMarkdownSecurityAnalysis(securityIssues) {
        let section = '## 🔒 Security Analysis\n\n';

        const groupedIssues = this.groupIssuesByType(securityIssues);

        for (const [type, issues] of Object.entries(groupedIssues)) {
            section += `### ${type.replace(/_/g, ' ').toUpperCase()}\n\n`;
            
            for (const issue of issues) {
                section += `- **${issue.file}**${issue.line ? ` (Line ${issue.line})` : ''}: ${issue.description}\n`;
                if (issue.suggestion) {
                    section += `  - *Suggestion: ${issue.suggestion}*\n`;
                }
            }
            section += '\n';
        }

        return section;
    }

    /**
     * Format markdown performance analysis
     */
    formatMarkdownPerformanceAnalysis(performanceIssues) {
        let section = '## ⚡ Performance Analysis\n\n';

        const groupedIssues = this.groupIssuesByType(performanceIssues);

        for (const [type, issues] of Object.entries(groupedIssues)) {
            section += `### ${type.replace(/_/g, ' ').toUpperCase()}\n\n`;
            
            for (const issue of issues) {
                section += `- **${issue.file}**${issue.line ? ` (Line ${issue.line})` : ''}: ${issue.description}\n`;
                if (issue.suggestion) {
                    section += `  - *Optimization: ${issue.suggestion}*\n`;
                }
            }
            section += '\n';
        }

        return section;
    }

    /**
     * Format markdown quality analysis
     */
    formatMarkdownQualityAnalysis(qualityIssues) {
        let section = '## 📝 Code Quality Analysis\n\n';

        const groupedIssues = this.groupIssuesByType(qualityIssues);

        for (const [type, issues] of Object.entries(groupedIssues)) {
            section += `### ${type.replace(/_/g, ' ').toUpperCase()}\n\n`;
            
            for (const issue of issues) {
                section += `- **${issue.file}**${issue.line ? ` (Line ${issue.line})` : ''}: ${issue.description}\n`;
                if (issue.suggestion) {
                    section += `  - *Improvement: ${issue.suggestion}*\n`;
                }
            }
            section += '\n';
        }

        return section;
    }

    /**
     * Format markdown suggestions
     */
    formatMarkdownSuggestions(suggestions) {
        let section = '## 💡 Recommendations\n\n';

        const priorityOrder = ['high', 'medium', 'low'];
        const groupedSuggestions = this.groupSuggestionsByPriority(suggestions);

        for (const priority of priorityOrder) {
            if (groupedSuggestions[priority] && groupedSuggestions[priority].length > 0) {
                section += `### ${priority.toUpperCase()} Priority\n\n`;
                
                for (const suggestion of groupedSuggestions[priority]) {
                    section += `- **${suggestion.type.replace(/_/g, ' ')}**: ${suggestion.description}\n`;
                    if (suggestion.action) {
                        section += `  - *Action: ${suggestion.action}*\n`;
                    }
                }
                section += '\n';
            }
        }

        return section;
    }

    /**
     * Format markdown metrics
     */
    formatMarkdownMetrics(metrics) {
        return `## 📊 Code Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Cyclomatic Complexity | ${metrics.complexity || 'N/A'} | ${this.getComplexityStatus(metrics.complexity)} |
| Test Coverage | ${metrics.testCoverage || 'N/A'}% | ${this.getCoverageStatus(metrics.testCoverage)} |
| Code Duplication | ${metrics.duplication || 'N/A'}% | ${this.getDuplicationStatus(metrics.duplication)} |
| Technical Debt | ${metrics.technicalDebt || 'N/A'} | ${this.getDebtStatus(metrics.technicalDebt)} |
| Maintainability Index | ${metrics.maintainability || 'N/A'} | ${this.getMaintainabilityStatus(metrics.maintainability)} |`;
    }

    /**
     * Format markdown footer
     */
    formatMarkdownFooter(data) {
        return `---

*This report was generated by the AI Code Review System v1.0*
*Analysis completed at: ${new Date().toISOString()}*
*Review ID: ${data.reviewId || 'Unknown'}*`;
    }

    /**
     * Format JSON report
     */
    formatJsonReport(data) {
        return JSON.stringify({
            metadata: {
                reviewId: data.reviewId,
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            },
            summary: {
                riskScore: data.riskScore,
                recommendation: data.recommendation,
                filesChanged: data.filesChanged,
                linesAdded: data.linesAdded,
                linesRemoved: data.linesRemoved,
                languages: data.languages
            },
            issues: {
                critical: data.criticalIssues || [],
                security: data.security || [],
                performance: data.performance || [],
                quality: data.quality || []
            },
            suggestions: data.suggestions || [],
            metrics: data.metrics || {}
        }, null, 2);
    }

    /**
     * Format HTML report
     */
    formatHtmlReport(data) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>AI Code Review Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .issue { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .critical { background: #f8d7da; }
        .suggestion { background: #d1ecf1; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 AI Code Review Report</h1>
        <p><strong>Repository:</strong> ${data.repository || 'Unknown'}</p>
        <p><strong>Pull Request:</strong> #${data.pullRequestId || 'Unknown'}</p>
        <p><strong>Risk Score:</strong> ${data.riskScore || 0}/10</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <p>Files Changed: ${data.filesChanged || 0}</p>
        <p>Lines Added: +${data.linesAdded || 0}</p>
        <p>Lines Removed: -${data.linesRemoved || 0}</p>
    </div>
    
    <!-- Additional sections would be added here -->
    
    <footer>
        <p><em>Generated by AI Code Review System v1.0 at ${new Date().toISOString()}</em></p>
    </footer>
</body>
</html>`;
    }

    /**
     * Format text report
     */
    formatTextReport(data) {
        let report = '';
        
        report += '='.repeat(60) + '\n';
        report += 'AI CODE REVIEW REPORT\n';
        report += '='.repeat(60) + '\n\n';
        
        report += `Repository: ${data.repository || 'Unknown'}\n`;
        report += `Pull Request: #${data.pullRequestId || 'Unknown'}\n`;
        report += `Risk Score: ${data.riskScore || 0}/10\n\n`;
        
        if (data.criticalIssues && data.criticalIssues.length > 0) {
            report += 'CRITICAL ISSUES:\n';
            report += '-'.repeat(20) + '\n';
            for (const issue of data.criticalIssues) {
                report += `- ${issue.type}: ${issue.description}\n`;
                report += `  File: ${issue.file}\n\n`;
            }
        }
        
        report += '\n' + '='.repeat(60) + '\n';
        report += `Generated at: ${new Date().toISOString()}\n`;
        
        return report;
    }

    /**
     * Helper methods
     */
    getRiskLevel(score) {
        if (score >= 8) return 'Critical';
        if (score >= 6) return 'High';
        if (score >= 4) return 'Medium';
        if (score >= 2) return 'Low';
        return 'Minimal';
    }

    getRiskEmoji(level) {
        const emojis = {
            'Critical': '🔴',
            'High': '🟠',
            'Medium': '🟡',
            'Low': '🟢',
            'Minimal': '⚪'
        };
        return emojis[level] || '⚪';
    }

    getSeverityEmoji(severity) {
        const emojis = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        };
        return emojis[severity] || '⚪';
    }

    groupIssuesByType(issues) {
        return issues.reduce((groups, issue) => {
            const type = issue.type || 'unknown';
            if (!groups[type]) groups[type] = [];
            groups[type].push(issue);
            return groups;
        }, {});
    }

    groupSuggestionsByPriority(suggestions) {
        return suggestions.reduce((groups, suggestion) => {
            const priority = suggestion.priority || 'low';
            if (!groups[priority]) groups[priority] = [];
            groups[priority].push(suggestion);
            return groups;
        }, {});
    }

    getComplexityStatus(complexity) {
        if (!complexity) return 'Unknown';
        if (complexity > 15) return '❌ High';
        if (complexity > 10) return '⚠️ Medium';
        return '✅ Good';
    }

    getCoverageStatus(coverage) {
        if (!coverage) return 'Unknown';
        if (coverage < 60) return '❌ Low';
        if (coverage < 80) return '⚠️ Medium';
        return '✅ Good';
    }

    getDuplicationStatus(duplication) {
        if (!duplication) return 'Unknown';
        if (duplication > 10) return '❌ High';
        if (duplication > 5) return '⚠️ Medium';
        return '✅ Good';
    }

    getDebtStatus(debt) {
        if (!debt) return 'Unknown';
        return debt > 5 ? '❌ High' : '✅ Low';
    }

    getMaintainabilityStatus(maintainability) {
        if (!maintainability) return 'Unknown';
        if (maintainability < 60) return '❌ Poor';
        if (maintainability < 80) return '⚠️ Fair';
        return '✅ Good';
    }

    initializeTemplates() {
        return {
        };
    }
}

module.exports = ReportFormatter;
