#!/usr/bin/env tsx

/**
 * Terminal UI Component Library Reference
 *
 * Demonstrates all common UI patterns for claude-code-buddy dashboard
 *
 * Run: npx tsx examples/component-library.tsx
 */

import React, { useState } from 'react';
import { render, Box, Text, Newline } from 'ink';
import Spinner from 'ink-spinner';
import chalk from 'chalk';

// ============================================================================
// 1. STATUS INDICATORS
// ============================================================================

const StatusIndicators: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>Status Indicators:</Text>
    <Box>
      <Text color="green">✓</Text>
      <Text> Success</Text>
    </Box>
    <Box>
      <Text color="red">✗</Text>
      <Text> Error</Text>
    </Box>
    <Box>
      <Text color="yellow">⚠</Text>
      <Text> Warning</Text>
    </Box>
    <Box>
      <Text color="cyan"><Spinner type="dots" /></Text>
      <Text> Running</Text>
    </Box>
    <Box>
      <Text dimColor>○</Text>
      <Text> Pending</Text>
    </Box>
  </Box>
);

// ============================================================================
// 2. PROGRESS BARS
// ============================================================================

interface ProgressBarProps {
  label: string;
  progress: number;
  width?: number;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  progress,
  width = 20,
  color = 'cyan'
}) => {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text>{label}: </Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {progress}%</Text>
    </Box>
  );
};

const ProgressBars: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>Progress Bars:</Text>
    <ProgressBar label="Task 1" progress={100} color="green" />
    <ProgressBar label="Task 2" progress={75} color="cyan" />
    <ProgressBar label="Task 3" progress={50} color="yellow" />
    <ProgressBar label="Task 4" progress={25} color="magenta" />
    <ProgressBar label="Task 5" progress={0} color="gray" />
  </Box>
);

// ============================================================================
// 3. TASK CARDS
// ============================================================================

interface Task {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  agent?: string;
  duration?: string;
}

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const statusConfig = {
    pending: { icon: '○', color: 'gray' as const },
    running: { icon: <Spinner type="dots" />, color: 'cyan' as const },
    complete: { icon: '✓', color: 'green' as const },
    error: { icon: '✗', color: 'red' as const },
  };

  const config = statusConfig[task.status];

  return (
    <Box borderStyle="round" borderColor={config.color} paddingX={1} marginY={0}>
      <Box flexDirection="column" width={50}>
        <Box>
          <Text color={config.color} bold>{config.icon}</Text>
          <Text bold> {task.name}</Text>
        </Box>
        <Box>
          <Text dimColor>  Agent: {task.agent || 'N/A'}</Text>
        </Box>
        <Box>
          <Text dimColor>  Progress: </Text>
          <Text color={config.color}>{task.progress}%</Text>
          {task.duration && <Text dimColor> ({task.duration})</Text>}
        </Box>
      </Box>
    </Box>
  );
};

const TaskCards: React.FC = () => {
  const sampleTasks: Task[] = [
    {
      id: '1',
      name: 'Research Agent',
      status: 'complete',
      progress: 100,
      agent: 'research-001',
      duration: '2.5s'
    },
    {
      id: '2',
      name: 'Code Review',
      status: 'running',
      progress: 67,
      agent: 'code-reviewer-001'
    },
    {
      id: '3',
      name: 'Test Automation',
      status: 'pending',
      progress: 0,
      agent: 'test-automator-001'
    },
    {
      id: '4',
      name: 'Deploy Agent',
      status: 'error',
      progress: 45,
      agent: 'deploy-001',
      duration: '1.2s (failed)'
    }
  ];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold underline>Task Cards:</Text>
      {sampleTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </Box>
  );
};

// ============================================================================
// 4. BOXES & PANELS
// ============================================================================

const BoxesAndPanels: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>Boxes & Panels:</Text>

    <Box borderStyle="round" borderColor="cyan" paddingX={2} marginY={0}>
      <Text>Rounded Box (round)</Text>
    </Box>

    <Box borderStyle="single" borderColor="green" paddingX={2} marginY={0}>
      <Text>Single Line Box (single)</Text>
    </Box>

    <Box borderStyle="double" borderColor="magenta" paddingX={2} marginY={0}>
      <Text>Double Line Box (double)</Text>
    </Box>

    <Box borderStyle="classic" paddingX={2} marginY={0}>
      <Text>Classic Box (classic)</Text>
    </Box>
  </Box>
);

// ============================================================================
// 5. TABLES
// ============================================================================

