# Live MCP Verification — ground truth

Captured 2026-10-21 by calling the connected `unity-mcp` server against the user's
running Unity Editor. Every line below is an **observed tool response**, not documentation.
Treat this file as authoritative over POWER.md wherever they disagree.

## Environment

| Fact | Observed value | Source call |
|---|---|---|
| Unity Editor version | **6000.4.6f1** (Unity 6.4) | `execute_code` → `Application.unityVersion` |
| Platform / active build target | `WindowsEditor` / `StandaloneWindows64` | same |
| `manage_build(action:"platform")` | `target: StandaloneWindows64`, `target_group: Standalone`, `subtarget: Player` | `manage_build` |
| MCP bridge package | **`com.coplaydev.unity-mcp` 9.6.8** ("MCP for Unity"), source `Git` | `manage_packages(list_packages)` |
| Upstream bridge release | **v10.0.0 (2026-06-30)** → installed bridge is one MAJOR version behind | CoplayDev/unity-mcp README |
| Render pipeline | Universal (URP), asset `PC_RPAsset` at `Assets/Settings/PC_RPAsset.asset`, type `UniversalRenderPipelineAsset` | `manage_graphics(pipeline_get_info)` |
| Quality levels | `["Mobile","PC"]`, active `PC` (index 1), colorSpace `Linear`, `hasVolumeSystem: true` | same |
| URP package | `com.unity.render-pipelines.universal` **17.4.0** (BuiltIn) | `manage_packages` |
| Test Framework | `com.unity.test-framework` **1.6.0** | `manage_packages` |
| Input System | `com.unity.inputsystem` **1.19.0** | `manage_packages` |
| uGUI | `com.unity.ugui` **2.0.0** | `manage_packages` |
| Installed package count | 46 | `manage_packages` |
| Roslyn | **NOT installed** — `execute_code` reported `"compiler":"codedom"` under default `auto` | `execute_code` |
| Active scene | `SampleScene` at `Assets/Scenes/SampleScene.unity`, buildIndex 0, rootCount 3 | `manage_scene(get_active)` |
| ProBuilder / Memory Profiler / Cinemachine | NOT in the installed package list | `manage_packages` |

**Consequence of the codedom finding:** POWER.md's "avoid C# 7+ syntax unless Roslyn is
confirmed" caveat is correct AND load-bearing on this machine. Keep it.

## Live tool inventory — 43 tools

```
apply_text_edits  batch_execute  create_script  debug_request_context  delete_script
execute_code  execute_custom_tool  execute_menu_item  find_gameobjects  find_in_file
get_sha  get_test_job  manage_animation  manage_asset  manage_build  manage_camera
manage_components  manage_editor  manage_gameobject  manage_graphics  manage_material
manage_packages  manage_physics  manage_prefabs  manage_probuilder  manage_profiler
manage_scene  manage_script  manage_script_capabilities  manage_scriptable_object
manage_shader  manage_texture  manage_tools  manage_ui  manage_vfx  read_console
refresh_unity  run_tests  script_apply_edits  set_active_instance  unity_docs
unity_reflect  validate_script
```

### Tools that exist live but POWER.md does NOT document at all (7)

| Tool | Live description / params |
|---|---|
| `manage_tools` | **Tool-group gating.** Actions: `list_groups`, `activate`, `deactivate`, `sync`, `reset`. Params: `action` (required), `group`. Valid groups: `animation, core, docs, probuilder, profiling, scripting_ext, testing, ui, vfx`. "Activating a group makes its tools appear; deactivating hides them. Use sync after toggling tools in the Unity Editor GUI." |
| `execute_menu_item` | Execute a Unity menu item by path. Param: `menu_path`. |
| `execute_custom_tool` | Execute a project-scoped custom tool registered by Unity. Params: `tool_name` (required), `parameters`. |
| `set_active_instance` | Set the active Unity instance for this client/session. Param: `instance` (required) — accepts `Name@hash`, hash prefix, or port number (stdio only). Multi-instance routing. |
| `manage_script_capabilities` | Returns `manage_script` capabilities: `ops`, `text_ops`, `max_edit_payload_bytes`, `guards`. No params. |
| `find_in_file` | Regex search in a file, returns line numbers + excerpts. Params: `uri` (required), `pattern` (required), `project_root`, `max_results`, `ignore_case`. POWER.md only mentions it in passing under resources. |
| `debug_request_context` | Returns FastMCP request context (`client_id`, `session_id`, meta dump). No params. |

