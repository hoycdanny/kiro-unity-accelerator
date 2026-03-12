/**
 * Cloud_Assist routing module.
 *
 * Determines whether a build task should be executed locally via MCP
 * or routed to the Kiro-managed cloud infrastructure.
 *
 * Requirement: 3.5
 */

import { BuildConfig } from './types';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type BuildRoute = 'local' | 'cloud';

export interface BuildRouteResult {
  route: BuildRoute;
  /** MCP tool name used for local builds. */
  mcpTool: string;
  /** MCP action used for local builds. */
  mcpAction: string;
  /** Polling interval in seconds for progress checks. */
  pollIntervalSeconds: number;
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Determine the execution route for a build task based on the
 * `useCloudAssist` flag in the provided BuildConfig.
 *
 * - `useCloudAssist === true`  → cloud route (30 s polling)
 * - `useCloudAssist === false` → local MCP route (10 s polling)
 */
export function routeBuildTask(config: BuildConfig): BuildRouteResult {
  if (config.useCloudAssist) {
    return {
      route: 'cloud',
      mcpTool: config.mcpToolMapping.primaryTool,
      mcpAction: config.mcpToolMapping.action,
      pollIntervalSeconds: 30,
    };
  }

  return {
    route: 'local',
    mcpTool: config.mcpToolMapping.primaryTool,
    mcpAction: config.mcpToolMapping.action,
    pollIntervalSeconds: 10,
  };
}
