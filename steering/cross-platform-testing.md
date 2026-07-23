# Cross-Platform Testing Integration Steering

<!-- File Purpose / 本檔案用途: Unity cross-platform testing steering guide / Unity 跨平台測試的 steering 指引，涵蓋 Unity Test Framework 本地測試執行、非同步 job 輪詢、失敗日誌處理及跨平台程式碼路徑驗證策略。 -->

> **Scope correction**: Earlier drafts of this guide described an optional cloud/remote device-testing layer ("Cloud_Assist") with automatic test-suite format conversion and a `platform` parameter on `run_tests`. **Neither exists in the current unity-mcp tool surface.** `run_tests` runs Unity Test Framework tests inside the Editor by test mode (`EditMode`/`PlayMode`), not against a specific build target or remote device — there is no built-in way to run "the same test suite on an Android device" through unity-mcp today. "Cross-platform testing" in practice means: (1) run the test suite once in the Editor, (2) separately build for each target platform via `manage_build` and check for compile/shader errors there, and (3) manually or via `execute_code` verify platform-conditional code paths (`#if UNITY_ANDROID` etc.) are exercised. If real device-farm integration is needed, it would require a separate custom tool outside this Power's current scope.

## Role and Purpose

This document provides Unity testing expertise for verifying behavior across platform-conditional code paths. When developers request test execution, platform compatibility verification via tests, or want to check code before building for a specific target, use the following knowledge to plan and execute the testing workflow.

## Testing Execution Flow

1. **Confirm test scope**: Ask the developer whether to run `EditMode` tests, `PlayMode` tests, or both, and whether to filter by category/assembly/test name
2. **Start tests** — `run_tests(mode: "EditMode")` (or `"PlayMode"`). **This is asynchronous**: it returns `{job_id}` immediately, it does not block until tests finish
3. **Poll for completion** — `get_test_job(job_id: ..., wait_timeout: 30)` repeatedly until `status` is no longer `"running"`. `wait_timeout` lets the server hold the response for up to that many seconds before returning, reducing the number of round-trips needed
4. **Structure results**: Format raw test results into a report (pass rate, failure list) — use `include_failed_tests: true` on `get_test_job` to get failure detail without pulling every passing test's data too
5. **Report results**: Present test results to the developer in a clear format
6. **For platform-specific verification**: separately trigger `manage_build(action: "build", target: ...)` for each target platform to catch platform-specific compile/shader errors that EditMode/PlayMode tests running under the Editor's own platform won't surface

## MCP Tool Usage

> **Verified syntax**: confirmed against a live unity-mcp connection — `run_tests` returns a job immediately; there is no `platform` param, and the action/mode params differ from older drafts of this guide.

### Start Tests

```
run_tests(mode: "EditMode")
→ { data: { job_id: "...", status: "running", mode: "EditMode", ... } }
```

There is no `action: "run"` param and no `testFilter`/`platform` params — the real params are `mode`, `test_names`, `group_names`, `category_names`, `assembly_names`, `include_failed_tests`, `include_details`, `init_timeout`.

### Poll for Results

```
get_test_job(job_id: "...", wait_timeout: 30, include_failed_tests: true)
```

### Read Test Results From Console

```
read_console(filter_text: "TestRunner")
```

The param is `filter_text`, not `filter`.

### Batch-Run Multiple Test Categories

```
batch_execute(commands: [
  { "tool": "run_tests", "params": { "mode": "EditMode", "category_names": ["Networking"] } },
  { "tool": "run_tests", "params": { "mode": "PlayMode", "category_names": ["Gameplay"] } }
])
```

Each `run_tests` call still returns its own `job_id` — `batch_execute` here just fires both requests together; you still need to poll each `job_id` separately with `get_test_job`.

> **Common patterns**: The most common cross-platform *behavioral* failures (surfaced during PlayMode tests, or discovered manually on-device) are shader incompatibilities on mobile (especially OpenGL ES fallback devices — Unity 6 recommends Vulkan as the primary Android Graphics API, with OpenGL ES retained only as a compatibility fallback for older/unsupported hardware) and memory pressure on devices with 2GB RAM or less. Prioritize testing on low-end target devices first.

> **Unity 6.x note**: If the project has the URP **GPU Resident Drawer** enabled (see `performance-analysis.md` — verify the actual `gpuResidentDrawerMode` on the URP Asset rather than assuming from version number), the GPU Resident Drawer silently falls back to standard drawing on unsupported Graphics APIs (OpenGL ES, VisionOS), so functional correctness is preserved but expected draw-call reductions will not materialize there. This is not something Unity Test Framework tests would catch — it needs a manual or `manage_graphics(action: "stats_get")`-based check on an actual build/device.

## Test Failure Log Handling Guide

### Failure Log Handling

1. **Extract failure messages**: Use `get_test_job(..., include_failed_tests: true)` to get structured failure data directly, rather than parsing raw console text
2. **Structure failure info**: Each failure case typically includes test name, failure message, and stack trace (exact shape depends on the connected unity-mcp version — inspect the actual response rather than assuming a fixed schema)
3. **Classify failure reasons** (by exception type in the message):
   - `AssertionError`: Assertion failure, test logic issue
   - `NullReferenceException`: Null reference, possibly platform/environment differences
   - `TimeoutException`: Timeout, possibly performance issue
   - `PlatformNotSupportedException`: Unsupported API call — flag as a genuine cross-platform compatibility issue, not a test bug

### Result Presentation Format

```
=== Test Report ===

[EditMode] Pass rate: 95% (19/20)
  ✗ TestPlayerMovement.TestTouchInput — NullReferenceException: Touch input not available in editor mode

[PlayMode] Pass rate: 100% (20/20)
  ✓ All passed
```

## Test Failure and Environment Troubleshooting

- If `run_tests`/`get_test_job` returns a connection error, prompt the developer to confirm Unity Editor is open and MCP Server is started
- If a test job's status stays `"running"` far longer than expected (check `progress.stuck_suspected` if present), suggest the developer check if the Editor lost focus (some PlayMode test runs pause without an active window) or narrow the test scope
- If `wait_timeout` polling returns `"running"` repeatedly, keep polling with reasonable intervals rather than assuming failure — PlayMode tests with domain reload can take a while to start

## Cross-Platform Testing Strategy Recommendations

- Run EditMode tests first for fast feedback on pure logic, then PlayMode tests for scene/runtime behavior
- Create test categories (`category_names`) aligned with platform-conditional code areas for easy filtering
- Run tests regularly to avoid accumulating regressions
- Since Unity Test Framework itself doesn't test against a specific build target, pair test runs with an actual `manage_build` build for each shipped platform to catch platform-specific compile and shader issues that only show up at build time
