const fetch = require('node-fetch');

class AzureDevOpsClient {
  constructor({ organization, project, repository, patToken }) {
    this.organization = organization;
    this.project = project;
    this.repository = repository;
    this.patToken = patToken;
    this.baseUrl = `https://dev.azure.com/${organization}`;
    this.apiVersion = '7.0';
  }

  async request(url, options = {}) {
    const auth = Buffer.from(`:${this.patToken}`).toString('base64');
    const headers = Object.assign({
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }, options.headers);

    const response = await fetch(url, Object.assign({}, options, { headers }));
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Azure DevOps API error ${response.status}: ${text}`);
    }
    return response.json();
  }

  async getPullRequest(prId) {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories/${this.repository}/pullrequests/${prId}?api-version=${this.apiVersion}`;
    return this.request(url);
  }

  async getPullRequestChanges(prId, iterationId) {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories/${this.repository}/pullrequests/${prId}/iterations/${iterationId}/changes?api-version=${this.apiVersion}`;
    return this.request(url);
  }

  async createThread(prId, body) {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories/${this.repository}/pullrequests/${prId}/threads?api-version=${this.apiVersion}`;
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

module.exports = AzureDevOpsClient;
