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
    identifyComponents(featureDescription) {
        const components = [];
        const desc = featureDescription.toLowerCase();
        if (desc.includes('database') || desc.includes('schema') || desc.includes('model')) {
            components.push({
                type: 'database-schema',
                description: 'Database schema and migrations'
            });
        }
        if (desc.includes('api') || desc.includes('endpoint') || desc.includes('backend')) {
            components.push({
                type: 'api-endpoint',
                description: 'Backend API endpoint'
            });
        }
        if (desc.includes('ui') || desc.includes('frontend') || desc.includes('component') || desc.includes('dashboard')) {
            components.push({
                type: 'frontend-component',
                description: 'Frontend UI component'
            });
        }
        if (desc.includes('auth') || desc.includes('login') || desc.includes('jwt') || desc.includes('registration') || desc.includes('password')) {
            components.push({
                type: 'authentication',
                description: 'Authentication system'
            });
        }
        components.push({
            type: 'testing',
            description: 'Integration and E2E tests'
        });
        if (components.length === 1 && components[0].type === 'testing') {
            components.unshift({
                type: 'implementation',
                description: 'Core implementation'
            });
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
        const schemaTasks = tasks.filter(t => t.description.toLowerCase().includes('schema'));
        const apiEndpointTasks = tasks.filter(t => t.description.toLowerCase().includes('endpoint') ||
            t.description.toLowerCase().includes('api'));
        for (const apiTask of apiEndpointTasks) {
            apiTask.dependencies.push(...schemaTasks.map(t => t.id));
        }
        const testingTasks = tasks.filter(t => t.phase === 'testing');
        const implementationTasks = tasks.filter(t => t.phase !== 'testing');
        for (const testTask of testingTasks) {
            testTask.dependencies = implementationTasks.map(t => t.id);
        }
        const frontendTasks = tasks.filter(t => t.phase === 'frontend');
        const backendTasks = tasks.filter(t => t.phase === 'backend');
        for (const frontendTask of frontendTasks) {
            frontendTask.dependencies.push(...backendTasks.map(t => t.id));
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