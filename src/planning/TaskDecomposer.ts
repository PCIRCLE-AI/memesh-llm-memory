/**
 * TaskDecomposer - Breaks down features into bite-sized, testable tasks (2-5 minutes each)
 */

export interface DecomposedTask {
  id: string;
  description: string;
  estimatedDuration: '2-5 minutes';
  testable: boolean;
  steps: string[];
  dependencies: string[];
  phase?: string;
  files?: string[];
}

export interface DecompositionRequest {
  featureDescription: string;
  scope?: {
    includeTests?: boolean;
    includeDocs?: boolean;
  };
  existingContext?: {
    relatedFiles?: string[];
    relatedTasks?: string[];
  };
}

type ComponentType =
  | 'database-schema'
  | 'api-endpoint'
  | 'frontend-component'
  | 'authentication'
  | 'testing'
  | 'implementation';

interface Component {
  type: ComponentType;
  description: string;
}

export class TaskDecomposer {
  /**
   * Main decomposition method - breaks feature into bite-sized tasks
   */
  decompose(request: DecompositionRequest): DecomposedTask[] {
    // 1. Identify high-level components
    const components = this.identifyComponents(request.featureDescription);

    // 2. Break each component into atomic tasks
    const tasks: DecomposedTask[] = [];
    let taskIdCounter = 1;

    for (const component of components) {
      const componentTasks = this.breakIntoAtomicTasks(component, taskIdCounter);
      tasks.push(...componentTasks);
      taskIdCounter += componentTasks.length;
    }

    // 3. Link dependencies
    this.linkDependencies(tasks);

    // 4. Assign phases (already done during task creation)
    this.assignPhases(tasks);

    return tasks;
  }

  /**
   * Identify high-level components from feature description
   */
  private identifyComponents(featureDescription: string): Component[] {
    const components: Component[] = [];
    const desc = featureDescription.toLowerCase();

    // Database schema
    if (desc.includes('database') || desc.includes('schema') || desc.includes('model')) {
      components.push({
        type: 'database-schema',
        description: 'Database schema and migrations'
      });
    }

    // API endpoint
    if (desc.includes('api') || desc.includes('endpoint') || desc.includes('backend')) {
      components.push({
        type: 'api-endpoint',
        description: 'Backend API endpoint'
      });
    }

    // Frontend component
    if (desc.includes('ui') || desc.includes('frontend') || desc.includes('component') || desc.includes('dashboard')) {
      components.push({
        type: 'frontend-component',
        description: 'Frontend UI component'
      });
    }

    // Authentication
    if (desc.includes('auth') || desc.includes('login') || desc.includes('jwt') || desc.includes('registration') || desc.includes('password')) {
      components.push({
        type: 'authentication',
        description: 'Authentication system'
      });
    }

    // Always include testing
    components.push({
      type: 'testing',
      description: 'Integration and E2E tests'
    });

    // If only testing, add implementation first
    if (components.length === 1 && components[0].type === 'testing') {
      components.unshift({
        type: 'implementation',
        description: 'Core implementation'
      });
    }

    return components;
  }

