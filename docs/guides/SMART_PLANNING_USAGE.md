# Smart-Planning System - Usage Guide

## Overview

The Smart-Planning System generates intelligent implementation plans that combine agent-aware task breakdown, learned patterns from past successes, and TDD-first development workflow.

## How It Works

### 1. Feature Input

Provide:
- **Feature Description** (required): What you want to build
- **Requirements** (optional): Specific requirements or constraints
- **Project Context** (optional): Project type, tech stack, complexity

### 2. Intelligent Analysis

The system:
1. Analyzes feature requirements
2. Identifies required agent capabilities
3. Retrieves learned patterns from LearningManager
4. Breaks feature into bite-sized tasks (2-5 min each)
5. Assigns appropriate agents to each task
6. Identifies dependencies between tasks
7. Generates TDD workflow for each task

### 3. Plan Generation

Output includes:
- **Title & Goal**: Clear feature name and purpose
- **Architecture**: High-level technical approach
- **Tech Stack**: Recommended technologies
- **Tasks**: Bite-sized implementation tasks with:
  - ID, description, priority
  - Estimated duration (2-5 minutes)
  - Suggested agent (based on capabilities)
  - 5-step TDD workflow
  - File operations (create/modify/test)
  - Dependencies

## MCP Tool Usage

### `generate-smart-plan`

Generate implementation plan from feature description.

**Input:**
```json
{
  "featureDescription": "Add user authentication with JWT tokens",
  "requirements": [
    "Secure password hashing",
    "Token expiration",
    "Refresh token support"
  ],
  "constraints": {
    "projectType": "backend-api",
    "techStack": ["Node.js", "Express", "JWT", "bcrypt"],
    "complexity": "medium"
  }
}
```

**Output:**
```markdown
# Add User Authentication Implementation Plan

**Goal:** Implement secure JWT-based authentication

**Architecture:** Token-based auth with bcrypt hashing

**Tech Stack:** Node.js, Express, JWT, bcrypt

**Tasks:**

1. Implement JWT token generation (2-5 min, high priority)
   - Agent: backend-developer
   - Steps: [5-step TDD workflow]
   - Files: Create src/auth/jwt.ts, tests/unit/jwt.test.ts

2. Implement token validation (2-5 min, high priority)
   - Agent: backend-developer
   - Dependencies: task-1
   - Steps: [5-step TDD workflow]

[Additional tasks...]

**Total Estimated Time:** 12-30 minutes
```

## Best Practices

1. **Provide Context**: More context = better agent assignment and pattern matching
2. **Trust Agent Assignments**: Based on proven capability mapping
3. **Follow TDD Workflow**: Each task has 5-step TDD structure for quality
4. **Respect Dependencies**: Execute tasks in dependency order
5. **Track Outcomes**: Feedback improves future plans via Evolution System

## Integration with Subagent-Driven Development

**Recommended Workflow:**
1. Generate plan with `generate-smart-plan`
2. Use `superpowers:subagent-driven-development` to execute
3. Fresh subagent per task with two-stage review
4. Continuous learning feeds back to LearningManager

## Configuration

### Complexity Levels

- **Low**: Simple CRUD operations, configuration changes (3-5 tasks)
- **Medium**: Feature additions, integrations, refactoring (5-10 tasks)
- **High**: Architecture changes, multi-system features (10+ tasks)

### Agent Capability Mapping

System automatically maps task keywords to agents:
- `security`, `authentication`, `authorization` → Security Auditor
- `test`, `coverage`, `TDD` → Test Automator
- `review`, `quality`, `refactor` → Code Reviewer
- `API`, `endpoint`, `REST` → API Designer
- `frontend`, `UI`, `component` → Frontend Developer
- `database`, `schema`, `migration` → Backend Developer

## Troubleshooting

### "No agent assigned to task"

**Cause**: Task description doesn't match any agent capability keywords.

**Solution**: Provide more specific task description or manually assign agent after generation.

### "Too many tasks generated"

**Cause**: Feature description is too broad.

**Solution**: Break feature into smaller sub-features and plan separately.

