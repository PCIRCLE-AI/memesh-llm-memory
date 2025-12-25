#!/usr/bin/env node
/**
 * Terminal UI Components Demo
 *
 * Tests all base components: Box, Text, Spinner, ProgressBar, StatusIndicator
 */

import React, { useState, useEffect } from 'react';
import { render } from 'ink';
import { Box, Text, Spinner, ProgressBar, StatusIndicator } from './components/index.js';
import type { Status } from './components/StatusIndicator.js';

const Demo: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev < 100 ? prev + 5 : 0));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text variant="primary" size="2xl" weight="bold">
          Terminal UI Components Demo
        </Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text variant="muted">{'─'.repeat(60)}</Text>
      </Box>

      {/* Text Variants */}
      <Box marginBottom={1} flexDirection="column">
        <Text variant="primary" weight="bold">
          Text Variants:
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text variant="primary">Primary text</Text>
          <Text variant="secondary">Secondary text</Text>
          <Text variant="muted">Muted text</Text>
          <Text variant="success">Success text</Text>
          <Text variant="warning">Warning text</Text>
          <Text variant="error">Error text</Text>
          <Text variant="info">Info text</Text>
        </Box>
      </Box>

      {/* Box Variants */}
      <Box marginBottom={1} flexDirection="column">
        <Text variant="primary" weight="bold">
          Box Variants:
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box variant="bordered" borderStyle="light" padding={1} marginBottom={1}>
            <Text>Light bordered box</Text>
          </Box>
          <Box variant="bordered" borderStyle="heavy" padding={1} marginBottom={1}>
            <Text>Heavy bordered box</Text>
          </Box>
          <Box variant="card" padding={1}>
            <Text>Card box with padding</Text>
          </Box>
        </Box>
      </Box>

      {/* Spinners */}
      <Box marginBottom={1} flexDirection="column">
        <Text variant="primary" weight="bold">
          Spinners:
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <Spinner variant="primary" label="Loading..." />
          </Box>
          <Box marginBottom={1}>
            <Spinner variant="success" label="Processing..." />
          </Box>
          <Box marginBottom={1}>
            <Spinner variant="warning" label="Warning..." />
          </Box>
          <Box>
            <Spinner variant="error" label="Error state..." />
          </Box>
        </Box>
      </Box>

      {/* Progress Bars */}
      <Box marginBottom={1} flexDirection="column">
        <Text variant="primary" weight="bold">
          Progress Bars:
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <ProgressBar
              value={progress}
              max={100}
              width={40}
              showPercentage={true}
              label="Dynamic Progress"
              variant="primary"
            />
          </Box>
          <Box marginBottom={1}>
            <ProgressBar
              value={75}
              max={100}
              width={40}
              showPercentage={true}
              label="Success (75%)"
              variant="success"
            />
          </Box>
          <Box marginBottom={1}>
            <ProgressBar
              value={50}
              max={100}
              width={40}
              showPercentage={true}
              label="Warning (50%)"
              variant="warning"
            />
          </Box>
          <Box>
            <ProgressBar
              value={25}
              max={100}
              width={40}
              showPercentage={true}
              label="Error (25%)"
              variant="error"
            />
          </Box>
        </Box>
      </Box>

      {/* Status Indicators */}
      <Box marginBottom={1} flexDirection="column">
        <Text variant="primary" weight="bold">
          Status Indicators:
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <StatusIndicator status="success" label="Operation completed" />
          </Box>
          <Box marginBottom={1}>
            <StatusIndicator status="error" label="Operation failed" />
          </Box>
          <Box marginBottom={1}>
            <StatusIndicator status="warning" label="Warning detected" />
          </Box>
          <Box marginBottom={1}>
            <StatusIndicator status="info" label="Information message" />
          </Box>
          <Box marginBottom={1}>
            <StatusIndicator status="pending" label="Waiting to start" />
          </Box>
          <Box>
            <StatusIndicator status="in_progress" label="Currently running" />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text variant="muted">{'─'.repeat(60)}</Text>
      </Box>
      <Box marginTop={1}>
        <Text variant="muted">Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};

render(<Demo />);
