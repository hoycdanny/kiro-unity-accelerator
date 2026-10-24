# Cross-Platform Testing Integration Steering

<!-- File Purpose / 本檔案用途: Unity cross-platform testing steering guide / Unity 跨平台測試的 steering 指引，涵蓋 testing 工具群組啟用、Unity Test Framework 本地測試執行、非同步 job 輪詢、失敗日誌處理及跨平台程式碼路徑驗證策略。 -->

> **Scope correction**: Earlier drafts of this guide described an optional cloud/remote device-testing layer ("Cloud_Assist") with automatic test-suite format conversion and a `platform` parameter on `run_tests`. **Neither exists in the current unity-mcp tool surface.** `run_tests` runs Unity Test Framework tests inside the Editor by test mode (`EditMode`/`PlayMode`), not against a specific build target or remote device — there is no built-in way to run "the same test suite on an Android device" through unity-mcp today. "Cross-platform testing" in practice means: (1) run the test suite once in the Editor, (2) separately build for each target platform via `manage_build` and check for compile/shader errors there, and (3) manually or via `execute_code` verify platform-conditional code paths (`#if UNITY_ANDROID` etc.) are exercised. If real device-farm integration is needed, it would require a separate custom tool outside this Power's current scope.

## Role and Purpose

This document provides Unity testing expertise for verifying behavior across platform-conditional code paths. When developers request test execution, platform compatibility verification via tests, or want to check code before building for a specific target, use the following knowledge to plan and execute the testing workflow.

## Testing Execution Flow

> **Tool group note**: `run_tests` and `get_test_job` are declared in the **`testing`** group, which the bridge reports as off by default — but on the live-verified install both were callable with no activation. **Do not open this flow with an activation step.** Call `run_tests`; only if it is reported as not existing do you run `manage_tools(action: "activate", group: "testing")` and then expect the MCP client may need a refresh or reconnect. `manage_build`, `read_console` and `manage_graphics`, used elsewhere in this flow, are `core`. The canonical procedure, including the `list_groups` → `sync` → `activate` → `reset` recovery order, is in `unity-general.md` under "Tool Group Activation (`manage_tools`)".

