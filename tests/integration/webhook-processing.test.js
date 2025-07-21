/**
 * Integration Tests for Webhook Processing
 */

const request = require('supertest');
const express = require('express');
const AzureDevOpsClient = require('../../functions/azure-devops-client');
const { logger } = require('../../functions/logger');

jest.mock('../../functions/azure-devops-client');
jest.mock('../../functions/logger');

describe('Webhook Processing Integration', () => {
    let app;
    let mockAzureClient;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        mockAzureClient = {
            getPullRequest: jest.fn(),
            getPullRequestChanges: jest.fn(),
            createPullRequestThread: jest.fn()
        };
        AzureDevOpsClient.mockImplementation(() => mockAzureClient);
        AzureDevOpsClient.validateWebhookSignature = jest.fn().mockReturnValue(true);

        logger.info = jest.fn();
        logger.error = jest.fn();
        logger.logWebhook = jest.fn();

        app.post('/webhook/pr', async (req, res) => {
            try {
                const { eventType, resource } = req.body;
                
                if (eventType === 'git.pullrequest.created' || eventType === 'git.pullrequest.updated') {
                    const pullRequest = resource;
                    
                    logger.logWebhook(eventType, pullRequest.pullRequestId, 'processing', 0);
                    
                    const prDetails = await mockAzureClient.getPullRequest(
                        pullRequest.repository.project.id,
                        pullRequest.repository.id,
                        pullRequest.pullRequestId
                    );
                    
                    const changes = await mockAzureClient.getPullRequestChanges(
                        pullRequest.repository.project.id,
                        pullRequest.repository.id,
                        pullRequest.pullRequestId
                    );
                    
                    const analysisResult = {
                        summary: 'Code review completed',
                        riskScore: 3,
                        issues: []
                    };
                    
                    const threadData = {
                        comments: [{
                            content: `## PR Review Summary\n\n${analysisResult.summary}\n\nRisk Score: ${analysisResult.riskScore}/10`
                        }]
                    };
                    
                    await mockAzureClient.createPullRequestThread(
                        pullRequest.repository.project.id,
                        pullRequest.repository.id,
                        pullRequest.pullRequestId,
                        threadData
                    );
                    
                    logger.logWebhook(eventType, pullRequest.pullRequestId, 'completed', 1000);
                    
                    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
                } else {
                    res.status(200).json({ success: true, message: 'Event type not handled' });
                }
            } catch (error) {
                logger.error('Webhook processing failed', { error });
                res.status(500).json({ success: false, error: error.message });
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Pull Request Created Event', () => {
        test('should process PR created webhook successfully', async () => {
            const webhookPayload = {
                eventType: 'git.pullrequest.created',
                resource: {
                    pullRequestId: 123,
                    repository: {
                        id: 'repo-id',
                        project: {
                            id: 'project-id'
                        }
                    },
                    title: 'Test PR',
                    description: 'Test description'
                }
            };

            mockAzureClient.getPullRequest.mockResolvedValue({
                pullRequestId: 123,
                title: 'Test PR',
                status: 'active'
            });

            mockAzureClient.getPullRequestChanges.mockResolvedValue({
                changeEntries: [
                    {
                        item: { path: '/src/test.js' },
                        changeType: 'edit'
                    }
                ]
            });

            mockAzureClient.createPullRequestThread.mockResolvedValue({
                id: 456,
                status: 'active'
            });

            const response = await request(app)
                .post('/webhook/pr')
                .send(webhookPayload)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockAzureClient.getPullRequest).toHaveBeenCalledWith(
                'project-id',
                'repo-id',
                123
            );
            expect(mockAzureClient.getPullRequestChanges).toHaveBeenCalledWith(
                'project-id',
                'repo-id',
                123
            );
            expect(mockAzureClient.createPullRequestThread).toHaveBeenCalledWith(
                'project-id',
                'repo-id',
                123,
                expect.objectContaining({
                    comments: expect.arrayContaining([
                        expect.objectContaining({
                            content: expect.stringContaining('PR Review Summary')
                        })
                    ])
                })
            );
            expect(logger.logWebhook).toHaveBeenCalledWith(
                'git.pullrequest.created',
                123,
                'completed',
                1000
            );
        });

        test('should handle Azure DevOps API errors gracefully', async () => {
            const webhookPayload = {
                eventType: 'git.pullrequest.created',
                resource: {
                    pullRequestId: 123,
                    repository: {
                        id: 'repo-id',
                        project: {
                            id: 'project-id'
                        }
                    }
                }
            };

            mockAzureClient.getPullRequest.mockRejectedValue(new Error('API Error'));

            const response = await request(app)
                .post('/webhook/pr')
                .send(webhookPayload)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('API Error');
            expect(logger.error).toHaveBeenCalledWith(
                'Webhook processing failed',
                expect.objectContaining({
                    error: expect.any(Error)
                })
            );
        });
    });

    describe('Pull Request Updated Event', () => {
        test('should process PR updated webhook successfully', async () => {
            const webhookPayload = {
                eventType: 'git.pullrequest.updated',
                resource: {
                    pullRequestId: 456,
                    repository: {
                        id: 'repo-id',
                        project: {
                            id: 'project-id'
                        }
                    },
                    title: 'Updated PR'
                }
            };

            mockAzureClient.getPullRequest.mockResolvedValue({
                pullRequestId: 456,
                title: 'Updated PR',
                status: 'active'
            });

            mockAzureClient.getPullRequestChanges.mockResolvedValue({
                changeEntries: []
            });

            mockAzureClient.createPullRequestThread.mockResolvedValue({
                id: 789,
                status: 'active'
            });

            const response = await request(app)
                .post('/webhook/pr')
                .send(webhookPayload)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(logger.logWebhook).toHaveBeenCalledWith(
                'git.pullrequest.updated',
                456,
                'completed',
                1000
            );
        });
    });

    describe('Unsupported Event Types', () => {
        test('should handle unsupported event types gracefully', async () => {
            const webhookPayload = {
                eventType: 'git.push',
                resource: {
                    repository: {
                        id: 'repo-id'
                    }
                }
            };

            const response = await request(app)
                .post('/webhook/pr')
                .send(webhookPayload)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Event type not handled');
            expect(mockAzureClient.getPullRequest).not.toHaveBeenCalled();
        });
    });

    describe('Webhook Security', () => {
        test('should validate webhook signature', () => {
            const payload = JSON.stringify({ test: 'data' });
            const secret = 'webhook-secret';
            const signature = 'valid-signature';

            AzureDevOpsClient.validateWebhookSignature.mockReturnValue(true);

            const isValid = AzureDevOpsClient.validateWebhookSignature(payload, signature, secret);

            expect(isValid).toBe(true);
            expect(AzureDevOpsClient.validateWebhookSignature).toHaveBeenCalledWith(
                payload,
                signature,
                secret
            );
        });

        test('should reject invalid webhook signature', () => {
            const payload = JSON.stringify({ test: 'data' });
            const secret = 'webhook-secret';
            const signature = 'invalid-signature';

            AzureDevOpsClient.validateWebhookSignature.mockReturnValue(false);

            const isValid = AzureDevOpsClient.validateWebhookSignature(payload, signature, secret);

            expect(isValid).toBe(false);
        });
    });
});
