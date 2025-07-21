# Architecture

This system automates Azure DevOps pull request reviews using Sim Studio AI.

## Components
- **Webhook Listener** receives PR events.
- **Azure API Client** fetches PR data.
- **Code Analyzer Agent** runs AI analysis on diffs.
- **Risk Assessment** scores changes.
- **Comment Generator** formats feedback.
- **Report Builder** compiles a summary and detailed review.
- **Azure DevOps Publisher** posts results back to the PR thread.
