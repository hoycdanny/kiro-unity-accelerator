# Cross-Platform Testing Integration Steering

<!-- File Purpose / 本檔案用途: Unity cross-platform testing steering guide / Unity 跨平台測試的 steering 指引，涵蓋本地測試執行、雲端裝置測試、測試套件格式轉換及失敗日誌處理。 -->

> **Note**: This document is part of the Unity Accelerator sample project.
> References to "Cloud_Assist" represent one example of a remote device-testing
> service. You may substitute any cloud device-testing service that supports
> Unity test execution (e.g., AWS Device Farm, Firebase Test Lab, BrowserStack)
> depending on your infrastructure. Cloud device testing is optional — all core testing
> functionality works locally without requiring cloud service access.

## Role and Purpose

This document provides Unity cross-platform testing expertise. When developers request cross-platform testing, multi-platform compatibility verification, or real-device testing, use the following knowledge to plan and execute the testing workflow.

## Cross-Platform Testing Execution Flow

### Local Cross-Platform Testing Flow

1. **Confirm test scope**: Ask the developer which target platforms to test (iOS, Android, WebGL, etc.)
2. **Execute tests**: Use the `run_tests` MCP tool to run Unity Test Framework test cases in Unity Editor
3. **Structure results**: Format raw test results into structured reports per platform (pass rate, failure list)
4. **Report results**: Present test results to the developer in a clear format

### Remote Device Testing Flow (Optional — e.g., Cloud_Assist or equivalent service)

1. **Confirm remote testing is enabled**: Check if `useCloudAssist` is true in configuration (or equivalent flag for your chosen service)
2. **Convert test suite**: Convert Unity Test Framework test suite to the remote service's executable format
3. **Submit test task**: Submit build artifacts and test suite to the remote cloud device pool for execution
4. **Poll status**: Query test progress every 30 seconds
5. **Download results**: After tests complete, automatically download results including per-device pass rates, failure cases, and screenshots
6. **Report results**: Display the complete test report in structured format in Unity Editor

## MCP Tool Usage

### Execute Local Tests

```
run_tests(action: "run", testFilter: "PlayMode", platform: "Android")
```

### Read Test Results

```
read_console(filter: "TestRunner")
```

### Batch Execute Multi-Platform Tests

```
batch_execute(commands: [
  { "tool": "run_tests", "args": { "action": "run", "platform": "Android" } },
  { "tool": "run_tests", "args": { "action": "run", "platform": "iOS" } },
  { "tool": "run_tests", "args": { "action": "run", "platform": "WebGL" } }
])
```

> **Common patterns**: The most common cross-platform failures are shader incompatibilities on mobile (especially OpenGL ES 2.0 fallbacks) and memory pressure on devices with 2GB RAM or less. Prioritize testing on low-end target devices first.

## Test Suite Format Conversion Guide

### Unity Test Framework Format

Unity Test Framework test suite definition includes:
- `suiteName`: Test suite name
- `testCases`: Array of test cases, each containing `className`, `methodName`, `categories`
- `platform`: Target platform
- `timeout`: Timeout setting (seconds)

### Remote Service Format (e.g., Cloud_Assist)

The remote device-testing format (using Cloud_Assist as an example) includes:
- `name`: Test suite name (maps to suiteName)
- `tests`: Array of tests, each containing `id` (className.methodName), `name` (methodName), `tags` (categories)
- `targetPlatform`: Target platform (maps to platform)
- `timeoutSeconds`: Timeout setting (maps to timeout)
- `devicePool`: Device pool configuration (service-specific)

### Conversion Rules

- `suiteName` ↔ `name`: Direct mapping
- `testCases[].className + "." + methodName` → `tests[].id`
- `testCases[].methodName` → `tests[].name`
- `testCases[].categories` ↔ `tests[].tags`: Direct mapping
- `platform` ↔ `targetPlatform`: Direct mapping
- `timeout` ↔ `timeoutSeconds`: Direct mapping
- For reverse conversion, split `tests[].id` to extract `className` and `methodName`

## Test Failure Marking and Log Handling Guide

### Failure Marking Rules

- Any test case failure → Mark that platform as "has failures"
- Any device with test failures → Mark that device as "failed device" with failure logs attached
- All tests pass → Mark platform as "all passed"

### Failure Log Handling

1. **Extract failure messages**: Extract lines starting with `[FAIL]` or `Assert` from `read_console` output
2. **Structure failure info**: Each failure case includes:
   - `testName`: Name of the failed test
   - `message`: Failure message
   - `stackTrace`: Stack trace (if available)
   - `screenshot`: Screenshot path (for remote device testing)
3. **Classify failure reasons**:
   - `AssertionError`: Assertion failure, test logic issue
   - `NullReferenceException`: Null reference, possibly platform differences
   - `TimeoutException`: Timeout, possibly performance issue
   - `PlatformNotSupportedException`: Unsupported API call on the platform

### Result Presentation Format

```
=== Cross-Platform Test Report ===

[Android] Pass rate: 95% (19/20)
  ✗ TestPlayerMovement.TestTouchInput — NullReferenceException: Touch input not available in editor mode

[iOS] Pass rate: 100% (20/20)
  ✓ All passed

[WebGL] Pass rate: 90% (18/20)
  ✗ TestAudioManager.TestSpatialAudio — PlatformNotSupportedException: Spatial audio not supported on WebGL
  ✗ TestFileIO.TestSaveGame — PlatformNotSupportedException: FileStream not available on WebGL
```

## Test Failure and Environment Troubleshooting

- If `run_tests` returns a connection error, prompt the developer to confirm Unity Editor is open and MCP Server is started
- If test execution times out, suggest the developer narrow the test scope or increase the timeout setting
- If the remote device-testing service is unavailable, automatically degrade to local test mode and notify the developer
- If test suite format conversion fails, report the specific format error and suggest corrections

## Cross-Platform Testing Strategy Recommendations

- Run quick local tests first to confirm basic functionality, then use remote device testing for full coverage
- Create platform-specific test categories for easy filtering of platform-related tests
- Run cross-platform tests regularly to avoid accumulating platform compatibility issues
- Use `batch_execute` to trigger multi-platform tests simultaneously, saving wait time
- Remote device test results include screenshots — use screenshot comparison to identify UI differences