> **Version baseline**: this file targets **Unity 6.4** (stream `6000.4`, pinned patch `6000.4.12f1`); the live-verified Test Framework pairing is `com.unity.test-framework` 1.6.0. Anything past 6.4 is forward-looking and unverified — see `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

0. **(Only if `run_tests` is reported as not existing)** `manage_tools(action: "activate", group: "testing")` — otherwise start at step 1
1. **Confirm test scope**: Ask the developer whether to run `EditMode` tests, `PlayMode` tests, or both, and whether to filter by category/assembly/test name
2. **Start tests** — `run_tests(mode: "EditMode")` (or `"PlayMode"`). **This is asynchronous**: it returns `{job_id}` immediately, it does not block until tests finish
3. **Poll for completion** — `get_test_job(job_id: ..., wait_timeout: 30)` repeatedly until `status` is no longer `"running"`. **`status` is the TEST outcome, not the run's health** — see "A Test Job's `status` Is the Test Outcome, Not the Run's Health" below before reacting to `"failed"`. `wait_timeout` is accepted by the server, but whether it holds the response open to save round-trips is **UNVERIFIED** — keep the polling loop as if it returns immediately
4. **Structure results**: Format raw test results into a report (pass rate, failure list) from `result.summary` and **`progress.failures_so_far`** — that `progress` list is where failure detail actually arrives, with or without `include_failed_tests`
5. **Report results**: Present test results to the developer in a clear format, always naming the status **and** the `completed`/`total` counts
6. **For platform-specific verification**: separately trigger `manage_build(action: "build", target: ...)` for each target platform to catch platform-specific compile/shader errors that EditMode/PlayMode tests running under the Editor's own platform won't surface

## MCP Tool Usage

> **Verified syntax**: confirmed against a live unity-mcp connection — `run_tests` returns a job immediately; there is no `platform` param, and the action/mode params differ from older drafts of this guide.

### Getting a Testable EditMode Assembly in Place

`run_tests` only sees tests that live in a test assembly, so a project with no `.asmdef` for tests has nothing to run — the job will finish `succeeded` with `completed: 0, total: 0`. If the developer needs tests created before they can be run, this is the **EditMode test-assembly recipe that is VERIFIED working on bridge 10.3.0 / Unity 6000.4.6f1 (2026-10-21)**:

```jsonc
// Assets/<YourFolder>/Tests/MyProject.Tests.asmdef
{
  "name": "MyProject.Tests",
  "references": ["UnityEngine.TestRunner", "UnityEditor.TestRunner"],
  "includePlatforms": ["Editor"],
  "precompiledReferences": ["nunit.framework.dll"],
  "overrideReferences": true,
  "autoReferenced": false,
  "defineConstraints": ["UNITY_INCLUDE_TESTS"]
}
```

All seven fields matter: `UnityEngine.TestRunner` + `UnityEditor.TestRunner` in `references`, `includePlatforms: ["Editor"]` to keep it out of player builds, `precompiledReferences: ["nunit.framework.dll"]` together with `overrideReferences: true` to make NUnit's `Assert` resolve, `autoReferenced: false`, and `defineConstraints: ["UNITY_INCLUDE_TESTS"]`.

Then write the `.asmdef` and the test `.cs` files to disk and import them:

```
refresh_unity(mode: "force", compile: "request")
```

**That import path is VERIFIED**: files created outside Unity's import pipeline (ordinary file I/O, or `create_script`) were picked up by `refresh_unity(mode: "force", compile: "request")`, and `execute_code` then confirmed the type had really loaded — `System.Type.GetType("MCPVerifyTests, MCPVerify.Tests")` returned `loaded: MCPVerifyTests asm=MCPVerify.Tests`. Remember that `wait_for_ready: true` does **not** block (see `unity-general.md`): confirm the type loaded before calling `run_tests`, rather than assuming the compile finished. Pass the assembly's `name` to `run_tests(assembly_names: [...])` to run only those tests.

### Getting a Testable PlayMode Assembly in Place

A PlayMode test assembly is the EditMode recipe with **one field changed**. This is the **PlayMode test-assembly recipe VERIFIED working on bridge 10.3.0 / Unity 6000.4.6f1 (2026-10-21)**:

```jsonc
// Assets/<YourFolder>/Tests/MyProject.PlayTests.asmdef
{
  "name": "MyProject.PlayTests",
  "references": ["UnityEngine.TestRunner", "UnityEditor.TestRunner"],
  "includePlatforms": [],
  "precompiledReferences": ["nunit.framework.dll"],
  "overrideReferences": true,
  "autoReferenced": false,
  "defineConstraints": ["UNITY_INCLUDE_TESTS"]
}
```

**The single difference from the EditMode recipe is `includePlatforms: []`** — an empty list means *all platforms*, and that is what makes the assembly PlayMode-capable. `["Editor"]` restricts it to EditMode. Everything else is unchanged and every field still matters: `UnityEngine.TestRunner` + `UnityEditor.TestRunner` in `references`, `precompiledReferences: ["nunit.framework.dll"]` together with `overrideReferences: true` so NUnit's `Assert` resolves, `autoReferenced: false`, and `defineConstraints: ["UNITY_INCLUDE_TESTS"]`.

Inside a PlayMode assembly you can write either form of test:

- `[Test]` — a plain synchronous NUnit test, same as in EditMode.
- **`[UnityTest]` returning `IEnumerator` — the coroutine form**, which Unity drives across frames so `yield return null` advances one frame. It requires **`using UnityEngine.TestTools;`**. The verified run included a `[UnityTest]` asserting `Time.frameCount` advanced across two `yield return null`s, and it passed — frame-based tests really do execute.

Import it the same way (`refresh_unity(mode: "force", compile: "request")`, then confirm the type loaded), then run it with `run_tests(mode: "PlayMode", assembly_names: ["MyProject.PlayTests"], init_timeout: 120000)`.

### Removing a Throwaway Test Assembly Afterwards

A test assembly created only to prove something should be removed, and the removal is **VERIFIED to be complete on bridge 10.3.0 (2026-10-21)**:

1. Keep the whole thing in **one isolated folder** from the start (the verified runs used `Assets/_MCPVerify/`) so deletion is a single call.
2. `manage_asset(action: "delete", path: "Assets/_MCPVerify")`.
3. `refresh_unity` so the AssetDatabase and the compiler notice.

What was confirmed afterwards, and worth confirming yourself: the folder was **gone from disk**; `Assets/` was back to only its original top-level entries (`Scenes`, `Settings`, `TutorialInfo`, `InputSystem_Actions.inputactions`, `Readme.asset` and their `.meta` files); and `execute_code` reported `scene=SampleScene roots=3 dirty=False isPlaying=False testAsmGone=True`. **That last field is the one that matters: the test type no longer resolved, so the assembly was genuinely unloaded, not merely deleted from disk while still live in the domain.** Check the type is gone rather than trusting the delete call's success.

**No scene save was needed**, because the scene was never modified — a PlayMode test run does not dirty it. If your tests *do* mutate the scene, the save-to-persist and mutate-then-save ordering rules apply (see `unity-general.md` and `scene-scaffolding.md`). And note the related trap recorded in `unity-general.md`: re-creating a previously deleted asset folder at the **same path** can fail with a misleading "already exists" error, whose fix is a disk-level mkdir plus a refresh.

### Start Tests

```
run_tests(mode: "EditMode")
→ { data: { job_id: "...", status: "running", mode: "EditMode", ... } }
```

There is no `action: "run"` param and no `testFilter`/`platform` params. The real params are `mode`, `test_names`, `group_names`, `category_names`, `assembly_names`, `include_failed_tests`, `include_details`, `init_timeout` and `clear_stuck`. Three of them are easy to misuse:

- `group_names` takes **regular expressions** matched against the full test name (unlike `test_names`, which needs exact full names including namespace and class)
- `init_timeout` is in **milliseconds** and defaults to 15000; a PlayMode run starts with a domain reload, so 120000 is the documented recommendation. **Keep passing 120000 for PlayMode.** The one verified PlayMode run finished in ~5.2 s wall clock, but it was run *with* `init_timeout: 120000`, so **whether a smaller value would have sufficed is UNVERIFIED** — a fast run is not evidence that a shorter timeout is safe, and upstream's recommendation stands
- `clear_stuck: true` only clears an orphaned job that is blocking new runs — it starts no tests, and it marks any job in the `running` state as failed without checking whether the run is still alive

Source: [`run_tests` tool reference @ v10.3.0](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/tools/testing/run_tests.md), retrieved 2026-10-21.

**Verification status — be precise about the split (observed 2026-10-21, bridge 10.3.0):**

- **The async job LIFECYCLE is VERIFIED end to end.** `run_tests(mode: "EditMode")` returned a `job_id`, and `get_test_job(job_id)` went `status: "running"` → `status: "succeeded"` in roughly 7.5 seconds — on a project that had no test assemblies, so that run reported `completed: 0, total: 0`.
- **EditMode pass/fail reporting is VERIFIED.** A throwaway test assembly with one deliberately passing and one deliberately failing test was built, imported, run and deleted. The job reported `summary: {total: 2, passed: 1, failed: 1, skipped: 0, durationSeconds: 0.33, resultState: "Failed(Child)"}` with NUnit's assertion text intact. The **`assembly_names`** filter is verified in the same run.
- **PlayMode pass/fail reporting is VERIFIED too (2026-10-21, bridge 10.3.0).** A throwaway PlayMode test assembly — three tests, one deliberately failing — was created, run and deleted. `run_tests(mode: "PlayMode", assembly_names: ["MCPVerify.PlayTests"], include_failed_tests: true, init_timeout: 120000)` ran end to end and the job reported `status: "failed"`, `mode: "PlayMode"`, `progress.completed: 3` of `total: 3`, and `summary: {total: 3, passed: 2, failed: 1, skipped: 0, durationSeconds: 0.0716135, resultState: "Failed(Child)"}` with `result.results: null`. **Two of the three passed, and one of those was a `[UnityTest]` coroutine** asserting `Time.frameCount` advanced across two `yield return null`s — so frame-based PlayMode tests genuinely execute, not just plain `[Test]` methods. The **`assembly_names`** filter works in PlayMode as well.
- **The PlayMode response shape is IDENTICAL to EditMode's — confirmed in both modes, so there is nothing mode-specific to re-learn.** `status: "failed"` reflects the **test outcome**, not a harness error (see "A Test Job's `status` Is the Test Outcome" below), and `result.results` came back `null` with failure detail arriving through `progress.failures_so_far` — exactly as in the EditMode runs. Read a PlayMode job with the same rules as an EditMode one.
- **The MCP session SURVIVES a PlayMode run, and it was a real domain reload.** The `get_test_job` poll issued immediately after the run succeeded — no `Session not found`, no `no_unity_session`. The reload was genuine, not skipped: `execute_code` reported `EditorSettings.enterPlayModeOptionsEnabled = False` and `enterPlayModeOptions = None`, so that project does **not** skip domain reload on Play Mode entry. **This does not soften the instance-ID rule**: the *session* surviving a domain reload and *instance IDs* surviving one are two different facts, and IDs still do not survive — re-resolve every id on the far side of a PlayMode run (see the instance-ID section in `unity-general.md`).
- **Play Mode *control* is verified separately.** `manage_editor` `play`/`pause`/`stop` were exercised on 10.3.0 (2026-10-21) and work. It is still a different code path from a Test-Framework-managed PlayMode test run — both are now verified, but evidence about one is not evidence about the other. See "Play Mode control is VERIFIED" in `unity-general.md`, and note the separate hazard recorded there: a scene mutation issued while Play Mode is on **succeeds and is then silently discarded**.
- **Also still UNVERIFIED**: whether a **smaller `init_timeout`** suffices for PlayMode (120000 was passed on the one verified run), the `test_names` / `group_names` / `category_names` filters, `clear_stuck`, whether `wait_timeout` blocks, and what `include_failed_tests` / `include_details` actually change — `result.results` came back `null` with either setting.
- **`manage_build` is UNVERIFIED on the verification machine, and that is not a defect.** Step 6 of the flow above pairs test runs with per-platform builds, but no `manage_build` call could be made: a `capability: mcp` / `effect: deny` rule in the **user's own** `~/.kiro/settings/permissions.yaml` blocked it before Unity saw it. That is the **user's security decision**, not a bug in this Power or in the bridge — report the matched rule and stop, and never edit that file on their behalf (see "Tool Call Denied by the IDE's Permissions" in `unity-general.md`).

### A Test Job's `status` Is the Test Outcome, Not the Run's Health

**VERIFIED on 10.3.0 (2026-10-21).** `get_test_job`'s top-level `status` reports what the tests did:

| `status` | What it means |
|---|---|
| `running` | the job has not finished |
| `succeeded` | every test that ran passed — **including when nothing ran at all** |
| `failed` | **at least one test assertion failed**; the run itself was fine |

The observed `failed` job had `error: null`, both of its tests executed, and `progress.completed: 2` of `progress.total: 2`. So **report a `failed` status as a test failure** — do not start debugging the harness. A genuine harness error looks different: the **`error`** field is populated and `progress.completed` / `total` never advance. Check those two before concluding the run broke.

Neither value means much on its own. The other end of the same scale was also observed: a run against a project with no test assemblies returned `status: "succeeded"` with `completed: 0, total: 0`. So "succeeded" can mean *nothing ran*. **Always report the status together with the counts**, never the status alone.

**Timing expectation**: two EditMode runs of two trivial tests each took about **4.2 seconds** wall clock (`started_unix_ms` → `finished_unix_ms`) while the tests themselves took 0.33 s and 0.21 s — roughly **4 seconds of fixed overhead per EditMode run**, independent of test count. The measured PlayMode run of three trivial tests took **~5.2 seconds** wall clock with `durationSeconds: 0.0716` — so on that machine **PlayMode added only about a second over EditMode despite the domain reload**. Both figures are measured on one machine; use them to set expectations, not as a budget. Do not treat a few seconds of apparent idleness as a stuck run; `progress.stuck_suspected` (with `progress.blocked_reason`) is the field to watch. And do **not** read the fast PlayMode number as a reason to lower `init_timeout` — that run passed `init_timeout: 120000`, so a smaller value is untested.

### Poll for Results

```
get_test_job(job_id: "...", wait_timeout: 30)
```

**Where failure detail actually comes from (VERIFIED on 10.3.0, 2026-10-21):** `progress.failures_so_far` — a list of `{full_name, message}` where `message` carries NUnit's assertion text, custom message included. Observed: `full_name: "MCPVerifyTests.MCPVerify_FailingTest"`, message containing `intentional failure for MCP verification`, `Expected: 5`, `But was: 4`.

**`result.results` was `null` in every observed run.** Two runs were compared — `include_failed_tests: true` + `include_details: false`, and `include_failed_tests: false` + `include_details: true`. `result.results` stayed `null` both times, and `progress.failures_so_far` was populated both times, **including with `include_failed_tests: false`**. So read failures from `progress.failures_so_far` whatever the flags say, and treat the effect of `include_failed_tests` / `include_details` on `result.results` as **NOT OBSERVED** rather than asserting what they do.

`result.summary` is the reliable aggregate: `{total, passed, failed, skipped, durationSeconds, resultState}` — observed `{total: 2, passed: 1, failed: 1, skipped: 0, durationSeconds: 0.33, resultState: "Failed(Child)"}`.

`wait_timeout` (seconds) is accepted with no validation error, which is meaningful because the server does reject unknown kwargs elsewhere. **Whether it blocks is UNVERIFIED** — both observed polls happened after the job had finished.

**The response carries considerably more than older drafts of this file described (VERIFIED on 10.3.0, 2026-10-21):** timestamps `started_unix_ms`, `finished_unix_ms` and `last_update_unix_ms`, plus a `progress` object containing `completed`, `total`, `current_test_full_name`, `last_finished_test_full_name`, `stuck_suspected`, `editor_is_focused`, `run_in_background`, `focus_nudge_attempts`, `focus_nudge_limit`, `focus_nudge_status`, `blocked_reason`, `failures_so_far` and `failures_capped`.

Use them instead of guessing at the run's state:

- `progress.completed` / `progress.total` → a real progress figure to report while the run is in flight
- `progress.current_test_full_name` / `last_finished_test_full_name` → where the run actually is
- `progress.failures_so_far` → report failures as they accumulate, without waiting for the terminal status; `failures_capped` says the server stopped collecting more
- `progress.blocked_reason` → why a job is not advancing; `stuck_suspected`, `editor_is_focused` and the `focus_nudge_*` fields describe the focus-nudging behaviour
- `started_unix_ms` / `finished_unix_ms` → the run's real duration, instead of timing the polling loop

**Also note `clear_stuck` on `run_tests`**: an orphaned `running` job lost to a domain reload will block new runs, and `clear_stuck: true` clears it (it starts no tests).

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
], fail_fast: false)
```

