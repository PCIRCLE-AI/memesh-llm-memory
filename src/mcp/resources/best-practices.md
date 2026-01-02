# Claude Code Buddy Best Practices

**Version**: 0.1.0

## 🎯 Core Principles

### 1. Let the System Learn

**❌ Don't**:
- Force specific agents for every task
- Bypass the smart router constantly
- Ignore evolution suggestions

**✅ Do**:
- Use `buddy_do` and let the router choose
- Review evolution dashboard regularly
- Trust the learned patterns
- Provide feedback when results are unexpected

**Why**: The system improves with usage. The more you use the smart router, the better it gets at routing.

---

### 2. Write Clear, Descriptive Tasks

**❌ Don't**:
```bash
buddy_do "fix bug"
buddy_do "add feature"
buddy_do "make it faster"
```

**✅ Do**:
```bash
buddy_do "fix authentication bug where JWT tokens expire immediately after login"
buddy_do "add email verification to user registration with 24-hour expiry"
buddy_do "optimize dashboard SQL query reducing load time from 5s to under 1s"
```

**Why**: Specific descriptions help the router select the best agent and provide better context for execution.

---

### 3. Provide Context

**❌ Don't**:
```bash
buddy_do "review code"  # Which code? What aspects?
```

**✅ Do**:
```bash
buddy_do "review UserController.ts focusing on security vulnerabilities, input validation, and error handling"
```

**Why**: Context enables more focused and valuable agent work.

---

## 📋 Task Description Guidelines

### Structure of a Good Task Description

```
[Action] + [Target] + [Context/Requirements]
```

**Examples**:

| Action | Target | Context | Full Task |
|--------|--------|---------|-----------|
| debug | login endpoint | timeout after password check | debug login endpoint timeout occurring after password verification step |
| implement | user search | pagination and filters | implement user search API with pagination, name filter, and role filter |
| optimize | dashboard query | reduce from 5s to 1s | optimize dashboard analytics query currently taking 5s with N+1 problem |
| review | payment integration | security and edge cases | review Stripe payment integration for security issues and edge case handling |

---

### Include Constraints and Requirements

**❌ Vague**:
```bash
buddy_do "add caching"
```

**✅ Specific**:
```bash
buddy_do "add Redis caching to product API with 5-minute TTL and cache invalidation on product updates"
```

**Include**:
- Performance targets
- Security requirements
- Error handling expectations
- Edge cases to consider
- Business rules

---

## 🔄 Workflow Best Practices

### Feature Development Sequence

**Recommended Flow**:
1. **Design** (api-designer / architecture-agent)
2. **Implement** (frontend-specialist / backend-specialist)
3. **Test** (test-writer)
4. **Review** (code-reviewer)
5. **Deploy** (devops-engineer)

**Example**:
```bash
buddy_do "design API endpoints for blog post management (CRUD operations)"
buddy_do "implement blog post API with validation, authentication, and authorization"
buddy_do "write comprehensive tests for blog API covering CRUD, auth, and edge cases"
buddy_do "review blog API code for security, performance, and best practices"
buddy_do "set up CI/CD pipeline for blog service deployment"
```

---

### Bug Fixing Sequence

**Recommended Flow**:
1. **Debug** (debugger)
2. **Fix** (appropriate specialist)
3. **Verify** (debugger / test-writer)
4. **Test** (test-writer)

**Example**:
```bash
buddy_do "debug checkout failure where payment succeeds but order is not created"
buddy_do "fix order creation race condition in payment webhook handler"
buddy_do "write regression test for payment webhook race condition"
```

---

### Refactoring Sequence

**Recommended Flow**:
1. **Analyze** (code-reviewer / architecture-agent)
2. **Plan** (refactorer / architecture-agent)
3. **Implement** (refactorer)
4. **Test** (test-writer)
5. **Verify** (code-reviewer)

