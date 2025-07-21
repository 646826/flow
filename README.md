# flow

# **Technical Requirements: Automated Pull Request Review System**

## **Project Objective**
Create an automated system for analyzing and reviewing pull requests in Azure DevOps using Sim Studio AI, which will provide detailed code assessment, identify issues, and give improvement recommendations.

## **Source Data**
- **Platform**: Azure DevOps
- **Example URL structure**: `https://{organization}.visualstudio.com/{project}/_git/{repository}/pullrequest/{id}`
- **Automation Tool**: Sim Studio AI

## **Technical Context**

### **Azure DevOps REST API**
```
Base URL: https://dev.azure.com/{organization}/_apis/
Auth: Personal Access Token (PAT)
API Version: 7.0

Key endpoints:
- GET /git/repositories/{repositoryId}/pullrequests/{pullRequestId}
- GET /git/repositories/{repositoryId}/pullrequests/{pullRequestId}/iterations/{iterationId}/changes
- POST /git/repositories/{repositoryId}/pullrequests/{pullRequestId}/threads
```

### **PR Data Structure**
```json
{
  "pullRequestId": number,
  "title": string,
  "description": string,
  "sourceRefName": string,
  "targetRefName": string,
  "status": "active|completed|abandoned",
  "createdBy": { "displayName": string },
  "reviewers": [],
  "labels": [],
  "workItemRefs": []
}
```

### **Changes Data**
```json
{
  "changes": [
    {
      "item": { "path": string },
      "changeType": "add|edit|delete",
      "contents": { "content": string, "contentType": string }
    }
  ]
}
```

## **Quality Code Review Criteria**

### **Architectural Aspects**
- SOLID principles compliance
- Proper design patterns usage
- Separation of concerns
- Modularity and reusability

### **Code Quality**
- Readability and clarity
- Naming conventions adherence
- Absence of code smells
- Performance and optimization
- Error handling and validation

### **Security**
- Vulnerability checks (SQL injection, XSS, CSRF)
- Input validation
- Access control management
- Secure API usage

### **Testing**
- Unit test coverage
- Test scenario quality
- Integration tests
- Edge case testing

### **Documentation**
- Complex logic comments
- API documentation
- README updates
- Changelog entries

## **System Requirements**

### **Functional Requirements**
1. **Automatic trigger** on PR creation/update
2. **Diff analysis** - detailed change breakdown
3. **Contextual analysis** - understanding file relationships
4. **Summary generation** - brief change overview
5. **Detailed comments** - specific code remarks
6. **Risk assessment** - potential issue identification
7. **Recommendations** - improvement suggestions

### **Technical Requirements**
1. **Azure DevOps API integration**
2. **Multiple file type processing** (JS, TS, C#, CSS, HTML, JSON, etc.)
3. **Scalability** - large PR handling
4. **Performance** - reasonable review time
5. **Configurability** - project-specific rules

## **Sim Studio AI Workflow Structure**

### **Core Blocks**
1. **Webhook Listener** - receive PR notifications
2. **Azure DevOps API Client** - fetch PR data
3. **Code Analyzer Agent** - LLM-powered code analysis
4. **Risk Assessment** - risk evaluation
5. **Comment Generator** - create comments
6. **Report Builder** - compile final report
7. **Azure DevOps Publisher** - publish results

### **Integrations**
- **Azure DevOps REST API** for data retrieval and submission
- **GitHub/OpenAI** for LLM-powered code analysis
- **Memory/Database** for context and rules storage

## **Output Format**

### **Summary (Brief Overview)**
```
📊 PR Analysis Summary
• Files changed: X
• Lines added/removed: +X/-X
• Risk level: Low/Medium/High
• Key changes: Brief description
• Recommendations: Top 3 items
```

### **Detailed Review**
```
🔍 Detailed Code Review

📋 Architecture & Design
• [✅/⚠️/❌] Assessment with explanation

🛡️ Security Review  
• [✅/⚠️/❌] Assessment with specific findings

⚡ Performance Analysis
• [✅/⚠️/❌] Assessment with recommendations

🧪 Testing Coverage
• [✅/⚠️/❌] Assessment with gaps identified
```

## **Industry Best Practices**

### **Automated Review**
- SonarQube patterns for code quality
- ESLint/TSLint rules for JavaScript/TypeScript
- Security scanning (Snyk, OWASP)
- Performance profiling recommendations

### **Human-Centric Approach**
- Constructive feedback instead of negativity
- Specific improvement examples
- Links to best practices and documentation
- Issue prioritization (critical/major/minor)

## **Additional Considerations**

### **Configuration**
- Project-specific rule customization
- Legacy code exceptions
- Team-specific profiles
- Review effectiveness A/B testing

### **Process Integration**
- Critical issue merge blocking
- CI/CD pipeline integration
- Teams/Slack notifications
- Code quality metrics

### **Extensibility**
- Custom rules support
- External tool integration
- Third-party integration APIs
- Machine learning for accuracy improvement

## **Context for Implementation**

### **Sim Studio AI Capabilities to Leverage**
- **Function Blocks** for API calls and data processing
- **Agent Blocks** for intelligent code analysis
- **API Blocks** for Azure DevOps integration
- **Router/Condition Blocks** for workflow logic
- **Memory Blocks** for context retention

### **Data Flow Architecture**
```
Webhook → Fetch PR Data → Extract Changes → 
Analyze Code → Assess Risks → Generate Comments → 
Compile Report → Post to Azure DevOps
```

### **Error Handling Requirements**
- API rate limiting management
- Large file processing optimization
- Network failure recovery
- Invalid code handling

### **Security Considerations**
- PAT token secure storage
- Code content encryption
- Access logging
- Data retention policies

### **Configuration Variables**
```yaml
azure_devops:
  organization: "{your-organization}"
  project: "{your-project}"
  repository: "{your-repository}"
  pat_token: "{secure-token}"
  
review_settings:
  max_file_size: 1MB
  supported_extensions: [".js", ".ts", ".cs", ".css", ".html", ".json"]
  analysis_depth: "detailed"
  auto_approve_threshold: 0.95
```

---

**Task**: Design the architecture and create an implementation plan for this system using Sim Studio AI capabilities, considering all listed requirements and context for any Azure DevOps organization.
