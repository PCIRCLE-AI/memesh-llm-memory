/**
 * Smart-Agents Terminal UI System
 *
 * Beautiful, elegant terminal interface components
 *
 * @example
 * ```tsx
 * import { Box, Text, Spinner, ProgressBar } from './ui';
 *
 * <Box flexDirection="column">
 *   <Text variant="primary" size="lg">Smart-Agents</Text>
 *   <Spinner label="Loading..." />
 *   <ProgressBar value={75} label="Progress" />
 * </Box>
 * ```
 */

export * from './components/index.js';
export { theme } from './theme.js';
export type { Theme } from './theme.js';

// Phase 3 Dashboard (Task 7)
export { Dashboard } from './Dashboard.js';
export { UIEventBus } from './UIEventBus.js';
export { ProgressRenderer } from './ProgressRenderer.js';
export { AttributionManager } from './AttributionManager.js';
export { MetricsStore } from './MetricsStore.js';
export * from './types.js';
