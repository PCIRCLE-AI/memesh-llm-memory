# Claude Code Buddy Complete Usage Guide

**Version**: 0.1.0
**Last Updated**: 2025-12-29

## 📖 Overview

Claude Code Buddy is an intelligent multi-agent system with 36 specialized agents designed to handle diverse software development tasks. The system automatically routes your tasks to the most appropriate agent based on task analysis and learned patterns.

## 🎯 Quick Start

### Using the Smart Router (Recommended)

```
buddy_do "implement user authentication with JWT"
```

The system will:
1. Analyze your task description
2. Select the best agent automatically
3. Execute the task
4. Learn from the result

### Viewing Available Agents

```
buddy_agents
```

## 📋 All 36 Specialized Agents

### 💻 Development Agents (9)

#### 1. code-reviewer
**Purpose**: Expert code review, security analysis, and best practices validation

**Use Cases**:
- Review pull requests for quality and security
- Identify potential bugs and code smells
- Suggest improvements and refactoring opportunities
- Validate adherence to coding standards

**Example**:
```
buddy_do "review the authentication module for security issues"
```

---

#### 2. test-writer
**Purpose**: Test automation specialist, TDD expert, coverage analysis

**Use Cases**:
- Write comprehensive unit tests
- Create integration test suites
- Implement E2E tests
- Analyze test coverage and suggest improvements
- Set up testing frameworks

**Example**:
```
buddy_do "write unit tests for the UserService class"
```

---

#### 3. debugger
**Purpose**: Root cause analysis, debugging specialist, systematic troubleshooting

**Use Cases**:
- Investigate production bugs
- Trace error stack traces
- Identify performance bottlenecks
- Debug complex async issues
- Root cause analysis using systematic methodologies

**Example**:
```
buddy_do "debug why the API is returning 500 errors on user login"
```

---

#### 4. refactorer
**Purpose**: Code refactoring expert, design patterns, clean architecture

**Use Cases**:
- Refactor legacy code
- Apply design patterns (SOLID, DRY, KISS)
- Improve code maintainability
- Reduce technical debt
- Extract reusable components

**Example**:
```
buddy_do "refactor the authentication logic to use the Strategy pattern"
```

---

#### 5. api-designer
**Purpose**: API design specialist, RESTful principles, GraphQL expert

**Use Cases**:
- Design RESTful APIs
- Create GraphQL schemas
- Define API contracts and documentation
- Design endpoint naming and resource modeling
- API versioning strategies

**Example**:
```
buddy_do "design a RESTful API for the blog platform"
```

---

#### 6. db-optimizer
**Purpose**: Database optimization, query tuning, index design specialist

**Use Cases**:
- Optimize slow SQL queries
- Design efficient database schemas
- Create appropriate indexes
- Analyze query execution plans
- Database migration strategies

**Example**:
```
buddy_do "optimize the user search query that's timing out"
```

---

#### 7. frontend-specialist
**Purpose**: Frontend development, React, Vue, modern web frameworks expert

**Use Cases**:
- Build React components
- Implement responsive UIs
- State management (Redux, Context API)
- Frontend performance optimization
- Modern CSS (Tailwind, CSS-in-JS)

**Example**:
```
buddy_do "create a reusable dropdown component in React"
```

---

#### 8. backend-specialist
**Purpose**: Backend development, API design, server architecture expert

**Use Cases**:
- Build backend APIs
- Implement business logic
- Design microservices
- Server-side optimization
- Authentication and authorization

**Example**:
```
buddy_do "implement a user registration endpoint with email verification"
```

---

#### 9. development-butler
**Purpose**: Event-driven workflow automation, code maintenance, testing, dependency management, git workflow, build automation, development monitoring

**Use Cases**:
- Automate repetitive development tasks
- Set up CI/CD pipelines
- Manage dependencies and updates
- Git workflow automation
- Build process optimization

**Example**:
```
buddy_do "set up automated dependency updates with testing"
```

---

### 🔍 Analysis Agents (5)

#### 10. rag-agent
**Purpose**: Knowledge retrieval, vector search, embedding-based context search

**Use Cases**:
- Search codebase for relevant context
- Find similar code patterns
- Semantic search in documentation
- Context-aware code suggestions

**Example**:
```
buddy_do "find all authentication-related code in the codebase"
```

---

#### 11. research-agent
**Purpose**: Research specialist, investigation, comparative analysis

**Use Cases**:
- Research technology stacks
- Compare frameworks and libraries
- Investigate best practices
- Technology trend analysis

**Example**:
```
buddy_do "research and compare PostgreSQL vs MongoDB for our use case"
```

---

#### 12. architecture-agent
**Purpose**: System architecture expert, design patterns, scalability analysis

**Use Cases**:
- Design system architecture
- Evaluate architectural patterns
- Scalability planning
- Architecture documentation

**Example**:
```
buddy_do "design a microservices architecture for the e-commerce platform"
```

---

#### 13. data-analyst
**Purpose**: Data analysis, statistics, metrics, visualization specialist

**Use Cases**:
- Analyze application metrics
- Create data visualizations
- Statistical analysis
- Performance metrics analysis

**Example**:
```
buddy_do "analyze user engagement metrics from the last month"
```

---

#### 14. performance-profiler
**Purpose**: Performance profiling, optimization, bottleneck identification

**Use Cases**:
- Profile application performance
- Identify memory leaks
- Analyze CPU/memory usage
- Optimize slow operations

**Example**:
```
buddy_do "profile and optimize the dashboard loading time"
```

---

### 📚 Knowledge Agents (1)

#### 15. knowledge-agent
**Purpose**: Knowledge management, organization, information synthesis

