/**
 * Azure DevOps API Client
 * Handles all interactions with Azure DevOps REST API
 */

const https = require('https');
const { URL } = require('url');

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
        const url = new URL(endpoint, this.baseUrl);
        url.searchParams.set('api-version', this.apiVersion);

        const options = {
            method,
            headers: {
                'Authorization': `Basic ${Buffer.from(`:${this.pat}`).toString('base64')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'PR-Review-System/1.0'
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsedData = responseData ? JSON.parse(responseData) : {};
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsedData);
                        } else {
                            reject(new Error(`API request failed: ${res.statusCode} - ${parsedData.message || responseData}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Get pull request details
     */
    async getPullRequest(project, repositoryId, pullRequestId) {
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}`;
        return this.makeRequest('GET', endpoint);
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
        const endpoint = `/${project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads`;
        return this.makeRequest('POST', endpoint, threadData);
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
