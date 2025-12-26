/**
 * Specialized Teams Integration Tests
 *
 * Tests for the 4 new specialized teams:
 * - Code Development Team
 * - Research & Analysis Team
 * - Quality Assurance Team
 * - Orchestration & Optimization Team
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageBus } from '../collaboration/MessageBus.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
import {
  createCodeDevelopmentTeam,
  createResearchAnalysisTeam,
  createQualityAssuranceTeam,
  createOrchestrationTeam,
  createAllTeams,
  CODE_DEV_TEAM_USE_CASES,
  RESEARCH_TEAM_USE_CASES,
  QA_TEAM_USE_CASES,
  ORCHESTRATION_TEAM_USE_CASES,
  TEAM_SELECTION_GUIDE,
} from './index.js';
import type { CollaborativeTask } from '../collaboration/types.js';

describe('Specialized Teams', () => {
  let messageBus: MessageBus;
  let teamCoordinator: TeamCoordinator;

  beforeEach(() => {
    messageBus = new MessageBus();
    teamCoordinator = new TeamCoordinator(messageBus);
  });

  describe('Code Development Team', () => {
    it('should create code development team with correct capabilities', () => {
      const team = createCodeDevelopmentTeam({ teamCoordinator });

      expect(team.name).toBe('Code Development Team');
      expect(team.capabilities).toContain('code-review');
      expect(team.capabilities).toContain('security-audit');
      expect(team.capabilities).toContain('performance-analysis');
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.metadata?.domain).toBe('software-development');
    });

    it('should match code review use case', () => {
      const team = createCodeDevelopmentTeam({ teamCoordinator });

      const task: CollaborativeTask = {
        id: 'task-1',
        description: 'Review user authentication code',
        requiredCapabilities: ['code-review', 'security-audit'],
        status: 'pending',
      };

      const selectedTeam = teamCoordinator.selectTeamForTask(task);
      expect(selectedTeam).toBeDefined();
      expect(selectedTeam?.id).toBe(team.id);
    });

    it('should provide use cases with cost estimates', () => {
      expect(CODE_DEV_TEAM_USE_CASES.code_review).toBeDefined();
      expect(CODE_DEV_TEAM_USE_CASES.security_audit).toBeDefined();
      expect(CODE_DEV_TEAM_USE_CASES.performance_optimization).toBeDefined();
      expect(CODE_DEV_TEAM_USE_CASES.comprehensive_review).toBeDefined();

      // Verify cost estimates are reasonable
      expect(CODE_DEV_TEAM_USE_CASES.code_review.estimatedCost).toBeLessThan(0.20);
      expect(CODE_DEV_TEAM_USE_CASES.code_review.estimatedTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Research & Analysis Team', () => {
    it('should create research team with correct capabilities', () => {
      const team = createResearchAnalysisTeam({ teamCoordinator });

      expect(team.name).toBe('Research & Analysis Team');
      expect(team.capabilities).toContain('technical-research');
      expect(team.capabilities).toContain('competitive-analysis');
      expect(team.capabilities).toContain('best-practices');
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.metadata?.domain).toBe('research-analysis');
    });

    it('should match technology evaluation use case', () => {
      const team = createResearchAnalysisTeam({ teamCoordinator });

      const task: CollaborativeTask = {
        id: 'task-2',
        description: 'Evaluate new AI framework options',
        requiredCapabilities: ['technical-research', 'competitive-analysis'],
        status: 'pending',
      };

      const selectedTeam = teamCoordinator.selectTeamForTask(task);
      expect(selectedTeam).toBeDefined();
      expect(selectedTeam?.id).toBe(team.id);
    });

    it('should provide research use cases', () => {
      expect(RESEARCH_TEAM_USE_CASES.technology_evaluation).toBeDefined();
      expect(RESEARCH_TEAM_USE_CASES.market_research).toBeDefined();
      expect(RESEARCH_TEAM_USE_CASES.best_practices_research).toBeDefined();
      expect(RESEARCH_TEAM_USE_CASES.competitive_intelligence).toBeDefined();
    });
  });

  describe('Quality Assurance Team', () => {
    it('should create QA team with correct capabilities', () => {
      const team = createQualityAssuranceTeam({ teamCoordinator });

      expect(team.name).toBe('Quality Assurance Team');
      expect(team.capabilities).toContain('code-review');
      expect(team.capabilities).toContain('security-audit');
      expect(team.capabilities).toContain('performance-analysis');
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.metadata?.domain).toBe('quality-assurance');
    });

    it('should match comprehensive QA use case', () => {
      const team = createQualityAssuranceTeam({ teamCoordinator });

      const task: CollaborativeTask = {
        id: 'task-3',
        description: 'Full QA before production release',
        requiredCapabilities: ['code-review', 'security-audit', 'performance-analysis'],
        status: 'pending',
      };

      const selectedTeam = teamCoordinator.selectTeamForTask(task);
      expect(selectedTeam).toBeDefined();
      expect(selectedTeam?.id).toBe(team.id);
    });

    it('should provide QA use cases', () => {
      expect(QA_TEAM_USE_CASES.comprehensive_qa).toBeDefined();
      expect(QA_TEAM_USE_CASES.security_audit).toBeDefined();
      expect(QA_TEAM_USE_CASES.performance_testing).toBeDefined();
      expect(QA_TEAM_USE_CASES.pre_release_check).toBeDefined();
    });
  });

  describe('Orchestration & Optimization Team', () => {
    it('should create orchestration team with correct capabilities', () => {
      const team = createOrchestrationTeam({ teamCoordinator });

      expect(team.name).toBe('Orchestration & Optimization Team');
      expect(team.capabilities).toContain('analyze_architecture');
      expect(team.capabilities).toContain('suggest_improvements');
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.metadata?.domain).toBe('orchestration-optimization');
    });

    it('should match architecture review use case', () => {
      const team = createOrchestrationTeam({ teamCoordinator });

      const task: CollaborativeTask = {
        id: 'task-4',
        description: 'Review system architecture and suggest improvements',
        requiredCapabilities: ['analyze_architecture', 'suggest_improvements'],
        status: 'pending',
      };

      const selectedTeam = teamCoordinator.selectTeamForTask(task);
      expect(selectedTeam).toBeDefined();
      expect(selectedTeam?.id).toBe(team.id);
    });

    it('should provide orchestration use cases', () => {
      expect(ORCHESTRATION_TEAM_USE_CASES.architecture_analysis).toBeDefined();
      expect(ORCHESTRATION_TEAM_USE_CASES.improvement_suggestions).toBeDefined();
      expect(ORCHESTRATION_TEAM_USE_CASES.architecture_review).toBeDefined();
      expect(ORCHESTRATION_TEAM_USE_CASES.optimization_planning).toBeDefined();
    });
  });

  describe('Team Creation Utilities', () => {
    it('should create all teams at once', async () => {
      const teams = await createAllTeams({ teamCoordinator });

      expect(teams.codeDevelopment).toBeDefined();
      expect(teams.researchAnalysis).toBeDefined();
      expect(teams.qualityAssurance).toBeDefined();
      expect(teams.orchestration).toBeDefined();

      // Verify all teams are registered
      const allTeams = teamCoordinator.getTeams();
      expect(allTeams.length).toBe(4);
    });

    it('should provide team selection guide', () => {
      expect(TEAM_SELECTION_GUIDE['feature-development']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['technical-research']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['performance-optimization']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['security-audit']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['cost-optimization']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['code-refactoring']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['competitive-analysis']).toBeDefined();
      expect(TEAM_SELECTION_GUIDE['pre-release-validation']).toBeDefined();

      // Verify guide structure
      const guide = TEAM_SELECTION_GUIDE['feature-development'];
      expect(guide.primaryTeam).toBe('codeDevelopment');
      expect(guide.supportTeams).toContain('qualityAssurance');
      expect(guide.description).toBeDefined();
    });
  });

  describe('Team Collaboration', () => {
    it('should support multiple teams working on different capabilities', () => {
      const codingTeam = createCodeDevelopmentTeam({ teamCoordinator });
      const researchTeam = createResearchAnalysisTeam({ teamCoordinator });
      const qaTeam = createQualityAssuranceTeam({ teamCoordinator });
      const orchestrationTeam = createOrchestrationTeam({ teamCoordinator });

      // Task requiring research + implementation
      const researchTask: CollaborativeTask = {
        id: 'research-task',
        description: 'Research best authentication practices',
        requiredCapabilities: ['technical-research', 'best-practices'],
        status: 'pending',
      };

      // Task requiring code review
      const reviewTask: CollaborativeTask = {
        id: 'review-task',
        description: 'Review authentication code',
        requiredCapabilities: ['code-review', 'security-audit'],
        status: 'pending',
      };

      // Task requiring QA
      const qaTask: CollaborativeTask = {
        id: 'qa-task',
        description: 'Security audit of authentication',
        requiredCapabilities: ['security-audit', 'performance-analysis'],
        status: 'pending',
      };

      // Task requiring architecture analysis
      const archTask: CollaborativeTask = {
        id: 'arch-task',
        description: 'Analyze authentication architecture',
        requiredCapabilities: ['analyze_architecture', 'suggest_improvements'],
        status: 'pending',
      };

      const selectedResearch = teamCoordinator.selectTeamForTask(researchTask);
      const selectedReview = teamCoordinator.selectTeamForTask(reviewTask);
      const selectedQA = teamCoordinator.selectTeamForTask(qaTask);
      const selectedArch = teamCoordinator.selectTeamForTask(archTask);

      // Verify teams are selected (ID doesn't matter since teams may share capabilities)
      expect(selectedResearch).toBeDefined();
      expect(selectedReview).toBeDefined();
      expect(selectedQA).toBeDefined();
      expect(selectedArch).toBeDefined();

      // Verify correct team types are selected
      expect(selectedResearch?.metadata?.domain).toBe('research-analysis');
      expect([codingTeam.id, qaTeam.id]).toContain(selectedReview?.id); // Both have code-review
      expect([codingTeam.id, qaTeam.id]).toContain(selectedQA?.id); // Both have security-audit
      expect(selectedArch?.metadata?.domain).toBe('orchestration-optimization');
    });
  });

  describe('Team Customization', () => {
    it('should support custom team names and descriptions', () => {
      const team = createCodeDevelopmentTeam({
        teamCoordinator,
        name: 'Custom Dev Team',
        description: 'Custom description for dev team',
      });

      expect(team.name).toBe('Custom Dev Team');
      expect(team.description).toBe('Custom description for dev team');
    });
  });
});