  /**
   * Break component into atomic 2-5 minute tasks
   */
  private breakIntoAtomicTasks(component: Component, startId: number): DecomposedTask[] {
    const tasks: DecomposedTask[] = [];

    switch (component.type) {
      case 'database-schema':
        tasks.push(this.createTask(
          `task-${startId}`,
          'Define database schema and create migration',
          'backend',
          [
            'Write test for schema validation',
            'Run test to verify it fails',
            'Define schema structure',
            'Create migration file',
            'Run test to verify it passes',
            'Commit changes'
          ]
        ));
        break;

      case 'api-endpoint':
        tasks.push(
          this.createTask(
            `task-${startId}`,
            'Create API endpoint stub',
            'backend',
            [
              'Write test for endpoint response',
              'Run test to verify it fails',
              'Create endpoint stub',
              'Run test to verify it passes',
              'Commit changes'
            ]
          ),
          this.createTask(
            `task-${startId + 1}`,
            'Implement API endpoint logic',
            'backend',
            [
              'Write test for business logic',
              'Run test to verify it fails',
              'Implement endpoint logic',
              'Run test to verify it passes',
              'Commit changes'
            ]
          )
        );
        break;

      case 'frontend-component':
        tasks.push(
          this.createTask(
            `task-${startId}`,
            'Create frontend component structure',
            'frontend',
            [
              'Write test for component rendering',
              'Run test to verify it fails',
              'Create component structure',
              'Run test to verify it passes',
              'Commit changes'
            ]
          ),
          this.createTask(
            `task-${startId + 1}`,
            'Implement frontend component logic',
            'frontend',
            [
              'Write test for component interactions',
              'Run test to verify it fails',
              'Implement component logic',
              'Run test to verify it passes',
              'Commit changes'
            ]
          )
        );
        break;

      case 'authentication':
        tasks.push(
          this.createTask(
            `task-${startId}`,
            'Implement JWT token generation',
            'backend',
            [
              'Write test for token generation',
              'Run test (expect fail)',
              'Implement token generation',
              'Run test (expect pass)',
              'Commit token logic',
            ]
          ),
          this.createTask(
            `task-${startId + 1}`,
            'Implement token validation',
            'backend',
            [
              'Write test for token validation',
              'Run test (expect fail)',
              'Implement validation logic',
              'Run test (expect pass)',
              'Commit validation',
            ],
            [`task-${startId}`] // Token validation depends on token generation
          )
        );
        break;

      case 'testing':
        tasks.push(this.createTask(
          `task-${startId}`,
          'Create integration tests',
          'testing',
          [
            'Write integration test scenarios',
            'Run test to verify setup',
            'Implement test cases',
            'Run test to verify all pass',
            'Commit changes'
          ]
        ));
        break;

      default: // 'implementation' or other
        tasks.push(this.createTask(
          `task-${startId}`,
          `Implement ${component.description}`,
          'backend',
          [
            'Write test for functionality',
            'Run test to verify it fails',
            'Implement core logic',
            'Run test to verify it passes',
            'Commit changes'
          ]
        ));
        break;
    }

    return tasks;
  }

  /**
   * Helper to create a standardized task
   */
  private createTask(
    id: string,
    description: string,
    phase: string,
    steps: string[]
  ): DecomposedTask {
    return {
      id,
      description,
      estimatedDuration: '2-5 minutes',
      testable: true,
      steps,
      dependencies: [],
      phase
    };
  }

  /**
   * Link dependencies between tasks
   */
  private linkDependencies(tasks: DecomposedTask[]): void {
    // Find schema tasks
    const schemaTasks = tasks.filter(t => t.description.toLowerCase().includes('schema'));

    // API endpoint tasks depend on schema tasks
    const apiEndpointTasks = tasks.filter(t =>
      t.description.toLowerCase().includes('endpoint') ||
      t.description.toLowerCase().includes('api')
    );

    for (const apiTask of apiEndpointTasks) {
      apiTask.dependencies.push(...schemaTasks.map(t => t.id));
    }

    // Testing tasks depend on ALL implementation tasks
    const testingTasks = tasks.filter(t => t.phase === 'testing');
    const implementationTasks = tasks.filter(t => t.phase !== 'testing');

    for (const testTask of testingTasks) {
      testTask.dependencies = implementationTasks.map(t => t.id);
    }

    // Frontend tasks depend on ALL backend tasks
    const frontendTasks = tasks.filter(t => t.phase === 'frontend');
    const backendTasks = tasks.filter(t => t.phase === 'backend');

    for (const frontendTask of frontendTasks) {
      frontendTask.dependencies.push(...backendTasks.map(t => t.id));
    }
  }

  /**
   * Assign phases to tasks (already done during creation, this is a no-op)
   */
  private assignPhases(tasks: DecomposedTask[]): void {
    // Phases are already assigned during task creation
    // This method exists for future expansion if needed
  }

  /**
   * PUBLIC method to identify unique phases from tasks
   */
  identifyPhases(tasks: DecomposedTask[]): string[] {
    const phases = new Set<string>();
    for (const task of tasks) {
      if (task.phase) {
        phases.add(task.phase);
      }
    }
    return Array.from(phases);
  }
}
