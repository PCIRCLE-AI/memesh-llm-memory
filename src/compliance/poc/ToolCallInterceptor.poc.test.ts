import { describe, it, expect } from 'vitest';
import { POCToolCallInterceptor } from './ToolCallInterceptor.poc.js';

describe('POC: Tool Call Interception', () => {
  it('should intercept Edit calls and detect missing Read', () => {
    const interceptor = new POCToolCallInterceptor();

    // Simulate agent making Edit call without prior Read
    const violation = interceptor.interceptToolCall('agent-1', 'Edit', {
      file_path: '/test/file.ts',
      old_string: 'foo',
      new_string: 'bar'
    });

    expect(violation).toBeDefined();
    expect(violation?.rule).toBe('READ_BEFORE_EDIT');
    expect(violation?.severity).toBe('critical');
  });

  it('should allow Edit after Read', () => {
    const interceptor = new POCToolCallInterceptor();

    // Simulate agent reading file first
    interceptor.interceptToolCall('agent-1', 'Read', {
      file_path: '/test/file.ts'
    });

    // Then editing
    const violation = interceptor.interceptToolCall('agent-1', 'Edit', {
      file_path: '/test/file.ts',
      old_string: 'foo',
      new_string: 'bar'
    });

    expect(violation).toBeUndefined(); // No violation
  });

  it('should track tool call history per agent', () => {
    const interceptor = new POCToolCallInterceptor();

    interceptor.interceptToolCall('agent-1', 'Read', { file_path: '/a.ts' });
    interceptor.interceptToolCall('agent-2', 'Read', { file_path: '/b.ts' });

    const history1 = interceptor.getToolHistory('agent-1');
    const history2 = interceptor.getToolHistory('agent-2');

    expect(history1).toHaveLength(1);
    expect(history1[0].toolName).toBe('Read');
    expect(history1[0].args.file_path).toBe('/a.ts');

    expect(history2).toHaveLength(1);
    expect(history2[0].args.file_path).toBe('/b.ts');
  });
});
