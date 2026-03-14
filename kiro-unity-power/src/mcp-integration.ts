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
      error: `MCP 連線錯誤 (${hint.errorType})：${hint.suggestion}`,
    };
  }
}

// ----------------------------------------------------------------
// Compilation wait logic (Requirement 5.6)
// ----------------------------------------------------------------

/**
 * Checks whether Unity Editor is currently compiling by calling
 * `manage_editor(action: "telemetry_status")` and inspecting the response.
 */
export async function isUnityCompiling(executor: McpExecutor): Promise<boolean> {
  try {
    const result = await executor({
      tool: 'manage_editor',
      args: { action: 'telemetry_status' },
    });
    if (!result.success || !result.data) return false;
    const data = result.data as Record<string, unknown>;
    // The telemetry_status response includes editor state info;
    // check for compilation indicators.
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
 * Requirement 5.3
 */
export async function refreshUnityEditor(
  executor: McpExecutor,
): Promise<McpToolResult> {
  return executeMcpCall(
    { tool: 'manage_editor', args: { action: 'play' } },
    executor,
  ).then(() =>
    executeMcpCall(
      {
        tool: 'refresh_unity',
        args: { scope: 'all', compile: 'request', wait_for_ready: true },
      },
      executor,
    ),
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
