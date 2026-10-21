/**
 * MCP Integration Layer for Level Design Tooling.
 *
 * Provides shared utilities for executing MCP tool calls, handling
 * connection errors, and waiting for Unity Editor compilation.
 *
 * Requirements: 5.1, 5.3, 5.5, 5.6
 */

import { McpToolCall, McpToolResult, BatchExecuteResult } from './types';
import { classifyError, DiagnosticHint } from './mcp-health';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

/** Function signature for executing a single MCP tool call. */
export type McpExecutor = (call: McpToolCall) => Promise<McpToolResult>;

/** Options for MCP workflow operations. */
export interface McpWorkflowOptions {
  /** Function that executes a single MCP tool call. */
  executor: McpExecutor;
  /** Maximum number of retries when Unity is compiling (default: 10). */
  maxCompileWaitRetries?: number;
  /** Delay in ms between compilation wait polls (default: 2000). */
  compileWaitDelayMs?: number;
}

/** Result of an MCP workflow operation. */
export interface McpWorkflowResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  diagnosticHint?: DiagnosticHint;
}

// ----------------------------------------------------------------
// Error handling (Requirement 5.5)
// ----------------------------------------------------------------

/**
 * Wraps an MCP executor call with connection error handling.
 * Returns a structured result with diagnostic hints on failure.
 */
export async function executeMcpCall(
  call: McpToolCall,
  executor: McpExecutor,
): Promise<McpToolResult> {
  try {
    return await executor(call);
  } catch (err: unknown) {
    const hint = classifyError(err);
    return {
      success: false,
      error: `MCP connection error (${hint.errorType}): ${hint.suggestion}`,
    };
  }
}

// ----------------------------------------------------------------
// Compilation wait logic (Requirement 5.6)
// ----------------------------------------------------------------

/** MCP resource URI carrying the Editor readiness snapshot. */
export const EDITOR_STATE_RESOURCE = 'mcpforunity://editor/state';

/**
 * Checks whether Unity Editor is currently compiling by reading the
 * `mcpforunity://editor/state` resource and inspecting its `advice` block.
 *
 * Editor state is exposed as an MCP resource, not as a tool action —
 * `manage_editor` has no read-only action that reports compilation state. The
 * read is dispatched through the executor as the JSON-RPC `resources/read`
 * method (the same method `mcp-health.ts` uses), so the caller's executor is
 * responsible for routing it.
 */
export async function isUnityCompiling(executor: McpExecutor): Promise<boolean> {
  try {
    const result = await executor({
      tool: 'resources/read',
      params: { uri: EDITOR_STATE_RESOURCE },
    });
    if (!result.success || !result.data) return false;
    const data = result.data as Record<string, unknown>;
    // `advice.ready_for_tools` is the canonical readiness flag; it is false
    // while the Editor is compiling or otherwise busy.
    const advice = data['advice'] as Record<string, unknown> | undefined;
    if (advice && advice['ready_for_tools'] === false) return true;
    const isCompiling = data['isCompiling'] ?? data['is_compiling'];
    return isCompiling === true;
  } catch {
    // If we can't determine, assume not compiling to avoid infinite waits.
    return false;
  }
}


/**
 * Waits for Unity Editor to finish compiling before proceeding.
 * Polls at regular intervals up to a maximum number of retries.
 *
 * Requirement 5.6
 */
export async function waitForCompilation(
  executor: McpExecutor,
  maxRetries = 10,
  delayMs = 2000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const compiling = await isUnityCompiling(executor);
    if (!compiling) return;
    await delay(delayMs);
  }
  // If still compiling after max retries, proceed anyway and let
  // downstream calls handle any compilation-related failures.
}

/**
 * Triggers Unity Editor refresh/recompilation.
 *
 * Only `refresh_unity` is called — the Editor is never put into Play Mode,
 * which would violate the Power's "no permanent changes while in Play Mode"
 * safety rule.
 *
 * Requirement 5.3
 */
export async function refreshUnityEditor(
  executor: McpExecutor,
): Promise<McpToolResult> {
  return executeMcpCall(
    {
      tool: 'refresh_unity',
      params: { scope: 'all', compile: 'request', wait_for_ready: true },
    },
    executor,
  );
}

/**
 * Executes a batch of MCP calls sequentially, collecting results.
 * Used by scene-batch-config for batch operations.
 */
export async function executeBatch(
  calls: McpToolCall[],
  executor: McpExecutor,
): Promise<BatchExecuteResult> {
  const results: McpToolResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const call of calls) {
    const result = await executeMcpCall(call, executor);
    results.push(result);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return { results, successCount, failureCount };
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
