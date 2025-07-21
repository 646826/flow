# Configuration Guide

## Overview

This guide provides detailed information on configuring the Azure DevOps PR Reviewer system for your specific environment and requirements.

## Environment Variables

### Required Configuration

#### Azure DevOps Settings

```bash
# Azure DevOps organization name
AZURE_DEVOPS_ORGANIZATION=your-organization-name

# Personal Access Token with appropriate permissions
AZURE_DEVOPS_PAT=your-personal-access-token

# Optional: Specific Azure DevOps URL (defaults to https://dev.azure.com)
AZURE_DEVOPS_URL=https://dev.azure.com
```

#### AI/LLM Configuration

```bash
# OpenAI API configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=4000
```

#### Webhook Configuration

```bash
# Webhook secret for signature validation
WEBHOOK_SECRET=your-webhook-secret

# Server configuration
PORT=3000
HOST=0.0.0.0

# Optional: Custom webhook path
WEBHOOK_PATH=/webhook/pr
```

### Optional Configuration

#### Logging Settings

```bash
# Log level: debug, info, warn, error
LOG_LEVEL=info

# Log format: json, text
LOG_FORMAT=json

# Log file path (optional)
LOG_FILE=/var/log/pr-reviewer.log
```

#### External Integrations

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#code-reviews

# Microsoft Teams notifications
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

## Configuration Files

### Review Rules (`config/review-rules.yaml`)

Controls how the system evaluates pull requests:

```yaml
global_settings:
  enabled: true
  auto_approve_threshold: 2
  block_merge_threshold: 8
  require_human_review_threshold: 6
```

### Security Patterns (`config/security-patterns.yaml`)

Defines security vulnerability detection patterns:

```yaml
sql_injection:
  enabled: true
  severity: "critical"
  patterns:
    - name: "Dynamic SQL Construction"
      regex: '(?i)(select|insert|update|delete)\s+.*\+.*\$'
      languages: ["javascript", "typescript", "python"]
```

### Quality Metrics (`config/quality-metrics.yaml`)

Sets code quality thresholds and metrics:

```yaml
complexity:
  cyclomatic_complexity:
    enabled: true
    thresholds:
      low: 5
      medium: 10
      high: 15
      critical: 20
```

## Customization

### Adding Custom Security Patterns

1. Edit `config/security-patterns.yaml`
2. Add your pattern under the appropriate category
3. Update `config/review-rules.yaml` to include the new pattern

### Modifying Quality Thresholds

1. Edit `config/quality-metrics.yaml`
2. Adjust thresholds for your team's standards
3. Test with sample PRs to validate settings

### Custom Comment Templates

1. Edit `workflows/blocks/comment-generator.yaml`
2. Modify templates to match your team's style
3. Add new comment types as needed

## Integration Setup

### Slack Integration

1. Create Slack webhook URL
2. Set `SLACK_WEBHOOK_URL` environment variable
3. Configure channel and formatting preferences

### Teams Integration

1. Create Teams webhook URL
2. Set `TEAMS_WEBHOOK_URL` environment variable
3. Customize notification format

## Troubleshooting

### Common Configuration Issues

- **Invalid Azure DevOps PAT**: Check token permissions and expiration
- **Webhook delivery failures**: Verify URL and secret configuration
- **OpenAI API errors**: Check API key and quota limits
- **Configuration validation errors**: Validate YAML syntax

### Debug Configuration

```bash
# Enable debug logging
LOG_LEVEL=debug
DEBUG_ENABLED=true

# Verbose output
VERBOSE_LOGGING=true
LOG_REQUEST_DETAILS=true
```

For deployment instructions, see [Deployment Guide](deployment.md).
For system architecture details, see [Architecture Documentation](architecture.md).