### "Dependencies seem incorrect"

**Cause**: Automatic dependency detection based on phase ordering.

**Solution**: Review and adjust dependencies manually if needed. Frontend tasks automatically depend on backend tasks.

## Learning and Adaptation

The system learns from:
- **Successful Plans**: Task structure, agent assignments, execution order
- **Failed Approaches**: Anti-patterns, problematic dependencies
- **User Feedback**: Manual adjustments, rejected suggestions
- **Completion Quality**: Test pass rates, review scores, bug rates

Learned patterns are stored and applied to future plans automatically.

## Example: Full Feature Implementation

### Input

```json
{
  "featureDescription": "Add user profile management with avatar upload",
  "requirements": [
    "Profile CRUD operations",
    "Image upload with validation",
    "Profile picture resizing",
    "Update notifications"
  ],
  "constraints": {
    "projectType": "fullstack-web",
    "techStack": ["Node.js", "React", "PostgreSQL", "AWS S3"],
    "complexity": "medium"
  }
}
```

### Generated Plan

```markdown
# User Profile Management Implementation Plan

**Goal:** Implement complete user profile management with avatar upload

**Architecture:** RESTful API with S3 storage, React frontend with form validation

**Tech Stack:** Node.js, Express, PostgreSQL, React, AWS S3, Sharp (image processing)

**Tasks:**

### Backend Phase

1. **Create user profile database schema** (2-5 min, high)
   - Agent: backend-developer
   - TDD Steps:
     1. Write migration test
     2. Run test (expect fail)
     3. Create migration file
     4. Run test (expect pass)
     5. Commit schema changes
   - Files: Create migrations/001_user_profiles.sql, tests/migrations/001.test.ts
   - Dependencies: None

2. **Implement profile CRUD API endpoints** (2-5 min, high)
   - Agent: api-designer
   - TDD Steps:
     1. Write API endpoint tests
     2. Run tests (expect fail)
     3. Implement GET/PUT/DELETE /api/profile
     4. Run tests (expect pass)
     5. Commit API endpoints
   - Files: Create src/routes/profile.ts, tests/api/profile.test.ts
   - Dependencies: task-1

3. **Implement image upload endpoint** (2-5 min, medium)
   - Agent: backend-developer
   - TDD Steps:
     1. Write upload test with mock S3
     2. Run test (expect fail)
     3. Implement POST /api/profile/avatar
     4. Run test (expect pass)
     5. Commit upload logic
   - Files: Create src/services/upload.ts, tests/services/upload.test.ts
   - Dependencies: task-2

4. **Add image processing and validation** (2-5 min, medium)
   - Agent: backend-developer
   - TDD Steps:
     1. Write validation tests (size, format, dimensions)
     2. Run tests (expect fail)
     3. Implement Sharp resizing and validation
     4. Run tests (expect pass)
     5. Commit image processing
   - Files: Modify src/services/upload.ts, tests/services/upload.test.ts
   - Dependencies: task-3

### Frontend Phase

5. **Create profile form component** (2-5 min, medium)
   - Agent: frontend-developer
   - TDD Steps:
     1. Write component render tests
     2. Run tests (expect fail)
     3. Implement ProfileForm component
     4. Run tests (expect pass)
     5. Commit component
   - Files: Create src/components/ProfileForm.tsx, tests/components/ProfileForm.test.tsx
   - Dependencies: task-2

6. **Implement avatar upload UI** (2-5 min, medium)
   - Agent: ui-designer
   - TDD Steps:
     1. Write upload interaction tests
     2. Run tests (expect fail)
     3. Implement AvatarUpload component
     4. Run tests (expect pass)
     5. Commit upload UI
   - Files: Create src/components/AvatarUpload.tsx, tests/components/AvatarUpload.test.tsx
   - Dependencies: task-3, task-5

7. **Add client-side validation** (2-5 min, low)
   - Agent: frontend-developer
   - TDD Steps:
     1. Write validation tests
     2. Run tests (expect fail)
     3. Implement form validation
     4. Run tests (expect pass)
     5. Commit validation
   - Files: Modify src/components/ProfileForm.tsx, tests/components/ProfileForm.test.tsx
   - Dependencies: task-5, task-6

### Testing Phase

8. **Add E2E profile update tests** (2-5 min, medium)
   - Agent: test-automator
   - TDD Steps:
     1. Write E2E test scenarios
     2. Run tests (expect fail if no implementation)
     3. Fix any integration issues
     4. Run tests (expect pass)
     5. Commit E2E tests
   - Files: Create tests/e2e/profile.test.ts
   - Dependencies: task-7

9. **Security review for upload endpoints** (2-5 min, high)
   - Agent: security-auditor
   - Steps:
     1. Review authentication checks
     2. Verify file type validation
     3. Check size limits enforcement
     4. Test malicious file handling
     5. Document security findings
   - Files: Review src/services/upload.ts, src/routes/profile.ts
   - Dependencies: task-4

### Documentation Phase

10. **Update API documentation** (2-5 min, low)
    - Agent: api-designer
    - Steps:
      1. Document new endpoints
      2. Add request/response examples
      3. Include error cases
      4. Update OpenAPI spec
      5. Commit documentation
    - Files: Modify docs/API.md, swagger.yaml
    - Dependencies: task-2, task-3

**Total Estimated Time:** 20-50 minutes
**Critical Path:** task-1 → task-2 → task-3 → task-4 → task-9
**Parallel Opportunities:** task-5/task-6 can start after task-2
```

