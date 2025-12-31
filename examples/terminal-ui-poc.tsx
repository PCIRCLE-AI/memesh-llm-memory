#!/usr/bin/env tsx

/**
 * Terminal UI Proof of Concept
 *
 * Demonstrates:
 * - Ink-based dashboard
 * - Real-time task updates
 * - Event-driven architecture
 * - Beautiful terminal UI
 *
 * Run: npx tsx examples/terminal-ui-poc.tsx
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { EventEmitter } from 'events';

// Types
interface Task {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  startTime?: number;
  endTime?: number;
}

interface LogEntry {
  timestamp: number;
  level: 'info' | 'success' | 'error';
  message: string;
}

// Components
const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const statusConfig = {
    pending: { icon: '⏳', color: 'yellow' as const },
    running: { icon: <Spinner type="dots" />, color: 'cyan' as const },
    complete: { icon: '✅', color: 'green' as const },
    error: { icon: '❌', color: 'red' as const },
  };

  const config = statusConfig[task.status];
  const duration = task.endTime && task.startTime
    ? `${((task.endTime - task.startTime) / 1000).toFixed(1)}s`
    : '';

  return (
    <Box marginY={0}>
      <Text color={config.color}>{config.icon}</Text>
      <Text> {task.name}</Text>
      <Text dimColor> ({task.progress}%)</Text>
      {duration && <Text dimColor> [{duration}]</Text>}
    </Box>
  );
};

const Header: React.FC = () => (
  <Box borderStyle="round" borderColor="cyan" paddingX={2} marginBottom={1}>
    <Text bold>🤖 Claude Code Buddy Dashboard</Text>
  </Box>
);

const ProgressBar: React.FC<{ progress: number; width?: number }> = ({
  progress,
  width = 20
}) => {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="cyan">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {progress}%</Text>
    </Box>
  );
};

const LogViewer: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const colorMap = {
    info: 'blue' as const,
    success: 'green' as const,
    error: 'red' as const,
  };

  return (
    <Box flexDirection="column" marginTop={1} borderStyle="single" paddingX={1}>
      <Text bold dimColor>Recent Logs:</Text>
      {logs.slice(-5).map((log, i) => (
        <Box key={i}>
          <Text dimColor>[{new Date(log.timestamp).toLocaleTimeString()}]</Text>
          <Text color={colorMap[log.level]}> {log.message}</Text>
        </Box>
      ))}
    </Box>
  );
};

const WorkflowDiagram: React.FC<{ steps: string[]; currentStep: number }> = ({
  steps,
  currentStep
}) => (
  <Box flexDirection="column" marginTop={1}>
    <Text bold dimColor>Workflow:</Text>
    {steps.map((step, i) => (
      <Box key={i} flexDirection="column">
        {i > 0 && (
          <Text dimColor>  ↓</Text>
        )}
        <Box>
          <Text color={i === currentStep ? 'cyan' : i < currentStep ? 'green' : 'gray'}>
            {i === currentStep ? '▶' : i < currentStep ? '✓' : '○'}
          </Text>
          <Text color={i === currentStep ? 'cyan' : 'white'}> {step}</Text>
        </Box>
      </Box>
    ))}
  </Box>
);

const Dashboard: React.FC<{ eventBus: EventEmitter }> = ({ eventBus }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);

  const workflowSteps = [
    'Initialize agents',
    'Execute tasks',
    'Validate results',
    'Generate reports',
    'Complete'
  ];

  useEffect(() => {
    eventBus.on('task:update', (updatedTask: Task) => {
      setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        if (exists) {
          return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
        }
        return [...prev, updatedTask];
      });
    });

    eventBus.on('log', (entry: LogEntry) => {
      setLogs(prev => [...prev, entry]);
    });

    eventBus.on('workflow:step', (step: number) => {
      setCurrentWorkflowStep(step);
    });

    return () => eventBus.removeAllListeners();
  }, [eventBus]);

  // Calculate overall progress
  useEffect(() => {
    if (tasks.length === 0) {
      setOverallProgress(0);
      return;
    }
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    setOverallProgress(Math.round(totalProgress / tasks.length));
  }, [tasks]);

  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Overall Progress:</Text>
        <ProgressBar progress={overallProgress} width={30} />
      </Box>

      <Box flexDirection="column">
        <Text bold>Active Tasks:</Text>
        {tasks.length === 0 ? (
          <Text dimColor>No tasks running...</Text>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </Box>

      <WorkflowDiagram steps={workflowSteps} currentStep={currentWorkflowStep} />

      <LogViewer logs={logs} />
    </Box>
  );
};

// Simulation
const eventBus = new EventEmitter();

const log = (level: LogEntry['level'], message: string) => {
  eventBus.emit('log', {
    timestamp: Date.now(),
    level,
    message,
  });
};

const simulateTask = async (id: string, name: string, duration: number = 2000) => {
  const task: Task = {
    id,
    name,
    status: 'running',
    progress: 0,
    startTime: Date.now(),
  };

  log('info', `Starting task: ${name}`);
  eventBus.emit('task:update', { ...task });

  const steps = 10;
  const stepDelay = duration / steps;

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDelay));
    task.progress = i * 10;

    if (i === steps) {
      task.status = Math.random() > 0.8 ? 'error' : 'complete';
      task.endTime = Date.now();

      if (task.status === 'complete') {
        log('success', `Completed: ${name}`);
      } else {
        log('error', `Failed: ${name}`);
      }
    }

    eventBus.emit('task:update', { ...task });
  }
};

const simulateWorkflow = async () => {
  const workflowSteps = [
    { name: 'Initialize agents', delay: 500 },
    { name: 'Execute tasks', delay: 1000 },
    { name: 'Validate results', delay: 800 },
    { name: 'Generate reports', delay: 600 },
    { name: 'Complete', delay: 300 },
  ];

  for (let i = 0; i < workflowSteps.length; i++) {
    eventBus.emit('workflow:step', i);
    log('info', `Workflow: ${workflowSteps[i].name}`);
    await new Promise(resolve => setTimeout(resolve, workflowSteps[i].delay));
  }
};

// Main
const main = async () => {
  // Render dashboard
  render(<Dashboard eventBus={eventBus} />);

  // Start workflow
  await new Promise(resolve => setTimeout(resolve, 500));
  simulateWorkflow();

  // Simulate tasks
  setTimeout(() => simulateTask('1', 'Research Agent', 3000), 800);
  setTimeout(() => simulateTask('2', 'Code Review Agent', 2500), 1500);
  setTimeout(() => simulateTask('3', 'Test Automation', 2000), 2200);
  setTimeout(() => simulateTask('4', 'Deploy Agent', 1800), 3000);
  setTimeout(() => simulateTask('5', 'Monitor Agent', 1500), 3800);
};

main().catch(console.error);
