/**
 * Azure DevOps API Client
 * Handles all interactions with Azure DevOps REST API
 */

const https = require('https');
const { URL } = require('url');
const { logger } = require('./logger');
const { ErrorHandler, AzureDevOpsError } = require('./error-handler');

class AzureDevOpsClient {
    constructor(organization, personalAccessToken) {
        this.organization = organization;
        this.pat = personalAccessToken;
        this.baseUrl = `https://dev.azure.com/${organization}`;
        this.apiVersion = '7.0';
    }

    /**
     * Make authenticated request to Azure DevOps API
     */
    async makeRequest(method, endpoint, data = null) {
        const startTime = Date.now();
        const url = new URL(endpoint, this.baseUrl);
        url.searchParams.set('api-version', this.apiVersion);

        const options = {
            method,
            headers: {
                'Authorization': `Basic ${Buffer.from(`:${this.pat}`).toString('base64')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'PR-Review-System/1.0'
            },
            timeout: 30000
        };

        logger.debug('Making Azure DevOps API request', {
            method,
            endpoint,
            hasData: !!data
        });

        return ErrorHandler.withTimeout(
            () => new Promise((resolve, reject) => {
                const req = https.request(url, options, (res) => {
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    res.on('end', () => {
                        const duration = Date.now() - startTime;
                        
                        try {
                            const parsedData = responseData ? JSON.parse(responseData) : {};
                            
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                logger.logApiCall(method, endpoint, res.statusCode, duration);
                                resolve(parsedData);
                            } else {
                                const error = new AzureDevOpsError(
                                    `API request failed: ${res.statusCode} - ${parsedData.message || responseData}`,
                                    res.statusCode,
                                    {
                                        endpoint,
                                        method,
                                        statusCode: res.statusCode,
                                        response: parsedData
                                    }
                                );
                                logger.logApiCall(method, endpoint, res.statusCode, duration, error);
                                reject(error);
                            }
                        } catch (parseError) {
                            const error = new AzureDevOpsError(
                                `Failed to parse response: ${parseError.message}`,
                                500,
                                {
                                    endpoint,
                                    method,
                                    parseError: parseError.message,
                                    rawResponse: responseData
                                }
                            );
                            logger.logApiCall(method, endpoint, res.statusCode, duration, error);
                            reject(error);
                        }
                    });
                });

                req.on('error', (error) => {
                    const duration = Date.now() - startTime;
                    const azureError = new AzureDevOpsError(
                        `Request failed: ${error.message}`,
                        500,
                        {
                            endpoint,
                            method,
                            originalError: error.message
                        }
                    );
                    logger.logApiCall(method, endpoint, 0, duration, azureError);
                    reject(azureError);
                });

                req.on('timeout', () => {
                    req.destroy();
                    const duration = Date.now() - startTime;
                    const error = new AzureDevOpsError(
                        'Request timeout',
                        408,
                        { endpoint, method, timeout: options.timeout }
                    );
                    logger.logApiCall(method, endpoint, 408, duration, error);
                    reject(error);
                });

                if (data) {
                    req.write(JSON.stringify(data));
                }

                req.end();
            }),
            options.timeout
        );
    }

    /**
     * Get pull request details
     */
    async getPullRequest(project, repositoryId, pullRequestId) {
        ErrorHandler.validateRequired({ project, repositoryId, pullRequestId }, 
            ['project', 'repositoryId', 'pullRequestId']);
        
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}`;
        return ErrorHandler.retry(() => this.makeRequest('GET', endpoint), {
            maxAttempts: 3,
            retryCondition: (error) => error.statusCode >= 500
        });
    }

    /**
     * Get pull request commits
     */
    async getPullRequestCommits(project, repositoryId, pullRequestId) {
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/commits`;
        return this.makeRequest('GET', endpoint);
    }

    /**
     * Get pull request file changes
     */
    async getPullRequestChanges(project, repositoryId, pullRequestId, iterationId = 1) {
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/iterations/${iterationId}/changes`;
        return this.makeRequest('GET', endpoint);
    }

    /**
     * Get file content at specific commit
     */
    async getFileContent(project, repositoryId, filePath, commitId) {
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/items`;
        const url = new URL(endpoint, this.baseUrl);
        url.searchParams.set('path', filePath);
        url.searchParams.set('version', commitId);
        url.searchParams.set('api-version', this.apiVersion);

        return this.makeRequest('GET', url.pathname + url.search);
    }

    /**
     * Create pull request comment thread
     */
    async createPullRequestThread(project, repositoryId, pullRequestId, threadData) {
        ErrorHandler.validateRequired({ project, repositoryId, pullRequestId, threadData }, 
            ['project', 'repositoryId', 'pullRequestId', 'threadData']);
        
        if (!threadData.comments || !Array.isArray(threadData.comments) || threadData.comments.length === 0) {
            throw new AzureDevOpsError('Thread data must contain at least one comment', 400);
        }

        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads`;
        return ErrorHandler.retry(() => this.makeRequest('POST', endpoint, threadData), {
            maxAttempts: 2,
            retryCondition: (error) => error.statusCode >= 500
        });
    }

    /**
     * Update pull request comment thread
     */
    async updatePullRequestThread(project, repositoryId, pullRequestId, threadId, threadData) {
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads/${threadId}`;
        return this.makeRequest('PATCH', endpoint, threadData);
    }

    /**
     * Get repository information
     */
    async getRepository(project, repositoryId) {
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}`;
        return this.makeRequest('GET', endpoint);
    }

    /**
     * Get project information
     */
    async getProject(projectId) {
        const endpoint = `/_apis/projects/${projectId}`;
        return this.makeRequest('GET', endpoint);
    }

    /**
     * Validate webhook signature
     */
    static validateWebhookSignature(payload, signature, secret) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }
}

module.exports = AzureDevOpsClient;