**Use Cases**:
- Organize project documentation
- Create knowledge bases
- Synthesize information from multiple sources
- Documentation maintenance

**Example**:
```
buddy_do "create a comprehensive API documentation"
```

---

### ⚙️ Operations Agents (2)

#### 16. devops-engineer
**Purpose**: DevOps, CI/CD, infrastructure automation, deployment expert

**Use Cases**:
- Set up CI/CD pipelines
- Configure deployment automation
- Infrastructure as Code (Terraform, CloudFormation)
- Container orchestration (Docker, Kubernetes)

**Example**:
```
buddy_do "set up a GitHub Actions CI/CD pipeline for the Node.js app"
```

---

#### 17. security-auditor
**Purpose**: Security auditing, vulnerability assessment, compliance expert

**Use Cases**:
- Security vulnerability scans
- Compliance audits (OWASP, PCI-DSS)
- Penetration testing guidance
- Security best practices

**Example**:
```
buddy_do "audit the application for OWASP Top 10 vulnerabilities"
```

---

### 🎨 Creative Agents (2)

#### 18. technical-writer
**Purpose**: Technical writing, documentation, user guides, API docs expert

**Use Cases**:
- Write technical documentation
- Create user manuals
- API documentation
- README files

**Example**:
```
buddy_do "write a user guide for the new feature"
```

---

#### 19. ui-designer
**Purpose**: UI/UX design, user experience, interface design specialist

**Use Cases**:
- Design user interfaces
- Create wireframes
- UX research and analysis
- Accessibility improvements

**Example**:
```
buddy_do "design a user-friendly login page"
```

---

### 🔧 Utility Agents (2)

#### 20. migration-assistant
**Purpose**: Migration assistance, upgrade planning, legacy modernization

**Use Cases**:
- Plan system migrations
- Upgrade framework versions
- Modernize legacy code
- Database migrations

**Example**:
```
buddy_do "plan migration from Express 4 to Express 5"
```

---

#### 21. api-integrator
**Purpose**: API integration, third-party services, SDK implementation

**Use Cases**:
- Integrate third-party APIs
- Implement OAuth flows
- SDK integration
- API client generation

**Example**:
```
buddy_do "integrate Stripe payment API"
```

---

### 🤖 General Agent (1)

#### 22. general-agent
**Purpose**: Versatile AI assistant for general tasks and fallback operations

**Use Cases**:
- Handle tasks that don't fit other agents
- General programming assistance
- Fallback for complex multi-domain tasks

**Example**:
```
buddy_do "help me understand how WebSockets work"
```

---

## 🎓 Best Practices

### 1. Use Descriptive Task Descriptions

❌ Bad:
```
buddy_do "fix bug"
```

✅ Good:
```
buddy_do "fix the authentication bug where users can't login after password reset"
```

### 2. Specify Context When Needed

```
buddy_do "review the UserController.ts file for security vulnerabilities, focusing on SQL injection and XSS"
```

### 3. Leverage the Smart Router

Let the system choose the best agent:
```
buddy_do "optimize database queries"
```

The router will automatically select `db-optimizer` based on keywords.

### 4. Check Evolution Dashboard

```
buddy_dashboard
```

See which agents are performing well and learn from patterns.

## 🔄 Workflow Examples

### Feature Development Workflow

```
1. buddy_do "design API endpoints for user management"  → api-designer
2. buddy_do "implement user registration with validation" → backend-specialist
3. buddy_do "write tests for user registration"          → test-writer
4. buddy_do "review user management code"                 → code-reviewer
```

### Bug Fix Workflow

```
1. buddy_do "debug login timeout issue"                   → debugger
2. buddy_do "optimize login query performance"            → db-optimizer
3. buddy_do "write regression test for login timeout"     → test-writer
```

### Refactoring Workflow

```
1. buddy_do "analyze current architecture for scalability" → architecture-agent
2. buddy_do "refactor monolith to microservices"          → refactorer
3. buddy_do "set up CI/CD for microservices"               → devops-engineer
4. buddy_do "performance test the new architecture"        → performance-profiler
```

## 📊 Evolution System

### How It Works

1. **Pattern Learning**: System learns which agent sequences work best
2. **Auto-Routing**: Improved suggestions based on your patterns
3. **Performance Tracking**: Monitors success rates
4. **Adaptation**: Adjusts recommendations over time

### Viewing Progress

```
buddy_dashboard
```

Shows:
- Agent usage statistics
- Success rates
- Common workflows
- Performance metrics

## 💡 Tips & Tricks

### 1. Combine Agents for Complex Tasks

```
buddy_do "research best database for real-time chat, then design the schema"
```

System may route to: research-agent → db-optimizer

### 2. Use Specific Keywords

- "review" → code-reviewer
- "test" → test-writer
- "debug" → debugger
- "refactor" → refactorer
- "design API" → api-designer
- "optimize query" → db-optimizer

### 3. View All Available Agents

```
buddy_agents --category development
buddy_agents --category analysis
```

## 🆘 Troubleshooting

### Agent Not Working as Expected

1. Check task description clarity
2. Try more specific keywords
3. Manually specify agent if needed (direct tool call)
4. Check evolution dashboard for patterns

### System Not Learning

- Ensure enough tasks have been completed (>10)
- Check if bootstrap data is enabled for new users
- Review success/failure metrics

## 📚 Additional Resources

- Quick Reference: `@claude-code-buddy://quick-reference`
- Examples: `@claude-code-buddy://examples`
- Best Practices: `@claude-code-buddy://best-practices`

---

**Need Help?** The system learns from your usage patterns. The more you use it, the better the recommendations become!