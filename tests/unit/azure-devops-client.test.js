/**
 * Unit Tests for Azure DevOps Client
 */

const AzureDevOpsClient = require('../../functions/azure-devops-client');
const { AzureDevOpsError } = require('../../functions/error-handler');
const https = require('https');

jest.mock('https');

describe('AzureDevOpsClient', () => {
    let client;
    const mockOrganization = 'test-org';
    const mockPAT = 'test-pat';

    beforeEach(() => {
        client = new AzureDevOpsClient(mockOrganization, mockPAT);
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should initialize with correct properties', () => {
            expect(client.organization).toBe(mockOrganization);
            expect(client.pat).toBe(mockPAT);
            expect(client.baseUrl).toBe(`https://dev.azure.com/${mockOrganization}`);
            expect(client.apiVersion).toBe('7.0');
        });
    });

    describe('makeRequest', () => {
        test('should make successful GET request', async () => {
            const mockResponse = { id: 123, title: 'Test PR' };
            const mockRes = {
                statusCode: 200,
                on: jest.fn((event, callback) => {
                    if (event === 'data') {
                        callback(JSON.stringify(mockResponse));
                    } else if (event === 'end') {
                        callback();
                    }
                })
            };
            const mockReq = {
                on: jest.fn(),
                end: jest.fn(),
                write: jest.fn()
            };

            https.request.mockImplementation((url, options, callback) => {
                callback(mockRes);
                return mockReq;
            });

            const result = await client.makeRequest('GET', '/test/endpoint');

            expect(result).toEqual(mockResponse);
            expect(https.request).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Basic'),
                        'Content-Type': 'application/json'
                    })
                }),
                expect.any(Function)
            );
        });

        test('should handle API error responses', async () => {
            const mockErrorResponse = { message: 'Not found' };
            const mockRes = {
                statusCode: 404,
                on: jest.fn((event, callback) => {
                    if (event === 'data') {
                        callback(JSON.stringify(mockErrorResponse));
                    } else if (event === 'end') {
                        callback();
                    }
                })
            };
            const mockReq = {
                on: jest.fn(),
                end: jest.fn(),
                write: jest.fn()
            };

            https.request.mockImplementation((url, options, callback) => {
                callback(mockRes);
                return mockReq;
            });

            await expect(client.makeRequest('GET', '/test/endpoint'))
                .rejects.toThrow(AzureDevOpsError);
        });

        test('should handle network errors', async () => {
            const mockReq = {
                on: jest.fn((event, callback) => {
                    if (event === 'error') {
                        callback(new Error('Network error'));
                    }
                }),
                end: jest.fn(),
                write: jest.fn()
            };

            https.request.mockImplementation(() => mockReq);

            await expect(client.makeRequest('GET', '/test/endpoint'))
                .rejects.toThrow(AzureDevOpsError);
        });

        test('should handle JSON parse errors', async () => {
            const mockRes = {
                statusCode: 200,
                on: jest.fn((event, callback) => {
                    if (event === 'data') {
                        callback('invalid json');
                    } else if (event === 'end') {
                        callback();
                    }
                })
            };
            const mockReq = {
                on: jest.fn(),
                end: jest.fn(),
                write: jest.fn()
            };

            https.request.mockImplementation((url, options, callback) => {
                callback(mockRes);
                return mockReq;
            });

            await expect(client.makeRequest('GET', '/test/endpoint'))
                .rejects.toThrow(AzureDevOpsError);
        });

        test('should send POST data correctly', async () => {
            const mockResponse = { success: true };
            const mockData = { title: 'Test PR' };
            const mockRes = {
                statusCode: 201,
                on: jest.fn((event, callback) => {
                    if (event === 'data') {
                        callback(JSON.stringify(mockResponse));
                    } else if (event === 'end') {
                        callback();
                    }
                })
            };
            const mockReq = {
                on: jest.fn(),
                end: jest.fn(),
                write: jest.fn()
            };

            https.request.mockImplementation((url, options, callback) => {
                callback(mockRes);
                return mockReq;
            });

            await client.makeRequest('POST', '/test/endpoint', mockData);

            expect(mockReq.write).toHaveBeenCalledWith(JSON.stringify(mockData));
        });
    });

    describe('getPullRequest', () => {
        test('should validate required parameters', async () => {
            await expect(client.getPullRequest(null, 'repo', 123))
                .rejects.toThrow('Missing required fields');
            
            await expect(client.getPullRequest('project', null, 123))
                .rejects.toThrow('Missing required fields');
            
            await expect(client.getPullRequest('project', 'repo', null))
                .rejects.toThrow('Missing required fields');
        });

        test('should call makeRequest with correct endpoint', async () => {
            const mockResponse = { id: 123 };
            client.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await client.getPullRequest('test-project', 'test-repo', 123);

            expect(client.makeRequest).toHaveBeenCalledWith(
                'GET',
                '/test-project/_apis/git/repositories/test-repo/pullrequests/123'
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('createPullRequestThread', () => {
        test('should validate thread data', async () => {
            await expect(client.createPullRequestThread('project', 'repo', 123, null))
                .rejects.toThrow('Missing required fields');

            await expect(client.createPullRequestThread('project', 'repo', 123, {}))
                .rejects.toThrow('Thread data must contain at least one comment');

            await expect(client.createPullRequestThread('project', 'repo', 123, { comments: [] }))
                .rejects.toThrow('Thread data must contain at least one comment');
        });

        test('should create thread with valid data', async () => {
            const mockResponse = { id: 456 };
            const threadData = {
                comments: [{ content: 'Test comment' }]
            };
            client.makeRequest = jest.fn().mockResolvedValue(mockResponse);

            const result = await client.createPullRequestThread('project', 'repo', 123, threadData);

            expect(client.makeRequest).toHaveBeenCalledWith(
                'POST',
                '/project/_apis/git/repositories/repo/pullrequests/123/threads',
                threadData
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('validateWebhookSignature', () => {
        test('should validate correct signature', () => {
            const payload = 'test-payload';
            const secret = 'test-secret';
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            const result = AzureDevOpsClient.validateWebhookSignature(
                payload,
                expectedSignature,
                secret
            );

            expect(result).toBe(true);
        });

        test('should reject invalid signature', () => {
            const payload = 'test-payload';
            const secret = 'test-secret';
            const invalidSignature = 'invalid-signature';

            const result = AzureDevOpsClient.validateWebhookSignature(
                payload,
                invalidSignature,
                secret
            );

            expect(result).toBe(false);
        });
    });
});
