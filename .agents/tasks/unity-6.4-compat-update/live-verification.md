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

---

# ROUND 4 — live 9.6.8 → 10.3.0 upgrade, performed and observed (2026-10-21)

The bridge was actually upgraded on the verification machine. Everything below was observed
during that upgrade (process command lines, Unity editor log, manifest, PyPI/GitHub release
metadata). This round supersedes the earlier rounds' "all v10 claims are documentation-derived"
caveat for the facts listed here. The user's Unity remains 6000.4.6f1.

## E-1 — v10.3.0 is the current release, and the matching server exists

- GitHub `releases/latest` → `tag_name: "v10.3.0"`, `name: "v10.3.0"`, `published_at:
  2026-10-04T02:52:24Z`, `prerelease: false`, `target_commitish: "beta"`. Asset:
  `unity-mcp-10.3.0.mcpb`. So v10.3.0 is a real, non-prerelease release.
- PyPI `mcpforunityserver` has `mcpforunityserver-10.3.0.tar.gz`, uploaded
  `2026-10-04T02:52:47Z` (same minute as the GitHub release), `requires_python: ">=3.10"`.
- Release notes highlights relevant to this Power: a fix for Unity 6000.6
  `InstanceIDToObjectCompat`; `fix(stdio): refresh port discovery before reconnect backoff`;
  `fix(read_console): stop the Console window's filters from hiding entries`;
  `docs(skill): say where to look when a tool is not in the tool list`; new Blender Bridge; and
  auto-discovery of fal / OpenRouter asset-generation models.

## E-2 — ROOT CAUSE of being stranded on an old bridge: installing with `#main`

The machine's `Packages/manifest.json` contained:
`"com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main"`
while the installed package resolved to **9.6.8** and upstream was already 10.3.0.

**VERIFIED:** a git UPM dependency pinned to a moving ref such as `#main` is resolved **once**
and then cached by Unity. It does not track the branch. The user sits on whatever commit was
current at first resolve, indefinitely, with no upgrade prompt. Changing the ref to an explicit
tag (`#v10.3.0`) changes the dependency string, which forces Unity to re-resolve and actually
upgrades.

**This is a documentation bug in this repo.** `POWER.md` (install step) and `README.md` both
still instruct `...?path=/MCPForUnity#main`. Anyone following those instructions is set up to be
stranded on whatever version they first installed — a direct contributor to the reported
"cannot drive Unity", since a months-old bridge will not match the documented tool surface.
Upstream's own README says to pin the release tag. The install guidance must change to a pinned
tag, with an explanation of the caching behaviour and how to upgrade later.

## E-3 — THE TWO INDEPENDENT VERSION PINS (the big undocumented mechanism)

MCP for Unity is two components with **separately pinned versions**:

