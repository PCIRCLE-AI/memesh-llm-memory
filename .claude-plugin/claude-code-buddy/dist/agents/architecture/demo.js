import { CollaborationManager } from '../../collaboration/index.js';
import { ArchitectureAgent } from './ArchitectureAgent.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
export async function runArchitectureTeamDemo() {
    logger.info('🚀 Starting System Architecture Team Demo...');
    const manager = new CollaborationManager();
    await manager.initialize();
    const seniorArchitect = new ArchitectureAgent({
        name: 'Senior System Architect',
        systemPrompt: `You are a senior system architect with 15+ years of experience.
Focus on scalability, reliability, and maintainability.
Provide pragmatic solutions with clear trade-offs.`,
    });
    const securityArchitect = new ArchitectureAgent({
        name: 'Security Architect',
        systemPrompt: `You are a security architect specializing in:
- Authentication and authorization
- Data encryption
- API security
- OWASP Top 10
Prioritize security best practices and compliance.`,
    });
    const performanceArchitect = new ArchitectureAgent({
        name: 'Performance Architect',
        systemPrompt: `You are a performance optimization expert focusing on:
- Database query optimization
- Caching strategies
- Load balancing
- CDN and edge computing
Provide data-driven optimization recommendations.`,
    });
    manager.registerAgent(seniorArchitect);
    manager.registerAgent(securityArchitect);
    manager.registerAgent(performanceArchitect);
    logger.info(`✅ Registered ${manager.getAgents().length} agents`);
    const archTeam = await manager.createTeam({
        name: 'System Architecture Team',
        description: 'Expert team for system design and architecture analysis',
        members: [seniorArchitect.id, securityArchitect.id, performanceArchitect.id],
        leader: seniorArchitect.id,
        capabilities: [
            'analyze_architecture',
            'suggest_improvements',
            'evaluate_technology',
        ],
    });
    logger.info(`✅ Created team: ${archTeam.name} (${archTeam.members.length} members)`);
    const analysisTask = {
        id: uuidv4(),
        description: 'Analyze and improve the architecture of a social media application',
        requiredCapabilities: [
            'analyze_architecture',
            'suggest_improvements',
            'evaluate_technology',
        ],
        status: 'pending',
        context: {
            currentArchitecture: {
                frontend: 'React SPA',
                backend: 'Node.js + Express',
                database: 'MongoDB',
                caching: 'Redis',
                deployment: 'AWS EC2',
                traffic: '100k DAU, 10M requests/day',
            },
            constraints: {
                budget: 'Medium (5-10K USD/month)',
                team: '5 engineers',
                timeline: '3 months for migration',
            },
            painPoints: [
                'Slow response time during peak hours (> 2s)',
                'Database queries hitting performance limits',
                'High server costs',
                'Difficulty scaling horizontally',
            ],
        },
    };
    logger.info(`📋 Executing task: ${analysisTask.description}`);
    const session = await manager.executeTask(analysisTask);
    logger.info('\n' + '='.repeat(80));
    logger.info('📊 COLLABORATION SESSION RESULTS');
    logger.info('='.repeat(80));
    logger.info(`\nSession ID: ${session.id}`);
    logger.info(`Team: ${session.team.name}`);
    logger.info(`Status: ${session.results.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    logger.info(`Duration: ${session.results.durationMs}ms`);
    logger.info(`Cost: $${session.results.cost.toFixed(4)}`);
    if (session.results.success && session.results.output) {
        logger.info('\n📝 Analysis Results:');
        logger.info('-'.repeat(80));
        session.results.output.forEach((result, index) => {
            logger.info(`\n[${index + 1}/${session.results.output?.length}] ${result}`);
        });
    }
    if (session.results.error) {
        logger.error(`\n❌ Error: ${session.results.error}`);
    }
    const metrics = manager.getTeamMetrics(archTeam.id);
    if (metrics) {
        logger.info('\n' + '='.repeat(80));
        logger.info('📈 TEAM PERFORMANCE METRICS');
        logger.info('='.repeat(80));
        logger.info(`Tasks Completed: ${metrics.tasksCompleted}`);
        logger.info(`Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
        logger.info(`Average Duration: ${metrics.averageDurationMs.toFixed(0)}ms`);
        logger.info(`Total Cost: $${metrics.totalCost.toFixed(4)}`);
        logger.info('\nAgent Utilization:');
        Object.entries(metrics.agentUtilization).forEach(([agentId, utilization]) => {
            const agent = manager.getAgents().find(a => a.id === agentId);
            logger.info(`  ${agent?.name}: ${utilization.toFixed(1)}%`);
        });
    }
    const messageStats = manager.getMessageStats();
    logger.info('\n' + '='.repeat(80));
    logger.info('💬 MESSAGE STATISTICS');
    logger.info('='.repeat(80));
    logger.info(`Total Messages: ${messageStats.totalMessages}`);
    logger.info(`Active Subscribers: ${messageStats.activeSubscribers}`);
    await manager.shutdown();
    logger.info('\n✅ Demo completed successfully!');
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runArchitectureTeamDemo()
        .then(() => {
        process.exit(0);
    })
        .catch(error => {
        logger.error('Demo failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=demo.js.map