/**
 * MCP connection health-check module.
 *
 * Attempts to read the `project_info` resource from the unity-mcp server
 * and returns a structured health status with actionable error messages.
 *
 * This module provides MCP connection health checks for Unity Editor
 * integration via the unity-mcp package (https://github.com/CoplayDev/unity-mcp).
 * The package is installed inside the developer's Unity project via Package
 * Manager (Window > Package Manager > Add package from git URL) and runs an
 * MCP server on `localhost` that this module talks to. When that bridge is
 * missing, outdated, or stopped, every other workflow will fail, which is why
 * the diagnostic hints below explicitly reference `unity-mcp` by name.
 *
 * Requirement: All (MCP connection foundation)
 */

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type HealthStatus = 'healthy' | 'unhealthy';

export interface McpHealthResult {
  status: HealthStatus;
  /** Human-readable message describing the result. */
  message: string;
  /** The server URL that was checked. */
  serverUrl: string;
  /** Response time in milliseconds (undefined when unhealthy). */
  responseTimeMs?: number;
}

/**
 * Diagnostic hint returned when the health check fails.
 */
export interface DiagnosticHint {
  /** Short error category label. */
  errorType: string;
  /** Actionable suggestion for the developer. */
  suggestion: string;
}

// ----------------------------------------------------------------
// Error classification helpers
// ----------------------------------------------------------------

/**
 * Classify a connection error and return a developer-friendly diagnostic.
 */
export function classifyError(error: unknown): DiagnosticHint {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('econnrefused') || lower.includes('connection refused')) {
    return {
      errorType: 'Connection Refused',
      suggestion:
        'Open Window > MCP for Unity > Start Server in Unity Editor to confirm the MCP Server is running.',
    };
  }

  if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('esockettimedout')) {
    return {
      errorType: 'Connection Timeout',
      suggestion:
        'Unity Editor may be performing a time-consuming operation (compiling or building). Please wait and retry.',
    };
  }

  if (lower.includes('enotfound') || lower.includes('host unreachable') || lower.includes('ehostunreach')) {
    return {
      errorType: 'Host Unreachable',
      suggestion:
        'Verify that localhost:8080 is not occupied by another process and that network configuration is correct.',
    };
  }

  if (lower.includes('unexpected token') || lower.includes('invalid json') || lower.includes('not valid json')) {
    return {
      errorType: 'Invalid Response',
      suggestion:
        'MCP Server response format is abnormal. The unity-mcp package (the open-source UPM bridge that exposes Unity Editor to MCP clients, installed in your Unity project under Window > Package Manager) is likely outdated. Please update the unity-mcp UPM package in your Unity project to the latest version.',
    };
  }

  return {
    errorType: 'Unknown Error',
    suggestion:
      'Ensure Unity Editor is open with a project loaded and MCP Server is running (Window > MCP for Unity > Start Server).',
  };
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Check the health of the MCP server at the given URL by attempting
 * to read the `project_info` resource.
 *
 * The `fetchFn` parameter allows callers to inject their own HTTP
 * implementation (or a test stub). It defaults to the global `fetch`.
 *
 * @param serverUrl - Base URL of the MCP server (e.g. `<your-mcp-server-url>`).
 *                    Security: HTTP is intentional — this endpoint is local-only (loopback) and never exposed externally.
 * @param fetchFn   - Optional fetch implementation for testing.
 * @returns A structured health result.
 */
export async function checkMcpHealth(
  serverUrl: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<McpHealthResult> {
  const start = Date.now();

  try {
    const response = await fetchFn(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: { uri: 'unity://project_info' },
      }),
    });

    const elapsed = Date.now() - start;

    if (!response.ok) {
      const hint = classifyError(new Error(`HTTP ${response.status}`));
      return {
        status: 'unhealthy',
        message: `MCP Server returned HTTP ${response.status}. ${hint.suggestion}`,
        serverUrl,
      };
    }

    // Validate that the response is parseable JSON-RPC.
    const body = (await response.json()) as {
      error?: { message?: string };
      result?: unknown;
    };

    if (body.error) {
      return {
        status: 'unhealthy',
        message: `MCP Server returned error: ${body.error.message ?? JSON.stringify(body.error)}`,
        serverUrl,
      };
    }

    return {
      status: 'healthy',
      message: 'MCP connection is healthy.',
      serverUrl,
      responseTimeMs: elapsed,
    };
  } catch (err: unknown) {
    const hint = classifyError(err);
    return {
      status: 'unhealthy',
      message: `${hint.errorType}：${hint.suggestion}`,
      serverUrl,
    };
  }
}
