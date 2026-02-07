import { describe, it, expect } from 'vitest';
import {
  operationDisplayNames,
  operationIcons,
  getOperationDisplayName,
  getOperationIcon,
} from '../../src/ui/design-tokens';

describe('Design Tokens', () => {
  describe('Operation Display Names', () => {
    it('should provide friendly names for all operations', () => {
      expect(operationDisplayNames['memesh-remember']).toBe('Memory Search');
      expect(operationDisplayNames['memesh-do']).toBe('Task Router');
      expect(operationDisplayNames['memesh-help']).toBe('Help Center');
      expect(operationDisplayNames['create-entities']).toBe('Knowledge Storage');
    });

    it('should handle unknown operations gracefully', () => {
      expect(operationDisplayNames['unknown-op']).toBeUndefined();
    });
  });

  describe('Operation Icons', () => {
    it('should provide icons for all operations', () => {
      expect(operationIcons.memory).toBe('🧠');
      expect(operationIcons.task).toBe('📋');
      expect(operationIcons.help).toBe('💡');
      expect(operationIcons.agent).toBe('🤖');
    });
  });

  describe('getOperationDisplayName', () => {
    it('should return display name for known operations', () => {
      expect(getOperationDisplayName('memesh-remember')).toBe('Memory Search');
      expect(getOperationDisplayName('memesh-secret-store')).toBe('Secret Storage');
    });

    it('should format unknown operations', () => {
      expect(getOperationDisplayName('unknown-operation')).toBe('Unknown Operation');
      expect(getOperationDisplayName('memesh-test-thing')).toBe('Test Thing');
    });
  });

  describe('getOperationIcon', () => {
    it('should return correct icon for operations', () => {
      expect(getOperationIcon('memesh-remember')).toBe('🧠');
      expect(getOperationIcon('task-something')).toBe('📋');
      expect(getOperationIcon('help-me')).toBe('💡');
    });

    it('should return empty string for unknown operations', () => {
      expect(getOperationIcon('completely-unknown')).toBe('');
    });
  });
});
