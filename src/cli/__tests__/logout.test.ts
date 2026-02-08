import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock credentials module
vi.mock('../credentials.js', () => ({
  loadCredentials: vi.fn(),
  deleteCredentials: vi.fn(),
}));

import { loadCredentials, deleteCredentials } from '../credentials.js';

const mockLoadCredentials = vi.mocked(loadCredentials);
const mockDeleteCredentials = vi.mocked(deleteCredentials);

describe('logout logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should detect when not logged in', () => {
    mockLoadCredentials.mockReturnValue(null);
    const existing = loadCredentials();
    expect(existing).toBeNull();
  });

  it('should delete credentials when logged in', () => {
    mockLoadCredentials.mockReturnValue({
      apiKey: 'sk_memmesh_todelete',
      createdAt: '2026-01-01T00:00:00Z',
    });
    mockDeleteCredentials.mockReturnValue(true);

    const existing = loadCredentials();
    expect(existing).not.toBeNull();

    const result = deleteCredentials();
    expect(result).toBe(true);
    expect(mockDeleteCredentials).toHaveBeenCalledOnce();
  });

  it('should handle delete failure', () => {
    mockLoadCredentials.mockReturnValue({
      apiKey: 'sk_memmesh_todelete',
      createdAt: '2026-01-01T00:00:00Z',
    });
    mockDeleteCredentials.mockReturnValue(false);

    const result = deleteCredentials();
    expect(result).toBe(false);
  });
});