**Example**:
```bash
buddy_do "analyze UserService class for code smells and refactoring opportunities"
buddy_do "refactor UserService to separate concerns using repository pattern and service layer"
buddy_do "write tests for refactored UserService maintaining 100% code coverage"
buddy_do "review refactored code ensuring improved maintainability"
```

---

## 🎓 Agent Selection Guidelines

### When to Use Which Agent

#### Development Tasks

**Frontend Work** → **frontend-specialist**
- Building React/Vue components
- State management
- Responsive design
- Frontend performance

**Backend Work** → **backend-specialist**
- Business logic
- API implementation
- Authentication/Authorization
- Server-side validation

**Both Frontend + Backend** → **general-agent** or split into tasks

---

#### Quality Assurance

**Code Review** → **code-reviewer**
- Pull request reviews
- Security audits
- Best practice validation
- Code quality checks

**Testing** → **test-writer**
- Unit tests
- Integration tests
- E2E tests
- Test coverage improvement

**Debugging** → **debugger**
- Production bugs
- Error investigation
- Performance issues
- Root cause analysis

---

#### Optimization

**Database** → **db-optimizer**
- Slow queries
- Schema design
- Index optimization
- Query plan analysis

**Application Performance** → **performance-profiler**
- Memory leaks
- CPU bottlenecks
- Load testing
- Performance profiling

**Frontend Performance** → **frontend-specialist**
- Bundle size
- Lazy loading
- Rendering optimization
- Asset optimization

---

#### Architecture & Design

**System Architecture** → **architecture-agent**
- Microservices design
- Scalability planning
- Architecture documentation
- System design

**API Design** → **api-designer**
- RESTful APIs
- GraphQL schemas
- API contracts
- Endpoint design

**UI/UX Design** → **ui-designer**
- Interface design
- User experience
- Wireframes
- Accessibility

---

## 💡 Pro Tips

### 1. Chain Related Tasks

Instead of one giant task:
```bash
❌ buddy_do "implement complete user management system with registration, login, profile, password reset, email verification, and admin panel"
```

Break into logical steps:
```bash
✅ buddy_do "design user management API endpoints"
✅ buddy_do "implement user registration with validation"
✅ buddy_do "implement login with JWT authentication"
✅ buddy_do "implement profile management"
✅ buddy_do "implement password reset flow"
✅ buddy_do "write comprehensive tests for user management"
```

**Why**: Better agent selection, clearer results, easier debugging

---

### 2. Use Evolution Dashboard

```bash
buddy_dashboard
```

**Look for**:
- Which agent sequences work best
- Success/failure patterns
- Common workflows
- Performance metrics

**Adjust based on**:
- High-success patterns → repeat them
- Low-success patterns → modify approach
- Unused agents → explore new use cases

---

### 3. Keyword Optimization

Use keywords that trigger the right agent:

| Goal | Keywords to Include |
|------|---------------------|
| Code Review | review, audit, security, best practices |
| Testing | test, coverage, TDD, unit test, integration |
| Debugging | debug, error, bug, trace, investigate |
| Optimization | optimize, performance, slow, improve speed |
| Refactoring | refactor, clean up, patterns, improve structure |
| Design | design, architecture, API, endpoints, schema |

---

### 4. Provide Success Criteria

**❌ Vague**:
```bash
buddy_do "improve performance"
```

**✅ Clear Success Criteria**:
```bash
buddy_do "improve homepage load time from 3s to under 1s measured by Lighthouse performance score"
```

**Benefits**:
- Agent knows when task is complete
- Clear verification method
- Evolution system learns what "success" means

---

## 🚫 Common Mistakes to Avoid

### 1. Over-Specifying Agent

**❌ Don't**:
```bash
# Forcing wrong agent via direct tool call
code-reviewer "write unit tests"  # Wrong! Use test-writer
```

**✅ Do**:
```bash
buddy_do "write unit tests for authentication"  # Let router choose
```

---

### 2. Under-Describing Context

**❌ Don't**:
```bash
buddy_do "fix the thing"
buddy_do "add that feature we discussed"
```