Each `run_tests` call still returns its own `job_id` — `batch_execute` here just fires both requests together; the developer still needs to poll each `job_id` separately with `get_test_job`. `fail_fast: false` is what makes "both requests" true: `fail_fast` defaults to `true`, so without it a rejected first call would stop the second from ever being sent. See `unity-general.md` under "Batch Operation Partial Failure Handling Guide" for the command cap and the rest of the batch semantics — including the verified rule that `batch_execute` bypasses the Python server layer, so an `Unknown action` error from inside a batch must be retested as a direct call before it is believed.

> **Common patterns**: The most common cross-platform *behavioral* failures (surfaced during PlayMode tests, or discovered manually on-device) are shader incompatibilities on mobile (especially OpenGL ES fallback devices — Unity 6 recommends Vulkan as the primary Android Graphics API, with OpenGL ES retained only as a compatibility fallback for older/unsupported hardware) and memory pressure on devices with 2GB RAM or less. Prioritize testing on low-end target devices first.

> **Unity 6.4 note**: If the project has the URP **GPU Resident Drawer** enabled (see `performance-analysis.md` — verify the actual `gpuResidentDrawerMode` on the URP Asset rather than assuming from version number), the GPU Resident Drawer silently falls back to standard drawing on unsupported Graphics APIs (OpenGL ES, VisionOS), so functional correctness is preserved but expected draw-call reductions will not materialize there. This is not something Unity Test Framework tests would catch — it needs a manual or `manage_graphics(action: "stats_get")`-based check on an actual build/device.