const TableExample: React.FC = () => {
  const tableData = [
    ['Agent', 'Status', 'Progress', 'Time'],
    ['─────', '──────', '────────', '────'],
    ['Research', '✓', '100%', '2.5s'],
    ['Code Review', '⋯', '67%', '1.2s'],
    ['Testing', '○', '0%', '-'],
  ];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold underline>Table Example:</Text>
      <Box borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          {tableData.map((row, i) => (
            <Box key={i}>
              {row.map((cell, j) => (
                <Text key={j} color={i === 0 ? 'cyan' : 'white'}>
                  {cell.padEnd(15)}
                </Text>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ============================================================================
// 6. LOGS / TIMELINE
// ============================================================================

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

const LogViewer: React.FC = () => {
  const logs: LogEntry[] = [
    { timestamp: '10:30:15', level: 'info', message: 'Orchestrator started' },
    { timestamp: '10:30:16', level: 'success', message: 'Research agent completed' },
    { timestamp: '10:30:18', level: 'warning', message: 'Code review taking longer than expected' },
    { timestamp: '10:30:20', level: 'error', message: 'Deploy agent failed: connection timeout' },
    { timestamp: '10:30:22', level: 'info', message: 'Retrying deploy agent...' },
  ];

  const colorMap = {
    info: 'blue' as const,
    success: 'green' as const,
    error: 'red' as const,
    warning: 'yellow' as const,
  };

  const iconMap = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warning: '⚠',
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold underline>Log Viewer:</Text>
      <Box borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          {logs.map((log, i) => (
            <Box key={i}>
              <Text dimColor>[{log.timestamp}]</Text>
              <Text color={colorMap[log.level]}> {iconMap[log.level]}</Text>
              <Text> {log.message}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ============================================================================
// 7. WORKFLOW DIAGRAM
// ============================================================================

const WorkflowDiagram: React.FC = () => {
  const steps = [
    { name: 'Initialize', status: 'complete' },
    { name: 'Execute Tasks', status: 'running' },
    { name: 'Validate Results', status: 'pending' },
    { name: 'Generate Reports', status: 'pending' },
    { name: 'Complete', status: 'pending' },
  ];

  const statusIcon = {
    complete: '✓',
    running: '▶',
    pending: '○',
  };

  const statusColor = {
    complete: 'green' as const,
    running: 'cyan' as const,
    pending: 'gray' as const,
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold underline>Workflow Diagram:</Text>
      <Box flexDirection="column">
        {steps.map((step, i) => (
          <Box key={i} flexDirection="column">
            {i > 0 && <Text dimColor>  ↓</Text>}
            <Box>
              <Text color={statusColor[step.status]}>
                {statusIcon[step.status]}
              </Text>
              <Text> {step.name}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ============================================================================
// 8. NOTIFICATIONS
// ============================================================================

const Notifications: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>Notifications:</Text>

    <Box borderStyle="round" borderColor="green" paddingX={2}>
      <Text color="green">✓ Task completed successfully!</Text>
    </Box>

    <Box borderStyle="round" borderColor="yellow" paddingX={2}>
      <Text color="yellow">⚠ Performance degradation detected</Text>
    </Box>

    <Box borderStyle="round" borderColor="red" paddingX={2}>
      <Text color="red">✗ Critical error: Agent crashed</Text>
    </Box>

    <Box borderStyle="round" borderColor="cyan" paddingX={2}>
      <Text color="cyan">ℹ New agent available for deployment</Text>
    </Box>
  </Box>
);

// ============================================================================
// 9. STATISTICS PANEL
// ============================================================================

const StatisticsPanel: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>Statistics Panel:</Text>
    <Box borderStyle="double" borderColor="cyan" paddingX={2}>
      <Box flexDirection="column">
        <Text bold>Orchestrator Statistics</Text>
        <Newline />
        <Box justifyContent="space-between" width={40}>
          <Text>Total Tasks:</Text>
          <Text color="cyan" bold>42</Text>
        </Box>
        <Box justifyContent="space-between" width={40}>
          <Text>Completed:</Text>
          <Text color="green" bold>35</Text>
        </Box>
        <Box justifyContent="space-between" width={40}>
          <Text>Running:</Text>
          <Text color="yellow" bold>5</Text>
        </Box>
        <Box justifyContent="space-between" width={40}>
          <Text>Failed:</Text>
          <Text color="red" bold>2</Text>
        </Box>
        <Newline />
        <Box justifyContent="space-between" width={40}>
          <Text>Avg Duration:</Text>
          <Text dimColor>2.3s</Text>
        </Box>
        <Box justifyContent="space-between" width={40}>
          <Text>Success Rate:</Text>
          <Text dimColor>95.2%</Text>
        </Box>
      </Box>
    </Box>
  </Box>
);

// ============================================================================
// 10. SPINNER TYPES
// ============================================================================

const SpinnerTypes: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold underline>Spinner Types:</Text>
    <Box>
      <Text color="cyan"><Spinner type="dots" /></Text>
      <Text> dots</Text>
    </Box>
    <Box>
      <Text color="cyan"><Spinner type="line" /></Text>
      <Text> line</Text>
    </Box>
    <Box>
      <Text color="cyan"><Spinner type="pipe" /></Text>
      <Text> pipe</Text>
    </Box>
    <Box>
      <Text color="cyan"><Spinner type="dots2" /></Text>
      <Text> dots2</Text>
    </Box>
  </Box>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ComponentLibrary: React.FC = () => (
  <Box flexDirection="column" padding={1}>
    <Box borderStyle="double" borderColor="cyan" paddingX={2} marginBottom={1}>
      <Text bold>🎨 Claude Code Buddy Terminal UI Component Library</Text>
    </Box>

    <StatusIndicators />
    <ProgressBars />
    <SpinnerTypes />
    <BoxesAndPanels />
    <TaskCards />
    <TableExample />
    <LogViewer />
    <WorkflowDiagram />
    <Notifications />
    <StatisticsPanel />

    <Box borderStyle="single" paddingX={2} marginTop={1}>
      <Text dimColor>
        Press Ctrl+C to exit | Use these patterns in your dashboard!
      </Text>
    </Box>
  </Box>
);

// Render
render(<ComponentLibrary />);
