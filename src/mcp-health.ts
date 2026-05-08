/**
 * MCP connection health-check module.
 *
 * Attempts to read the `project_info` resource from the unity-mcp server
 * and returns a structured health status with actionable error messages.
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
        '請在 Unity Editor 中開啟 Window > MCP for Unity > Start Server，確認 MCP Server 已啟動。',
    };
  }

  if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('esockettimedout')) {
    return {
      errorType: 'Connection Timeout',
      suggestion:
        'Unity Editor 可能正在執行耗時操作（編譯或建置中），請稍候重試。',
    };
  }

  if (lower.includes('enotfound') || lower.includes('host unreachable') || lower.includes('ehostunreach')) {
    return {
      errorType: 'Host Unreachable',
      suggestion:
        '請確認 localhost:8080 未被其他程式佔用，且網路配置正常。',
    };
  }

  if (lower.includes('unexpected token') || lower.includes('invalid json') || lower.includes('not valid json')) {
    return {
      errorType: 'Invalid Response',
      suggestion:
        'MCP Server 回應格式異常，請更新 unity-mcp UPM 套件至最新版本。',
    };
  }

  return {
    errorType: 'Unknown Error',
    suggestion:
      '請確認 Unity Editor 已開啟並載入專案，且 MCP Server 已啟動（Window > MCP for Unity > Start Server）。',
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
 * @param serverUrl - Base URL of the MCP server (e.g. `http://localhost:8080/mcp`).
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
        message: `MCP Server 回傳 HTTP ${response.status}。${hint.suggestion}`,
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
        message: `MCP Server 回傳錯誤：${body.error.message ?? JSON.stringify(body.error)}`,
        serverUrl,
      };
    }

    return {
      status: 'healthy',
      message: 'MCP 連線正常。',
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
