const express = require('express');
const bodyParser = require('body-parser');
const AzureDevOpsClient = require('./azure-devops-pr-reviewer/functions/azure-devops-client');
const { summarizeChanges } = require('./azure-devops-pr-reviewer/functions/diff-analyzer');
const { buildSummary } = require('./azure-devops-pr-reviewer/functions/report-formatter');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const config = {
  organization: process.env.AZ_ORG,
  project: process.env.AZ_PROJECT,
  repository: process.env.AZ_REPO,
  patToken: process.env.AZ_PAT,
};

app.post('/api/pr', async (req, res) => {
  const prId = req.body.resource && req.body.resource.pullRequestId;
  if (!prId) {
    return res.status(400).send('Invalid payload');
  }

  const client = new AzureDevOpsClient(config);
  try {
    const pr = await client.getPullRequest(prId);
    const changes = await client.getPullRequestChanges(prId, pr.lastMergeCommit.commitId);

    const summary = summarizeChanges(changes.changes.map(c => ({
      changeType: c.changeType
    })));

    const report = buildSummary({
      ...summary,
      risk: 'Medium'
    });

    await client.createThread(prId, {
      comments: [{
        parentCommentId: 0,
        content: report,
        commentType: 1
      }]
    });
    res.status(200).send('Processed');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing PR');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