**✅ Do**:
```bash
buddy_do "fix race condition in order creation where concurrent requests create duplicate orders"
buddy_do "add dark mode toggle to settings page with localStorage persistence"
```

---

### 3. Ignoring Evolution Patterns

**❌ Don't**:
- Manually route every task
- Ignore dashboard suggestions
- Skip pattern review

**✅ Do**:
- Check `buddy_dashboard` regularly
- Notice successful patterns
- Adapt workflow based on learning

---

### 4. Batch Unrelated Tasks

**❌ Don't**:
```bash
buddy_do "implement login, fix checkout bug, optimize database, and write documentation"
```

**✅ Do**:
```bash
buddy_do "implement JWT-based login with refresh tokens"
buddy_do "debug checkout payment processing timeout"
buddy_do "optimize product search query with proper indexes"
buddy_do "write API documentation for user endpoints"
```

---

## 📊 Measuring Success

### Key Metrics to Track

1. **Task Success Rate**
   - View in `buddy_dashboard --metrics`
   - Target: >90% success rate

2. **Agent Selection Accuracy**
   - Are tasks going to the right agent?
   - Check via `buddy_dashboard --patterns`

3. **Time to Completion**
   - Are tasks completing faster over time?
   - Evolution should improve efficiency

4. **Pattern Emergence**
   - Are common workflows being recognized?
   - Check `buddy_dashboard --patterns`

---

### Continuous Improvement

**Weekly Review**:
```bash
buddy_dashboard --timeframe week
```

**Questions to Ask**:
- Which agents are most/least used?
- What workflows are most successful?
- Where are failures happening?
- How can task descriptions improve?

**Adjustments**:
- Refine task descriptions
- Try new agent combinations
- Experiment with workflows

---

## 🎯 Advanced Techniques

### 1. Sequential Task Planning

For complex features, plan the full sequence:

```bash
# 1. Architecture
buddy_do "design microservices architecture for order processing system"

# 2. Database
buddy_do "design PostgreSQL schema for orders, products, and inventory"

# 3. API
buddy_do "design REST API endpoints for order management"

# 4. Implementation
buddy_do "implement order creation API with inventory validation"

# 5. Testing
buddy_do "write integration tests for order creation flow"

# 6. Review
buddy_do "review order system for race conditions and edge cases"

# 7. Deploy
buddy_do "set up CI/CD for order service with staging environment"
```

---

### 2. Iterative Refinement

Use agent output to refine next task:

```bash
# Initial
buddy_do "design user management API"
# → Output suggests using OAuth

# Refined
buddy_do "research OAuth 2.0 implementation best practices for user management"
# → Output recommends specific libraries

# Implemented
buddy_do "implement user authentication using OAuth 2.0 with passport.js"
```

---

### 3. Parallel Tracks

For independent features:

```bash
# Track 1: Frontend
buddy_do "implement user profile UI with React hooks"

# Track 2: Backend (parallel)
buddy_do "implement user profile API endpoints"

# Track 3: Testing (parallel)
buddy_do "write E2E tests for user profile"

# Merge point
buddy_do "integrate frontend and backend for user profile"
```

---

## 📚 Resources

### Quick Access

```bash
buddy_agents                  # View all agents
buddy_dashboard               # Check evolution
buddy_skills                  # List available skills
```

### Documentation

- Full Guide: `@claude-code-buddy://usage-guide`
- Quick Lookup: `@claude-code-buddy://quick-reference`
- Real Examples: `@claude-code-buddy://examples`

---

## 🎓 Final Recommendations

1. **Start Simple**: Begin with single tasks, then chain them
2. **Be Descriptive**: Clear descriptions = better results
3. **Trust the System**: Let the router learn your patterns
4. **Review Regularly**: Check dashboard weekly
5. **Iterate**: Refine task descriptions based on results
6. **Experiment**: Try different agent combinations
7. **Learn**: Study successful patterns in evolution dashboard

**Remember**: Claude Code Buddy gets smarter the more you use it. Every task helps the system learn your preferences and improve routing accuracy!