1. The Unity **UPM package** (C# editor side) — pinned in `Packages/manifest.json`.
2. The **Python MCP server** — pinned in the launch command line, observed verbatim before the
   upgrade as:
   `uvx --from "mcpforunityserver==9.6.8" mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile <project>\Library\MCPForUnity\RunState\mcp_http_8080.pid --unity-instance-token <token>`

Observed process tree (pre-upgrade): `uvx.exe` → `uv.exe tool uvx --from mcpforunityserver==9.6.8`
→ `mcp-for-unity.exe` (from uv cache archive `hIhdP2TZcOvbkf3X`) → `python.exe` holding port 8080.

**VERIFIED CONSEQUENCE:** upgrading the UPM package alone does **not** upgrade the Python server.
The running server kept reporting `server.version: "9.6.8"` from the old cache archive even after
the manifest said `#v10.3.0` and Unity had imported and compiled the v10.3.0 C# code cleanly
(editor log showed the new `Editor/Services/Blender`, `Editor/Tools/AssetGen`,
`Editor/Security/SecureKeyStore` trees importing, with zero `error CS`).

**The mismatch breaks the bridge completely.** With C# at v10.3.0 and Python at 9.6.8, every
Unity-dependent tool call returned:
`{"success":false,"error":"Unity session not available; please retry","data":{"reason":"no_unity_session","retry_after_ms":250}}`
while server-layer-only tools (`debug_request_context`) still answered. So the symptom of a
version mismatch is *selective*: the server appears alive, but nothing touching Unity works.
That is an extremely confusing failure mode and deserves an explicit troubleshooting entry.

**Recovery that worked:** stop the stale server process chain, then start the server from Unity
(Window → MCP for Unity → Start Server). Unity, now running v10.3.0 C#, relaunched it with a
matching pin — observed afterwards as:
`uvx --offline --from "mcpforunityserver==10.3.0" mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile ... --unity-instance-token ...`
from a NEW uv cache archive `i8nZG0Ewwibnn1em`, with port 8080 listening again. Both components
are now at 10.3.0.

Notes on the recovery:
- The server did **not** auto-restart after the package upgrade, and it did not restart on its
  own after the process chain was killed. It required the explicit Start Server action in Unity.
- A stale `mcp_http_<port>.pid` file remained in `<project>\Library\MCPForUnity\RunState\` after
  the kill and was removed manually; the fresh start recreated it.
- Pre-seeding the uv cache with `uvx --from "mcpforunityserver==10.3.0" mcp-for-unity --help`
  made the restart fast and let Unity launch with `--offline`. Useful tip for slow networks.

## E-4 — the MCP client's session does not survive a server restart

After the server restarted at 10.3.0, the already-connected Kiro client's calls failed with:
`{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Session not found"}}`
Distinct from the `no_unity_session` error in E-3: this one is the MCP transport session, not the
Unity bridge. The client must reconnect (Kiro's MCP Server panel → reconnect, or restart the
client) to obtain a new session and re-read the tool list. Worth documenting next to the upgrade
procedure, since an upgrade always triggers it.

## E-5 — v10.3.0 server CLI surface (from `mcp-for-unity --help`)

```
mcp-for-unity [-h] [--default-instance INSTANCE] [--transport {stdio,http}]
              [--http-url URL] [--http-host HOST] [--http-port PORT]
              [--http-remote-hosted] [--api-key-validation-url URL]
              [--api-key-login-url URL] [--api-key-cache-ttl SECONDS]
              [--api-key-service-token-header HEADER] [--api-key-service-token TOKEN]
              [--unity-instance-token TOKEN] [--pidfile PATH] [--project-scoped-tools]
```

New in v10 relative to what the 9.6.8 launch line used: `--http-host` / `--http-port` as
separate options alongside `--http-url`, `--http-remote-hosted`, the `--api-key-*` group
(remote-hosted auth), and `--default-instance`. `--project-scoped-tools` and
`--unity-instance-token` carry over. This confirms the stdio fallback form the docs already
use (`uvx --from mcpforunityserver mcp-for-unity --transport stdio`) is correct, and that
pinning a version in `--from` is the real-world convention.

## Still NOT verified

- The v10.3.0 **tool inventory and per-tool contracts**: the client session was invalidated by
  the restart (E-4) before any v10 tool could be called. Everything in the repo about v10's
  43-vs-48 tool count, the `asset_gen` group, and per-action parameters remains
  documentation-derived. A fresh sweep after the client reconnects is still needed.
- Whether `asset_gen` is off by default (it spends third-party credits, so this matters).
- All mutating actions, `run_tests` / `get_test_job`, `manage_build` (still blocked by the
  user's `permissions.yaml` deny rule, C-5), script-tool success paths (project has no `.cs`).
- Whether the earlier Round-2/Round-3 findings still hold on 10.3.0 — in particular C-2
  (`batch_execute` bypassing server-layer actions), D-1 (`unity_docs` name form) and D-2
  (`find_in_file` coercing to `.cs`) were all observed on 9.6.8 and must be re-checked.

---

# ROUND 5 — live verification ON v10.3.0 (2026-10-21)

The client reconnected after the upgrade, so the v10 tool surface was finally exercised directly.
This round **closes the biggest UNVERIFIED gap** left by Round 4. All calls are direct calls
unless stated. Unity 6000.4.6f1, bridge now 10.3.0 on both sides. Nothing was mutated.

## F-1 — version confirmed, and a v10 security improvement

`debug_request_context` → `server.version: "10.3.0"`, running from uv cache archive
`i8nZG0Ewwibnn1em`, argv:
`mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile <project>\Library\MCPForUnity\RunState\mcp_http_8080.pid --unity-instance-token ***`

**New in v10:** the instance token is **masked as `***`** in the debug output. On 9.6.8 the same
call returned the token in clear text. Worth noting as a hardening improvement (it also means
earlier guidance about manually redacting that value before sharing logs is less critical,
though still good practice). New session id issued; `session_state` no longer reports the
`derived_key` / `all_keys_in_store` fields that 9.6.8 returned.

## F-2 — tool inventory: 43 → 49, PURELY ADDITIVE (verified, not inferred)

Diffing the live tool list from the two bridge versions on the same machine:

- 9.6.8: **43** tools
- 10.3.0: **49** tools
- **Added (6):** `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`,
  `import_model`, `import_model_file`
- **Removed or renamed: NONE**

So the 9.6.8 → 10.3.0 delta really is purely additive. Earlier passes asserted "no migration
cost" from documentation; that is now an observed fact. Every tool name the Power documents
still exists on 10.3.0.

Minor discrepancy worth recording: upstream's README advertises "48 focused MCP tool
entrypoints" while the live count is 49. Treat the live count as authoritative and do not
repeat a hard number from upstream marketing copy.

## F-3 — the `asset_gen` group: exists, OFF by default, spends third-party credits

`manage_tools(list_groups)` on 10.3.0 returned a tenth group absent from 9.6.8:

| Group | `enabled` | `default_enabled` | Tools |
|---|---|---|---|
| **asset_gen** | false | **false** | `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model`, `import_model_file` (6) |

Its description: AI asset generation — 3D model gen/import, 2D image gen and audio gen,
**bring-your-own-key**.

**VERIFIED: it is off by default.** That is the safe default, because these tools call paid
third-party services (the v10.3.0 release notes add auto-discovery of fal and OpenRouter
models). Document that activating `asset_gen` exposes credit-spending tools, and keep routing
no workflow through it.

**Deliberately NOT exercised:** none of the six asset_gen tools was called, because doing so
would spend the user's money. Their per-action contracts remain documentation-derived.

All nine other groups are byte-for-byte identical to 9.6.8: core 25 (on by default), animation 1,
docs 2, probuilder 1, profiling 1, scripting_ext 2, testing 2, ui 1, vfx 3 — all
`default_enabled: false` except `core`.

## F-4 — the three earlier findings REPRODUCE EXACTLY on 10.3.0

Each had been observed only on 9.6.8 and was flagged for re-check. All three still hold:

| Finding | Re-test on 10.3.0 | Result |
|---|---|---|
| **C-2** `batch_execute` bypasses server-layer action handlers | `manage_editor(telemetry_status)` direct vs. inside `batch_execute` | Direct → `{"success":true,"telemetry_enabled":true}`. Batched → `Unknown action: 'telemetry_status'` with the same 12-Unity-action list. **Divergence persists.** |
| **D-1** `unity_docs` needs an unqualified class name | `unity_docs(get_doc, class_name:"UnityEngine.Rigidbody2D")` | `{"success":true,"data":{"found":false,...}}` — same silent miss. **Persists.** |
| **D-2** `find_in_file` is C#-script-only | `find_in_file(uri:"Assets/Scenes/SampleScene.unity", pattern:"m_Name")` | `Script not found at 'Assets/Scenes/SampleScene.cs'.` — still rewrites the extension. **Persists.** |

So all three are now **verified on BOTH 9.6.8 and 10.3.0**, not version-specific quirks. The
documentation for them can drop any "may be fixed in v10" hedging.

## F-5 — core tool contracts unchanged on 10.3.0

| Call | Result |
|---|---|
| `manage_asset(action:"list", path:"Assets/")` | Rejected with the identical valid-action list: `import, create, modify, delete, duplicate, move, rename, search, get_info, create_folder, get_components`. Still **no `list` action**. |
| `find_gameobjects(search_term:"Main Camera", search_method:"name")` | Rejected with the identical list: `by_name, by_tag, by_layer, by_component, by_path, by_id`. Prefixed values and `by_id` both still correct. |
| `manage_scene(action:"get_active")` | Works — `SampleScene`, buildIndex 0, rootCount 3. |

The Power's documented action/parameter contracts therefore survive the major version bump
intact.

## Verification status after Round 5 — what is now settled

Converted from documentation-derived to **VERIFIED on 10.3.0**: the bridge version; the full
49-tool inventory and the purely-additive delta; the existence, membership and default-off state
of `asset_gen`; all ten group memberships and defaults; the `batch_execute` server-layer
divergence; the `unity_docs` name-form trap; `find_in_file` being script-only; and the
`manage_asset` / `find_gameobjects` / `manage_scene` contracts.

## Still NOT verified (unchanged, and honest)

- **All mutating actions** — `create`/`modify`/`delete`, `manage_gameobject`,
  `manage_components`, `manage_prefabs` mutations, `execute_menu_item`, `refresh_unity`.
  Nothing in the user's project was ever modified across all five rounds.
- **`asset_gen`'s six tools** — intentionally never called; they spend real money.
- **`manage_build`** — still blocked by the user's own `permissions.yaml` MCP deny rule (C-5),
  so C-6 (the `settings` action's `property` requirement) stays UNVERIFIED.
- **`run_tests` / `get_test_job`** end to end.
- **Script-tool success paths** (`find_in_file`, `get_sha`, `validate_script`,
  `apply_text_edits`, `script_apply_edits`) — the verification project still has zero `.cs`
  assets.
- **`manage_probuilder`, memory snapshots, Cinemachine `manage_camera` paths** — packages absent.
- **The 25-URI `mcpforunity://` resource table** — this client exposes no resource-reading tool,
  so the URIs still could not be enumerated or fetched.

---

# ROUND 6 — MUTATING actions verified on v10.3.0 (2026-10-21)

The write path was finally exercised. Everything was created inside an isolated folder
`Assets/_MCPVerify/` with `MCPVerify_*` object names, then deleted; the project was confirmed
back at its original baseline afterwards (see F6-8). Unity 6000.4.6f1, bridge 10.3.0 both sides.

Baseline before: `SampleScene`, 3 roots — Main Camera (49224), Directional Light (49234),
Global Volume (49242); **0** `.cs` assets.

## G-1 — THE BIG ONE: instance IDs are volatile and must never be cached

Tracked a single GameObject across its lifetime:

| Moment | Reported instanceID |
|---|---|
| `manage_gameobject(create)` returned | **-5560** (negative) |
| later, in `manage_gameobject(duplicate)`'s `originalId` | **50436** (positive) |
| later, in `manage_prefabs(create_from_gameobject)`'s `instanceId` | **50470** |

And after the `refresh_unity` recompile / domain reload, **objects nobody touched were also
renumbered**: Main Camera 49224 → **50412**, Directional Light 49234 → **50422**,
Global Volume 49242 → **50430**.

**VERIFIED CONSEQUENCES:**
- A newly created GameObject's instance ID is **transient and negative**. Once the object is
  registered, it becomes a different, positive ID, and the negative one stops resolving:
  `manage_gameobject(action:"duplicate", target:"-5560", search_method:"by_id")` failed with
  `Target GameObject ('-5560') not found using method 'by_id'`.
- **Instance IDs do not survive a domain reload** — not even for untouched objects.
- Therefore any multi-step workflow that captures an instance ID and reuses it later is unsafe.
  This hits this Power directly: Workflow 2 (scene scaffolding) chains object creation and then
  operates on what it created, and `find_gameobjects` returns *only* instance IDs.

**Guidance to document:** prefer **names or paths** as the durable handle across steps; re-resolve
instance IDs immediately before use; never carry an ID across a `refresh_unity`, a recompile, or
anything that triggers a domain reload. POWER.md currently says "instance ID preferred" for
`manage_components.target` — that is fine *within* a single immediate step, but must be qualified
with this lifetime warning.

## G-2 — Three INCONSISTENT `target` conventions across the three object tools

All three take a parameter called `target`, and all three resolve it differently:

| Tool | Accepted `target` | Evidence |
|---|---|---|
| `manage_components` | **int** instance ID works | `target: -5560` (int) → `Component 'Rigidbody' added` |
| `manage_gameobject` | **must be a string**, and is treated as a **name** by default | `target: -5560` (int) → `Input should be a valid string`. `target: "-5560"` → `not found using method 'default'`. `target: "MCPVerify_Cube"` → success. `search_method:"by_id"` works only with a **positive** id: `target:"50436"` → success |
| `manage_prefabs` | requires the **name**; an instance-ID string fails | `target: "50436"` → `GameObject '50436' not found in the active scene or prefab stage`. `target: "MCPVerify_Cube"` → success |

This is a real trap: an agent that learns "pass the instance ID" from one tool's docs will fail
on the other two. Document the per-tool convention explicitly.

## G-3 — `script_apply_edits` does NOT take `uri` (documentation error in this repo)

`script_apply_edits` requires **`name` + `path`**, not `uri`:
- `uri: "Assets/_MCPVerify/MCPVerifyProbe.cs"` → `3 validation errors`: `name` missing,
  `path` missing, `uri` unexpected keyword argument.
- `name: "MCPVerifyProbe"`, `path: "Assets/_MCPVerify"` → success.

**POWER.md is currently WRONG about this.** Its script-URI note says the `uri` argument of
`apply_text_edits` / **`script_apply_edits`** / `get_sha` / `validate_script` / `delete_script` /
`find_in_file` accepts three forms. `script_apply_edits` must be removed from that list and
documented with its own `name` + `path` signature.

Successful response shape: `{path, uri, editsApplied: 1, scheduledRefresh: false, sha256,
normalizedEdits: [...], routing: "structured"}`. Canonical edit fields confirmed from the live
description: `op` (one of `replace_method, insert_method, delete_method, anchor_insert,
anchor_delete, anchor_replace`), `className`, `methodName`, `replacement`; plus
`options.validate` (`standard` / `basic`).

## G-4 — `refresh_unity` parameter VALUES (both are enums, and `compile` is NOT a boolean)

`mode: "both", compile: true` → `2 validation errors`:
- `mode` must be `'if_dirty'` or `'force'`
- `compile` must be `'none'` or `'request'` — a **string**, not a bool

Correct call `{mode:"force", compile:"request", wait_for_ready:true}` returned
`{refresh_triggered:true, compile_requested:true, compile_started:true,
resulting_state:"compiling"}`.

POWER.md lists the parameter *names* but not their allowed values, so `compile: true` is the
natural and wrong guess. Document the enums.

**Bonus corroboration:** the response `hint` reads "poll the `mcpforunity://editor/state`
resource until `data.advice.ready_for_tools` is true" — independent confirmation that the
editor-state resource really exists, which is what Round 1 flagged (POWER.md's old
"do not assume editor-state resources exist" warning was wrong and has already been fixed).

## G-5 — `manage_gameobject(duplicate)` ignores the `name` parameter

Called with `name: "MCPVerify_Cube_Dup"`; the duplicate was created as **`MCPVerify_Cube_Copy`**
(Unity's own auto-naming). So `name` is not an alias for the new object's name on `duplicate` —
rename afterwards with `action:"modify"` if a specific name is needed. Document this.

The duplicate correctly inherited the added `Rigidbody` (`componentNames` included
`UnityEngine.Rigidbody`), confirming the earlier component add really applied.

## G-6 — Unity 6.4's current physics API works through the bridge

`manage_components(action:"set_property", component_type:"Rigidbody", properties:{linearDamping:
2.25, useGravity:false, mass:7.5})` succeeded, and reading back via `execute_code` returned:
`MCPVerify_Cube mass=7.5 linearDamping=2.25 useGravity=False`.

So the 6.4 replacement property `linearDamping` (for the obsolete `drag`) is settable through
`manage_components`, and the `properties` dictionary form works for multiple properties at once.
This validates the Round-3 obsolete→current physics mapping end to end on a real object.

## G-7 — mutating actions and async jobs: all verified

| Call | Result |
|---|---|
| `manage_asset(create_folder, path:"Assets/_MCPVerify")` | ok — returned guid, instanceID, `isFolder:true` |
| `create_script(path, contents)` | ok — returned `uri: mcpforunity://path/...`, `scheduledRefresh:false`. Params are `path` + `contents` (plain text; the server base64-encodes) |
| `get_sha(uri)` | ok — `sha256`, `lengthBytes: 249` |
| `validate_script(uri)` | ok — `{warnings:0, errors:0}` |
| `find_in_file(uri, pattern)` **success path** | ok — `matches[{line, content, match, start, end}]`, `count`, `total_matches`. Closes the D-2 success-path gap |
| `script_apply_edits(name, path, edits)` | ok (see G-3) |
| `manage_gameobject(create, primitive_type:"Cube", position:[10,0,10])` | ok — Transform/MeshFilter/BoxCollider/MeshRenderer |
| `manage_components(add, "Rigidbody")` | ok — `componentInstanceID` returned |
| `manage_components(set_property, properties:{...})` | ok (see G-6) |
| `manage_gameobject(modify, position, search_method:"by_id")` | ok — position updated |
| `manage_gameobject(duplicate)` | ok (see G-5) |
| `manage_prefabs(create_from_gameobject, prefab_path)` | ok — `componentCount:5`, `wasUnlinked:false`, `wasReplaced:false`, "instance linked" |
| `manage_gameobject(delete)` ×2 | ok |
| `delete_script(uri)` | ok — "moved to trash" |
| `manage_asset(delete, folder path)` | ok — removed the folder and the prefab inside it |
| `refresh_unity` | ok (see G-4) |
| `run_tests(mode:"EditMode")` → `get_test_job(job_id)` | **end-to-end ok** — `status:"running"` then `status:"succeeded"` in ~7.5s. `completed:0, total:0` since the project has no test assemblies, but the full async job lifecycle is confirmed |

`get_test_job`'s response carries more than the docs describe: `started_unix_ms`,
`finished_unix_ms`, `last_update_unix_ms`, and a `progress` object with `completed`, `total`,
`current_test_full_name`, `last_finished_test_full_name`, `stuck_suspected`,
`editor_is_focused`, `run_in_background`, `focus_nudge_attempts`, `focus_nudge_limit`,
`focus_nudge_status`, `blocked_reason`, `failures_so_far`, `failures_capped`. `run_tests` also
accepts `group_names`, `include_details`, `init_timeout` (PlayMode needs longer — upstream
recommends 120000) and `clear_stuck` (to clear an orphaned job lost to a domain reload), none of
which the Power documents.

## G-8 — cleanup verified: project restored

After cleanup: `SampleScene` has exactly its original **3** roots with the original names and
component sets (Main Camera, Directional Light, Global Volume), and `manage_asset(search,
"*.cs")` returns **0** assets. `Assets/_MCPVerify/` and everything in it is gone. Only the
instance IDs differ, for the domain-reload reason in G-1.

## Still NOT verified after Round 6

- The six `asset_gen` tools — intentionally never called; they spend real money.
- `manage_build` — still blocked by the user's own `permissions.yaml` MCP deny rule (C-5), so
  C-6 (the `settings` action's `property` requirement) remains UNVERIFIED.
- `run_tests` with **actual tests** — the project has no test assemblies, so pass/fail
  reporting, `include_failed_tests` and PlayMode behaviour are unexercised.
- `execute_menu_item`, `execute_custom_tool`, `set_active_instance`, `manage_editor`'s
  `play`/`pause`/`stop`/`deploy_package`/`restore_package`, `manage_scene` create/save/load,
  `manage_scriptable_object`, `manage_animation`, `manage_vfx`, `manage_texture`,
  `manage_shader`, `manage_ui` writes, `manage_graphics` setters and bake actions.
- `manage_probuilder`, memory snapshots, Cinemachine `manage_camera` paths — packages absent.
- The `mcpforunity://` resource URIs — this client still exposes no resource-reading tool,
  though G-4's hint independently confirms `mcpforunity://editor/state` exists.

---

# ROUND 7 — workshop acceptance test on 10.3.0, and two serious documentation bugs (2026-10-21)

Ran the platformer workshop's critical path against the live Editor as an acceptance test, in an
isolated scene under `Assets/_MCPVerify/`, then cleaned up and confirmed the project restored.
Unity 6000.4.6f1, bridge 10.3.0. Two previously-unknown documentation bugs surfaced, one of
which silently breaks a whole workflow.

## H-1 — CRITICAL: `manage_asset(search)` does NOT accept `*.ext` globs

| `search_pattern` | Result |
|---|---|
| `"*.cs"` | **0 assets** — silently |
| `"Readme"` (bare name substring) | 3 assets, including `Assets/TutorialInfo/Scripts/Readme.cs` and `.../Editor/ReadmeEditor.cs` |
| `"t:MonoScript"` | **2 assets** — both `.cs` files, correctly |
| `"t:Texture2D"` | **1 asset** — `Assets/TutorialInfo/Icons/URP.png` |
| `"*"` | 20 assets (everything) |

**VERIFIED:** `search_pattern` is **Unity's AssetDatabase filter syntax** (`t:<Type>`, plus bare
name substrings), **not** a filename glob. An `*.ext` pattern matches nothing and returns
`success: true` with zero results — a silent, confidence-inspiring failure.

**This breaks the Power's own documented guidance in several places**, all of which must be fixed:
- POWER.md's `manage_asset` row: "There is no `list` action — use `search` with `path` +
  `search_pattern` (e.g. `"*.fbx"`)".
- POWER.md's repeated instruction to enumerate scripts with
  `manage_asset(action:"search", search_pattern:"*.cs")` (used in the `manage_script` and
  `manage_shader` notes too, e.g. `"*.shader"`).
- **Workflow 1 (Asset Batch Configuration) step 1**:
  `manage_asset(action:"search", path:"Assets/Characters/", search_pattern:"*.fbx")`. Following
  the workflow as written finds **zero** assets, so the batch step configures nothing and the
  final report says "0 succeeded" — the workflow appears to run and silently does nothing. This
  is a direct, concrete instance of "the Power cannot drive Unity".
- `steering/asset-automation.md` and any template encoding an `*.ext` search pattern.

Correct replacements to document: `t:MonoScript` for scripts, `t:Texture2D` for textures,
`t:Shader` for shaders, `t:Material`, `t:SceneAsset`, `t:Prefab`, etc. For FBX/model files Unity's
filter is `t:Model` (or `t:GameObject`) — **UNVERIFIED here**, the project contains no model
assets, so document it as the Unity filter to use while flagging that it was not exercised.
A bare substring also works and is a safe fallback when the type name is uncertain.

## H-2 — a Round-1..6 claim was WRONG because of H-1

Earlier rounds repeatedly stated "the verification project contains zero `.cs` assets", and used
that to justify leaving the script tools' success paths UNVERIFIED. That was an artifact of H-1:
the project actually contains **two** `.cs` assets (`TutorialInfo/Scripts/Readme.cs` and
`TutorialInfo/Scripts/Editor/ReadmeEditor.cs`). Correct any text that asserts the project has no
scripts. (The script tools' success paths were independently verified in Round 6 against a script
that was created for the purpose, so that conclusion still stands — only the stated reason was
wrong.)

This is also a cautionary example worth keeping: a silent empty result was mistaken for
"nothing exists" across five rounds.

## H-3 — `manage_components(add)` needs an ASSEMBLY-QUALIFIED name for user scripts

| `component_type` | Result |
|---|---|
| `"PlayerController"` | `Component type 'PlayerController' not found. Use a fully-qualified name if needed.` |
| `"PlayerController, Assembly-CSharp"` | **success** — `componentType: "PlayerController"`, `componentInstanceID: -12444` |

The failure is **not** a timing artifact: `execute_code` in the same Editor confirmed
`System.Type.GetType("PlayerController, Assembly-CSharp")` → `loaded: PlayerController
base=MonoBehaviour` *before* the plain-name call was retried and failed again.

**Why this matters a lot:** the live tool description lists `'MyScript'` as an example
`component_type`, which implies a plain user-script name works. It does not. Every workshop step
that says "attach this script to the object" — and the platformer workshop has many
(`PlayerController`, `CameraFollow`, `GameManager`, collectibles, enemies, goal) — fails on the
natural call. Built-in Unity types are fine with the short name (`Rigidbody`, `Rigidbody2D`,
`SpriteRenderer`, `BoxCollider2D` all worked). Document the rule: **built-in types → short name;
user scripts → `TypeName, Assembly-CSharp`.**

## H-4 — `refresh_unity(wait_for_ready: true)` does NOT actually wait

Called with `wait_for_ready: true`, it returned immediately with
`resulting_state: "compiling"`. A subsequent `manage_components(add)` then failed because the
assembly was not yet reloaded. So the parameter does not block until the Editor is ready; callers
must poll (the response's own `hint` says to poll `mcpforunity://editor/state` until
`data.advice.ready_for_tools` is true). Document that `wait_for_ready` is not a synchronous
barrier, and that a compile needs an explicit readiness wait before dependent calls.

## H-5 — deletions are not persisted until the scene is saved, and a scene switch can resurrect them

Round 6 deleted `MCPVerify_Cube` from `SampleScene` but never saved the scene. After creating and
loading another scene and then re-loading `SampleScene` from disk, **the cube was back** —
`get_hierarchy` showed 4 roots instead of the baseline 3. It had to be deleted again and
`manage_scene(action:"save")` called explicitly before the on-disk scene was actually clean.

Document this: `manage_gameobject(delete)` (and any scene mutation) affects only the in-memory
scene; an explicit `manage_scene(action:"save")` is required to persist it, and switching or
reloading scenes can discard unsaved changes or re-read stale on-disk state. Any workflow that
mutates a scene must decide deliberately whether to save. This is also a cleanup hazard: a
verification pass that deletes its test objects without saving leaves them in the project.

## H-6 — WORKSHOP ACCEPTANCE TEST: PASSED

Executed `workshop/2d-platformer-game.md`'s player-setup critical path as written:

| Step | Call | Result |
|---|---|---|
| New isolated scene | `manage_scene(create, name:"MCPVerify_Platformer", path:"Assets/_MCPVerify")` | ok — also auto-created the folder; became the active scene (rootCount 0, buildIndex -1) |
| Player object | `manage_gameobject(create, name:"Player", tag:"Player", position:[0,1,0], components_to_add:["SpriteRenderer","Rigidbody2D","BoxCollider2D"])` | ok — all three components attached, tag applied. `components_to_add` VERIFIED |
| 2D physics setup | `manage_components(set_property, "Rigidbody2D", properties:{gravityScale:3, freezeRotation:true}, target:"Player")` | ok — `target` by NAME works on `manage_components` too |
| 6.4-API movement script | `create_script` with `rb.linearVelocity = new Vector2(...)` and `rb.linearVelocity = Vector2.zero` | ok |
| Compile | `refresh_unity(mode:"force", compile:"request")` then `validate_script` | **0 errors**, 1 analyzer warning (unassigned `groundLayer` field); `read_console(types:[error,warning], filter_text:"PlayerController")` → **0 entries** |
| Type really compiled | `execute_code` → `System.Type.GetType("PlayerController, Assembly-CSharp")` | `loaded: PlayerController base=MonoBehaviour` |
| Attach script | `manage_components(add, "PlayerController, Assembly-CSharp")` | ok (see H-3) |
| Verify the result | `execute_code` reading the live object | `script=True gravityScale=3 freezeRot=FreezeRotation comps=5` |
| Save | `manage_scene(action:"save")` | ok |

**The key outcome:** a script written with Unity 6.4's current `linearVelocity` API compiled with
**zero obsolete-API warnings** and ran as a real attached component. That validates the Round-3
obsolete→current physics mapping *as the workshops now instruct it*. Had the script used the
classic `rb.velocity`, Unity would have emitted obsolete warnings on 6.4.

Also newly verified here: `manage_scene` **create**, **save** and **load** (all three were
previously unexercised), and `manage_scene(create)` creating its target folder as needed.

## H-7 — cleanup verified, project fully restored

Final state after cleanup: `SampleScene` active with exactly its original **3** roots (Main
Camera, Directional Light, Global Volume) and original component sets; a full
`manage_asset(search, "*")` returns **20** assets, all original Unity template content
(`InputSystem_Actions.inputactions`, `Readme.asset`, `Scenes/SampleScene.unity`, `Settings/*`,
`TutorialInfo/*`). No `_MCPVerify` folder, no `MCPVerify_*` objects, no leftover prefab or
script. Only instance IDs differ, per G-1.

## Still NOT verified

- The six `asset_gen` tools — intentionally never called; they spend real money.
- `manage_build` — still blocked by the user's `permissions.yaml` MCP deny rule (C-5); C-6 stays
  UNVERIFIED.
- `run_tests` with actual tests — the two existing `.cs` files are not test assemblies, so
  pass/fail reporting, `include_failed_tests` and PlayMode remain unexercised.
- `t:Model` / `t:GameObject` search filters for FBX — no model assets in the project (H-1).
- `execute_menu_item`, `execute_custom_tool`, `set_active_instance`, `manage_editor`'s
  play/pause/stop/deploy_package/restore_package, `manage_scriptable_object`, `manage_animation`,
  `manage_vfx`, `manage_texture`, `manage_shader`, `manage_ui` writes, `manage_graphics` setters
  and bake actions, `manage_prefabs` stage actions.
- `manage_probuilder`, memory snapshots, Cinemachine `manage_camera` paths — packages absent.
- The `mcpforunity://` resource URIs — no resource-reading tool on this client.

---

# ROUND 8 — `run_tests` with REAL tests: pass/fail reporting verified (2026-10-21)

Closed the last big Workflow-4 gap. A throwaway EditMode test assembly was written to
`Assets/_MCPVerify/Tests/` with **one deliberately passing and one deliberately failing test**,
imported via `refresh_unity`, run, then deleted. Unity 6000.4.6f1, bridge 10.3.0.

Setup: `MCPVerify.Tests.asmdef` (references `UnityEngine.TestRunner` + `UnityEditor.TestRunner`,
`includePlatforms: ["Editor"]`, `precompiledReferences: ["nunit.framework.dll"]`,
`defineConstraints: ["UNITY_INCLUDE_TESTS"]`) plus `MCPVerifyTests.cs` with
`MCPVerify_PassingTest` (`Assert.AreEqual(4, 2+2)`) and `MCPVerify_FailingTest`
(`Assert.AreEqual(5, 2+2, "intentional failure for MCP verification")`).

Files were written to disk with ordinary file I/O and imported with
`refresh_unity(mode:"force", compile:"request")` — which is precisely the tool's documented
purpose (changes made outside Unity's import pipeline). That path is now VERIFIED: afterwards
`execute_code` confirmed `System.Type.GetType("MCPVerifyTests, MCPVerify.Tests")` →
`loaded: MCPVerifyTests asm=MCPVerify.Tests`.

## I-1 — pass/fail reporting: VERIFIED, with the exact response shape

`run_tests(mode:"EditMode", assembly_names:["MCPVerify.Tests"], include_failed_tests:true)` →
`{job_id, status:"running", mode:"EditMode"}`. Polling `get_test_job` returned, stably across
repeated calls:

```
status: "failed"
progress: { completed: 2, total: 2,
            last_finished_test_full_name: "MCPVerifyTests.MCPVerify_PassingTest",
            failures_so_far: [ { full_name: "MCPVerifyTests.MCPVerify_FailingTest",
                                 message: "intentional failure for MCP verification
                                           Expected: 5  But was: 4" } ],
            failures_capped: false, stuck_suspected: false }
result:   { mode: "EditMode",
            summary: { total: 2, passed: 1, failed: 1, skipped: 0,
                       durationSeconds: 0.33, resultState: "Failed(Child)" },
            results: null }
```

So `assembly_names` filtering works, the summary counts are correct, and NUnit's assertion
message (including the custom message and the Expected/But-was detail) is surfaced.

## I-2 — `status: "failed"` means TESTS failed, not that the run errored

This is the important semantic. The job's top-level `status` became **`"failed"`** purely because
one test assertion failed; execution itself was fine (`error: null`, both tests ran,
`completed: 2 / total: 2`).

POWER.md's Workflow 4 currently says to poll "until `status` is no longer `running`", which is
correct, but an agent reading `status: "failed"` can easily conclude the test *run* broke and
start debugging the harness instead of reporting a legitimate test failure. Document explicitly:
`status` reflects the **test outcome** — `succeeded` when all tests pass, `failed` when any test
fails — and the way to tell a real harness error apart is the `error` field plus whether
`progress.completed`/`total` advanced. (Round 6's zero-test run returned
`status:"succeeded"` with `completed:0, total:0`, which is the other end of the same scale.)

## I-3 — `result.results` is ALWAYS null; failures arrive via `progress.failures_so_far`

Two runs were compared:

| Run | `include_failed_tests` | `include_details` | `result.results` | `progress.failures_so_far` |
|---|---|---|---|---|
| 1 | **true** | false | **null** | populated |
| 2 | false | **true** | **null** | **populated anyway** |

**VERIFIED:** `result.results` stayed `null` in both runs, and `progress.failures_so_far` was
populated **even with `include_failed_tests: false`**.

POWER.md currently advises using `include_failed_tests: true` "to get failure details without a
huge payload". That is misleading on 10.3.0: failure details come through
`progress.failures_so_far` regardless of the flag, and `result.results` never filled in. Correct
the guidance to read failures from `progress.failures_so_far`, and describe
`include_failed_tests` / `include_details` as flags whose effect on `result.results` was **not
observed** here rather than asserting what they do.

## I-4 — `get_test_job`'s `wait_timeout` IS accepted

`get_test_job(job_id, wait_timeout: 30)` was accepted with no validation error, so the parameter
is real and POWER.md is right to mention it. Note the server **does** reject unknown kwargs
elsewhere (`manage_packages`' `identifier` and `unity_reflect`' `type_name` both produced
"Unexpected keyword argument"), which is why acceptance is meaningful evidence here.

**UNVERIFIED:** whether `wait_timeout` actually blocks. Both polls happened after the job had
already finished, so no blocking behaviour could be observed. Do not claim it long-polls.

## I-5 — timings, for expectation-setting

Two EditMode runs of 2 trivial tests: wall-clock job duration ~4.2 s and ~4.2 s
(`started`→`finished`), of which the tests themselves were `durationSeconds` 0.33 and 0.21. So
roughly 4 seconds of fixed overhead per EditMode run on this machine, independent of test count.
Useful for the docs: do not treat a few seconds of apparent idleness as a stuck run, and note
that `stuck_suspected` is the field to watch instead.

## I-6 — cleanup verified

`manage_asset(action:"delete", path:"Assets/_MCPVerify")` plus a `refresh_unity` removed the
assembly. Confirmed afterwards: `Assets/_MCPVerify` is gone from disk; `Assets/` top level
contains only the original template content (`Scenes`, `Settings`, `TutorialInfo`,
`InputSystem_Actions.inputactions`, `Readme.asset` and their `.meta` files); `SampleScene` has its
original **3** roots; and `manage_asset(search, "t:MonoScript")` returns exactly the **2** original
TutorialInfo scripts. No scene save was needed this round because the scene was never modified.

## Still NOT verified

- The six `asset_gen` tools — intentionally never called; they spend real money.
- `manage_build` — still blocked by the user's `permissions.yaml` MCP deny rule (C-5); C-6 stays
  UNVERIFIED.
- **PlayMode** tests — only EditMode was exercised. PlayMode involves a domain reload and
  upstream recommends `init_timeout: 120000`; none of that was tested.
- `run_tests`' `test_names`, `group_names`, `category_names` filters and `clear_stuck`.
- Whether `wait_timeout` blocks (I-4).
- `t:Model` / `t:GameObject` search filters — no model assets in the project.
- `execute_menu_item`, `execute_custom_tool`, `set_active_instance`, `manage_editor`'s
  play/pause/stop/deploy_package/restore_package, `manage_scriptable_object`, `manage_animation`,
  `manage_vfx`, `manage_texture`, `manage_shader`, `manage_ui` writes, `manage_graphics` setters
  and bake actions, `manage_prefabs` stage actions.
- `manage_probuilder`, memory snapshots, Cinemachine `manage_camera` paths — packages absent.
- The `mcpforunity://` resource URIs — no resource-reading tool on this client.

---

# ROUND 9 — remaining asset-creation write tools (2026-10-21)

Swept the write actions still unexercised after Round 8. All work was isolated under
`Assets/_MCPVerify/` with `MCPVerify_*` names and then deleted; project confirmed restored.
Unity 6000.4.6f1, bridge 10.3.0. **`manage_graphics` setters and bake actions were deliberately
skipped** — they mutate project-wide render settings and could not be restored with confidence.

## J-1 — BUG: a deleted folder leaves a dangling GUID that blocks recreating the path

`manage_asset(action:"create_folder", path:"Assets/_MCPVerify")` failed with:
`An asset (not a folder) already exists at path: Assets/_MCPVerify`
— for a path that **did not exist on disk at all** (`Test-Path` false, no `.meta`, no recursive
match anywhere under `Assets/`). A `refresh_unity(mode:"force")` did not clear it, and the retry
failed identically.

Diagnosed via `execute_code`:
```
AssetPathToGUID("Assets/_MCPVerify") -> "9417d3273afa9244bba95d21b0e8a911"
AssetDatabase.IsValidFolder(...)     -> False
LoadAssetAtPath<Object>(...)         -> null
Directory.Exists(...)                -> False
```
That GUID is **the same one returned when the folder was first created back in Round 6**. So the
AssetDatabase keeps a **dangling path→GUID mapping** after the folder is deleted: the path still
resolves to a GUID while being neither a valid folder nor a loadable asset, and
`create_folder` evidently treats "path maps to a GUID" as "an asset exists" and refuses.

**VERIFIED workaround:** create the directory with ordinary file I/O and then
`refresh_unity(mode:"force", compile:"none")`. Afterwards `IsValidFolder` returned **True** and
the path reused the very same GUID. Using a different path also avoids it.

Document this: re-creating a previously-deleted asset folder at the same path can fail with a
misleading "already exists" error; the fix is a disk-level mkdir plus a refresh, not another
`create_folder` call.

## J-2 — `refresh_unity` is SYNCHRONOUS when `compile: "none"`

| Call | Response |
|---|---|
| `refresh_unity(mode:"force", compile:"request")` | `compile_started: true`, `resulting_state: "compiling"`, hint to poll `mcpforunity://editor/state` |
| `refresh_unity(mode:"force", compile:"none")` | `compile_requested: false`, `compile_started: null`, **`resulting_state: "idle"`**, hint "Unity refresh completed; editor should be ready." |

So an asset-only refresh completes before returning, while requesting a compile returns mid-flight.
This refines H-4 (`wait_for_ready` is not a barrier): the blocking problem is specific to the
compile path. Document both shapes — if you only need the AssetDatabase to notice new files and
no C# changed, `compile: "none"` is both faster and synchronous.

## J-3 — asset-creation write actions: all VERIFIED

| Call | Result |
|---|---|
| `manage_material(action:"create", material_path:"Assets/_MCPVerify/MCPVerify_Mat.mat", shader:"Universal Render Pipeline/Lit")` | ok — created with the URP Lit shader |
| `manage_texture(action:"create", path:"...MCPVerify_Tex.png", width:64, height:64, fill_color:[0.2,0.6,0.9,1])` | ok — 64×64. Response `_debug_params` shows the float colour was converted to bytes `[51,153,230,255]`, so `fill_color` accepts 0–1 floats |
| `manage_shader(action:"create", name:"MCPVerifyShader", path:"Assets/_MCPVerify")` | ok — `contents` is optional; a default shader was generated. Params are `name` + `path`, not a single file path |
| `manage_scriptable_object(action:"create", type_name:"Readme", folder_path:"Assets/_MCPVerify", asset_name:"MCPVerify_SO")` | ok — `typeNameResolved: "Readme"`, guid returned. An **unqualified** type name resolved fine for a type in the global namespace (the schema calls the param "namespace-qualified", so qualify it only when the type actually has a namespace) |
| `manage_ui(action:"create", path:"...MCPVerify_UI.uxml", contents:"<ui:UXML …>")` | ok — **`contents` is REQUIRED**; the first attempt without it failed with `'contents' parameter is required for create.` |
| `manage_animation(action:"controller_create", properties:{controllerPath:"...MCPVerify_Controller.controller"})` | ok — `layerCount: 1`, `parameterCount: 0` |
| `manage_vfx(action:"particle_create", target:"MCPVerify_FX")` | ok — `createdGameObject: false`, `addedParticleSystem: true`, `assignedMaterial: "Auto_Default_ParticleSystem_Universal"` (auto-assigns a URP particle material) |
| `manage_prefabs(action:"create_from_gameobject")` | ok — `componentCount: 3`, `materialsPersisted: 1` |
| `manage_prefabs(action:"open_prefab_stage")` | ok — `enteredPrefabStage: true`, `rootName` returned |
| `manage_prefabs(action:"get_hierarchy")` | ok — per-item `prefab` metadata: `isRoot`, `isNestedRoot`, `nestingDepth`, `assetPath`, `parentPath` |
| `manage_prefabs(action:"close_prefab_stage")` | ok — takes no target; exits the stage |
| `manage_scene(action:"save")` | ok (again) |

## J-4 — `manage_animation` mixes naming conventions

Top-level params are snake_case (`action`, `properties`), but the key **inside** `properties` is
**camelCase**: `properties:{path:...}` failed with `'controllerPath' is required (e.g.
'Assets/Animations/Player.controller')`, and `properties:{controllerPath:...}` succeeded. So the
`properties` dict for `manage_animation` uses camelCase keys. Document this, because every other
tool in the surface uses snake_case and an agent will guess `path`.

## J-5 — `execute_menu_item` does not confirm success

`execute_menu_item(menu_path:"Window/General/Console")` returned:
`"Attempted to execute menu item: 'Window/General/Console'. Check Unity logs for confirmation or
errors."` with `data: null`.

So it is **fire-and-forget**: a `success: true` means the call was dispatched, NOT that the menu
item existed or ran. Document that its result is not a verification signal and that any effect
must be confirmed separately (console, or a follow-up read).

## J-6 — I repeated the H-5 mistake, which confirms how easy it is

I issued `manage_scene(save)` and `manage_gameobject(delete)` as parallel calls; the save landed
**first**, so the scene was persisted *with* the test object and the delete then existed only in
memory. Re-running delete-then-save in the correct order fixed it.

This is worth adding to the guidance as a concrete ordering rule: scene mutation and
`manage_scene(save)` must be **sequenced deliberately**, never issued concurrently, and the save
must come after the mutation. Note this applies to `batch_execute` ordering too.

## J-7 — cleanup verified

After `manage_gameobject(delete)` → `manage_scene(save)` → `manage_asset(delete,
"Assets/_MCPVerify")`, and a reload of `SampleScene` from disk: the scene has exactly its
original **3** roots (Main Camera, Directional Light, Global Volume) with original components;
`Assets/_MCPVerify` is absent from disk; and `Assets/` top level holds only `Scenes`, `Settings`,
`TutorialInfo`, `InputSystem_Actions.inputactions`, `Readme.asset` and their `.meta` files.

## Still NOT verified

- **`manage_graphics` setters and bake actions** — deliberately skipped (project-wide render
  settings, not safely restorable). `pipeline_set_settings`, `pipeline_set_quality`,
  `feature_add`/`remove`/`configure`/`toggle`, `skybox_set_*`, `volume_*`, `bake_*` all remain
  documentation-derived.
- The six `asset_gen` tools — intentionally never called; they spend real money.
- `manage_build` — blocked by the user's `permissions.yaml` MCP deny rule (C-5); C-6 stays
  UNVERIFIED.
- **PlayMode** tests, and `manage_editor`'s `play`/`pause`/`stop` — entering Play Mode was not
  exercised.
- `manage_editor`'s `deploy_package` / `restore_package`, `add_tag`/`remove_tag`,
  `add_layer`/`remove_layer`, `set_active_tool`, `undo`/`redo`.
- `run_tests`' `test_names` / `group_names` / `category_names` filters and `clear_stuck`;
  whether `get_test_job`'s `wait_timeout` blocks.
- `execute_custom_tool`, `set_active_instance`.
- Modify/delete paths for the tools whose create paths were verified here (e.g.
  `manage_texture(modify)`, `manage_shader(update)`, `manage_scriptable_object(modify)` patches,
  `manage_ui(update)`/`modify_visual_element`/`render_ui`, the rest of `manage_animation`'s
  `clip_*`/`animator_*` actions, `manage_vfx`'s `vfx_*`/`line_*`/`trail_*`).
- `t:Model` / `t:GameObject` search filters — no model assets in the project.
- `manage_probuilder`, memory snapshots, Cinemachine `manage_camera` paths — packages absent.
- The `mcpforunity://` resource URIs — no resource-reading tool on this client.
