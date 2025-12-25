/**
 * Monitoring & Cost Tracking Dashboard Server
 *
 * 提供即時監控數據的 API 端點
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Orchestrator } from '../orchestrator/index.js';
import { CollaborationManager } from '../collaboration/index.js';
import { logger } from '../utils/logger.js';
import { appConfig } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DashboardServer {
  private app: express.Application;
  private orchestrator: Orchestrator;
  private collaborationManager: CollaborationManager;
  private port: number;

  constructor(port: number = appConfig.server.port + 1) {
    this.app = express();
    this.port = port;
    this.orchestrator = new Orchestrator();
    this.collaborationManager = new CollaborationManager();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private setupRoutes() {
    // 健康檢查
    this.app.get('/api/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });

    // 系統狀態
    this.app.get('/api/system/status', async (_req, res) => {
      try {
        const status = await this.orchestrator.getSystemStatus();
        res.json(status);
      } catch (error: any) {
        logger.error('Failed to get system status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 成本統計
    this.app.get('/api/costs/stats', async (_req, res) => {
      try {
        const report = this.orchestrator.getCostReport();
        const status = await this.orchestrator.getSystemStatus();

        res.json({
          report,
          stats: status.costStats,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        logger.error('Failed to get cost stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Agent 列表
    this.app.get('/api/agents', (_req, res) => {
      try {
        const agents = this.collaborationManager.getAgents().map(agent => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          capabilities: agent.capabilities.map(c => c.name),
        }));

        res.json({ agents, count: agents.length });
      } catch (error: any) {
        logger.error('Failed to get agents:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Team 列表
    this.app.get('/api/teams', (_req, res) => {
      try {
        const teams = this.collaborationManager.getTeams().map(team => ({
          id: team.id,
          name: team.name,
          description: team.description,
          memberCount: team.members.length,
          capabilities: team.capabilities,
        }));

        res.json({ teams, count: teams.length });
      } catch (error: any) {
        logger.error('Failed to get teams:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Team 效能指標
    this.app.get('/api/teams/:teamId/metrics', (req, res) => {
      try {
        const { teamId } = req.params;
        const metrics = this.collaborationManager.getTeamMetrics(teamId);

        if (!metrics) {
          res.status(404).json({ error: 'Team not found' });
          return;
        }

        res.json(metrics);
      } catch (error: any) {
        logger.error('Failed to get team metrics:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 訊息統計
    this.app.get('/api/messages/stats', (_req, res) => {
      try {
        const stats = this.collaborationManager.getMessageStats();
        res.json(stats);
      } catch (error: any) {
        logger.error('Failed to get message stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 訊息歷史
    this.app.get('/api/messages/history', (req, res) => {
      try {
        const { from, to, type, limit } = req.query;

        const filter: any = {};
        if (from) filter.from = from as string;
        if (to) filter.to = to as string;
        if (type) filter.type = type as string;

        let history = this.collaborationManager.getMessageHistory(filter);

        if (limit) {
          const limitNum = parseInt(limit as string);
          history = history.slice(0, limitNum);
        }

        res.json({
          messages: history,
          count: history.length,
        });
      } catch (error: any) {
        logger.error('Failed to get message history:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 服務 dashboard HTML
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  async start() {
    try {
      await this.collaborationManager.initialize();

      this.app.listen(this.port, () => {
        logger.info(`🎨 Dashboard server running on http://localhost:${this.port}`);
        logger.info(`📊 Open your browser and visit: http://localhost:${this.port}`);
      });
    } catch (error) {
      logger.error('Failed to start dashboard server:', error);
      throw error;
    }
  }

  async stop() {
    await this.collaborationManager.shutdown();
    logger.info('Dashboard server stopped');
  }
}

// 直接執行時啟動 server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new DashboardServer();
  server.start().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}
