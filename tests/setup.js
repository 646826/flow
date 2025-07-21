/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

jest.setTimeout(30000);

global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

global.testUtils = {
    createMockPullRequest: (overrides = {}) => ({
        pullRequestId: 123,
        title: 'Test PR',
        description: 'Test description',
        status: 'active',
        createdBy: {
            displayName: 'Test User',
            uniqueName: 'test@example.com'
        },
        repository: {
            id: 'test-repo-id',
            name: 'test-repo',
            project: {
                id: 'test-project-id',
                name: 'test-project'
            }
        },
        ...overrides
    }),

    createMockWebhookPayload: (eventType = 'git.pullrequest.created', overrides = {}) => ({
        eventType,
        resource: global.testUtils.createMockPullRequest(overrides.resource),
        ...overrides
    }),

    createMockAnalysisResult: (overrides = {}) => ({
        securityIssues: [],
        performanceIssues: [],
        qualityIssues: [],
        riskScore: 0,
        ...overrides
    }),

    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

afterEach(() => {
    jest.clearAllMocks();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