## TOOL GROUPS — undocumented gating mechanism (highest-value finding)

`manage_tools(action:"list_groups")` returned, verbatim per group:

| Group | `enabled` | `default_enabled` | Tools |
|---|---|---|---|
| **core** | true | **true** | 25 tools: `batch_execute, execute_menu_item, find_gameobjects, find_in_file, manage_asset, manage_build, manage_camera, manage_components, manage_editor, manage_gameobject, manage_graphics, manage_material, manage_packages, manage_physics, manage_prefabs, manage_scene, refresh_unity, apply_text_edits, create_script, delete_script, validate_script, manage_script, get_sha, read_console, script_apply_edits` |
| animation | false | **false** | `manage_animation` |
| docs | false | **false** | `unity_docs`, `unity_reflect` |
| probuilder | false | **false** | `manage_probuilder` (needs `com.unity.probuilder`) |
| profiling | false | **false** | `manage_profiler` |
| scripting_ext | false | **false** | `execute_code`, `manage_scriptable_object` |
| testing | false | **false** | `run_tests`, `get_test_job` |
| ui | false | **false** | `manage_ui` |
| vfx | false | **false** | `manage_shader`, `manage_texture`, `manage_vfx` |

Server note returned with the list: "Use activate/deactivate to toggle groups for this
session. Tools with group=None (server meta-tools) are always visible."

**Only `core` is on by default. 8 of 9 groups are off by default.**

### IMPORTANT nuance — do not overclaim

In this session every tool was still *visible and callable* despite `enabled: false`:
`manage_profiler(get_frame_timing)` returned real frame timings, `manage_ui(list)`
returned a valid empty result, and `execute_code` ran. So on this client the `enabled`
flag did **not** block invocation.

Therefore: the gating mechanism is REAL and completely undocumented, but it is **UNVERIFIED**
whether `enabled:false` blocks tool calls for other clients / fresh sessions, or whether the
flag merely mirrors the Unity Editor's GUI toggles while the client's cached tool list stays
full. The research step MUST pin down the enforcement semantics from the v10 source/docs
before writing the troubleshooting text. Document `manage_tools` + `sync` + `activate` as
the recovery path regardless.

### Which POWER.md workflows depend on default-OFF groups

- Connection Health Check suggests `execute_code` → `scripting_ext` (off by default)
- Workflow 4 (cross-platform testing) → `run_tests` / `get_test_job` → `testing` (off)
- Workflow 6 (performance analysis) → `manage_profiler` → `profiling` (off)
- Workflow 2 (scene scaffolding) → `manage_ui` → `ui` (off)
- "confirm an API exists via `unity_reflect`" guidance → `docs` (off)
- `manage_shader` / `manage_texture` → `vfx` (off); `manage_scriptable_object` → `scripting_ext` (off)

The health check must be changed to use a **core-group** call, e.g.
`manage_scene(action:"get_active")`, never `execute_code`.

## CONFIRMED-WRONG claims in POWER.md (each proved by a live error)

1. **`manage_editor` has no telemetry actions.** POWER.md states: "Read-only:
   `telemetry_status`, `telemetry_ping`". Live error:
   > Unknown action: 'telemetry_status'. Supported actions: play, pause, stop, set_active_tool, add_tag, remove_tag, add_layer, remove_layer, deploy_package, restore_package, undo, redo. For prefab editing (open/save/close prefab stage), use manage_prefabs. Use MCP resources for reading editor state, project info, tags, layers, selection, windows, prefab stage, and active tool.