## Test Failure Log Handling Guide

### Failure Log Handling

1. **Extract failure messages**: Read `progress.failures_so_far` from the `get_test_job` response rather than parsing raw console text. It is populated with or without `include_failed_tests`, and `result.results` was `null` in every observed run — so there is no flag you need to set first
2. **Structure failure info**: Each entry observed on 10.3.0 is `{full_name, message}`, with `message` carrying NUnit's assertion text (custom message plus the `Expected:` / `But was:` detail). A stack trace was not present in that shape — inspect the actual response rather than assuming a richer schema, and pair the failures with `result.summary` for the counts
3. **Classify failure reasons** (by exception type in the message):
   - `AssertionError`: Assertion failure, test logic issue
   - `NullReferenceException`: Null reference, possibly platform/environment differences
   - `TimeoutException`: Timeout, possibly performance issue
   - `PlatformNotSupportedException`: Unsupported API call — flag as a genuine cross-platform compatibility issue, not a test bug

### Result Presentation Format

```
=== Test Report ===

[EditMode] status: failed — 19/20 passed (completed 20 / total 20, 1.84 s)
  ✗ TestPlayerMovement.TestTouchInput — NullReferenceException: Touch input not available in editor mode

[PlayMode] status: succeeded — 20/20 passed (completed 20 / total 20)
  ✓ All passed
```

