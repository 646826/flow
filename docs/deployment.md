# Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Azure DevOps PR Reviewer system in various environments, from development to production.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.x or higher
- **npm/yarn**: Package manager
- **Git**: Version control system
- **Azure DevOps**: Organization with API access
- **OpenAI API**: Access to GPT-4 (or compatible LLM)

### Required Permissions

- **Azure DevOps**: 
  - Code (read)
  - Pull Request (read/write)
  - Project and team (read)
- **OpenAI**: API access with sufficient quota
- **Infrastructure**: Deployment permissions for target environment

## Environment Setup

### 1. Local Development

#### Clone Repository

```bash
git clone https://github.com/your-org/azure-devops-pr-reviewer.git
cd azure-devops-pr-reviewer
```

#### Install Dependencies

```bash
npm install
# or
yarn install
```

#### Environment Configuration

Create `.env` file:

```bash
# Azure DevOps Configuration
AZURE_DEVOPS_ORGANIZATION=your-organization
AZURE_DEVOPS_PAT=your-personal-access-token

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
PORT=3000

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=json
```

#### Start Development Server

```bash
npm run dev
# or
yarn dev
```

### 2. Docker Deployment

#### Build Docker Image

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

```bash
docker build -t azure-devops-pr-reviewer:latest .
```

#### Run Container

```bash
docker run -d \
  --name pr-reviewer \
  -p 3000:3000 \
  --env-file .env \
  azure-devops-pr-reviewer:latest
```

### 3. Production Deployment

#### Environment Variables

```bash
# Production settings
NODE_ENV=production
LOG_LEVEL=info
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
```

#### Health Checks

```bash
# Health check endpoints
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
READINESS_CHECK_PATH=/ready
```

## Azure DevOps Setup

### Personal Access Token (PAT)

1. Navigate to Azure DevOps → Personal access tokens
2. Create New Token with scopes:
   - **Code**: Read & write
   - **Pull Request**: Read & write
   - **Project and team**: Read
3. Copy token and store in `AZURE_DEVOPS_PAT` environment variable

### Webhook Configuration

1. Go to Project Settings → Service hooks
2. Create subscription for "Web Hooks"
3. Configure:
   - **Event**: Pull request created, Pull request updated
   - **URL**: `https://your-domain.com/webhook/pr`
   - **Secret**: Use same value as `WEBHOOK_SECRET`

## Monitoring & Troubleshooting

### Health Checks

```bash
# Check application health
curl https://your-domain.com/health

# Check readiness
curl https://your-domain.com/ready
```

### Common Issues

- **Invalid PAT**: Verify token permissions and expiration
- **Webhook failures**: Check webhook URL and secret configuration
- **OpenAI errors**: Verify API key and quota limits
- **Memory issues**: Monitor resource usage and adjust limits

For detailed configuration options, see [Configuration Guide](configuration.md).
