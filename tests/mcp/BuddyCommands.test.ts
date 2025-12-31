import { describe, it, expect } from 'vitest';
import { BuddyCommands } from '../../src/mcp/BuddyCommands';

describe('BuddyCommands', () => {
  it('should parse "buddy do" command', () => {
    const result = BuddyCommands.parse('buddy do setup authentication');
    expect(result.command).toBe('do');
    expect(result.args).toBe('setup authentication');
  });

  it('should parse "buddy stats" command', () => {
    const result = BuddyCommands.parse('buddy stats');
    expect(result.command).toBe('stats');
    expect(result.args).toBe('');
  });

  it('should parse "buddy remember" command', () => {
    const result = BuddyCommands.parse('buddy remember api design decisions');
    expect(result.command).toBe('remember');
    expect(result.args).toBe('api design decisions');
  });

  it('should handle command aliases', () => {
    const result1 = BuddyCommands.parse('buddy help-with setup auth');
    expect(result1.command).toBe('do'); // 'help-with' is alias for 'do'

    const result2 = BuddyCommands.parse('buddy recall some memory');
    expect(result2.command).toBe('remember'); // 'recall' is alias
  });

  it('should return help for unknown commands', () => {
    const result = BuddyCommands.parse('buddy unknown command');
    expect(result.command).toBe('help');
  });

  it('should handle commands without "buddy" prefix', () => {
    const result = BuddyCommands.parse('do setup authentication');
    expect(result.command).toBe('do');
    expect(result.args).toBe('setup authentication');
  });

  it('should preserve original input', () => {
    const result = BuddyCommands.parse('buddy do setup authentication');
    expect(result.originalInput).toBe('buddy do setup authentication');
  });
});