State the job's `status` and the `completed`/`total` counts side by side. A bare "succeeded" hides the case where no tests ran, and a bare "failed" reads as a broken run rather than a failing assertion.

## Test Failure and Environment Troubleshooting

- If `run_tests`/`get_test_job` is reported as an unknown tool, the `testing` group may not be active for this session — run `manage_tools(action: "list_groups")`, then `sync`, then `activate` with `group: "testing"`, then refresh or reconnect the MCP client before retrying. Note that `list_groups` can report `enabled: false` for a group whose tools work fine, so judge by whether the retry succeeds, not by that field
- If the call comes back as *denied by permissions* instead, an IDE-side `capability: mcp` deny rule blocked it before Unity saw it — check `~/.kiro/settings/permissions.yaml`, report the matched rule, and stop (see "Tool Call Denied by the IDE's Permissions" in `unity-general.md`)
- If `run_tests`/`get_test_job` returns a connection error, prompt the developer to confirm Unity Editor is open and the MCP for Unity status panel reads `Connected`
- `get_test_job` may report `progress.stuck_suspected` or `progress.focus_nudge_status`, and the server may briefly focus the Unity window during a stalled run. That behaviour can be disabled by setting `UNITY_MCP_DISABLE_FOCUS_NUDGE=1` on the Python server. The `run_tests` → `get_test_job` **lifecycle and both EditMode and PlayMode pass/fail reporting are verified** on bridge 10.3.0 (see "Verification status" above)
- A `status: "failed"` job is **not** an error to troubleshoot — it means a test failed. Only treat the run as broken when `error` is populated and `progress.completed`/`total` never advanced
- If a new run is rejected because a job is already `running` and no run is actually alive — typically an orphan left behind by a domain reload — clear it with `run_tests(..., clear_stuck: true)`, then start the run again
- If a test job's status stays `"running"` far longer than expected (check `progress.stuck_suspected` if present), suggest the developer check if the Editor lost focus (some PlayMode test runs pause without an active window) or narrow the test scope
- If `wait_timeout` polling returns `"running"` repeatedly, keep polling with reasonable intervals rather than assuming failure — PlayMode tests with domain reload can take a while to start (the one measured PlayMode run took ~5.2 s end to end, but that is one data point on one machine, not a ceiling)
- **Do not expect a PlayMode run to drop the MCP session.** The verified PlayMode run went through a genuine domain reload (`enterPlayModeOptionsEnabled = False`) and the poll straight afterwards worked — so a `Session not found` or `no_unity_session` after a PlayMode run is a real connection problem to diagnose, not the expected cost of the reload. Instance IDs are a separate matter: those **do not** survive the reload, so re-resolve any id you were holding

## Cross-Platform Testing Strategy Recommendations

- Run EditMode tests first for fast feedback on pure logic, then PlayMode tests for scene/runtime behavior
- Create test categories (`category_names`) aligned with platform-conditional code areas for easy filtering
- Run tests regularly to avoid accumulating regressions
- Since Unity Test Framework itself doesn't test against a specific build target, pair test runs with an actual `manage_build` build for each shipped platform to catch platform-specific compile and shader issues that only show up at build time