2. **MCP resources for editor state DO exist.** POWER.md says: "Do not assume other resource
   URIs exist (e.g. a `project_info` or `editor_state` resource)" and "For current selection:
   not directly exposed as a tool as of this writing". The `manage_editor` error above
   explicitly directs callers to resources for **editor state, project info, tags, layers,
   selection, windows, prefab stage, and active tool**. POWER.md's warning is now
   actively misleading. Enumerate the real `mcpforunity://` resource URIs from the v10
   source and replace that section.

3. **`find_gameobjects.search_method` valid values are prefixed.** POWER.md's parameter table
   says `name/tag/layer/component/path`. Live error for `"name"`:
   > Input should be 'by_name', 'by_tag', 'by_layer', 'by_component', 'by_path' or 'by_id'

   So the table is WRONG and POWER.md's own Workflow 2 / Workflow 6 examples (`by_name`,
   `by_component`) are RIGHT. There is also an undocumented **`by_id`**.

4. **`find_gameobjects.search_method` is OPTIONAL, not required.** POWER.md says "both
   `search_term` and `search_method` are required". Live schema marks `search_term` required
   and `search_method` optional.

5. **`manage_build(action:"settings")` needs a `property` arg.** POWER.md lists `settings` as a
   bare action. Live error: `'property' parameter is required.`

6. **`unity_reflect` param is `class_name`, not `type_name`.** Live error for `type_name`:
   `Unexpected keyword argument`. Real schema: `get_type` requires `class_name`;
   `get_member` requires `class_name` + `member_name`; `search` requires `query`, optional
   `scope`. `unity_docs`: `get_doc` requires `class_name`, optional `member_name`, `version`.

7. **`batch_execute` has a command-count limit POWER.md never mentions:** "max commands per
   batch is configurable in the Unity MCP Tools window (default 25, hard max 100)."

