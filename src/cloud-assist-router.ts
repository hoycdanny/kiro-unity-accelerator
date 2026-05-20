/**
 * Cloud-assist routing module.
 *
 * Determines whether a build task should be executed locally via MCP
 * or routed to a remote cloud build service (e.g., AWS CodeBuild,
 * Azure Pipelines, or any compatible CI backend).
 *
 * This module demonstrates a generic configurable local-vs-cloud
 * routing pattern that can be adapted to any cloud CI provider.
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
