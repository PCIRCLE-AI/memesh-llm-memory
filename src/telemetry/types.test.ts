import { describe, it, expect } from 'vitest';
import type {
  TelemetryEvent,
  AgentUsageEvent,
  SkillUsageEvent,
  ErrorEvent
} from './types';
import {
  isAgentUsageEvent,
  isErrorEvent
} from './types';

describe('Telemetry Types', () => {
  it('should identify agent usage events', () => {
    const event: AgentUsageEvent = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    };

    expect(isAgentUsageEvent(event)).toBe(true);
    expect(isErrorEvent(event)).toBe(false);
  });

  it('should identify error events', () => {
    const event: ErrorEvent = {
      event: 'error',
      error_type: 'TypeError',
      error_category: 'runtime',
      component: 'agents/code-reviewer',
      stack_trace_hash: 'abc123',
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    };

    expect(isErrorEvent(event)).toBe(true);
    expect(isAgentUsageEvent(event)).toBe(false);
  });
});