### Pattern Learning

After completing this plan, the system learns:
- **Successful Pattern**: "Profile + upload features require backend → frontend → E2E → security sequence"
- **Agent Effectiveness**: Which agents performed best for which tasks
- **Dependency Patterns**: Backend API must complete before frontend integration
- **Best Practices**: Security review before deployment, E2E after integration

Next time a similar feature is requested (e.g., "Add document upload"), the system will:
- Apply learned task structure
- Suggest similar agent assignments
- Recommend proven dependency ordering
- Include security review automatically

## Advanced Usage

### Custom Agent Mapping

Override default agent assignments:

```json
{
  "featureDescription": "Add payment processing",
  "constraints": {
    "agentOverrides": {
      "payment-integration": "backend-developer",
      "security-audit": "security-auditor"
    }
  }
}
```

### Learning from Feedback

Track plan execution outcomes:

```typescript
// After completing tasks
await recordPlanOutcome({
  planId: 'auth-implementation-001',
  outcome: {
    successRate: 0.9,
    averageTaskDuration: 4.5,
    issuesEncountered: ['dependency ordering'],
    improvements: ['Add DB migration task earlier']
  }
});
```

### Integration with Evolution System

Smart-Planning automatically:
- Retrieves patterns with ≥75% success rate
- Filters patterns with ≥5 observations
- Applies domain-relevant patterns only
- Updates patterns after plan completion

## Metrics and Monitoring

Track planning effectiveness:
- **Plan Success Rate**: Percentage of plans completed successfully
- **Average Task Duration**: Actual vs estimated task time
- **Agent Assignment Accuracy**: How often suggested agents were used
- **Dependency Accuracy**: How often dependencies were correct
- **Pattern Application Rate**: How often learned patterns were applied

Access metrics via Evolution Dashboard:
```
evolution_dashboard - View all system metrics including Smart-Planning
```

## Summary

**Smart-Planning System = Agent-Aware + Pattern Learning + TDD-First**

**Key Benefits:**
- 🎯 Automatic agent assignment based on capabilities
- 🧠 Learns from successful implementations
- ⚡ Bite-sized tasks (2-5 minutes each)
- ✅ Built-in TDD workflow
- 🔗 Automatic dependency management
- 📈 Continuous improvement via Evolution System

**Best For:**
- Feature implementation planning
- Refactoring large systems
- Learning best practices
- Onboarding new developers
- Maintaining consistency across projects

**Not Suitable For:**
- Exploratory coding (use manual planning)
- Very simple tasks (just code directly)
- Highly creative work (requires human judgment)
