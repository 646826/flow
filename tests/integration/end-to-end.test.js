/**
 * End-to-End Integration Tests
 */

const AzureDevOpsClient = require('../../functions/azure-devops-client');
const { CodeParser } = require('../../functions/code-parser');
const { DiffAnalyzer } = require('../../functions/diff-analyzer');
const { ReportFormatter } = require('../../functions/report-formatter');
const { logger } = require('../../functions/logger');

jest.mock('../../functions/logger');

describe('End-to-End PR Review Process', () => {
    let azureClient;
    let codeParser;
    let diffAnalyzer;
    let reportFormatter;

    beforeEach(() => {
        azureClient = new AzureDevOpsClient('test-org', 'test-pat');
        codeParser = new CodeParser();
        diffAnalyzer = new DiffAnalyzer();
        reportFormatter = new ReportFormatter();

        logger.info = jest.fn();
        logger.error = jest.fn();
        logger.logAnalysis = jest.fn();

        jest.spyOn(azureClient, 'makeRequest').mockImplementation((method, endpoint) => {
            if (endpoint.includes('/pullrequests/')) {
                return Promise.resolve({
                    pullRequestId: 123,
                    title: 'Test PR',
                    description: 'Test description',
                    status: 'active',
                    createdBy: {
                        displayName: 'Test User'
                    }
                });
            } else if (endpoint.includes('/changes')) {
                return Promise.resolve({
                    changeEntries: [
                        {
                            item: { path: '/src/utils.js' },
                            changeType: 'edit'
                        },
                        {
                            item: { path: '/src/security.js' },
                            changeType: 'add'
                        }
                    ]
                });
            } else if (endpoint.includes('/items')) {
                return Promise.resolve({
                    content: 'function test() {\n  return "Hello World";\n}'
                });
            } else if (endpoint.includes('/threads')) {
                return Promise.resolve({
                    id: 456,
                    status: 'active'
                });
            }
            return Promise.resolve({});
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Complete PR Review Workflow', () => {
        test('should execute full review process successfully', async () => {
            const startTime = Date.now();

            try {
                logger.info('Starting PR review process');
                const prDetails = await azureClient.getPullRequest('test-project', 'test-repo', 123);
                expect(prDetails.pullRequestId).toBe(123);

                const changes = await azureClient.getPullRequestChanges('test-project', 'test-repo', 123);
                expect(changes.changeEntries).toHaveLength(2);

                const analysisResults = [];
                for (const change of changes.changeEntries) {
                    if (change.changeType === 'edit' || change.changeType === 'add') {
                        const fileContent = await azureClient.getFileContent(
                            'test-project',
                            'test-repo',
                            change.item.path,
                            'latest'
                        );

                        const parsedCode = codeParser.parseCode(fileContent.content, change.item.path);
                        expect(parsedCode).toHaveProperty('language');
                        expect(parsedCode).toHaveProperty('functions');

                        const diffAnalysis = diffAnalyzer.analyzeDiff(
                            '', // previous content (empty for new files)
                            fileContent.content,
                            change.item.path
                        );
                        expect(diffAnalysis).toHaveProperty('securityIssues');
                        expect(diffAnalysis).toHaveProperty('performanceIssues');
                        expect(diffAnalysis).toHaveProperty('qualityIssues');

                        analysisResults.push({
                            file: change.item.path,
                            changeType: change.changeType,
                            analysis: diffAnalysis,
                            parsedCode
                        });
                    }
                }

                expect(analysisResults).toHaveLength(2);

                const totalIssues = analysisResults.reduce((total, result) => {
                    return total + 
                        result.analysis.securityIssues.length +
                        result.analysis.performanceIssues.length +
                        result.analysis.qualityIssues.length;
                }, 0);

                const riskScore = Math.min(totalIssues * 2, 10); // Cap at 10

                const reportData = {
                    pullRequest: prDetails,
                    analysisResults,
                    summary: {
                        filesAnalyzed: analysisResults.length,
                        totalIssues,
                        riskScore,
                        recommendation: riskScore < 5 ? 'Approve' : 'Review Required'
                    },
                    criticalIssues: analysisResults
                        .flatMap(r => r.analysis.securityIssues)
                        .filter(issue => issue.severity === 'critical'),
                    suggestions: analysisResults
                        .flatMap(r => r.analysis.qualityIssues)
                        .slice(0, 5) // Top 5 suggestions
                };

                const markdownReport = reportFormatter.format(reportData, 'markdown');
                expect(markdownReport).toContain('PR Review Summary');
                expect(markdownReport).toContain(`Risk Score: ${riskScore}`);

                const threadData = {
                    comments: [{
                        content: markdownReport
                    }]
                };

                const commentResult = await azureClient.createPullRequestThread(
                    'test-project',
                    'test-repo',
                    123,
                    threadData
                );

                expect(commentResult.id).toBe(456);

                const duration = Date.now() - startTime;
                logger.logAnalysis(123, analysisResults.length, riskScore, duration);

                expect(logger.logAnalysis).toHaveBeenCalledWith(
                    123,
                    analysisResults.length,
                    riskScore,
                    expect.any(Number)
                );

                logger.info('PR review process completed successfully');

            } catch (error) {
                logger.error('PR review process failed', { error });
                throw error;
            }
        });

        test('should handle errors gracefully during review process', async () => {
            jest.spyOn(azureClient, 'makeRequest').mockRejectedValueOnce(
                new Error('API temporarily unavailable')
            );

            try {
                await azureClient.getPullRequest('test-project', 'test-repo', 123);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).toContain('API temporarily unavailable');
                logger.error('PR review process failed', { error });
                expect(logger.error).toHaveBeenCalled();
            }
        });
    });

    describe('Security Analysis Integration', () => {
        test('should detect security vulnerabilities in code changes', async () => {
            const vulnerableCode = `
                function login(username, password) {
                    const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
                    return database.query(query);
                }
            `;

            const parsedCode = codeParser.parseCode(vulnerableCode, 'login.js');
            const diffAnalysis = diffAnalyzer.analyzeDiff('', vulnerableCode, 'login.js');

            expect(diffAnalysis.securityIssues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'sql_injection',
                        severity: 'critical'
                    })
                ])
            );
        });

        test('should detect hardcoded secrets', async () => {
            const codeWithSecrets = `
                const config = {
                    apiKey: "sk-1234567890abcdef1234567890abcdef",
                    password: "hardcoded_password_123"
                };
            `;

            const diffAnalysis = diffAnalyzer.analyzeDiff('', codeWithSecrets, 'config.js');

            expect(diffAnalysis.securityIssues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'hardcoded_secrets',
                        severity: 'high'
                    })
                ])
            );
        });
    });

    describe('Performance Analysis Integration', () => {
        test('should detect performance issues', async () => {
            const inefficientCode = `
                function processUsers(users) {
                    for (let i = 0; i < users.length; i++) {
                        for (let j = 0; j < users[i].orders.length; j++) {
                            const order = database.query("SELECT * FROM orders WHERE id = " + users[i].orders[j].id);
                            processOrder(order);
                        }
                    }
                }
            `;

            const diffAnalysis = diffAnalyzer.analyzeDiff('', inefficientCode, 'processor.js');

            expect(diffAnalysis.performanceIssues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'database_queries_in_loops',
                        severity: 'high'
                    })
                ])
            );
        });
    });

    describe('Report Generation Integration', () => {
        test('should generate comprehensive reports in multiple formats', async () => {
            const mockReportData = {
                pullRequest: {
                    pullRequestId: 123,
                    title: 'Test PR'
                },
                analysisResults: [
                    {
                        file: '/src/test.js',
                        analysis: {
                            securityIssues: [],
                            performanceIssues: [],
                            qualityIssues: [
                                {
                                    type: 'long_method',
                                    severity: 'medium',
                                    description: 'Method is too long'
                                }
                            ]
                        }
                    }
                ],
                summary: {
                    filesAnalyzed: 1,
                    totalIssues: 1,
                    riskScore: 2,
                    recommendation: 'Approve'
                }
            };

            const markdownReport = reportFormatter.format(mockReportData, 'markdown');
            expect(markdownReport).toContain('# PR Review Summary');
            expect(markdownReport).toContain('Risk Score: 2');
            expect(markdownReport).toContain('Files Analyzed: 1');

            const jsonReport = reportFormatter.format(mockReportData, 'json');
            const parsedJson = JSON.parse(jsonReport);
            expect(parsedJson).toHaveProperty('summary');
            expect(parsedJson.summary.riskScore).toBe(2);

            const htmlReport = reportFormatter.format(mockReportData, 'html');
            expect(htmlReport).toContain('<html>');
            expect(htmlReport).toContain('PR Review Summary');
            expect(htmlReport).toContain('Risk Score: 2');
        });
    });

    describe('Configuration Integration', () => {
        test('should respect configuration settings during analysis', async () => {
            const mockConfig = {
                global_settings: {
                    block_merge_threshold: 5,
                    require_human_review_threshold: 3
                }
            };

            const highRiskCode = `
                function unsafeFunction(userInput) {
                    eval(userInput); // XSS vulnerability
                    const query = "SELECT * FROM users WHERE id = " + userInput; // SQL injection
                    return database.query(query);
                }
            `;

            const diffAnalysis = diffAnalyzer.analyzeDiff('', highRiskCode, 'unsafe.js');
            const riskScore = diffAnalysis.securityIssues.length * 3; // 2 critical issues * 3 = 6

            expect(riskScore).toBeGreaterThan(mockConfig.global_settings.block_merge_threshold);
            expect(riskScore).toBeGreaterThan(mockConfig.global_settings.require_human_review_threshold);
        });
    });
});
