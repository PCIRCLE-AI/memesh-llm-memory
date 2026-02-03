export class TaskDecomposer {
    decompose(request) {
        const components = this.identifyComponents(request.featureDescription);
        const tasks = [];
        let taskIdCounter = 1;
        for (const component of components) {
            const componentTasks = this.breakIntoAtomicTasks(component, taskIdCounter);
            tasks.push(...componentTasks);
            taskIdCounter += componentTasks.length;
        }
        this.linkDependencies(tasks);
        this.assignPhases(tasks);
        return tasks;
    }
    static COMPONENT_RULES = [
        { type: 'database-schema', description: 'Database schema and migrations', keywords: ['database', 'schema', 'model'] },
        { type: 'api-endpoint', description: 'Backend API endpoint', keywords: ['api', 'endpoint', 'backend'] },
        { type: 'frontend-component', description: 'Frontend UI component', keywords: ['ui', 'frontend', 'component', 'dashboard'] },
        { type: 'authentication', description: 'Authentication system', keywords: ['auth', 'login', 'jwt', 'registration', 'password'] },
    ];
    identifyComponents(featureDescription) {
        const desc = featureDescription.toLowerCase();
        const components = TaskDecomposer.COMPONENT_RULES
            .filter(rule => rule.keywords.some(keyword => desc.includes(keyword)))
            .map(rule => ({ type: rule.type, description: rule.description }));
        components.push({ type: 'testing', description: 'Integration and E2E tests' });
        if (components.length === 1) {
            components.unshift({ type: 'implementation', description: 'Core implementation' });
        }
        return components;
    }
    breakIntoAtomicTasks(component, startId) {
        const tasks = [];
        switch (component.type) {
            case 'database-schema':
                tasks.push(this.createTask(`task-${startId}`, 'Define database schema and create migration', 'backend', [
                    'Write test for schema validation',
                    'Run test to verify it fails',
                    'Define schema structure',
                    'Create migration file',
                    'Run test to verify it passes',
                    'Commit changes'
                ]));
                break;
            case 'api-endpoint':
                tasks.push(this.createTask(`task-${startId}`, 'Create API endpoint stub', 'backend', [
                    'Write test for endpoint response',
                    'Run test to verify it fails',
                    'Create endpoint stub',
                    'Run test to verify it passes',
                    'Commit changes'
                ]), this.createTask(`task-${startId + 1}`, 'Implement API endpoint logic', 'backend', [
                    'Write test for business logic',
                    'Run test to verify it fails',
                    'Implement endpoint logic',
                    'Run test to verify it passes',
                    'Commit changes'
                ]));
                break;
            case 'frontend-component':
                tasks.push(this.createTask(`task-${startId}`, 'Create frontend component structure', 'frontend', [
                    'Write test for component rendering',
                    'Run test to verify it fails',
                    'Create component structure',
                    'Run test to verify it passes',
                    'Commit changes'
                ]), this.createTask(`task-${startId + 1}`, 'Implement frontend component logic', 'frontend', [
                    'Write test for component interactions',
                    'Run test to verify it fails',
                    'Implement component logic',
                    'Run test to verify it passes',
                    'Commit changes'
                ]));
                break;
            case 'authentication':
                tasks.push(this.createTask(`task-${startId}`, 'Implement JWT token generation', 'backend', [
                    'Write test for token generation',
                    'Run test (expect fail)',
                    'Implement token generation',
                    'Run test (expect pass)',
                    'Commit token logic',
                ]), this.createTask(`task-${startId + 1}`, 'Implement token validation', 'backend', [
                    'Write test for token validation',
                    'Run test (expect fail)',
                    'Implement validation logic',
                    'Run test (expect pass)',
                    'Commit validation',
                ], [`task-${startId}`]));
                break;
            case 'testing':
                tasks.push(this.createTask(`task-${startId}`, 'Create integration tests', 'testing', [
                    'Write integration test scenarios',
                    'Run test to verify setup',
                    'Implement test cases',
                    'Run test to verify all pass',
                    'Commit changes'
                ]));
                break;
            default:
                tasks.push(this.createTask(`task-${startId}`, `Implement ${component.description}`, 'backend', [
                    'Write test for functionality',
                    'Run test to verify it fails',
                    'Implement core logic',
                    'Run test to verify it passes',
                    'Commit changes'
                ]));
                break;
        }
        return tasks;
    }
    createTask(id, description, phase, steps, dependencies = []) {
        return {
            id,
            description,
            estimatedDuration: '2-5 minutes',
            testable: true,
            steps,
            dependencies,
            phase
        };
    }
    linkDependencies(tasks) {
        const findByPhase = (phase) => tasks.filter(t => t.phase === phase);
        const findByKeyword = (keyword) => tasks.filter(t => t.description.toLowerCase().includes(keyword));
        const getIds = (taskList) => taskList.map(t => t.id);
        const schemaTaskIds = getIds(findByKeyword('schema'));
        const apiEndpointTasks = [...findByKeyword('endpoint'), ...findByKeyword('api')];
        for (const apiTask of apiEndpointTasks) {
            apiTask.dependencies.push(...schemaTaskIds);
        }
        const implementationTaskIds = getIds(tasks.filter(t => t.phase !== 'testing'));
        for (const testTask of findByPhase('testing')) {
            testTask.dependencies = implementationTaskIds;
        }
        const backendTaskIds = getIds(findByPhase('backend'));
        for (const frontendTask of findByPhase('frontend')) {
            frontendTask.dependencies.push(...backendTaskIds);
        }
    }
    assignPhases(tasks) {
    }
    identifyPhases(tasks) {
        const phases = new Set();
        for (const task of tasks) {
            if (task.phase) {
                phases.add(task.phase);
            }
        }
        return Array.from(phases);
    }
}
//# sourceMappingURL=TaskDecomposer.js.map