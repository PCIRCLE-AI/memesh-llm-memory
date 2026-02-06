/**
 * MeMesh Cloud Integration
 *
 * Bridge between local MCP server and MeMesh Cloud (api.memesh.ai).
 * All cloud features are optional and gated by MEMESH_API_KEY.
 */

export {
  MeMeshCloudClient,
  getCloudClient,
  isCloudEnabled,
  resetCloudClient,
} from './MeMeshCloudClient.js';

export type {
  CloudMemory,
  CloudMemoryWriteRequest,
  CloudMemorySearchResult,
  CloudAgentInfo,
  CloudSyncStatus,
} from './MeMeshCloudClient.js';