8. **`execute_code` has an undocumented `safety_checks` param** (default `true`, blocks
   patterns like `File.Delete`/`Process.Start`/infinite loops; explicitly "not a full
   sandbox"). Compiler options confirmed: `auto` / `roslyn` (C# 12+, needs
   Microsoft.CodeAnalysis) / `codedom` (C# 6 only).

## CONFIRMED-CORRECT claims in POWER.md (keep these, do not "clean up")

- `manage_asset` has **no `list` action**. Live error confirms valid actions are
  `import, create, modify, delete, duplicate, move, rename, search, get_info,
  create_folder, get_components` — and additionally revealed that **`path` is a required
  argument**. `manage_asset(action:"search", path:"Assets/", search_pattern:"*.cs")`
  succeeded.
- `batch_execute` per-command key is **`params`**, not `args` — verified working, with
  `fail_fast: false` honored. Response shape: `results[].tool`, `results[].callSucceeded`,
  `results[].result`, plus `callSuccessCount` / `callFailureCount` / `parallelRequested` /
  `parallelApplied` / `maxParallelism`.
- `manage_graphics` action names `stats_get`, `stats_list_counters`, `pipeline_get_info`
  all verified working (no `get_rendering_stats` / `get_settings`).
- `manage_packages` is **asynchronous**: `list_packages` returned
  `{"_mcp_status":"pending","_mcp_poll_interval":1.0,"data":{"job_id":"...","operation":"list_packages"}}`
  and `action:"status", job_id:...` resolved it. Confirmed.
- `manage_build` is the build tool; `manage_editor` has no build action (confirmed by the
  `manage_editor` supported-action list above).
- `manage_ui` actions as documented — live description confirms `ping, read,
  get_visual_tree, list, create, update, delete, attach_ui_document, detach_ui_document,
  create_panel_settings, update_panel_settings, modify_visual_element, render_ui,
  link_stylesheet`.
- `find_gameobjects` returns **instance IDs only**, paginated:
  `{"instanceIDs":[49224],"pageSize":50,"cursor":0,"nextCursor":null,"totalCount":1,"hasMore":false}`.

## Verified-working read-only calls (use as regression probes)

| Call | Result |
|---|---|
| `manage_scene(get_active)` | ok |
| `manage_scene(get_hierarchy)` | ok |
| `manage_scene(get_build_settings)` | ok |
| `manage_graphics(pipeline_get_info)` | ok |
| `manage_graphics(stats_get)` | ok — all-zero draw calls in Edit mode; `render_textures: 39`, `render_textures_bytes: 74126624` |
| `manage_graphics(stats_list_counters)` | ok — large counter catalog |
| `manage_physics(get_settings)` | ok |
| `manage_camera(list_cameras)` | ok |
| `manage_material(ping)` | ok |
| `read_console(get)` | ok |
| `manage_profiler(get_frame_timing)` | ok |
| `manage_ui(list)` | ok |
| `manage_asset(search)` | ok |
| `manage_packages(list_packages)` + `status` | ok (async) |
| `unity_reflect(get_type, class_name:...)` | ok |
| `find_gameobjects(search_term:"Main Camera", search_method:"by_name")` | ok |
| `batch_execute` with `params` key | ok |
| `execute_code(execute)` | ok (codedom) |

## NOT verified (state as unverified; do not assert)

- Whether `enabled:false` on a tool group actually blocks invocation for a fresh client.
- Any modifying action (`create`/`modify`/`delete`/`build`/`play`) — nothing was mutated in
  the user's project; all probes were read-only by design.
- `run_tests` / `get_test_job` end-to-end (not exercised).
- `manage_probuilder` (package absent), memory-snapshot actions (`com.unity.memoryprofiler`
  absent), Cinemachine-dependent `manage_camera` paths (package absent).
- The bridge's real default transport/host/port/path — the installed 9.6.8 works over the
  session's existing connection, but `mcp.json`'s hardcoded `http://127.0.0.1:8080/mcp`
  was not independently proven to be the v10 default.
- The exact newest Unity 6.4 patch (this machine runs 6000.4.6f1; newer 6000.4.x exist).

---

# ROUND 2 — CORRECTIONS TO THIS FILE (captured 2026-10-21, after the first workflow)

The first round of probes contained a **methodology error**: several claims were tested
*inside* `batch_execute` rather than as direct tool calls. Round 2 retested everything with
direct calls. **Two Round-1 findings were wrong and were propagated into the repo by the
first workflow. They must be reverted.** Round 2 also produced four new verified facts.

Round 2 probe environment is unchanged: Unity 6000.4.6f1, bridge `com.coplaydev.unity-mcp` 9.6.8.

## C-1 — RETRACTED: "`manage_editor` has no telemetry actions" was WRONG

Round-1 finding #1 is **false**. Direct calls both succeed:

| Direct call | Result |
|---|---|
| `manage_editor(action:"telemetry_status")` | `{"success":true,"telemetry_enabled":true}` |
| `manage_editor(action:"telemetry_ping")` | `{"success":true,"message":"telemetry ping queued"}` |

POWER.md's ORIGINAL text ("Read-only: `telemetry_status`, `telemetry_ping`") was **correct**.
The first workflow deleted/"fixed" it based on the bad Round-1 claim. **Revert that
correction** everywhere it was propagated (POWER.md, steering, READMEs, workshops, templates),
and instead document C-2 below.

## C-2 — NEW, HIGH VALUE: `batch_execute` diverges from direct calls

The Round-1 error had a real cause, and it is a significant undocumented behaviour.
Reproduced deterministically:

| Action | Direct call | Same action inside `batch_execute` |
|---|---|---|
| `manage_editor(telemetry_status)` | SUCCESS | FAILS — `Unknown action: 'telemetry_status'` |
| `manage_editor(telemetry_ping)` | SUCCESS | FAILS — `Unknown action: 'telemetry_ping'` |

The batch path's error lists only the 12 Unity-side actions:
`play, pause, stop, set_active_tool, add_tag, remove_tag, add_layer, remove_layer,
deploy_package, restore_package, undo, redo`.

**Conclusion (VERIFIED):** `batch_execute` forwards commands straight to Unity's C# handler and
**bypasses action handlers implemented in the Python server layer**. Any server-layer action
silently fails when wrapped in a batch, with a misleading "Unknown action" message that makes
the action look nonexistent.

This matters a lot: `batch_execute`'s own description "STRONGLY RECOMMENDED" it for repetitive
work, and POWER.md pushes it throughout. Document prominently:
- Server-layer actions must be called directly, never inside `batch_execute`.
- An "Unknown action" error from inside a batch is NOT proof the action doesn't exist — retest
  it as a direct call before believing it.
- The Round-1 methodology error is the cautionary example; the verification rule in POWER.md
  ("a live Pydantic/Unknown-action error is authoritative") needs this qualifier added.

## C-3 — REVISED: tool-group semantics (partly opposite of what was assumed)

Three separate facts, all VERIFIED by direct probe:

1. **Deactivation really does remove tools.** After `manage_tools(action:"deactivate", group:"profiling")`
   → `{"deactivated":"profiling","tools":["manage_profiler"],"message":"Group 'profiling' is now hidden."}`,
   calling `manage_profiler` returned: `Tool 'manage_profiler' does not exist on server
   'power-kiro-unity-accelerator-unity-mcp'`. So group gating IS enforced.
2. **But the default state exposed ALL 43 tools, not just core's 25.** Every non-core tool
   (`manage_profiler`, `manage_ui`, `execute_code`, `unity_reflect`, `manage_animation`...) was
   callable from the start of the session, before any `manage_tools` call.
3. **`list_groups`' `enabled` / `default_enabled` fields are misleading.** They report
   `enabled:false` for all 8 non-core groups both before AND after `reset`, while those tools
   are demonstrably callable. After `manage_tools(action:"reset")` →
   `{"reset":true,"default_groups":["core"],"message":"Tool visibility restored to server defaults."}`
   yet `manage_profiler(get_frame_timing)` succeeded immediately afterwards.

The server was launched with `--project-scoped-tools` (see C-4), which may explain why the HTTP
session exposes everything regardless of the reported group flags.

**Consequence for the docs the first workflow wrote:** it added a mandatory
"activate the tool group first" step to every workflow that uses a non-core tool. On this
verified setup that step is **unnecessary** — the tools are already there. Reframe group
activation as **conditional troubleshooting** ("if a tool is reported as not existing, run
`manage_tools(list_groups)` then `activate`/`sync`"), not as a required preamble. Also stop
asserting "9 of 10 groups are opt-in so your tools are missing" as the explanation for
"cannot drive Unity" — on this install it was not the cause.

## C-4 — NEW: the "stale Python server" hypothesis is DISPROVEN

`debug_request_context` returned:

- `server.version`: **9.6.8** — identical to the UPM package version, so server and package are
  in sync. The first workflow's review hypothesised an older Python server behind a 9.6.8
  package; that is false. The telemetry anomaly was C-2, not a version skew.
- `server.argv`: `mcp-for-unity --transport http --http-url http://127.0.0.1:8080
  --project-scoped-tools --pidfile <project>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>`
- Executable resolved from the uv cache: `...\uv\cache\archive-v0\<hash>\Scripts\mcp-for-unity`
  → the console script is **`mcp-for-unity`**, not `unity-mcp`.
- `server.cwd` / Unity project: `<user-home>\kiro-workshop`
- `session_state.active_instance`: `kiro-workshop@b81f852b5f42fc9d`; `derived_key: "global"`;
  `plugin_hub_configured: true`
- `request_context.client_id` / `session_id`: both `null`; `direct_properties.session_id` is set.

**So `http://127.0.0.1:8080` is the correct, actually-in-use endpoint for this install** —
driven by the server's own `--http-url` flag, and the pidfile name encodes the port
(`mcp_http_8080.pid`). The port is not an arbitrary constant here, it is whatever `--http-url`
was launched with, and the pidfile under `<project>\Library\MCPForUnity\RunState\` is a reliable
way for a user to discover it. Document that discovery path.

## C-5 — NEW: Kiro's MCP namespace, and a user permission rule silently blocking a tool

- **Namespace prefix:** Kiro exposes a Power's MCP server as
  **`power-<powerName>-<serverName>`** → here `power-kiro-unity-accelerator-unity-mcp`.
  Confirmed twice: in the group-deactivation error message and in the permission denial below.
- **`manage_build` is denied on this machine.** A direct `manage_build(action:"settings")` call
  returned: `Tool call denied by user's permissions. Rule: deny mcp matching
  "power-kiro-unity-accelerator-unity-mcp/manage_build" Source:
  <user-home>\.kiro\settings\permissions.yaml`. The rule is at permissions.yaml line ~2281:
  `- capability: mcp` / `effect: deny` / `match: [power-kiro-unity-accelerator-unity-mcp/manage_build]`.

  So **Workflow 3 (Build Automation) cannot run on this machine** for a reason that has nothing
  to do with Unity or the bridge. This is a genuine, previously unconsidered root cause for
  "cannot drive Unity": a user- or workspace-level `permissions.yaml` deny rule. The
  troubleshooting section must tell users to check `~/.kiro/settings/permissions.yaml` for
  `capability: mcp` deny rules matching `power-<powerName>-<serverName>/<tool>`.

- **Possible permission bypass via `batch_execute` (flagging, not asserting a verdict).**
  The direct `manage_build` call was blocked by the permission layer, but the Round-1
  `batch_execute` containing `manage_build(action:"settings")` was NOT blocked — it reached
  Unity and came back with a Unity-side validation error (`'property' parameter is required.`).
  That suggests per-tool MCP deny rules are enforced on the outer tool call only, so
  `batch_execute` can reach a denied tool. Worth reporting upstream and worth a security note;
  do not document it as an exploit recipe.

## C-6 — DOWNGRADED to UNVERIFIED: `manage_build(action:"settings")` requires `property`

Round-1 finding #5 came through the `batch_execute` path, which C-2 shows is not equivalent to a
direct call — and `manage_build` cannot be called directly on this machine because of C-5. So
the `'property' parameter is required.` observation **cannot be confirmed as the direct-call
contract**. Re-label it UNVERIFIED. Do not assert it; keep any doc wording conditional until
someone with `manage_build` permitted re-tests it directly.

## Round-1 findings that SURVIVE Round 2 unchanged

These were tested with direct calls in Round 1 and remain valid:

- `manage_asset(action:"list")` does not exist; `path` is required. (direct)
- `find_gameobjects.search_method` values are `by_name/by_tag/by_layer/by_component/by_path/by_id`;
  `"name"` is rejected; `by_id` is undocumented in POWER.md; `search_method` is optional. (direct)
- `unity_reflect` uses `class_name`, not `type_name`. (direct)
- The 7 tools missing from POWER.md (`manage_tools`, `execute_menu_item`, `execute_custom_tool`,
  `set_active_instance`, `manage_script_capabilities`, `find_in_file`, `debug_request_context`). (direct)
- `batch_execute` per-command key is `params`; `fail_fast` is honoured. (direct)
- `execute_code` runs `codedom` (C# 6) — Roslyn absent. (direct)
- Environment facts: Unity 6000.4.6f1, bridge 9.6.8, URP 17.4.0 + `PC_RPAsset`, Test Framework
  1.6.0, Input System 1.19.0, uGUI 2.0.0, 46 packages, scene `SampleScene` with 3 roots.

## Still NOT verified after Round 2

- Whether `manage_build` works at all here (permission-denied; rule is the user's own).
- All mutating actions — nothing in the user's project was modified in either round.
- `run_tests` / `get_test_job` end to end.
- `manage_probuilder`, memory snapshots, Cinemachine `manage_camera` paths (packages absent).
- Whether the real `mcpforunity://` resource URIs exist as the `manage_editor` error text claims
  (editor state, project info, tags, layers, selection, windows, prefab stage, active tool) —
  no resource-reading tool was available to enumerate them from this client.
- Anything about bridge v10.x: this machine runs 9.6.8, so every v10 claim remains
  documentation-derived, not observed.

---

# ROUND 3 — read-only sweep of previously untested tools (2026-10-21)

All calls below are **direct** calls (never wrapped in `batch_execute`, per C-2). Environment
unchanged: Unity 6000.4.6f1, bridge `com.coplaydev.unity-mcp` 9.6.8, URP, project
`kiro-workshop` with `SampleScene` (3 roots, 8473 assets). Nothing in the project was modified.

## D-1 — `unity_docs(get_doc)` requires an UNQUALIFIED class name (silent failure otherwise)

| Call | Result |
|---|---|
| `unity_docs(action:"get_doc", class_name:"UnityEngine.Rigidbody2D")` | `{"success":true,"data":{"found":false,"suggestion":"Try unity_reflect search action..."}}` |
| `unity_docs(action:"get_doc", class_name:"Rigidbody2D")` | `{"success":true,"data":{"found":true,"url":"https://docs.unity3d.com/ScriptReference/Rigidbody2D.html","class":"Rigidbody2D","description":"Provides physics movement and other dynamics, and the ability to attach Collider2D to it."}}` |
| `unity_reflect(action:"get_type", class_name:"Rigidbody2D")` | found:true |
| `unity_reflect(action:"get_type", class_name:"UnityEngine.GameObject")` | found:true (Round 1) |

**VERIFIED:** `unity_docs` wants the short name; `unity_reflect` accepts either short or
namespace-qualified. The `unity_docs` failure mode is **`success: true` with `found: false`** —
a silent miss, not an error. This is a trap for POWER.md's own guidance ("use `unity_reflect` to
confirm an API exists, then `unity_docs` for usage"): an agent that passes a qualified name to
`unity_docs` gets `found:false` and can wrongly conclude the API does not exist. Document the
parameter-form difference and the silent-miss shape explicitly.

## D-2 — `find_in_file` is C#-script-only, despite its description

Call: `find_in_file(uri:"Assets/Scenes/SampleScene.unity", pattern:"m_Name", max_results:3)`
Result: `{"success":false,"error":"Script not found at 'Assets/Scenes/SampleScene.cs'."}`

**VERIFIED:** the tool rewrote the extension from `.unity` to `.cs` and looked for a script. Its
own parameter description ("The resource URI to search under Assets/ or file path form supported
by read_resource") implies general asset search, which is misleading. Document it as a
**C# script search tool only**.

UNVERIFIED: the success path. This project contains **zero `.cs` assets**
(`manage_asset(action:"search", path:"Assets/", search_pattern:"*.cs")` returned 0), so no
positive case could be exercised. Same reason blocks testing `get_sha`, `validate_script`,
`apply_text_edits` and `script_apply_edits`.

## D-3 — Unity 6.4 obsolete physics members (live reflection — affects the workshops)

`unity_reflect(get_type, ...)` reported `obsolete_members` directly from the connected 6.4 Editor:

| Type | Assembly | `obsolete_members` |
|---|---|---|
| `Rigidbody2D` | UnityEngine.Physics2DModule | `angularDrag`, `drag`, `fixedAngle`, `isKinematic`, `OverlapCollider`, `velocity`, `velocityX`, `velocityY` |
| `Rigidbody` | UnityEngine.PhysicsModule | `angularDrag`, `drag`, `SetDensity`, `velocity` |

Current replacements, confirmed present in the same `properties` lists:

| Obsolete | Use instead | Applies to |
|---|---|---|
| `velocity` | `linearVelocity` | both 2D and 3D |
| `velocityX` / `velocityY` | `linearVelocityX` / `linearVelocityY` | 2D only |
| `drag` | `linearDamping` | both |
| `angularDrag` | `angularDamping` | both |
| `isKinematic` | `bodyType` (`RigidbodyType2D`) | **2D only** |

**Note the asymmetry, it is easy to get wrong:** `isKinematic` is obsolete on `Rigidbody2D` but
is still a valid, non-obsolete property on the 3D `Rigidbody`. Do not "correct" 3D code to
`bodyType`.

**Why this matters here:** `workshop\2d-platformer-game.md` and `workshop\2d-shooter-game.md`
describe physics behaviour in Chinese prose without naming the API — e.g. line 124 says to set
the Rigidbody2D's horizontal velocity directly, and line 168 says to zero the velocity on
respawn. A grep confirmed the workshops contain **zero** occurrences of `velocity`, `drag`,
`angularDrag`, `isKinematic`, `velocityX`, `velocityY`, `FindObjectOfType`, `Input.GetAxis` or
`GetComponent<`, so nothing is currently wrong. But because the prompts never name the current
API, an agent generating the code from memory will very likely emit the classic `rb.velocity`
pattern, which is obsolete on 6.4. The workshops should name `linearVelocity` (and the rest of
the table above) explicitly so the generated code is 6.4-clean. The only concrete API the
workshops do name is `SceneManager.LoadScene` (platformer L328, shooter L230), which is current.

## D-4 — Newly verified working read-only calls

| Call | Observed |
|---|---|
| `manage_script_capabilities()` | `ops`: replace_class, delete_class, replace_method, delete_method, insert_method, anchor_insert, anchor_delete, anchor_replace; `text_ops`: replace_range, regex_replace, prepend, append; `max_edit_payload_bytes`: **262144**; `guards.using_guard`: true; `extras.get_sha`: true |
| `manage_scene(get_loaded_scenes)` | 1 scene, `isActive:true`, rootCount 3 |
| `manage_graphics(feature_list)` | rendererDataName `PC_Renderer`, 1 feature: `ScreenSpaceAmbientOcclusion` active |
| `manage_graphics(skybox_get)` | full environment block — skybox `Default-Skybox` / `Skybox/Procedural`, ambient mode `Skybox`, fog disabled (`ExponentialSquared`), reflection mode `Skybox` res 128, sun `Directional Light` (instanceID 49234) |
| `manage_asset(get_info, path:"Assets/Scenes/SampleScene.unity")` | guid `99c9720ab356a0642a771bea13969a05`, assetType `UnityEditor.SceneAsset`, instanceID 49644 |
| `manage_profiler(get_counters, category:"Memory")` | 44 counters; each counter also returns `_valid` and `_unit` companion keys (e.g. `Texture Memory` 148440708 Bytes, `Asset Count` 8473, `Game Object Count` 9, `Scene Object Count` 474) |
| `manage_camera(get_brain_status)` | correctly fails with a clear message: action requires `com.unity.cinemachine`, package not installed |

Two documentation-relevant details from the above: `manage_profiler(get_counters)` returns
`<name>`, `<name>_valid` and `<name>_unit` triples rather than flat values, and
`manage_camera`'s Cinemachine-dependent actions fail with an explicit package-missing message
rather than silently — which supports POWER.md's existing "works with or without Cinemachine"
wording for `create_camera` while making clear that `*_brain_*` actions do not.

## Still NOT verified after Round 3

- Everything that writes: all `create`/`modify`/`delete` actions, `manage_gameobject`,
  `manage_components`, `manage_prefabs` mutations, `execute_menu_item`, `refresh_unity`.
- `manage_build` — blocked by the user's own `permissions.yaml` deny rule (C-5).
- `run_tests` / `get_test_job` end to end.
- All script tools' success paths — the project has no `.cs` assets (D-2).
- `manage_probuilder`, memory snapshots, Cinemachine camera paths — packages absent.
- The 25-URI `mcpforunity://` resource table added in this update: this client exposes no
  resource-reading tool, so the URIs could not be enumerated or fetched. Still
  documentation-derived.
- Anything about bridge v10.x — this machine runs 9.6.8.
