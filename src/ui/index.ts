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
