/**
 * MeMesh Cloud Integration
 *
 * Bridge between local MCP server and MeMesh Cloud (memesh-backend.fly.dev).
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
  CloudBatchWriteRequest,
  CloudBatchWriteResult,
  CloudAgentRegisterRequest,
  CloudAgentInfo,
  CloudSyncStatus,
} from './MeMeshCloudClient.js';
