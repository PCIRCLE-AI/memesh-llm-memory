/**
 * MeMesh Stats Command - Usage Statistics and Analytics
 *
 * Provides comprehensive analytics:
 * - Command usage frequency (buddy-do, buddy-remember)
 * - Entity and relation growth over time
 * - Popular entity types and search patterns
 * - Memory health metrics
 * - Visual charts and trends
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import * as asciichart from 'asciichart';
import { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { EntityType } from '../knowledge-graph/types.js';
import { logger } from '../utils/logger.js';

interface TimeRange {
  name: string;
  days: number;
}

interface EntityStats {
  type: string;
  count: number;
  percentage: number;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

interface CommandUsage {
  command: string;
  count: number;
  percentage: number;
}

interface StatsOptions {
  range?: 'day' | 'week' | 'month' | 'all';
  export?: 'json' | 'csv';
  verbose?: boolean;
}

export class StatsCommand {
  private kg: KnowledgeGraph;

  private constructor(kg: KnowledgeGraph) {
    this.kg = kg;
  }

  /**
   * Create StatsCommand instance
   */
  static async create(): Promise<StatsCommand> {
    const kg = await KnowledgeGraph.create();
    return new StatsCommand(kg);
  }

  /**
   * Run stats command
   */
  async run(options: StatsOptions = {}): Promise<void> {
    const range = options.range || 'all';

    try {
      console.log(chalk.bold.cyan('\n📊 MeMesh Usage Statistics\n'));

      // Get time range for filtering
      const timeRange = this.getTimeRange(range);

      // Collect all statistics
      const [
        totalEntities,
        totalRelations,
        entityBreakdown,
        growthData,
        topTypes,
        recentActivity,
        healthMetrics,
      ] = await Promise.all([
        this.getTotalEntities(timeRange),
        this.getTotalRelations(timeRange),
        this.getEntityBreakdown(timeRange),
        this.getGrowthData(timeRange),
        this.getTopEntityTypes(timeRange, 5),
        this.getRecentActivity(7),
        this.getHealthMetrics(),
      ]);

      // Display based on export format
      if (options.export === 'json') {
        this.exportJSON({
          timeRange: range,
          totalEntities,
          totalRelations,
          entityBreakdown,
          growthData,
          topTypes,
          recentActivity,
          healthMetrics,
        });
      } else if (options.export === 'csv') {
        this.exportCSV({
          entityBreakdown,
          growthData,
          topTypes,
        });
      } else {
        // Display formatted output
        this.displayOverview(totalEntities, totalRelations, range);
        this.displayEntityBreakdown(entityBreakdown);
        this.displayGrowthChart(growthData, range);
        this.displayTopTypes(topTypes);
        this.displayRecentActivity(recentActivity);
        this.displayHealthMetrics(healthMetrics);

        if (options.verbose) {
          await this.displayVerboseStats(timeRange);
        }
      }
    } catch (error) {
      logger.error('Stats command failed', { error });
      console.error(chalk.red('Failed to generate statistics:'), error);
      throw error;
    }
  }

  /**
   * Get time range for queries
   */
  private getTimeRange(range: string): TimeRange {
    const ranges: Record<string, TimeRange> = {
      day: { name: 'Last 24 Hours', days: 1 },
      week: { name: 'Last 7 Days', days: 7 },
      month: { name: 'Last 30 Days', days: 30 },
      all: { name: 'All Time', days: -1 },
    };

    return ranges[range] || ranges.all;
  }

  /**
   * Get total entities count
   */
  private async getTotalEntities(timeRange: TimeRange): Promise<number> {
    try {
      const query = timeRange.days === -1
        ? `SELECT COUNT(*) as count FROM entities`
        : `SELECT COUNT(*) as count FROM entities
           WHERE created_at >= datetime('now', '-${timeRange.days} days')`;

      const result = (this.kg as any).db.prepare(query).get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Failed to get total entities', { error });
      return 0;
    }
  }

  /**
   * Get total relations count
   */
  private async getTotalRelations(timeRange: TimeRange): Promise<number> {
    try {
      const query = timeRange.days === -1
        ? `SELECT COUNT(*) as count FROM relations`
        : `SELECT COUNT(*) as count FROM relations
           WHERE created_at >= datetime('now', '-${timeRange.days} days')`;

      const result = (this.kg as any).db.prepare(query).get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Failed to get total relations', { error });
      return 0;
    }
  }

  /**
   * Get entity breakdown by type
   */
  private async getEntityBreakdown(timeRange: TimeRange): Promise<EntityStats[]> {
    try {
      const query = timeRange.days === -1
        ? `SELECT type, COUNT(*) as count FROM entities GROUP BY type ORDER BY count DESC`
        : `SELECT type, COUNT(*) as count FROM entities
           WHERE created_at >= datetime('now', '-${timeRange.days} days')
           GROUP BY type ORDER BY count DESC`;

      const results = (this.kg as any).db.prepare(query).all() as Array<{ type: string; count: number }>;
      const total = results.reduce((sum, r) => sum + r.count, 0);

      return results.map(r => ({
        type: r.type,
        count: r.count,
        percentage: total > 0 ? (r.count / total) * 100 : 0,
      }));
    } catch (error) {
      logger.error('Failed to get entity breakdown', { error });
      return [];
    }
  }

  /**
   * Get growth data over time
   */
  private async getGrowthData(timeRange: TimeRange): Promise<TimeSeriesData[]> {
    try {
      const days = timeRange.days === -1 ? 30 : timeRange.days;

      const query = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM entities
        WHERE created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const results = (this.kg as any).db.prepare(query).all() as Array<{ date: string; count: number }>;
      return results;
    } catch (error) {
      logger.error('Failed to get growth data', { error });
      return [];
    }
  }

  /**
   * Get top entity types
   */
  private async getTopEntityTypes(timeRange: TimeRange, limit: number): Promise<EntityStats[]> {
    const breakdown = await this.getEntityBreakdown(timeRange);
    return breakdown.slice(0, limit);
  }

  /**
   * Get recent activity (last N days)
   */
  private async getRecentActivity(days: number): Promise<TimeSeriesData[]> {
    return this.getGrowthData({ name: `Last ${days} Days`, days });
  }

  /**
   * Get health metrics
   */
  private async getHealthMetrics(): Promise<{
    totalEntities: number;
    totalRelations: number;
    avgObservationsPerEntity: number;
    entitiesWithTags: number;
    avgRelationsPerEntity: number;
  }> {
    try {
      const totalEntities = await this.getTotalEntities({ name: 'All Time', days: -1 });
      const totalRelations = await this.getTotalRelations({ name: 'All Time', days: -1 });

      const obsQuery = `SELECT AVG(obs_count) as avg FROM (
        SELECT entity_id, COUNT(*) as obs_count FROM observations GROUP BY entity_id
      )`;
      const obsResult = (this.kg as any).db.prepare(obsQuery).get() as { avg: number };

      const tagsQuery = `SELECT COUNT(DISTINCT entity_id) as count FROM tags`;
      const tagsResult = (this.kg as any).db.prepare(tagsQuery).get() as { count: number };

      return {
        totalEntities,
        totalRelations,
        avgObservationsPerEntity: obsResult.avg || 0,
        entitiesWithTags: tagsResult.count || 0,
        avgRelationsPerEntity: totalEntities > 0 ? totalRelations / totalEntities : 0,
      };
    } catch (error) {
      logger.error('Failed to get health metrics', { error });
      return {
        totalEntities: 0,
        totalRelations: 0,
        avgObservationsPerEntity: 0,
        entitiesWithTags: 0,
        avgRelationsPerEntity: 0,
      };
    }
  }

  /**
   * Display overview section
   */
  private displayOverview(totalEntities: number, totalRelations: number, range: string): void {
    const rangeLabels: Record<string, string> = {
      day: 'Last 24 Hours',
      week: 'Last 7 Days',
      month: 'Last 30 Days',
      all: 'All Time',
    };

    console.log(chalk.bold('📈 Overview') + chalk.dim(` (${rangeLabels[range]})`));
    console.log('');

    const table = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
      colWidths: [30, 15],
      style: { head: [], border: ['dim'] },
    });

    table.push(
      ['Total Entities', chalk.green(totalEntities.toLocaleString())],
      ['Total Relations', chalk.green(totalRelations.toLocaleString())],
      ['Knowledge Density', this.calculateDensity(totalEntities, totalRelations)]
    );

    console.log(table.toString());
    console.log('');
  }

  /**
   * Calculate knowledge density score
   */
  private calculateDensity(entities: number, relations: number): string {
    if (entities === 0) return chalk.dim('N/A');

    const ratio = relations / entities;
    let rating = '';
    let color = chalk.yellow;

    if (ratio >= 2) {
      rating = 'Excellent';
      color = chalk.green;
    } else if (ratio >= 1) {
      rating = 'Good';
      color = chalk.cyan;
    } else if (ratio >= 0.5) {
      rating = 'Fair';
      color = chalk.yellow;
    } else {
      rating = 'Low';
      color = chalk.red;
    }

    return color(`${ratio.toFixed(2)} (${rating})`);
  }

  /**
   * Display entity breakdown
   */
  private displayEntityBreakdown(breakdown: EntityStats[]): void {
    if (breakdown.length === 0) {
      console.log(chalk.dim('No entities found in this time range.\n'));
      return;
    }

    console.log(chalk.bold('📊 Entity Types'));
    console.log('');

    const table = new Table({
      head: [chalk.cyan('Type'), chalk.cyan('Count'), chalk.cyan('Percentage'), chalk.cyan('Bar')],
      colWidths: [25, 10, 12, 30],
      style: { head: [], border: ['dim'] },
    });

    breakdown.forEach(stat => {
      const barLength = Math.round((stat.percentage / 100) * 20);
      const bar = chalk.cyan('█'.repeat(barLength)) + chalk.dim('░'.repeat(20 - barLength));

      table.push([
        this.formatEntityType(stat.type),
        chalk.green(stat.count.toString()),
        chalk.yellow(stat.percentage.toFixed(1) + '%'),
        bar,
      ]);
    });

    console.log(table.toString());
    console.log('');
  }

  /**
   * Format entity type for display
   */
  private formatEntityType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Display growth chart
   */
  private displayGrowthChart(data: TimeSeriesData[], range: string): void {
    if (data.length === 0) {
      console.log(chalk.dim('No growth data available.\n'));
      return;
    }

    console.log(chalk.bold('📈 Memory Growth'));
    console.log('');

    // Prepare data for chart
    const values = data.map(d => d.count);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    if (maxValue === 0) {
      console.log(chalk.dim('No entities created in this period.\n'));
      return;
    }

    // Generate ASCII chart
    const chart = asciichart.plot(values, {
      height: 10,
      format: (x: number) => (Number.isInteger(x) ? chalk.cyan(x.toFixed(0).padStart(4)) : ''),
    });

    console.log(chart);
    console.log('');

    // Display date range
    if (data.length > 0) {
      const firstDate = data[0].date;
      const lastDate = data[data.length - 1].date;
      console.log(chalk.dim(`${firstDate} to ${lastDate}`));
    }

    // Display statistics
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = total / values.length;
    console.log(chalk.dim(`Total: ${total} | Average: ${avg.toFixed(1)}/day | Peak: ${maxValue}`));
    console.log('');
  }

  /**
   * Display top entity types
   */
  private displayTopTypes(topTypes: EntityStats[]): void {
    if (topTypes.length === 0) return;

    console.log(chalk.bold('🏆 Most Used Entity Types'));
    console.log('');

    const table = new Table({
      head: [chalk.cyan('Rank'), chalk.cyan('Type'), chalk.cyan('Count'), chalk.cyan('Share')],
      colWidths: [8, 25, 10, 12],
      style: { head: [], border: ['dim'] },
    });

    topTypes.forEach((stat, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      table.push([
        medal,
        this.formatEntityType(stat.type),
        chalk.green(stat.count.toString()),
        chalk.yellow(stat.percentage.toFixed(1) + '%'),
      ]);
    });

    console.log(table.toString());
    console.log('');
  }

  /**
   * Display recent activity
   */
  private displayRecentActivity(activity: TimeSeriesData[]): void {
    if (activity.length === 0) return;

    console.log(chalk.bold('⏱️  Recent Activity (Last 7 Days)'));
    console.log('');

    const table = new Table({
      head: [chalk.cyan('Date'), chalk.cyan('New Entities'), chalk.cyan('Activity')],
      colWidths: [15, 15, 30],
      style: { head: [], border: ['dim'] },
    });

    // Show last 7 days
    activity.slice(-7).forEach(day => {
      const barLength = Math.min(20, day.count);
      const bar = chalk.green('▓'.repeat(barLength)) + chalk.dim('░'.repeat(20 - barLength));

      table.push([
        chalk.cyan(day.date),
        chalk.green(day.count.toString()),
        bar,
      ]);
    });

    console.log(table.toString());
    console.log('');
  }

  /**
   * Display health metrics
   */
  private displayHealthMetrics(metrics: {
    totalEntities: number;
    totalRelations: number;
    avgObservationsPerEntity: number;
    entitiesWithTags: number;
    avgRelationsPerEntity: number;
  }): void {
    console.log(chalk.bold('💊 Knowledge Graph Health'));
    console.log('');

    const table = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value'), chalk.cyan('Status')],
      colWidths: [30, 15, 15],
      style: { head: [], border: ['dim'] },
    });

    // Avg observations per entity
    const obsStatus = metrics.avgObservationsPerEntity >= 3 ? chalk.green('✓ Good') :
                      metrics.avgObservationsPerEntity >= 2 ? chalk.yellow('⚠ Fair') :
                      chalk.red('✗ Low');

    // Entities with tags percentage
    const tagPercentage = metrics.totalEntities > 0
      ? (metrics.entitiesWithTags / metrics.totalEntities) * 100
      : 0;
    const tagStatus = tagPercentage >= 50 ? chalk.green('✓ Good') :
                      tagPercentage >= 25 ? chalk.yellow('⚠ Fair') :
                      chalk.red('✗ Low');

    // Avg relations per entity
    const relStatus = metrics.avgRelationsPerEntity >= 2 ? chalk.green('✓ Excellent') :
                      metrics.avgRelationsPerEntity >= 1 ? chalk.cyan('✓ Good') :
                      metrics.avgRelationsPerEntity >= 0.5 ? chalk.yellow('⚠ Fair') :
                      chalk.red('✗ Low');

    table.push(
      [
        'Avg Observations/Entity',
        chalk.green(metrics.avgObservationsPerEntity.toFixed(2)),
        obsStatus,
      ],
      [
        'Entities with Tags',
        chalk.green(`${metrics.entitiesWithTags} (${tagPercentage.toFixed(1)}%)`),
        tagStatus,
      ],
      [
        'Avg Relations/Entity',
        chalk.green(metrics.avgRelationsPerEntity.toFixed(2)),
        relStatus,
      ]
    );

    console.log(table.toString());
    console.log('');

    // Health score
    const healthScore = this.calculateHealthScore(metrics);
    console.log(chalk.bold('Overall Health: ') + healthScore);
    console.log('');
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: {
    avgObservationsPerEntity: number;
    entitiesWithTags: number;
    totalEntities: number;
    avgRelationsPerEntity: number;
  }): string {
    let score = 0;

    // Observations score (0-33)
    if (metrics.avgObservationsPerEntity >= 3) score += 33;
    else if (metrics.avgObservationsPerEntity >= 2) score += 22;
    else if (metrics.avgObservationsPerEntity >= 1) score += 11;

    // Tags score (0-33)
    const tagPercentage = metrics.totalEntities > 0
      ? (metrics.entitiesWithTags / metrics.totalEntities) * 100
      : 0;
    if (tagPercentage >= 50) score += 33;
    else if (tagPercentage >= 25) score += 22;
    else if (tagPercentage >= 10) score += 11;

    // Relations score (0-34)
    if (metrics.avgRelationsPerEntity >= 2) score += 34;
    else if (metrics.avgRelationsPerEntity >= 1) score += 23;
    else if (metrics.avgRelationsPerEntity >= 0.5) score += 12;

    // Color-code the score
    let color = chalk.red;
    let rating = 'Poor';

    if (score >= 80) {
      color = chalk.green;
      rating = 'Excellent';
    } else if (score >= 60) {
      color = chalk.cyan;
      rating = 'Good';
    } else if (score >= 40) {
      color = chalk.yellow;
      rating = 'Fair';
    }

    return color(`${score}/100 (${rating})`);
  }

  /**
   * Display verbose statistics
   */
  private async displayVerboseStats(timeRange: TimeRange): Promise<void> {
    console.log(chalk.bold('🔍 Detailed Statistics'));
    console.log('');

    try {
      // Get relation types breakdown
      const relationQuery = timeRange.days === -1
        ? `SELECT relation_type, COUNT(*) as count FROM relations GROUP BY relation_type ORDER BY count DESC`
        : `SELECT relation_type, COUNT(*) as count FROM relations
           WHERE created_at >= datetime('now', '-${timeRange.days} days')
           GROUP BY relation_type ORDER BY count DESC`;

      const relations = (this.kg as any).db.prepare(relationQuery).all() as Array<{ relation_type: string; count: number }>;

      if (relations.length > 0) {
        const table = new Table({
          head: [chalk.cyan('Relation Type'), chalk.cyan('Count')],
          colWidths: [30, 15],
          style: { head: [], border: ['dim'] },
        });

        relations.forEach(r => {
          table.push([
            this.formatEntityType(r.relation_type),
            chalk.green(r.count.toString()),
          ]);
        });

        console.log(chalk.bold('Relation Types:'));
        console.log(table.toString());
        console.log('');
      }

      // Get most connected entities
      const connectedQuery = `
        SELECT e.name, e.type, COUNT(r.id) as connection_count
        FROM entities e
        LEFT JOIN relations r ON (e.id = r.from_entity_id OR e.id = r.to_entity_id)
        GROUP BY e.id
        ORDER BY connection_count DESC
        LIMIT 10
      `;

      const connected = (this.kg as any).db.prepare(connectedQuery).all() as Array<{
        name: string;
        type: string;
        connection_count: number
      }>;

      if (connected.length > 0) {
        const table = new Table({
          head: [chalk.cyan('Entity'), chalk.cyan('Type'), chalk.cyan('Connections')],
          colWidths: [30, 20, 15],
          style: { head: [], border: ['dim'] },
        });

        connected.forEach(e => {
          table.push([
            chalk.cyan(e.name.length > 28 ? e.name.slice(0, 25) + '...' : e.name),
            this.formatEntityType(e.type),
            chalk.green(e.connection_count.toString()),
          ]);
        });

        console.log(chalk.bold('Most Connected Entities:'));
        console.log(table.toString());
        console.log('');
      }
    } catch (error) {
      logger.error('Failed to display verbose stats', { error });
    }
  }

  /**
   * Export statistics as JSON
   */
  private exportJSON(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Export statistics as CSV
   */
  private exportCSV(data: {
    entityBreakdown: EntityStats[];
    growthData: TimeSeriesData[];
    topTypes: EntityStats[];
  }): void {
    console.log('Entity Type,Count,Percentage');
    data.entityBreakdown.forEach(stat => {
      console.log(`${stat.type},${stat.count},${stat.percentage.toFixed(2)}`);
    });

    console.log('\nDate,Count');
    data.growthData.forEach(point => {
      console.log(`${point.date},${point.count}`);
    });
  }
}

/**
 * Run stats command (exported for CLI use)
 */
export async function runStats(options: StatsOptions = {}): Promise<void> {
  const stats = await StatsCommand.create();
  await stats.run(options);
}
