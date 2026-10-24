---
name: "kiro-unity-accelerator"
displayName: "Unity Accelerator"
description: "Drive the Unity Editor from natural language via the MCP for Unity bridge — assets, scenes, builds, tests, profiling, code quality."
keywords: ["unity", "unity3d", "unity editor", "urp", "gameobject", "prefab", "scene", "shader", "il2cpp", "build", "mcp for unity", "unity-mcp", "game development"]
author: "kiro-unity-accelerator contributors"
---

# Unity Accelerator Power

## Onboarding

### 1. Pick exactly one MCP registration path

Two different mechanisms can register the Unity MCP server with the IDE, and they write to the **same** config file (`~/.kiro/settings/mcp.json`) under different names. Running both leaves two servers pointing at the same Unity Editor, which produces duplicate tool surfaces and ambiguous resource reads.

- **Path A — let this Power register the server.** Install the Power and leave its `mcp.json` alone. A Legacy (`POWER.md`) power's MCP servers are registered into `~/.kiro/settings/mcp.json` under the Powers section, with the server name namespaced by the IDE as **`power-<powerName>-<serverName>`** — for this Power, **`power-kiro-unity-accelerator-unity-mcp`** (VERIFIED 2026-10-21). That namespaced name is what appears in client-side tool errors and what permission rules match against; see [Tool denied by the IDE's own permission rules](#tool-denied-by-the-ides-own-permission-rules).
- **Path B — let Unity configure the IDE.** In Unity, `Window → MCP for Unity → Configure All Detected Clients` (or select the IDE and `Configure Selected`). The MCP for Unity package writes a server entry named `unityMCP` into the same file.

> **If the MCP panel shows two Unity MCP servers, disable one and restart the IDE.** Config file locations: user-level `~/.kiro/settings/mcp.json`, workspace-level `.kiro/settings/mcp.json`, and this Power's own `mcp.json`.
>
> Tool names are written here without a prefix (`manage_scene`, `manage_asset`, …). The MCP client may display them grouped under a server prefix — read the actual names in the IDE's MCP panel if a call is rejected as unknown.

### 2. Install the auto-guidance hook

This Power ships a hook template at `hooks/unity-power-auto-activate.json`. A Power cannot install a hook by itself — copy the file into the workspace at `.kiro/hooks/unity-power-auto-activate.json`:

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "unity-power-auto-activate",
      "trigger": "UserPromptSubmit",
      "enabled": true,
      "action": {
        "type": "agent",
        "prompt": "You MUST call kiroPowers(action=\"activate\", powerName=\"kiro-unity-accelerator\") NOW, every single time, no exceptions. Then call kiroPowers(action=\"readSteering\", powerName=\"kiro-unity-accelerator\", steeringFile=\"<relevant>.md\") to load the steering file matching the user's task. Do NOT skip this step even if you think you already did it.\n\nSteering file selection (15 files in steering/):\n- Scene/GameObject → scene-scaffolding.md\n- Asset import/config → asset-automation.md\n- Build/deploy → build-automation.md\n- Performance/FPS → performance-analysis.md\n- Code quality → code-quality.md\n- Platform targeting → platform-compatibility.md\n- Asset dependencies → asset-dependencies.md\n- Testing → cross-platform-testing.md\n- Multi-step workflow → workflow-automation.md\n- Knowledge/docs → knowledge-management.md\n- Level design → level-design-tooling.md\n- UI analysis → ui-dependency-analysis.md\n- Project structure → project-organization.md\n- General Unity → unity-general.md\n- Loaded when responding in Traditional Chinese → language-zh-tw.md"
      }
    }
  ]
}
```

Set `"enabled": false` to switch it off without deleting the file.

### 3. Verify the connection

Run one cheap read-only call — `manage_scene(action: "get_active")`. If it returns a scene, the bridge is working. If not, see [Connection Health Check](#connection-health-check).

## Overview

This package provides Unity development automation capabilities that can execute asset management, scene scaffolding, build automation, performance analysis, code quality checks, and more — all through natural language commands from the developer.

### Architecture

- **AI Layer**: Understand user intent, plan execution strategies, orchestrate MCP tool call sequences
- **unity-mcp = Execution Layer**: Open-source MCP server ([CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)) bridging the AI to Unity Editor. This guide uses unity-mcp as the MCP bridge implementation. Other MCP-compatible bridges may also work.
- **This Package = Intelligence Layer**: POWER.md (this file), steering files, and preset templates that provide deep Unity domain knowledge

### Which "Unity MCP"? — three different projects

Three unrelated things are called some variant of "Unity MCP". This Power targets **only the first**. Mixing them produces tool names and ports that do not match anything in this document. All three rows retrieved **2026-10-21**.

| Project | Identity | How it connects | Status |
|---|---|---|---|
| **(a) CoplayDev MCP for Unity** — *what this Power uses* | UPM `com.coplaydev.unity-mcp`, repo [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp), Python server distributed on PyPI as `mcpforunityserver`, MIT-licensed | streamable HTTP (default) at `http://127.0.0.1:8080/mcp`, or stdio via `uvx --from mcpforunityserver mcp-for-unity --transport stdio`; the Unity-side bridge also listens on TCP `6400` | Active. Verified-current release **v10.3.0** (2026-10-04); this Power documents **v10.3.0 or newer, minimum v10.0.0**. Bridge floor is Unity 2021.3 LTS. 49 tool entrypoints across 10 groups |
| **(b) IvanMurzak/Unity-MCP** — *a different project, not used here* | UPM `com.ivanmurzak.unity.mcp`, repo [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | a separate server binary auto-downloaded into `Library/mcp-server/`; its port is derived deterministically from a hash of the project path (range 20000–29999), so there is no port to configure | Active, latest 1.3.0 (~2026-10-20). Its tool names and port scheme do **not** match this Power — do not mix the two |
| **(c) Unity's own in-Editor MCP server** | shipped inside `com.unity.ai.assistant`; UI at `Edit > Project Settings > AI > Unity MCP` | the MCP client connects straight to the in-Editor server | **Deprecated** — see below |

**On the deprecation of (c), and why it does not affect this Power.** Unity's documentation states that the MCP server inside the in-Editor AI assistant package is deprecated and that the Unity CLI (`unity mcp`) takes its place, shipping its own MCP server that speaks the same protocol ([Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli), retrieved 2026-10-21; the same notice appears in the package docs, [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html), retrieved 2026-10-21). **The same Unity page states that third-party MCP packages installed from GitHub to give agents access to Unity are unaffected by that deprecation.** Project (a) — the bridge this Power uses — is therefore explicitly outside the scope of the deprecation. Do not tell a developer this Power is obsolete because of it.

Two known interactions with the AI Assistant package, both worth checking if the connection misbehaves: on Unity 6.3+ its bundled `System.Collections.Immutable` can clash with the Roslyn dependency used by `validate_script`/`execute_code`, and pre-release `com.unity.ai.assistant` / `com.unity.ai.inference` / `com.unity.asset-manager-for-unity` have been implicated in an Editor startup livelock (Unity issue UUM-132096) that presents as an MCP connection failure because the Editor never finishes loading.

### Key Principles

1. **Three-Step Setup**: Install the package, add the UPM dependency, and start the MCP server
2. **AI-Driven Architecture**: All operations originate from the AI layer; Unity Editor is the controlled target
3. **Knowledge-Driven**: Architecture separates domain knowledge (steering files) from execution logic (MCP tools)
4. **Natural Language Driven**: Developers describe intent; the AI translates to MCP tool call sequences
5. **Composable Architecture**: Complex workflows are composed from multiple MCP tool calls chained via `batch_execute` — with one exception: server-layer actions must be called directly, never batched ([`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions))
6. **Local First**: All operations run through the local Unity Editor via MCP — there is no cloud build or remote device-testing layer in the current tool surface

> **Historical note on `Cloud_Assist`**: earlier drafts of this Power described an optional cloud build / device-farm testing layer called `Cloud_Assist`. No such layer exists in the MCP for Unity tool surface. Build and test automation here runs entirely through the local Editor (`manage_build`, `run_tests`); cloud build or a remote device farm would have to be wired up separately as a custom tool (see `execute_custom_tool`).

### Core Behaviors

**These behaviors are always active when this Power is loaded, regardless of whether the developer mentions "Unity" explicitly.**

#### Language

Respond in the language the developer uses. If they write in Chinese, respond in Traditional Chinese (繁體中文). If they write in English or another language, match that language. When no preference is clear, default to Traditional Chinese. Technical terms may remain in English with Chinese explanation on first use. Code identifiers always stay in English.

#### Auto-Activation

When unity-mcp tools are available in the tool list, this Power is active. Any request involving scene objects, assets, scripts, builds, or game content should use this Power's workflows — the developer does not need to explicitly mention "Unity".

#### Steering-First Approach

Before executing any multi-step operation, read the relevant steering file(s) to ensure domain-correct behavior:

| Domain | Steering File |
|--------|--------------|
| Scene/GameObject operations | `scene-scaffolding.md` |
| Asset import/configuration | `asset-automation.md` |
| Build operations | `build-automation.md` |
| Performance concerns | `performance-analysis.md` |
| Code/architecture | `code-quality.md` |
| Platform targeting | `platform-compatibility.md` |
| Asset dependencies | `asset-dependencies.md` |
| Testing | `cross-platform-testing.md` |
| Multi-step automation | `workflow-automation.md` |
| Knowledge/docs | `knowledge-management.md` |
| Level design/Editor tools | `level-design-tooling.md` |
| UI analysis | `ui-dependency-analysis.md` |
| Project/folder structure, naming | `project-organization.md` |
| Responding in Traditional Chinese | `language-zh-tw.md` |
| General best practices | `unity-general.md` |

All 15 files listed above exist in `steering/`. The full table with load conditions is in [Steering Files](#steering-files).

#### Safety & Quality Checks

- **Post-operation**: After scene modifications adding 10+ objects (which can impact rendering performance by increasing draw calls and memory usage), run a quick performance check (draw calls, memory estimate) and check for common issues (missing colliders, shader incompatibilities). Report findings to the developer. For guidance on interpreting these metrics, see the `performance-analysis.md` steering file.
- **Render pipeline**: Always check the project's render pipeline (URP/HDRP/Built-in) before importing or recommending assets — verify via `manage_graphics(action: "pipeline_get_info")`, which is in the default-on `core` group, rather than assuming. Do **not** read `GraphicsSettings.currentRenderPipeline` through `execute_code` for this: `pipeline_get_info` returns the same answer from the default-on `core` group, with no dependence on `execute_code`'s group or on the Editor's Roslyn availability. Flag shader incompatibilities immediately. URP is the default and Unity-recommended pipeline for new Unity 6 projects; Built-in remains usable for existing projects and Unity has not committed to a firm removal version.
- **Play Mode**: Never make permanent scene changes while in Play Mode. Verify editor state before modifying and saving scenes.
- **Batch operations**: When placing multiple objects, ensure proper physics, vary rotation/scale for natural appearance, check performance impact for large quantities (50+), and respect the project's existing organizational structure.

#### Unity 6.4 Baseline

This Power targets **Unity 6.4** (release stream `6000.4`) and the MCP tool surface of **[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)** at **v10.3.0 or newer (minimum v10.0.0)**.

| Item | Value |
|---|---|
| Primary target / verified baseline | **Unity 6.4 (`6000.4`)**, pinned patch **`6000.4.12f1`** (released 17 Jun 2026) |
| Minimum supported Editor for this Power | **Unity 6.0 (`6000.0`)** — below that, the Build Profiles params on `manage_build` (Unity 6+ only) and the Render Graph / GPU Resident Drawer guidance throughout `steering/` simply do not apply |
| Minimum Editor for the bridge itself | **Unity 2021.3 LTS** — the bridge's floor is lower than this Power's |
| Live-verified pairing | Unity `6000.4.6f1` + URP 17.4.0 + MCP for Unity **10.3.0**, Windows Editor, 2026-10-21. Tool/action/parameter claims were first checked on **9.6.8**, then re-checked by direct calls on **10.3.0** after the bridge was upgraded on the same machine |
| Live-verified bridge upgrade | **9.6.8 → 10.3.0 performed and observed on the same machine, 2026-10-21**, and the v10.3.0 tool surface was then exercised directly once the client reconnected. **Observed on 10.3.0**: `server.version` `10.3.0`; the full **49-tool** inventory and the purely-additive 9.6.8 → 10.3.0 delta; the `asset_gen` group's existence, membership and default-off state; all ten group memberships and defaults; the `batch_execute` server-layer divergence; the `unity_docs` name-form trap; `find_in_file` being script-only; and the `manage_asset` / `find_gameobjects` / `manage_scene` contracts ([Upgrading the bridge](#upgrading-the-bridge--two-independent-version-pins)) |
| Live-verified **write path** | **VERIFIED on 10.3.0, 2026-10-21.** The mutating actions were finally exercised against the live Editor: `manage_asset` `create_folder`/`delete`, `create_script`, `get_sha`, `validate_script`, `find_in_file`'s success path, `script_apply_edits`, `manage_gameobject` create/modify/duplicate/delete, `manage_components` `add`/`set_property`, `manage_prefabs(create_from_gameobject)`, `delete_script`, `refresh_unity`, and `run_tests` → `get_test_job` as a complete async job lifecycle. **Method**: every write went into an isolated `Assets/_MCPVerify/` folder with `MCPVerify_*` object names and was then deleted; the project was confirmed back at baseline afterwards (`SampleScene` with its original 3 roots and their original component sets; a full `manage_asset(action: "search", search_pattern: "*")` returning the original **20** template assets). Three findings from that pass change guidance in this document: [instance IDs are volatile](#instance-ids-are-volatile--never-cache-one), [the three `target` conventions](#the-three-target-conventions), and `script_apply_edits` taking `name` + `path` rather than `uri`. Still **not** observed: the six `asset_gen` tools (deliberately never called — they spend real money), `manage_build`, `run_tests` against **actual tests** (the verification project has no test assemblies, so pass/fail reporting is unexercised), and the remaining unexercised actions listed under [Available MCP Tools](#available-mcp-tools) |
| Live-verified **workshop acceptance test** | **PASSED on 10.3.0, 2026-10-21.** `workshop/2d-platformer-game.md`'s player-setup critical path was executed against the live Editor exactly as the workshop instructs it, in an isolated scene. **The key outcome: a movement script written with Unity 6.4's current `linearVelocity` API compiled with zero errors and zero obsolete-API warnings** — `validate_script` returned 0 errors and 1 analyzer warning (an unassigned `groundLayer` field), `read_console(types: [error, warning], filter_text: "PlayerController")` returned **0 entries**, `execute_code` confirmed the type loaded as a MonoBehaviour, it attached as a real component, and reading the live object back gave `script=True gravityScale=3 freezeRot=FreezeRotation comps=5`. So the obsolete→current physics mapping (`steering/code-quality.md`) is validated **as the workshops now instruct it**; the classic `rb.velocity` would have produced obsolete warnings on 6.4. The run also found the two documentation bugs fixed in this revision ([glob search patterns](#search_pattern-is-an-assetdatabase-filter-not-a-glob) and [assembly-qualified component types](#component_type-built-in-vs-user-script)) and newly verified `manage_scene` `create`/`save`/`load`, `manage_gameobject`'s `components_to_add`, and `manage_components(set_property)` resolving `target` by name |

**Forward compatibility.** This Power is expected to work on Unity 6.5, 6.6 and later 6.x releases — but those streams were **not** live-verified here, so treat any 6.5+-specific behaviour as forward-looking and unverified until a call on the connected Editor proves it.

**Version-support reality, and what to recommend.** Unity 6.4 is an Update release, and an Update release is supported only until the next one ships; 6.4's patch stream ended 17 Jun 2026, so it receives no further fixes ([unity.com/releases](https://unity.com/releases/) and [endoflife.date/unity](https://endoflife.date/unity), both retrieved 2026-10-21). Consequences for advice this Power gives:

- A project locking down for production should move to **Unity 6.3 LTS** (supported through Dec 2027) or forward onto the current Update release.
- **Unity 6.0 LTS support ended 16 Oct 2026 — never recommend it**, including as a "safe older version".
- Unity 6.4 remains the right target for *this* Power's claims, because it is the only stream anything here was actually checked against.

If a **direct** tool call fails with an "Unknown action" or a validation error, the connected bridge build is likely older than v10.0.0 — tell the developer to update `com.coplaydev.unity-mcp` rather than working around it with legacy syntax, and point them at [Upgrading the bridge](#upgrading-the-bridge--two-independent-version-pins), because updating the UPM package alone leaves the Python server behind. If the same error came from inside a `batch_execute`, conclude nothing until you have retried it as a direct call ([`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions)).

Two things are still worth a runtime check rather than an assumption, because they vary per-project regardless of Unity version:
- **Render pipeline**: confirm URP vs. Built-in via `manage_graphics(action: "pipeline_get_info")` before recommending pipeline-specific features like the GPU Resident Drawer (see `performance-analysis.md`)
- **GPU Resident Drawer eligibility**: requires Forward+/Deferred+ rendering path, compute-shader-capable Graphics API (not OpenGL ES/VisionOS), and is unavailable on the 2D Renderer — check before recommending it, don't assume it's on. On Unity 6.4 the redesigned Rendering Statistics window itemises which draw calls the GPU Resident Drawer absorbed, so read `manage_graphics(action: "stats_get")` output with that breakdown in mind. The enable sequence (BatchRendererGroup Variants = Keep All → SRP Batcher on → GPU Resident Drawer = Instanced Drawing → Rendering Path = Forward+) was **not** re-verified on 6.4 — treat it as a procedure to confirm in Project Settings

## Setup

### Prerequisites

1. [Unity Editor](https://unity.com/download) installed and a project open (see [Unity Hub documentation](https://docs.unity3d.com/hub/manual/index.html) for getting started)
2. The IDE installed
3. **Python 3.10 or newer plus [`uv`](https://docs.astral.sh/uv/)** — the MCP for Unity server is a Python package (`mcpforunityserver` on PyPI) that the bridge launches through `uv`/`uvx`. The MCP for Unity setup wizard can install `uv` for you; on Windows, point "Choose UV Install Location" at the WinGet shim (`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`) if several `uv.exe` copies are on PATH

### Installation Steps

1. **Install the MCP bridge UPM package in Unity** — any one of:
   - **Git URL pinned to a release tag (use this)**: Unity Editor → Window → Package Manager → Add package from git URL: `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0`
   - **OpenUPM**: `openupm add com.coplaydev.unity-mcp` — a registry install, so Package Manager shows an update when a newer version ships
   - **Asset Store**: the "MCP for Unity" listing, then Package Manager → My Assets

   > **Corrected instruction — do not use `#main`.** Earlier revisions of this document told you to add `...?path=/MCPForUnity#main`. That was wrong, and the failure it causes was **reproduced on a real install (VERIFIED 2026-10-21)**. Unity resolves a git UPM dependency **once** and then caches the resolved commit; a moving ref such as `#main` does **not** track the branch. The verification machine's `Packages/manifest.json` said `#main` while the resolved package was **9.6.8** and upstream was already **10.3.0** — stranded for months, with no update prompt anywhere in Package Manager. A months-old bridge does not match the tool surface documented here, which is a direct contributor to "the agent cannot drive Unity".
   >
   > **How to upgrade later.** Changing the ref changes the dependency string, and that is what forces Unity to re-resolve. Either edit the tag in `Packages/manifest.json`:
   >
   > ```json
   > "com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0"
   > ```
   >
   > …or remove the package and re-add the git URL with the new tag. Then read [Upgrading the bridge](#upgrading-the-bridge--two-independent-version-pins) — **the UPM package is only half of the upgrade.**

2. **Install this Power in the IDE**:
   - Open the IDE → Powers panel → Install this Power

3. **Finish the MCP for Unity setup in Unity**:
   - On first import the package opens a **setup wizard**; the persistent UI afterwards is `Window → MCP for Unity`, which starts/stops the server, switches transport, and reconfigures clients
   - Confirm the status panel reads **Connected**. `Restart Server` is the recovery action
   - The server listens on a local MCP endpoint whose port the window displays (local-only loopback — communication that stays on the local computer and is not accessible from the network — see Security Note below)
   - Then pick **exactly one** registration path as described in [Onboarding](#1-pick-exactly-one-mcp-registration-path)

### Upgrading the bridge — two independent version pins

**MCP for Unity is two components, and each pins its own version separately.** This is the single most confusing thing about upgrading it, and it was observed end to end on a live 9.6.8 → 10.3.0 upgrade (**VERIFIED 2026-10-21**).

| Component | What it is | Where its version is pinned |
|---|---|---|
| UPM package (C# editor side) | `com.coplaydev.unity-mcp`, imported into the Unity project | `Packages/manifest.json` — the git tag, or the registry version |
| Python MCP server | PyPI distribution `mcpforunityserver`, console entrypoint `mcp-for-unity` | the `--from "mcpforunityserver==<version>"` argument of the launch command line Unity writes |

The pre-upgrade server launch line, observed verbatim:

```
uvx --from "mcpforunityserver==9.6.8" mcp-for-unity --transport http --http-url http://127.0.0.1:8080
  --project-scoped-tools --pidfile <UnityProject>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>
```

…running as the process chain `uvx.exe` → `uv.exe tool uvx --from mcpforunityserver==9.6.8` → `mcp-for-unity.exe` (resolved from uv cache archive `hIhdP2TZcOvbkf3X`) → `python.exe` holding port 8080.

**Upgrading the UPM package does not upgrade the Python server.** After the manifest moved to `#v10.3.0` and Unity imported and compiled the v10.3.0 C# cleanly (the editor log showed the new `Editor/Services/Blender`, `Editor/Tools/AssetGen` and `Editor/Security/SecureKeyStore` trees importing, with zero `error CS`), the still-running server reported `server.version: "9.6.8"` — it was executing the old uv cache archive.

**A C#-vs-Python mismatch breaks the bridge, and it breaks it selectively.** With C# at 10.3.0 and Python at 9.6.8, every Unity-dependent tool call returned:

```json
{"success": false, "error": "Unity session not available; please retry",
 "data": {"reason": "no_unity_session", "retry_after_ms": 250}}
```

…while server-layer-only tools such as `debug_request_context` kept answering normally. So the server looks alive and the client looks connected, yet nothing that touches Unity works. **Treat `no_unity_session` as a version-mismatch symptom first**, not as "Unity is busy" — see [Error Categories](#error-categories).

#### Ordered upgrade procedure

This is the sequence that actually worked on the verified upgrade. Follow it in order.

1. **Change the UPM pin.** Edit the tag in `Packages/manifest.json`, or remove the package and re-add the git URL with the new tag. A moving ref such as `#main` will **not** re-resolve — see [Installation Steps](#installation-steps).
2. *(Optional, recommended on a slow network)* **Pre-seed the uv cache** so the restart in step 6 is fast: `uvx --from "mcpforunityserver==10.3.0" mcp-for-unity --help`. On the verified upgrade this is why Unity was then able to launch the server with `--offline`.
3. **Let Unity import and compile** the new package, and confirm the editor log contains no `error CS`.
4. **Stop the stale server process chain** (`uvx` → `uv` → `mcp-for-unity` → `python`). It does not pick up the new version on its own.
5. **Remove the stale pidfile** if one is left behind: `<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid`. On the verified upgrade the kill left that file in place and it had to be deleted by hand; the fresh start recreates it.
6. **Start the server from Unity**: `Window → MCP for Unity → Start Server`. **This explicit action was required** — the server auto-restarted neither after the package upgrade nor after the process chain was killed. Unity, now running the v10.3.0 C#, relaunched it with a matching pin:

   ```
   uvx --offline --from "mcpforunityserver==10.3.0" mcp-for-unity --transport http
     --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile ... --unity-instance-token ...
   ```

   from a **new** uv cache archive (`i8nZG0Ewwibnn1em`), with port 8080 listening again and both components at 10.3.0.
7. **Reconnect the MCP client.** The restart invalidates the client's MCP transport session — see [The client session does not survive a server restart](#the-client-session-does-not-survive-a-server-restart). This step is not optional; an upgrade always triggers it.
8. **Confirm the two pins agree.** `debug_request_context` reports `server.version`; `manage_packages(action: "list_packages")` reports the UPM package version. They must match. On the verified upgrade this returned `server.version: "10.3.0"` from the new uv cache archive.

> **A v10 hardening change you will notice in that output (VERIFIED 2026-10-21).** On 10.3.0 `debug_request_context` prints the `--unity-instance-token` value **masked as `***`**; on 9.6.8 it printed the token in clear text. Glancing over the output before you paste it into an issue is still good practice, but on v10 it matters much less. Two related shape changes: `session_state` on 10.3.0 **no longer carries the `derived_key` / `all_keys_in_store` fields** 9.6.8 returned, and the restart issues a new session id — neither absence is a fault.

#### The client session does not survive a server restart

After the server came back at 10.3.0, the already-connected client's calls failed with (**VERIFIED 2026-10-21**):

```json
{"jsonrpc": "2.0", "id": "server-error", "error": {"code": -32600, "message": "Session not found"}}
```

**This is a different failure from `no_unity_session`, and confusing the two wastes a lot of time:**

| Error | Which layer | What it means | What fixes it |
|---|---|---|---|
| `Session not found` (JSON-RPC `-32600`) | the **MCP transport session** between the client and the Python server | the client is presenting a session id the restarted server never issued | reconnect the client — the IDE's MCP Server panel → reconnect, or restart the client. That also re-reads the tool list |
| `no_unity_session` / `Unity session not available; please retry` | the **Unity bridge** between the Python server and the Editor | the server runs but has no usable Unity session; first suspect is a C#-vs-Python version mismatch, then an Editor that is closed, compiling, or not running the bridge | match the two version pins ([procedure above](#ordered-upgrade-procedure)); if they already match, check the Editor |

A reconnect does **not** fix `no_unity_session`, and matching the versions does **not** fix `Session not found`. Read the error text and pull the right lever.

#### v10.3.0 server CLI surface

From `mcp-for-unity --help` on 10.3.0 (**VERIFIED 2026-10-21**):

```
mcp-for-unity [-h] [--default-instance INSTANCE] [--transport {stdio,http}]
              [--http-url URL] [--http-host HOST] [--http-port PORT]
              [--http-remote-hosted] [--api-key-validation-url URL]
              [--api-key-login-url URL] [--api-key-cache-ttl SECONDS]
              [--api-key-service-token-header HEADER] [--api-key-service-token TOKEN]
              [--unity-instance-token TOKEN] [--pidfile PATH] [--project-scoped-tools]
```

New in v10 relative to what the 9.6.8 launch line used: `--http-host` / `--http-port` as separate options alongside `--http-url`, `--http-remote-hosted`, the `--api-key-*` group (remote-hosted auth), and `--default-instance`. `--project-scoped-tools` and `--unity-instance-token` carry over unchanged. This also **confirms the stdio fallback form** documented under [MCP Connection](#mcp-connection) — `uvx --from mcpforunityserver mcp-for-unity --transport stdio` — is correct. The one thing to add is that **pinning a version in `--from` is the real-world convention**, which is exactly what Unity's own launcher does.

#### What v10.3.0 is, with sources

- **v10.3.0 is the current non-prerelease release**: GitHub tag `v10.3.0`, published 2026-10-04, release asset `unity-mcp-10.3.0.mcpb`.
- The matching Python server **`mcpforunityserver-10.3.0`** is on PyPI, uploaded the same minute, `requires_python >= 3.10`.
- Release-notes items that matter to this Power: a Unity 6000.6 `InstanceIDToObjectCompat` fix; `fix(stdio): refresh port discovery before reconnect backoff`; `fix(read_console): stop the Console window's filters from hiding entries`; upstream documentation on where to look when a tool is missing from the tool list; the new Blender Bridge; and auto-discovery of fal / OpenRouter asset-generation models.

### Language Setting / 語言設定

This Power automatically adapts to the language the developer uses — write in the preferred language and it responds in kind. No configuration needed.

本 Power 會自動適應您使用的語言 — 用任何語言提問，即以該語言回覆，無需額外設定。

- If no language is detected from the developer's input, the default is Traditional Chinese (繁體中文)
- Technical terms remain in English with explanation in the developer's language / 技術術語保留英文原文並附說明
- Code identifiers stay in English (Unity/C# conventions) / 程式碼變數/函式名稱維持英文
- To set a preferred response language, create a file named `language-override.md` in the `.kiro/steering/` directory of the project (note: folders starting with a dot are hidden by default on macOS/Linux; use `ls -a` or enable hidden files in the file manager to see them):

  ```markdown
  ---
  inclusion: auto
  ---
  # Language Override
  - Respond in English for all interactions.
  ```

### MCP Connection

**Primary — HTTP (default transport)**:
MCP for Unity's default transport is streamable HTTP, and the default local endpoint is `http://127.0.0.1:8080/mcp` — that value is the Unity-side default (`HttpEndpointUtility.DefaultLocalBaseUrl`) and the Python server default, so it is what this Power's `mcp.json` ships with. **VERIFIED on 2026-10-21**: on the live install, `debug_request_context` reported the server's own argv as

```
mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools
  --pidfile <UnityProject>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>
```

so `http://127.0.0.1:8080` really is the endpoint in use there. **That is not a universal constant** — the endpoint is whatever `--http-url` the server was launched with. (Two other facts from the same response, worth knowing when a client looks mis-wired: the console script is **`mcp-for-unity`**, not `unity-mcp`, resolved from the `uv` cache; and `server.version` was `9.6.8`, matching the installed UPM package exactly, so a server/package version skew is not the *steady* state. **It is, however, exactly what an upgrade produces** — the UPM package and the Python server are pinned separately, so upgrading one leaves the other behind; see [Upgrading the bridge](#upgrading-the-bridge--two-independent-version-pins).)

**The port is user-editable and 8080 collides with other services** (upstream names Tailscale as an example and suggests moving to 8090). Do the steps in this order:

1. **Let Unity write the config.** `Window → MCP for Unity` → confirm the transport is HTTP → **Configure All Detected Clients** (or select the IDE and **Configure Selected**). The IDE is a first-class supported client, so this writes a port-accurate entry for you.
2. **Read the real port.** The MCP for Unity window shows the server endpoint. If it is not 8080, the URL is `http://127.0.0.1:<that port>/mcp`.
   **Discovering the port without the window**: the running server writes a pidfile whose *name encodes the port*, under the Unity project:

   ```
   <UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid
   ```

   So listing that directory answers "which port is my server on?" directly — `mcp_http_8080.pid` means 8080. This is a reliable local check when the Editor window is unavailable or the IDE's config and the server disagree.
3. **Hand-edit `mcp.json` last**, and only if steps 1–2 did not produce a working entry:

   ```json
   {
     "mcpServers": {
       "unity-mcp": {
         "url": "http://127.0.0.1:8080/mcp",
         "type": "http",
         "env": {},
         "disabled": false
       }
     }
   }
   ```

   Replace `8080` with the port shown in the Unity window. The mode key is **`type`**, not `transport`.
4. **On a port conflict**: change the port in MCP for Unity settings, re-run Configure, then restart the IDE.

> **`127.0.0.1` vs `localhost`**: upstream docs print `localhost`, but the Unity side's own default is the literal `127.0.0.1`. The server binds both loopback families, and on Windows `localhost` can resolve to `::1` first — so `127.0.0.1` is the safer literal and the one this Power uses.

> **Security Note**: plain HTTP is used intentionally. The server binds loopback only (`127.0.0.1` / `::1`); binding a LAN address requires `Advanced Settings → Allow LAN Bind (HTTP Local)`, and a remote endpoint must be `https://` unless `Allow Insecure Remote HTTP` is explicitly enabled. Traffic on the default setup never leaves the local machine, so HTTPS is not required.

**Backup — stdio (standard input/output — communication via text streams) via uvx**:
If HTTP is unavailable (port conflict, firewall), stdio launches the MCP bridge as a subprocess (a child process managed by the IDE) through `uvx`, a Python package runner. The PyPI distribution is **`mcpforunityserver`** and the console entrypoint is **`mcp-for-unity`**; `--transport stdio` is required.

Windows (use an absolute `uvx.exe` path — the WinGet shim is the recommended one):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "C:/Users/<you>/AppData/Local/Microsoft/WinGet/Links/uvx.exe",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

macOS/Linux (`uvx` on PATH is usually fine):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

> **Note**: the HTTP mode above works without understanding any of this. stdio is only a fallback. Unity's own configurator writes a version-pinned `--from mcpforunityserver==<package version>`; the unpinned form above tracks the newest server. The `--transport stdio` form was **confirmed correct against v10.3.0's own `--help` output**, and version-pinning `--from` is the real-world convention — full option list at [v10.3.0 server CLI surface](#v1030-server-cli-surface).

> **stdio-only behaviour**: `set_active_instance` accepts a bare port number only in stdio mode. Over HTTP the `instance` argument must be `Name@hash` (or an unambiguous hash prefix).

### Connection Health Check

Before executing any MCP operation, perform a lightweight health check:
1. Attempt one cheap read-only call: `manage_scene(action: "get_active")`. Use this call and no other — it is in the `core` tool group, which is the only group enabled by default. **VERIFIED working on both bridge 9.6.8 and bridge 10.3.0** (2026-10-21), so it is a safe probe across the major version bump
2. If successful → MCP connection is healthy
3. If failed → prompt the developer to:
   - Confirm Unity Editor is open with a project loaded
   - Open `Window → MCP for Unity` and confirm the status panel reads **Connected**; use `Restart Server` if it does not
   - Read the server port shown in that window and confirm the URL in `mcp.json` (or the IDE's MCP panel) matches it — do not assume 8080. The pidfile `<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid` names the port the server is actually serving
   - Confirm only one Unity MCP server is registered (see [Onboarding](#1-pick-exactly-one-mcp-registration-path))
   - If the call came back as *denied by permissions* rather than failing to connect, this is not a connection fault at all — see [Tool denied by the IDE's own permission rules](#tool-denied-by-the-ides-own-permission-rules)
4. **Read the failure text before diagnosing anything** — three different failures look like "the connection is broken" and each needs a different lever:
   - `no_unity_session` / `Unity session not available; please retry` → the Python server is up but has no usable Unity session. First suspect a C#-vs-Python version mismatch ([Upgrading the bridge](#upgrading-the-bridge--two-independent-version-pins)), then an Editor that is closed or compiling. Reconnecting the client does nothing for this
   - `Session not found` (JSON-RPC `-32600`) → the MCP transport session is gone, almost always because the server restarted. Reconnect the client; the version pins are irrelevant here
   - `Tool call denied by user's permissions` → the IDE blocked it, as above

### Auto-Activation Hook（自動品質檢查）

本 Power 附帶一個 hook 範本，位於套件內的 `hooks/unity-power-auto-activate.json`，採用 Kiro 1.0 的 `v1` hook schema。

**觸發時機**：`UserPromptSubmit` — 每個使用者回合開始時觸發一次，必定早於任何工具呼叫。`action.type` 為 `agent`，也就是把一段提示注入對話中。

**功能**：提醒 AI 在動手之前必須先：
1. 啟動（activate）本 Power 以載入完整文件
2. 讀取對應的 steering file（`steering/` 下共 15 個檔案）以獲取該任務的最佳實踐指引
3. 依照 Power 文件中定義的 workflow 執行操作

**安裝方式**：Power 無法自行安裝 hook。請把 `hooks/unity-power-auto-activate.json` 複製到工作區的 `.kiro/hooks/unity-power-auto-activate.json`（完整 JSON 內容見本文件開頭的 [Onboarding](#2-install-the-auto-guidance-hook) 一節）。如需停用，把 `enabled` 改為 `false` 即可，不必刪除檔案。

> **為什麼不用 `PreToolUse`**：`PreToolUse` hook 是 fail-closed — 逾時、錯誤或無法執行都會「拒絕」該次工具呼叫，等於擋掉所有 Unity 工具呼叫，正是本 Power 要避免的故障。`UserPromptSubmit` 每回合只跑一次，既達到提醒目的，也不會在 25 筆的 `batch_execute` 工作流上重複啟動 agent loop。


## Available MCP Tools

> **Verification scope.** The tool names, actions and parameters below were checked on
> **2026-10-21** against MCP for Unity **9.6.8** and then again, by direct calls, against MCP for
> Unity **10.3.0** on the same machine, both connected to Unity **6000.4.6f1** (Windows Editor,
> URP 17.4.0). The first five rounds were read-only; a sixth round exercised the **write path** on
> 10.3.0. Items that could not be exercised on that machine were reconciled against the MCP for
> Unity **v10.3.0** generated tool reference and Python tool registry, and are marked as such.
>
> **How the write path was verified, so you can judge the claims.** Every mutating call went into
> an isolated `Assets/_MCPVerify/` folder, used `MCPVerify_*` object names, and was deleted
> afterwards. The project was then confirmed back at baseline: `SampleScene` with its original
> **3** roots (Main Camera, Directional Light, Global Volume) carrying their original component
> sets, and a full `manage_asset(action: "search", search_pattern: "*")` returning its original
> **20** assets — all stock Unity template content. The only difference from the starting state is
> the instance IDs, for the reason in
> [instance IDs are volatile](#instance-ids-are-volatile--never-cache-one).
>
> **A seventh round ran the platformer workshop's critical path as an acceptance test, and it
> PASSED.** That is the strongest claim in this document, so here is exactly what it means: the
> steps of `workshop/2d-platformer-game.md` that create the player and its movement script were
> executed as written, in an isolated scene, and a script using Unity 6.4's current
> `linearVelocity` API compiled with **0 errors and 0 obsolete-API warnings**
> (`validate_script` → 0 errors / 1 analyzer warning about an unassigned `groundLayer` field;
> `read_console(types: [error, warning], filter_text: "PlayerController")` → **0 entries**), the
> type genuinely loaded (`execute_code` reported `loaded: PlayerController base=MonoBehaviour`),
> it attached as a real component, and reading the live object back returned
> `script=True gravityScale=3 freezeRot=FreezeRotation comps=5`. The same run **newly verified**
> `manage_scene` `create`/`save`/`load` and `create`'s folder auto-creation,
> `manage_gameobject`'s `components_to_add` (SpriteRenderer + Rigidbody2D + BoxCollider2D in one
> call, with `tag` applied), and `manage_components(set_property)` resolving `target` by NAME. It
> also uncovered the two documentation bugs corrected in this revision:
> [`search_pattern` is not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob) and
> [user scripts need an assembly-qualified `component_type`](#component_type-built-in-vs-user-script).
>
> **What was verified ON 10.3.0.** The bridge was upgraded to **10.3.0** on that machine, the
> upgrade itself was observed, and after the client reconnected the v10 tool surface was exercised
> directly. **VERIFIED on 10.3.0**: `debug_request_context` reporting `server.version` `10.3.0`;
> the full **49-tool** inventory and the purely-additive 9.6.8 → 10.3.0 delta (6 tools added, none
> removed or renamed); the existence, membership and **default-off** state of the `asset_gen`
> group; all **ten** group memberships and their defaults; the
> [`batch_execute` server-layer divergence](#batch_execute-and-server-layer-actions); the
> `unity_docs` unqualified-`class_name` trap; `find_in_file` being C#-script-only; and the
> `manage_asset` / `find_gameobjects` / `manage_scene` action contracts. The release/tag/PyPI
> facts, the server CLI surface, the two-pin architecture, the upgrade failure modes and the
> recovery were observed during the upgrade itself
> ([Upgrading the bridge](#upgrading-the-bridge--two-independent-version-pins)).
>
> **The write path is also VERIFIED on 10.3.0**: `manage_asset` `create_folder` and `delete`;
> `create_script`; `get_sha`; `validate_script`; `find_in_file`'s **success path**;
> `script_apply_edits`; `manage_gameobject` `create`/`modify`/`duplicate`/`delete`;
> `manage_components` `add` and `set_property`; `manage_prefabs(action: "create_from_gameobject")`;
> `delete_script`; `refresh_unity`; and `run_tests` → `get_test_job` as a **complete async job
> lifecycle** (`status: "running"` then `"succeeded"` in roughly 7.5 s). The seventh round added
> `manage_scene` **`create`** (which auto-creates its target folder), **`save`** and **`load`**;
> `manage_gameobject`'s **`components_to_add`**; and `manage_components(set_property)` resolving
> **`target` by name**.
>
> **Still not exercised**: the six `asset_gen` tools (**deliberately never called — they spend the
> developer's third-party credits**); `manage_build` (denied by the verification machine's own
> `permissions.yaml` rule); `run_tests` against **actual tests** — the project's two `.cs` files
> are not test assemblies, so the job returned `completed: 0, total: 0`, and **pass/fail reporting,
> `include_failed_tests` and PlayMode remain UNVERIFIED** even though the lifecycle is confirmed;
> the `t:Model` / `t:GameObject` search filters for FBX and other models (the project contains no
> model assets, so only `t:MonoScript`, `t:Texture2D` and `*` were measured —
> [`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob));
> `execute_menu_item`; `execute_custom_tool`; `set_active_instance`; `manage_editor`'s
> `play`/`pause`/`stop`/`deploy_package`/`restore_package`;
> `manage_scriptable_object`; `manage_animation`; `manage_vfx`; `manage_texture`; `manage_shader`;
> `manage_ui` writes; `manage_graphics` setters and `bake_*` actions; `manage_prefabs`' prefab-stage
> actions (`open_prefab_stage`/`save_prefab_stage`/`close_prefab_stage`); `manage_asset`'s
> `modify`/`import`/`duplicate`/`move`/`rename`; `apply_text_edits`; `manage_probuilder` (package
> absent); memory-snapshot actions (`com.unity.memoryprofiler` absent); Cinemachine-dependent
> `manage_camera` paths (package absent); and the `mcpforunity://` resource table (the client
> exposes no resource-reading tool — though `refresh_unity`'s own response `hint` names
> `mcpforunity://editor/state`, which independently confirms that one resource exists).
>
> If a **direct** call fails with an "Unknown action" or a validation error, that error message
> lists the real valid values and **overrides this document**. That rule holds for direct calls
> **only** — an identical error raised inside `batch_execute` is not evidence of anything, because
> the batch path does not reach the server-layer action handlers. See
> [`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions).

**The 9.6.8 → 10.3.0 delta is purely additive, and that is now observed rather than inferred.** The live tool list was enumerated on the same machine under both bridge versions (**VERIFIED 2026-10-21**): **43** tools on 9.6.8, **49** on 10.3.0. The six added tools are `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model` and `import_model_file` — all six in the new [`asset_gen`](#generative-tools-asset_gen-group--awareness-only) group. **Nothing was removed and nothing was renamed.** So every tool name this document uses exists on 10.3.0, and the upgrade carries no migration cost for this Power.

> **Use the live count, not upstream's.** Upstream's README advertises "48 focused MCP tool entrypoints"; the live count on 10.3.0 is **49**. The live count is authoritative, and this document does not repeat a hard tool-count figure taken from upstream marketing copy — if you need the number, read it from `manage_tools(action: "list_groups")` on the connected bridge.

### `batch_execute` and server-layer actions

`batch_execute` is **not** equivalent to calling the same tools one at a time, and this trips up both agents and anyone verifying this document.

**VERIFIED on 2026-10-21 on BOTH bridge 9.6.8 and bridge 10.3.0** (direct calls vs. the same calls wrapped in a batch). The divergence was re-tested after the 10.3.0 upgrade and reproduced exactly, so this is bridge behaviour, not a version-specific quirk — there is nothing here to "re-check on v10":

| Call | Direct | Inside `batch_execute` |
|---|---|---|
| `manage_editor(action: "telemetry_status")` | `{"success": true, "telemetry_enabled": true}` | fails — `Unknown action: 'telemetry_status'` |
| `manage_editor(action: "telemetry_ping")` | `{"success": true, "message": "telemetry ping queued"}` | fails — `Unknown action: 'telemetry_ping'` |

The error raised inside the batch lists only the 12 Unity-side `manage_editor` actions (`play`, `pause`, `stop`, `set_active_tool`, `add_tag`, `remove_tag`, `add_layer`, `remove_layer`, `deploy_package`, `restore_package`, `undo`, `redo`) — the two telemetry actions are missing from it even though they work.

**Why:** `batch_execute` forwards each command straight to Unity's C# handler, **bypassing the action handlers implemented in the Python server layer**. A server-layer action therefore fails inside a batch with a message that makes it look as though the action does not exist.

**Rules that follow from this:**

- **Call server-layer actions directly. Never wrap them in `batch_execute`.** `manage_editor`'s `telemetry_status` / `telemetry_ping` are the confirmed, worked example.
- **An "Unknown action" error from inside a batch is not proof the action does not exist.** Retest it as a direct call before concluding anything, and before "correcting" this document.
- Batch what is genuinely Unity-side work: GameObject/component/asset mutation, the repetitive calls the rest of this document batches. That is unaffected.
- The server-layer/Unity-layer split is **established only for these two actions**. Do not assume a broader list — there is no enumerated catalog of server-layer actions, so if a batched action fails, retest it directly rather than guessing which layer owns it.

### Tool Groups

MCP for Unity partitions its entrypoints into **10 groups**. The bridge's own default is `core` only — the other nine are declared opt-in in the source and reported as `enabled: false` by `list_groups`.

> **The table below was enumerated from a live `manage_tools(action: "list_groups")` call on bridge 10.3.0 (VERIFIED 2026-10-21).** Ten groups, 49 tools, and the per-group membership and `default_enabled` value are all observed. `core` is the only group with `default_enabled: true`; the other nine report `default_enabled: false`. Group sizes as returned: `core` 25, `animation` 1, `asset_gen` 6, `docs` 2, `probuilder` 1, `profiling` 1, `scripting_ext` 2, `testing` 2, `ui` 1, `vfx` 3. The nine non-`asset_gen` groups came back **unchanged from the 9.6.8 response**; `asset_gen` is the one addition.

> **Do not treat group activation as a required preamble.** On the live-verified install (HTTP transport, server launched with `--project-scoped-tools`) **every tool was callable from the start of the session**, before any `manage_tools` call — 43 of 43 on 9.6.8, including `manage_profiler`, `manage_ui`, `execute_code`, `unity_reflect` and `manage_animation`; and on 10.3.0 default-off-group tools such as `unity_docs` answered directly with no activation. Activation is **conditional troubleshooting**: run it only when a tool is actually reported as not existing. The table below is the catalog and the ownership map, not a checklist to work through first.

> **`asset_gen` costs money — read [Generative Tools](#generative-tools-asset_gen-group--awareness-only) before activating it.** Activating that group exposes six tools that call paid third-party services on the developer's own API keys. It is **VERIFIED off by default on 10.3.0**, which is the safe default. Do not activate it as part of any diagnostic sweep.

| Group | Default | Tools |
|---|---|---|
| `core` (25) | **on** | `apply_text_edits`, `batch_execute`, `create_script`, `delete_script`, `execute_menu_item`, `find_gameobjects`, `find_in_file`, `get_sha`, `manage_asset`, `manage_build`, `manage_camera`, `manage_components`, `manage_editor`, `manage_gameobject`, `manage_graphics`, `manage_material`, `manage_packages`, `manage_physics`, `manage_prefabs`, `manage_scene`, `manage_script`, `read_console`, `refresh_unity`, `script_apply_edits`, `validate_script` |
| `animation` (1) | off | `manage_animation` |
| `asset_gen` (6) | off — **spends money, see [Generative Tools](#generative-tools-asset_gen-group--awareness-only)** | `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model`, `import_model_file` |
| `docs` (2) | off | `unity_docs`, `unity_reflect` |
| `probuilder` (1) | off | `manage_probuilder` (also needs `com.unity.probuilder`) |
| `profiling` (1) | off | `manage_profiler` |
| `scripting_ext` (2) | off | `execute_code`, `manage_scriptable_object` |
| `testing` (2) | off | `get_test_job`, `run_tests` |
| `ui` (1) | off | `manage_ui` |
| `vfx` (3) | off | `manage_shader`, `manage_texture`, `manage_vfx` |

The ten groups above account for 44 of the 49 tools. The remaining five are the **server meta-tools** — `manage_tools`, `set_active_instance`, `manage_script_capabilities`, `debug_request_context` and `execute_custom_tool` — which the live `list_groups` response placed **outside every group** on both 9.6.8 and 10.3.0 (`group=None` in the bridge source), even though upstream's catalog lists four of them under `core`. Either way all five are always visible and callable without activating anything, and `manage_tools` in particular cannot be switched off — that is what makes it a usable recovery lever.

**`manage_tools` — the control surface:**

| Action | Params | Effect |
|---|---|---|
| `list_groups` | — | returns every group with `name`, `description`, `enabled`, `default_enabled`, `tools`, `tool_count` |
| `activate` | `group` (required) | the group's tools appear in the next tool listing |
| `deactivate` | `group` (required) | hides them again |
| `sync` | — | adopts the Unity Editor's per-tool toggles (`Window > MCP for Unity > Tools`) into this session. Errors with an "update the MCPForUnity package" message if the Editor is too old to report tool states |
| `reset` | — | back to `core` only |

Valid `group` values: `animation`, `asset_gen`, `core`, `docs`, `probuilder`, `profiling`, `scripting_ext`, `testing`, `ui`, `vfx`.

**Conditional recovery sequence — run this only when a tool is reported as not existing:**

```
manage_tools(action: "list_groups")              # see the catalog
manage_tools(action: "sync")                     # adopt the Unity Tools-window toggles
manage_tools(action: "activate", group: "...")   # enable the group that owns the missing tool
manage_tools(action: "reset")                    # back to core-only when finished
```

**Enforcement semantics — read these distinctions carefully:**

- **VERIFIED**: the gate is a *tool-listing* filter (per-session component visibility keyed on a `group:<name>` tag), and the server-level default that hides non-`core` groups at startup is applied **only on HTTP transport**. On stdio every group is enabled at startup and then reconciled against Unity's toggles.
- **VERIFIED (2026-10-21)**: deactivation really is enforced. After `manage_tools(action: "deactivate", group: "profiling")`, a `manage_profiler` call was rejected by the client with `Tool 'manage_profiler' does not exist on server 'power-kiro-unity-accelerator-unity-mcp'`. So `deactivate` is a real off-switch — do not use it casually mid-workflow.
- **VERIFIED (2026-10-21)**: the *default* state on that install was the opposite of the reported flags — **every non-core tool was callable before any `manage_tools` call**, and still callable immediately after `manage_tools(action: "reset")` returned `{"reset": true, "default_groups": ["core"]}`. The server was launched with `--project-scoped-tools`, which may be why the HTTP session exposed the full surface regardless. **Treat "the group is off" as a hypothesis to test, never as the reason a call failed.**
- **VERIFIED**: `list_groups`' `enabled` / `default_enabled` fields are **misleading**. Every non-core group reported `enabled: false` both before and after `reset`, while those tools were demonstrably callable. **The fields are not a readout of what is callable** — the only reliable test is to make the call. The one place the flag is still worth reading is `asset_gen`, because its default-off state is the guard on tools that spend money; treat a callable `asset_gen` tool as something to tell the developer about, not something to use.
- Some MCP clients **cache the tool list** until the server is restarted or the client refreshes. After `activate`, a tool may not appear until the client reconnects — so always tell the developer that a refresh may be needed rather than assuming the activation failed.
- A tool can also be missing or refused for reasons that have nothing to do with groups — most notably an IDE-side permission rule. See [Tool denied by the IDE's own permission rules](#tool-denied-by-the-ides-own-permission-rules).

### Tool denied by the IDE's own permission rules

A tool call can be refused **before it ever reaches Unity**, by the IDE's permission layer. This is a distinct failure mode from a missing tool group and from a bridge error, and it was **VERIFIED on 2026-10-21**.

**The namespace.** The IDE exposes a Power's MCP server under **`power-<powerName>-<serverName>`**. For this Power that is **`power-kiro-unity-accelerator-unity-mcp`** (`powerName` from the POWER.md frontmatter `name`, `serverName` from the key in `mcp.json`). This is the string permission rules match against, and it is also the name that appears in client-side errors such as `Tool '<tool>' does not exist on server 'power-kiro-unity-accelerator-unity-mcp'`.

**The symptom.** A direct `manage_build(action: "settings")` call was refused with an IDE-side message, not a Unity one:

```
Tool call denied by user's permissions.
Rule: deny mcp matching "power-kiro-unity-accelerator-unity-mcp/manage_build"
Source: C:\Users\<you>\.kiro\settings\permissions.yaml
```

The rule was a `capability: mcp` / `effect: deny` entry in the user's own `permissions.yaml`. Consequence on that machine: **[Workflow 3 (Build Automation)](#workflow-3-build-automation-requirement-3) cannot run at all**, for a reason that has nothing to do with Unity, the bridge, or tool groups.

**What to do.** If a call comes back as denied-by-permissions rather than with a Unity or bridge error:

1. Check `~/.kiro/settings/permissions.yaml` (and the workspace-level equivalent) for `capability: mcp` entries with `effect: deny` whose `match` list contains `power-<powerName>-<serverName>/<tool>`.
2. Tell the developer which rule matched and let **them** decide whether to relax it. Never edit a user's permission file on their behalf, and never present the denial as a Power or bridge defect.
3. Do not retry the same call in a loop — the denial is deterministic.

> **Security note.** Permission denials observed here applied to the **outer** tool call. Treat a per-tool MCP deny rule as a guard on the tool the agent names, not as a guarantee that the underlying Unity operation is unreachable by any route. If a tool is denied, stop and tell the developer — do not look for another path to the same operation. (Reported as an observation in the task record for upstream follow-up.)

### Server & Session Meta-Tools

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_tools` | `list_groups`, `activate`, `deactivate`, `sync`, `reset` | Tool-group gating — see [Tool Groups](#tool-groups) above. Params: `action` (required), `group`. Never reaches Unity; always visible |
| `set_active_instance` | N/A — param: `instance` (required) | Routes this client/session to one of several connected Editors. Accepts `Name@hash` (where `Name` is Player Settings `productName` and `hash` is a stable 8-character hash of the project path) or an unambiguous hash prefix; **a bare port number works only in stdio mode**. Discover instances via the `mcpforunity://instances` resource. A per-call `unity_instance` argument routes a single call without changing the session default |
| `manage_script_capabilities` | N/A — no params | Returns the script-editing contract: `ops`, `text_ops`, `max_edit_payload_bytes`, `guards`. Call this before a large `apply_text_edits` to learn the payload ceiling instead of discovering it by failing |
| `execute_custom_tool` | N/A — params: `tool_name` (required), `parameters` | Invokes a project-scoped custom tool registered by the Unity project. Discover candidates via the `mcpforunity://custom-tools` resource. If the server was started with project-scoped tools disabled, this tool is not registered at all — its absence is not a connection fault |
| `debug_request_context` | N/A — no params | Returns the FastMCP request context (`client_id`, `session_id`, metadata dump) plus `server.version` and the server's own argv. Use it when a client appears to be talking to the wrong server key or the wrong session, and as the readout for the Python half of the two version pins. **v10 hardening (VERIFIED 2026-10-21)**: on 10.3.0 the `--unity-instance-token` value comes back **masked as `***`**; on 9.6.8 the same call printed it in clear text. Checking the output before pasting it into an issue or a chat is still good practice, but on v10 it is far less critical. Also on 10.3.0, `session_state` **no longer returns the `derived_key` / `all_keys_in_store` fields** that 9.6.8 returned — do not expect them, and do not treat their absence as a fault |

### Asset Management

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_asset` | `import`, `create`, `modify`, `delete`, `duplicate`, `move`, `rename`, `search`, `get_info`, `create_folder`, `get_components` | There is **no `list` action** (**VERIFIED on both bridge 9.6.8 and bridge 10.3.0** — the rejection on 10.3.0 returned the identical valid-action list, so the contract survived the major version bump) — use `search` with `path` + `search_pattern` to enumerate assets. **`search_pattern` is Unity's AssetDatabase filter syntax, NOT a filename glob**: write `t:Model`, never `"*.fbx"`, and read [`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob) before writing any `search` call — an `*.ext` pattern returns `success: true` with **zero** results. Use `get_info` for import settings/metadata on a single asset. **`path` is required on every action.** `asset_type` is required for `create`. Paging on `search` uses **`page_size` + `page_number` (1-based), not `cursor`**. Other params: `properties`, `destination`, `filter_type`, `filter_date_after`. Leave `generate_preview` at its default `false` — enabling it returns large base64 payloads. **`create_folder` and `delete` are VERIFIED on 10.3.0 (2026-10-21)**: `create_folder` returned the new folder's guid, instanceID and `isFolder: true`, and `delete` on a folder removed the folder together with the asset inside it. `modify`, `import`, `duplicate`, `move` and `rename` are still unexercised |
| `manage_material` | `ping`, `get_material_info`, `create`, `set_material_shader_property`, `set_material_color`, `assign_material_to_renderer`, `set_renderer_color` | `assign_material_to_renderer` also takes a `search_method` using the same `by_*` vocabulary as `find_gameobjects` |
| `manage_texture` | `create`, `modify`, `delete`, `create_sprite`, `apply_pattern`, `apply_gradient`, `apply_noise`, `set_import_settings` | Procedural texture generation, not just import-setting management. **Group `vfx` — reported off by default**; activate with `manage_tools(action: "activate", group: "vfx")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)) |
| `manage_shader` | `read` (read-only); `create`, `update`, `delete` (modifying) | Requires `name` + `path`; there is no `list` action — use `manage_asset(action: "search", path: "Assets/", search_pattern: "t:Shader")` to enumerate shaders first (**not** `"*.shader"`, which matches nothing — see [`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob)). **Group `vfx` — reported off by default**; activate with `manage_tools(action: "activate", group: "vfx")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)) |

#### `search_pattern` is an AssetDatabase filter, not a glob

**Corrected instruction — VERIFIED on 10.3.0, 2026-10-21.** Earlier revisions of this document told you to enumerate assets with a filename glob (`"*.fbx"`, `"*.cs"`, `"*.shader"`). That is wrong, and it fails in the worst possible way: `manage_asset(action: "search")` takes **Unity's AssetDatabase filter syntax**, so an `*.ext` pattern matches nothing and the call returns **`success: true` with zero assets**. Nothing errors. A workflow built on it looks like it ran and reports "0 succeeded", which reads as *the project is empty* rather than *the query was wrong*.

Measured on the verification project (20 assets total):

| `search_pattern` | Assets returned |
|---|---|
| `"*.cs"` | **0** — silently, with `success: true` |
| `"t:MonoScript"` | **2** — both `.cs` files, correctly |
| `"t:Texture2D"` | **1** — a `.png` |
| `"Readme"` (bare name substring) | 3, including both `.cs` files |
| `"*"` | 20 — every asset |

**Use these instead:**

| Want | `search_pattern` | Status |
|---|---|---|
| C# scripts | `t:MonoScript` | **VERIFIED** (2 assets, both `.cs`) |
| Textures | `t:Texture2D` | **VERIFIED** (1 asset, a `.png`) |
| Everything under `path` | `*` | **VERIFIED** (20 assets) |
| Shaders | `t:Shader` | Unity filter syntax — **UNVERIFIED here** (no shader assets in the verification project) |
| Materials / scenes / prefabs | `t:Material` / `t:SceneAsset` / `t:Prefab` | Unity filter syntax — **UNVERIFIED here** |
| **Models (FBX/OBJ/blend)** | `t:Model` (or `t:GameObject`) | Unity filter syntax — **UNVERIFIED here**: the verification project contains no model assets, so this filter was never exercised. Use it, but confirm the returned count against the folder before batching on it |

**A bare name substring also works** (`"Readme"` matched 3 assets) and is the safe fallback when the type name is uncertain — or combine them, since AssetDatabase accepts `t:` filters and name terms in the same query. Only `t:MonoScript`, `t:Texture2D` and `*` were actually measured; every other `t:` value above is Unity's documented filter vocabulary rather than something this Power observed.

**Before you trust a zero-result `search`, re-run it with `search_pattern: "*"` under the same `path`.** If `*` returns assets and your filter returned none, the filter is wrong — not the project. This exact mistake was made *inside this repo's own verification work*: a `"*.cs"` search returning 0 was recorded as "the project contains no scripts" and repeated across five rounds, when the project had two `.cs` files all along.

### Scene & GameObject Management

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_scene` | Read-only: `get_hierarchy`, `get_active`, `get_build_settings`, `get_loaded_scenes`, `scene_view_frame`. Modifying: `create`, `load`, `save`, `close_scene`, `set_active_scene`, `move_to_scene`, `validate` | No `list` action — use `get_loaded_scenes` for currently loaded scenes or `get_build_settings` for the Build Settings scene list. **`create`, `save` and `load` are VERIFIED on 10.3.0 (2026-10-21)**: `create` with `name` + `path` made the new scene active (rootCount 0, buildIndex -1) and **auto-created its target folder**; `save` persisted the in-memory scene; `load` re-read a scene from disk. **A scene mutation is not on disk until you `save`** — see [scene edits live in memory until you save](#scene-edits-live-in-memory-until-you-save) |
| `manage_gameobject` | `create`, `modify`, `delete`, `duplicate`, `move_relative`, `look_at` | For CRUD only. Use `find_gameobjects` to search. **`target` must be a string and is resolved as a NAME by default** — see [the three `target` conventions](#the-three-target-conventions). `create`, `modify`, `duplicate` and `delete` are **VERIFIED on 10.3.0**; `create` with `primitive_type: "Cube"` returned the object with Transform/MeshFilter/BoxCollider/MeshRenderer. **`duplicate` ignores `name`** — see [`duplicate` does not honour `name`](#duplicate-does-not-honour-name). The `instanceID` a `create` returns is transient and negative: [instance IDs are volatile](#instance-ids-are-volatile--never-cache-one) |
| `manage_components` | `add`, `remove`, `set_property` | Requires `target` + `component_type`. **An int instance ID is accepted here** — including the transient negative id a fresh `create` returned — which is the fastest handle **within one immediate step**; across steps use a name or path instead, because [instance IDs are volatile](#instance-ids-are-volatile--never-cache-one), and the three object tools do not agree on what `target` means ([the three `target` conventions](#the-three-target-conventions)). Treat the instance ID as an **opaque token** — see the `find_gameobjects` note below. **`component_type` takes a built-in type's short name, but a user script needs `TypeName, Assembly-CSharp`** — see [`component_type`: built-in vs. user script](#component_type-built-in-vs-user-script). `add` and `set_property` are **VERIFIED on 10.3.0**: `add` returned a `componentInstanceID`, `set_property` also resolves `target` **by object NAME**, and `set_property` with a `properties` dictionary set several fields in one call — `properties: {linearDamping: 2.25, useGravity: false, mass: 7.5}` on a `Rigidbody`, read back through `execute_code` as `mass=7.5 linearDamping=2.25 useGravity=False`. That also proves Unity 6.4's current `linearDamping` (the replacement for the obsolete `drag`) is settable through the bridge — see `steering/code-quality.md` for the full obsolete→current mapping |
| `manage_prefabs` | `get_info`, `get_hierarchy`, `create_from_gameobject`, `modify_contents`, `open_prefab_stage`, `save_prefab_stage`, `close_prefab_stage` | `modify_contents` supports `create_child`/`delete_child`/`component_properties` for headless prefab edits. **`target` must be the GameObject's NAME here** — an instance-ID string is rejected ([the three `target` conventions](#the-three-target-conventions)). `create_from_gameobject` is **VERIFIED on 10.3.0**: with `target` + `prefab_path` it returned `componentCount`, `wasUnlinked: false`, `wasReplaced: false` and left the scene instance linked to the new prefab |

#### `component_type`: built-in vs. user script

**VERIFIED on 10.3.0, 2026-10-21.** `manage_components(action: "add")` resolves the two kinds of component type differently, and the live tool description is misleading about it — it lists `'MyScript'` as an example `component_type`, which implies a plain user-script name works. It does not.

| `component_type` | Result |
|---|---|
| `"PlayerController"` (a user script) | **FAILS** — `Component type 'PlayerController' not found. Use a fully-qualified name if needed.` |
| `"PlayerController, Assembly-CSharp"` | **SUCCESS** — `componentType: "PlayerController"` |
| `"Rigidbody"`, `"Rigidbody2D"`, `"SpriteRenderer"`, `"BoxCollider2D"` (built-ins) | **SUCCESS** with the short name |

**The rule: built-in Unity types take the short name; a script you wrote needs `TypeName, Assembly-CSharp`.** (A script inside an assembly definition takes that assembly's name instead of `Assembly-CSharp`.)

**This is not a timing artifact.** In the same Editor, `execute_code` confirmed `System.Type.GetType("PlayerController, Assembly-CSharp")` returned `loaded: PlayerController base=MonoBehaviour` **before** the plain-name call was retried — and it failed again. The type was loaded; the short name simply does not resolve for user assemblies.

Consequence for any create-script-then-attach flow: the compile must have finished *and* the name must be assembly-qualified. Those are two separate failure modes, and `wait_for_ready` does not solve the first one — see [`wait_for_ready` does not wait](#wait_for_ready-does-not-wait).

#### `wait_for_ready` does not wait

**VERIFIED on 10.3.0, 2026-10-21.** `refresh_unity(mode: "force", compile: "request", wait_for_ready: true)` returned **immediately** with `resulting_state: "compiling"`, and the next `manage_components(action: "add")` then failed because the assembly had not reloaded yet. **`wait_for_ready` is not a synchronous barrier.** Do not read it as "this call blocks until the Editor is usable".

After requesting a compile, wait for readiness explicitly before any dependent call: poll `mcpforunity://editor/state` until `data.advice.ready_for_tools` is true — which is exactly what the `refresh_unity` response's own `hint` tells you to do. If no resource-reading tool is available on the client, probe with a cheap `core` call (for example `manage_scene(action: "get_active")`) and retry the dependent call on failure rather than assuming the refresh finished.

#### Scene edits live in memory until you save

**VERIFIED on 10.3.0, 2026-10-21.** `manage_gameobject(action: "delete")` — and every other scene mutation — changes only the **in-memory** scene. Without `manage_scene(action: "save")` the on-disk scene is untouched, and a scene switch re-reads the stale file.

Observed: an object deleted from `SampleScene` without saving came **back**. After creating and loading another scene and then re-loading `SampleScene` from disk, `get_hierarchy` reported **4** roots instead of the baseline 3; the object had to be deleted a second time with an explicit `manage_scene(action: "save")` before the file was actually clean.

- **Every workflow that mutates a scene must decide deliberately whether to save**, and say which it did in its report. Silence here means the developer cannot tell whether the work survived.
- **Switching or reloading a scene discards unsaved changes** — and symmetrically, re-reads whatever is still on disk. Do not treat a scene load as a refresh of what you just built.
- **Cleanup hazard**: a pass that deletes its own test objects but never saves leaves them in the project. Verification and scaffolding cleanup both need the explicit `save`.

#### Instance IDs are volatile — never cache one

**VERIFIED on 10.3.0, 2026-10-21, and this is the single most consequential finding for multi-step work.** One GameObject was tracked across its lifetime and reported **three different** instance IDs:

| Moment | Reported id |
|---|---|
| `manage_gameobject(action: "create")` returned | **-5560** (negative) |
| later, as `originalId` in `manage_gameobject(action: "duplicate")` | **50436** (positive) |
| later still, as `instanceId` in `manage_prefabs(action: "create_from_gameobject")` | **50470** |

Two separate facts came out of that:

- **A freshly created GameObject's instance ID is transient and negative.** Once Unity registers the object the id becomes a different, positive one, and the negative id stops resolving: `manage_gameobject(action: "duplicate", target: "-5560", search_method: "by_id")` failed with `Target GameObject ('-5560') not found using method 'by_id'`.
- **Instance IDs do not survive a domain reload — not even for objects nobody touched.** After a `refresh_unity` recompile, the three untouched scene roots were renumbered: Main Camera 49224 → 50412, Directional Light 49234 → 50422, Global Volume 49242 → 50430.

**Guidance, and it is binding on every workflow in this document:**

- **Prefer the NAME or the hierarchy PATH as the durable handle** when a value has to survive from one step to the next.
- **Re-resolve an instance ID immediately before you use it** (`find_gameobjects`, or the name-based `target` the tool accepts). An id is safe inside the one step that obtained it, and nowhere else.
- **Never carry an id across `refresh_unity`, a recompile, an assembly reload, entering Play Mode, or anything else that triggers a domain reload.** Re-resolve on the other side.
- A "not found using method `by_id`" error on an object you know exists is this finding, not a missing object. Re-resolve by name instead of retrying the id.

#### The three `target` conventions

All three object tools take a parameter named `target`, and **all three resolve it differently** (**VERIFIED on 10.3.0, 2026-10-21**). Learning one tool's convention and applying it to another is a reliable way to fail:

| Tool | What `target` accepts | Observed evidence |
|---|---|---|
| `manage_components` | an **int** instance ID works | `target: -5560` (int) → `Component 'Rigidbody' added` |
| `manage_gameobject` | **must be a string**, and is resolved as a **name** by default | `target: -5560` (int) → `Input should be a valid string`; `target: "-5560"` → `not found using method 'default'`; `target: "MCPVerify_Cube"` → success. `search_method: "by_id"` resolves only a **positive** id — `target: "50436"` → success |
| `manage_prefabs` | requires the **name**; an instance-ID string fails | `target: "50436"` → `GameObject '50436' not found in the active scene or prefab stage`; `target: "MCPVerify_Cube"` → success |

**The safe habit: pass the name to all three.** A name works on every one of them, it is readable in a workflow log, and it does not expire the way an id does ([instance IDs are volatile](#instance-ids-are-volatile--never-cache-one)).

#### `duplicate` does not honour `name`

`manage_gameobject(action: "duplicate", target: "MCPVerify_Cube", name: "MCPVerify_Cube_Dup")` created **`MCPVerify_Cube_Copy`** — Unity's own auto-naming (**VERIFIED on 10.3.0, 2026-10-21**). `name` is not the new object's name on `duplicate`. To get a specific name, follow the duplicate with `manage_gameobject(action: "modify", target: "<auto-name>", name: "<wanted>")`, resolving the auto-named object by name rather than by a cached id. The duplicate did correctly inherit the components added to the original, including the `Rigidbody` (`componentNames` contained `UnityEngine.Rigidbody`).

### UI & Visual

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_ui` | Read-only: `ping`, `read`, `get_visual_tree`, `list`. Modifying: `create`, `update`, `delete`, `attach_ui_document`, `detach_ui_document`, `create_panel_settings`, `update_panel_settings`, `modify_visual_element`, `render_ui`, `link_stylesheet` | This manages **UI Toolkit** (UXML/USS/UIDocument), not legacy uGUI Canvas/Button/Text. For legacy uGUI, create the GameObject + components via `manage_gameobject`/`manage_components` directly. **Group `ui` — reported off by default**; activate with `manage_tools(action: "activate", group: "ui")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)) |
| `manage_camera` | `ping`, `ensure_brain`, `get_brain_status`, `create_camera`, `set_target`, `set_priority`, `set_lens`, `set_body`, `set_aim`, `set_noise`, `add_extension`, `remove_extension`, `set_blend`, `force_camera`, `release_override`, `list_cameras`, `screenshot`, `screenshot_multiview` | `create_camera` supports presets (`third_person`, `freelook`, `follow`, `dolly`, `static`, `top_down`, `side_scroller`) and works with or without Cinemachine installed. To *read* the camera setup prefer the `mcpforunity://scene/cameras` resource. Cinemachine-specific paths are **UNVERIFIED** (package absent on the verification machine) |
| `manage_animation` | Prefixed actions: `animator_*`, `controller_*`, `clip_*` | Action-specific params go in the `properties` dict. **Group `animation` — reported off by default**; activate with `manage_tools(action: "activate", group: "animation")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)) |
| `manage_vfx` | Prefixed actions: `particle_*`, `vfx_*`, `line_*`, `trail_*` | ParticleSystem, VisualEffect, LineRenderer, TrailRenderer. **Group `vfx` — reported off by default**; activate only if the tool is reported as not existing |
| `manage_probuilder` | `create_shape`, `extrude_faces`, `bevel_edges`, `subdivide`, `get_mesh_info`, and many more mesh-editing actions | Requires `com.unity.probuilder` package. **Group `probuilder` — reported off by default**; activate only if the tool is reported as not existing (see [Tool Groups](#tool-groups)). Not exercised live (package absent on the verification machine) |
| `manage_graphics` | Action-prefixed by area — `stats_get`/`stats_list_counters`/`stats_get_memory` (rendering stats); `pipeline_get_info`/`pipeline_get_settings`/`pipeline_set_settings`/`pipeline_set_quality` (render pipeline); `feature_list`/`feature_add`/`feature_remove`/`feature_configure`/`feature_toggle` (URP renderer features); `skybox_get`/`skybox_set_*` (environment/fog/ambient); `volume_*` (Volume/post-processing, requires URP/HDRP); `bake_*` (lightmap/probe baking, Edit mode only) | There is **no `get_settings` or `get_rendering_stats` action** — those are `pipeline_get_settings` and `stats_get` respectively. **Unity 6.4 reading note for `stats_get`**: the redesigned Rendering Statistics window separates draw calls optimised by the SRP Batcher, the GPU Resident Drawer, BatchRendererGroup and GPU instancing, and reports more accurate frame times — report *which batching path absorbed the draw calls* rather than treating "draw calls" as one number. **Unity 6.4 caveat for `volume_*`**: SRP Core now takes `com.unity.modules.physics` as a soft dependency, so a project that disabled the physics module to shrink its build loses local Volumes (global Volumes are unaffected); `IVolume` was also removed in favour of `VolumeGizmoDrawer` |

### Project & Editor

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_packages` | `list_packages`, `search_packages`, `get_package_info`, `add_package`, `remove_package`, `list_registries`, `add_registry`, `remove_registry`, `embed_package`, `resolve_packages`, `ping`, `status` | **Asynchronous**: `list_packages`/`search_packages`/`add_package`/`remove_package` return `{job_id}` immediately with `_mcp_status: "pending"`; poll with `action: "status", job_id: "..."` until it resolves |
| `manage_build` | `build`, `status`, `platform`, `settings`, `scenes`, `profiles`, `batch`, `cancel` | **This is the build tool — `manage_editor` has no build action.** Supports Build Profiles (Unity 6+) via the `profile`/`profiles` params, and `batch` for multi-target builds. See the parameter detail immediately below this table |
| `manage_editor` | Read-only: `telemetry_status`, `telemetry_ping`. Modifying: `play`, `pause`, `stop`, `set_active_tool`, `add_tag`, `remove_tag`, `add_layer`, `remove_layer`, `deploy_package`, `restore_package`, `undo`, `redo`. Params: `tool_name`, `tag_name`, `layer_name` (each optional, used by the matching action) | Does **not** build or refresh — use `manage_build` for builds and `refresh_unity` for asset-database refresh/recompile. Prefab-stage operations live in `manage_prefabs`. **To read editor state, project info, tags, layers, selection, windows, prefab stage or the active tool, use the resources in [MCP Resources](#mcp-resources-read-only) — not this tool.** `telemetry_status` and `telemetry_ping` are real, working read-only actions — **VERIFIED by direct call** on 2026-10-21, returning `{"success": true, "telemetry_enabled": true}` and `{"success": true, "message": "telemetry ping queued"}`. They are handled in the Python server layer, which has two consequences: they **must be called directly and never inside `batch_execute`** (see [`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions)), and they report **nothing** about editor state or compilation, so they are not a readiness probe — use `mcpforunity://editor/state` for that |
| `refresh_unity` | N/A (single-purpose) | Params: `mode`, `scope`, `compile`, `wait_for_ready`. Use after script/asset changes made outside Unity's own import pipeline. **Both `mode` and `compile` are string enums, and `compile` is NOT a boolean (VERIFIED on 10.3.0, 2026-10-21)**: `mode` accepts only **`"if_dirty"`** or **`"force"`**, and `compile` only **`"none"`** or **`"request"`**. `{mode: "both", compile: true}` was rejected with 2 validation errors — `compile: true` is the natural guess and it is wrong. The verified call `{mode: "force", compile: "request", wait_for_ready: true}` returned `{refresh_triggered: true, compile_requested: true, compile_started: true, resulting_state: "compiling"}`, with a `hint` to poll the `mcpforunity://editor/state` resource until `data.advice.ready_for_tools` is true (that hint is also independent confirmation that the editor-state resource exists). **`wait_for_ready: true` does NOT block until the Editor is ready (VERIFIED on 10.3.0)** — that exact call returned immediately in the `compiling` state and the next `manage_components(add)` failed because the assembly had not reloaded. Poll for readiness yourself: [`wait_for_ready` does not wait](#wait_for_ready-does-not-wait). **A refresh that compiles triggers a domain reload, so every instance ID you were holding is now stale** — see [instance IDs are volatile](#instance-ids-are-volatile--never-cache-one) |
| `create_script` / `delete_script` / `validate_script` / `get_sha` | N/A (single-purpose each) | Modern script CRUD; prefer these over the legacy `manage_script` router. See the `uri` and edit-shape detail below this table |
| `apply_text_edits` / `script_apply_edits` | N/A | Line/column-based and structured (method/class-level) C# edits respectively; prefer `script_apply_edits` for method-level changes. **They do not share a signature**: `apply_text_edits` takes `uri`, while `script_apply_edits` takes **`name` + `path`** and rejects `uri` outright (**VERIFIED on 10.3.0**). See the edit-shape detail below this table |
| `manage_script` | `create`, `read`, `delete` only | Legacy compatibility router — **no `list` or `get_info` action**. To enumerate scripts, use `manage_asset(action: "search", path: "Assets/", search_pattern: "t:MonoScript")` — **VERIFIED**, it returns the project's `.cs` assets. `"*.cs"` returns zero results while reporting success ([`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob)) |
| `manage_scriptable_object` | `create`, `modify` | Uses SerializedObject property paths for patches. **Group `scripting_ext` — reported off by default**; activate with `manage_tools(action: "activate", group: "scripting_ext")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)) |
| `manage_physics` | `ping`, `get_settings`, `set_settings`, collision matrix, materials, joints, raycasts, `apply_force`, `simulate_step`, `validate` | 3D and 2D via the `dimension` param |
| `execute_menu_item` | N/A — param: `menu_path` | Executes a Unity menu item by its menu path. Enumerate the available paths with the `mcpforunity://menu-items` resource before guessing a path |

#### `manage_build` parameters

- **`action: "settings"` — pass a `property`.** Valid properties: `product_name`, `company_name`, `version`, `bundle_id`, `scripting_backend`, `defines`, `architecture`. Pass `value` to write; omit `value` to read. Whether a bare `manage_build(action: "settings")` is *rejected* is **UNVERIFIED**: the `'property' parameter is required.` error that this claim rested on was observed only through `batch_execute`, which is not equivalent to a direct call (see [`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions)), and `manage_build` could not be retested directly on the verification machine because the IDE's own permission rules denied it ([permission denials](#tool-denied-by-the-ides-own-permission-rules)). Treat `property` as the shape to use, not as a proven requirement, until someone with `manage_build` permitted retests it directly.
- **`scripting_backend` accepts only `mono` or `il2cpp`.** There is no `coreclr` option — whatever the Editor's own enum contains, this Power cannot select CoreCLR through `manage_build`.
- **`options`** takes a JSON array drawn from: `clean_build`, `auto_run`, `deep_profiling`, `compress_lz4`, `strict_mode`, `detailed_report`. Map any local build-config vocabulary onto these names.
- **`subtarget`**: `player` or `server`.
- **`profile` / `profiles`**: Build Profile asset paths, **Unity 6+ only**. `targets` + `output_dir` for `batch`. `job_id` for `status`/`cancel`.
- `target` values are the *bridge's* alias list, not Unity's full `BuildTarget` enum — read the live target with `manage_build(action: "platform")`.

#### Script-tool parameters

- The `uri` argument of `apply_text_edits` / `get_sha` / `validate_script` / `delete_script` / `find_in_file` accepts three forms: a project-relative `Assets/...` path, `mcpforunity://path/Assets/...`, or `file://...`. **`script_apply_edits` is not in that list** — it has a different signature, below.
- **`script_apply_edits` takes `name` + `path`, NOT `uri` (corrected instruction — VERIFIED on 10.3.0, 2026-10-21).** Earlier revisions of this document listed it among the `uri` tools; that was wrong. Passing `uri: "Assets/_MCPVerify/MCPVerifyProbe.cs"` produced **3 validation errors** at once (`name` missing, `path` missing, `uri` unexpected keyword argument), while `name: "MCPVerifyProbe"` + `path: "Assets/_MCPVerify"` succeeded — so `name` is the filename without `.cs` and `path` is the **containing folder**, the same shape `manage_script(action: "read")` uses. Verified success response: `{path, uri, editsApplied, scheduledRefresh, sha256, normalizedEdits, routing: "structured"}`. Each entry in `edits` carries `op` — one of `replace_method`, `insert_method`, `delete_method`, `anchor_insert`, `anchor_delete`, `anchor_replace` — plus `className`, `methodName` and `replacement`; `options.validate` accepts `standard` or `basic`.
- `apply_text_edits` takes `uri` plus `edits: [{startLine, startCol, endLine, endCol, newText}]` and the coordinates are **1-indexed**. It also accepts `precondition_sha256` (pair it with `get_sha` for a safe read-modify-write) and `strict`.
- `create_script` takes `path` + `contents`, and `contents` is **plain text** — the server base64-encodes it for transport, so do not pre-encode it. **VERIFIED on 10.3.0**: the response returned `uri: "mcpforunity://path/Assets/..."` and `scheduledRefresh: false`.
- `validate_script` takes `level` (`basic` or `standard`) and `include_diagnostics`.
- Call `manage_script_capabilities` first to read `max_edit_payload_bytes` before sending a large edit.
- `manage_script(action: "read")` requires both `name` and `path`, where `path` is the **containing folder**, not the full file path.
- `find_in_file` is a **C# script search**, not a general asset search — it rewrites the `uri`'s extension to `.cs` (see its row under [Execution & Query](#execution--query)).
- **Success paths: VERIFIED on 10.3.0 (2026-10-21)**, against a script created inside the isolated `Assets/_MCPVerify/` verification folder. `create_script` wrote the file; `get_sha` returned `sha256` + `lengthBytes`; `validate_script` returned `{warnings: 0, errors: 0}`; `find_in_file` returned `matches: [{line, content, match, start, end}]` with `count` and `total_matches`; `script_apply_edits` applied a structured edit; `delete_script` reported the file *moved to trash*. The one script tool whose success path is **still UNVERIFIED** is `apply_text_edits` — it was not exercised.

### Execution & Query

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `run_tests` | N/A — params: `mode` (`EditMode`/`PlayMode`), `test_names`, `group_names`, `category_names`, `assembly_names`, `include_failed_tests`, `include_details`, `init_timeout`, `clear_stuck` | **Asynchronous**: returns `{job_id}` immediately; poll with `get_test_job(job_id, wait_timeout: 30)` until the run completes. There is no `platform` filter param — filtering is by test mode/category/assembly, not target platform. `test_names` needs exact full names; `group_names` is the same filter but matched as a **regex**. `init_timeout` is in **milliseconds** (default 15000; 120000 recommended for PlayMode, which starts with a domain reload). `clear_stuck: true` clears an orphaned `running` job that is blocking new runs and starts nothing. Param list from the [v10.3.0 `run_tests` reference](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/tools/testing/run_tests.md), retrieved 2026-10-21. **Group `testing` — reported off by default**; activate only if the tool is reported as not existing (see [Tool Groups](#tool-groups)). **The async job LIFECYCLE is VERIFIED on 10.3.0 (2026-10-21)** — `run_tests(mode: "EditMode")` → `get_test_job(job_id)` went `status: "running"` → `status: "succeeded"` in roughly 7.5 s. **Pass/fail reporting is NOT verified**: the verification project has no test assemblies — it does contain two `.cs` files, but neither is a test assembly — so the job finished with `completed: 0, total: 0` and nothing was ever asserted on. `include_failed_tests` and PlayMode runs remain **UNVERIFIED** |
| `get_test_job` | N/A | Poll target for `run_tests`; supports `wait_timeout` (seconds) to reduce polling round-trips. **Group `testing` — reported off by default**; activate only if the tool is reported as not existing. **The response carries more than this document used to describe (VERIFIED on 10.3.0, 2026-10-21)**: timestamps `started_unix_ms`, `finished_unix_ms`, `last_update_unix_ms`, plus a `progress` object with `completed`, `total`, `current_test_full_name`, `last_finished_test_full_name`, `stuck_suspected`, `editor_is_focused`, `run_in_background`, `focus_nudge_attempts`, `focus_nudge_limit`, `focus_nudge_status`, `blocked_reason`, `failures_so_far` and `failures_capped`. Use `progress.completed` / `progress.total` for a live progress figure and `failures_so_far` to report failures before the run ends; `blocked_reason` explains a job that is not advancing. The server may briefly focus the Unity window during a stalled run (suppress by setting `UNITY_MCP_DISABLE_FOCUS_NUDGE=1` on the Python server). The **lifecycle** is verified end to end; **pass/fail reporting is not** — see the `run_tests` row |
| `read_console` | `get` (default), `clear` | Supports `filter_text`, `types`, `page_size`/`cursor` for paging |
| `batch_execute` | N/A | Each command is `{"tool": "...", "params": {...}}` — **the per-command key is `params`, not `args`**. Supports `parallel`/`fail_fast`/`max_parallelism`. **`fail_fast` defaults to `true`** — pass `fail_fast: false` explicitly for any "record the failure and continue" workflow. **Command cap**: configurable in the Unity MCP Tools window, **default 25, hard maximum 100** — split larger jobs into successive batches. **Not equivalent to direct calls**: the batch path goes straight to Unity's C# handler and bypasses server-layer action handlers, so a server-layer action (confirmed: `manage_editor`'s `telemetry_status` / `telemetry_ping`) fails inside a batch with a misleading `Unknown action` error. Call those directly, and never take a batch error as proof an action does not exist — see [`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions) |
| `find_in_file` | N/A — params: `uri` (required), `pattern` (required, regex), `project_root`, `max_results`, `ignore_case` | **Searches C# scripts only**, despite a parameter description that implies any asset under `Assets/`. Regex search inside one script; returns line numbers plus excerpts. Cheaper and safer than reading a whole script when only a symbol's location is needed. The tool rewrites the target's extension to `.cs`: `find_in_file(uri: "Assets/Scenes/SampleScene.unity", pattern: "m_Name")` failed with `Script not found at 'Assets/Scenes/SampleScene.cs'.` — never point it at a scene, prefab, `.asset` or any other non-script file. Verified against a live Unity 6000.4.6f1 Editor on **both bridge 9.6.8 and bridge 10.3.0**, 2026-10-21 — the same call reproduced the same error after the upgrade, so this is not a version-specific quirk. Its **success path is now VERIFIED too** (on 10.3.0, against a real `.cs` file): the response is `matches: [{line, content, match, start, end}]` plus `count` and `total_matches` |
| `find_gameobjects` | N/A — params: `search_term` (**required**); optional: `search_method`, `include_inactive`, `page_size`, `cursor` | **No `filter` param.** Only `search_term` is required — `search_method` is optional. Valid `search_method` values are prefixed: `by_name`, `by_tag`, `by_layer`, `by_component`, `by_path`, `by_id` (**VERIFIED on both bridge 9.6.8 and bridge 10.3.0** — an unprefixed `"name"` was rejected with the identical value list on each, so the contract is unchanged across the major version bump). Returns instance IDs only (paginated); fetch full data via the `mcpforunity://scene/gameobject/{id}` resource. **Because it returns *only* ids, this is where multi-step workflows get into trouble: an id is valid for the step that fetched it and no longer.** Re-call `find_gameobjects` immediately before the call that consumes the id, keep the object's name as the thing you carry between steps, and never reuse an id after a recompile or domain reload ([instance IDs are volatile](#instance-ids-are-volatile--never-cache-one)). **Unity 6.4 caveat**: `InstanceID` is deprecated in favour of the new `EntityId` type, and Unity's own guidance warns against casting ids to/from `int`, sign-based asset checks, `GetHashCode`, `ToString`-then-parse, and sorting by id to infer creation order. **Treat the returned id as an opaque token** — pass it straight back to the bridge; never do arithmetic on it, sort by it, or parse it |
| `execute_code` | `execute`, `get_history`, `replay`, `clear_history` | Runs arbitrary C# in-Editor. **Group `scripting_ext` — reported off by default**; activate only if the tool is reported as not existing (see [Tool Groups](#tool-groups)). Default `compiler: "auto"` falls back to `codedom` (C# 6 syntax only) unless Roslyn is installed — avoid C# 7+ syntax (e.g. `var x = (a, b);` tuples, pattern matching) unless you've confirmed Roslyn is available. `safety_checks` (bool, **default `true`**) rejects patterns such as `File.Delete`, `Process.Start` and obvious infinite loops; it is explicitly **not a full sandbox**, so it is no substitute for reading the snippet before running it. `index` selects which history entry `replay` re-runs; `limit` (1–50, default 10) bounds `get_history` |
| `manage_profiler` | Session: `profiler_start/stop/status/set_areas`. Counters: `get_frame_timing`, `get_counters`, `get_object_memory`. Memory: `memory_take_snapshot/list_snapshots/compare_snapshots`. Frame Debugger: `frame_debugger_*` | Memory snapshot actions require `com.unity.memoryprofiler` package (**UNVERIFIED** — absent on the verification machine). **Group `profiling` — reported off by default**; activate with `manage_tools(action: "activate", group: "profiling")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)) |
| `unity_docs` / `unity_reflect` | `get_doc`/`get_manual`/`get_package_doc`/`lookup`; `get_type`/`get_member`/`search` | **Group `docs` — reported off by default**; activate with `manage_tools(action: "activate", group: "docs")` **only if the tool is reported as not existing** (see [Tool Groups](#tool-groups)). Use `unity_reflect` to confirm an API exists on the connected Editor version before writing code against it, then `unity_docs` for usage examples — **but the two tools do not accept the same name form**. `unity_reflect` takes either form (`Rigidbody2D` and `UnityEngine.GameObject` both resolve); `unity_docs` requires the **unqualified** class name. Live: `unity_docs(action: "get_doc", class_name: "UnityEngine.Rigidbody2D")` returned `{"success": true, "data": {"found": false, ...}}` while `class_name: "Rigidbody2D"` returned `found: true`. That failure mode is a **silent miss** — `success: true` with `found: false`, no error — so a `found: false` from `unity_docs` means *the name form or spelling is wrong*, **never** *the API is absent*: strip the namespace and retry, and leave the existence verdict to `unity_reflect`. `unity_reflect(action: "get_type")` also returns an **`obsolete_members`** list, which is how you check whether a member is deprecated on the connected Editor rather than guessing from memory. Verified against a live Unity 6000.4.6f1 Editor on **both bridge 9.6.8 and bridge 10.3.0**, 2026-10-21 — the qualified-name miss reproduced identically after the upgrade, so this is not a version-specific quirk. **Parameter names**: `unity_reflect(action: "get_type", class_name: "...")`; `get_member` needs `class_name` + `member_name`; `search` needs `query` and takes an optional `scope`. `unity_docs(action: "get_doc", class_name: "...")` with optional `member_name` and `version`. The parameter is **`class_name`** — `type_name` is rejected |

### Generative Tools (`asset_gen` group) — awareness only

> **Cost warning. Activating `asset_gen` exposes credit-spending tools.** Every tool in this group calls a paid third-party service on the developer's own API key. `manage_tools(action: "activate", group: "asset_gen")` is therefore never a diagnostic step and never something to do on the agent's own initiative — it is a decision that costs the developer money.

**VERIFIED on 10.3.0 (2026-10-21).** A live `manage_tools(action: "list_groups")` call returned `asset_gen` as a tenth group that is absent from 9.6.8, with `enabled: false`, `default_enabled: false` and exactly these six tools: `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model`, `import_model_file`. Its description is AI asset generation — 3D model generation and import, 2D image generation and audio generation, **bring-your-own-key**. **Off by default is the observed state**, and it is the right default precisely because these tools spend real money (the v10.3.0 release notes add auto-discovery of fal and OpenRouter models).

The `asset_gen` group (new in bridge v10.0.0, **verified off by default on 10.3.0**) adds six entrypoints: `generate_model`, `generate_image`, `generate_audio`, `import_model`, `import_model_file` and `blender_bridge`. They call third-party services (Tripo/Meshy, fal.ai/OpenRouter, Sketchfab) on a bring-your-own-key basis; keys are entered in the Unity Editor's Asset Gen tab and held in the OS secure store (Keychain / Windows Credential Manager / libsecret), never in MCP parameters or project assets. Calls are asynchronous: they return a `job_id` to poll with `action: "status"`. `blender_bridge` talks to a BlenderMCP-connected Blender over a socket (default `127.0.0.1:9876`, configured under `Window > MCP for Unity > Generative > Blender Bridge`). Importing GLB/glTF results needs **glTFast**; FBX does not.

**Rule: no workflow, steering file or template in this Power may route to `asset_gen`.** These tools spend the developer's third-party API credits, so they are documented here only so an agent recognises them when the group is active — never selected implicitly. Use them only on an explicit, specific request from the developer.

**What is verified here, and what is not.** The group's existence, its six member tool names and its `default_enabled: false` state are **VERIFIED on 10.3.0**. The **per-action contracts of those six tools are not**: none of them was ever called, deliberately, because calling one would spend the developer's money. So the key handling, the async `job_id` pattern, the Blender socket default and the glTFast requirement described above are **documentation-derived and UNVERIFIED**, and this document deliberately publishes **no parameter table** for them. If a developer explicitly asks for one of these tools, read its parameters from the live tool schema rather than from this section.

### MCP Resources (Read-Only)

The bridge exposes a large amount of read-only state as `mcpforunity://`-scheme **resources** rather than tools. **Resources read; tools mutate.** Prefer a resource over a tool call whenever you only need to look at something — resources need no tool group activated, and several of them replace an `execute_code` snippet outright.

This is the complete set of resource URI forms, taken from the bridge's generated resource reference at v10.3.0 (retrieved 2026-10-21). Nothing outside this list needs guessing at, and nothing in it needs confirming before use:

| URI | What it returns |
|---|---|
| `mcpforunity://project/info` | static project info: root path, Unity version, platform |
| `mcpforunity://editor/state` | **the canonical editor-readiness snapshot**, including an `advice` block and server-computed staleness — this is the right readiness probe, not `manage_editor` |
| `mcpforunity://editor/selection` | the current selection (GameObjects, assets) with properties |
| `mcpforunity://editor/windows` | open editor windows: titles, types, positions, focus |
| `mcpforunity://editor/active-tool` | the active editor tool and transform-handle settings |
| `mcpforunity://editor/prefab-stage` | prefab isolation context; `isOpen=false` when none is open |
| `mcpforunity://project/tags` | every project tag — read this before `manage_editor(add_tag/remove_tag)` |
| `mcpforunity://project/layers` | every layer with its index 0–31 — read this before `manage_editor(add_layer/remove_layer)` |
| `mcpforunity://scene/gameobject/{instance_id}` | one GameObject: name, tag, layer, active state, transform, parent/child ids, component type list |
| `mcpforunity://scene/gameobject/{instance_id}/components` | all components with full property serialization; supports `page_size`, `cursor`, `include_properties` |
| `mcpforunity://scene/gameobject/{instance_id}/component/{component_name}` | one fully serialized component |
| `mcpforunity://scene/gameobject-api` | usage documentation for the GameObject resource family |
| `mcpforunity://scene/cameras` | all cameras, including Cinemachine priorities, Brain state, follow/lookAt |
| `mcpforunity://scene/volumes` | all Volume components with their profiles, effects and settings |
| `mcpforunity://rendering/stats` | a rendering-stats snapshot: draw calls, batches, triangles, frame time |
| `mcpforunity://pipeline/renderer-features` | URP renderer features on the active renderer: type, name, active flag |
| `mcpforunity://prefab/{encoded_path}` | prefab asset info: type, root name, component types, child count, variant info |
| `mcpforunity://prefab/{encoded_path}/hierarchy` | the full prefab hierarchy with nesting depth |
| `mcpforunity://prefab-api` | usage documentation for the prefab resource family |
| `mcpforunity://tests` | first page of Unity tests (default 50) |
| `mcpforunity://tests/{mode}` | first page for `EditMode` or `PlayMode` |
| `mcpforunity://menu-items` | every menu item — pairs with `execute_menu_item` |
| `mcpforunity://custom-tools` | custom tools available for the active project — pairs with `execute_custom_tool` |
| `mcpforunity://tool-groups` | the tool-group catalog — pairs with `manage_tools` |
| `mcpforunity://instances` | every connected Unity Editor instance — pairs with `set_active_instance` |

**Unity 6.4 caveat on the GameObject resources**: `{instance_id}` is the id `find_gameobjects` returned. On 6.4 `InstanceID` is deprecated in favour of `EntityId`, and Unity warns against casting, sign checks, `GetHashCode`, parsing or sorting by it. **Treat it as an opaque token** — round-trip it to the bridge unchanged.

**Not a resource, but a URI form to remember**: `mcpforunity://path/Assets/...` is one of the three accepted forms for the script tools' `uri` **parameter** (alongside a plain `Assets/...` path and `file://...`), used by `apply_text_edits`/`find_in_file`/`get_sha`/`validate_script`/`delete_script`. It is not something you read with `resources/read`. **`script_apply_edits` is the exception — it takes `name` + `path` and rejects `uri`** (see [Script-tool parameters](#script-tool-parameters)).

> **Client note**: some MCP clients require the server's discovery key to be supplied separately on a `resources/read` call (for example `server: "unityMCP"` alongside `uri: "mcpforunity://custom-tools"`). If a resource read fails with an unknown-server error, list the available resources first and use the server key exactly as the client reports it — this Power's `mcp.json` registers the server as `unity-mcp`, while Unity's own configurator writes `unityMCP`.


## Workflow Guides

### Workflow 1: Asset Batch Configuration (Requirement 1)

**To batch-configure assets (e.g., "Set all models in Characters folder to Humanoid rig"):**

**Step-by-step:**
1. **Scan** — `manage_asset(action: "search", path: "Assets/Characters/", search_pattern: "t:Model")` (`manage_asset` has no `list` action). **`search_pattern` is an AssetDatabase filter, not a glob — `"*.fbx"` matches NOTHING and returns `success: true` with zero assets**, which used to make this entire workflow a silent no-op: step 1 found nothing, step 4 configured nothing, and step 5 reported "0 succeeded" as if the folder were empty. `t:Model` covers every model format at once (`.fbx`, `.obj`, `.blend`, …), so there is no per-extension repeat. Full filter vocabulary and what was actually measured: [`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob) — note `t:Model` itself is **UNVERIFIED** here (the verification project has no models), so **sanity-check the result**: if the count is 0, re-run with `search_pattern: "*"` under the same `path` before concluding the folder is empty, and fall back to a bare name substring if needed
2. **Detect type** — Match filenames against naming patterns to suggest appropriate Asset_Preset:
   - `*_char_*`, `*_character_*`, `*_hero_*` → `3d-character` preset
   - `*_env_*`, `*_prop_*`, `*_building_*` → `3d-environment` preset
   - `*_ui_*`, `*_icon_*`, `*_hud_*` → `ui-texture` preset
   - `*_sfx_*`, `*_bgm_*`, `*_music_*` → `audio-sfx` preset
   - `*_sprite_*`, `*_2d_*` → `2d-sprite` preset
3. **Load preset** — Read the matching JSON preset from `templates/presets/`
4. **Batch apply** — `batch_execute(commands: [{tool: "manage_asset", params: {action: "modify", path: each, properties: preset.config}} × N], fail_fast: false)` — each command uses a `params` key, not `args`. **Pass `fail_fast: false` explicitly**: it defaults to `true`, which would abort the whole batch on the first bad asset instead of continuing as the error handling below requires. Keep each batch within the command cap (default 25, hard max 100) and send successive batches for larger sets
5. **Report** — Generate a change summary listing each asset and the parameters that were modified

**Error handling:**
- If an asset path doesn't exist, inform the developer and suggest the correct path
- If a preset application fails on one asset, record the failure and continue with remaining assets
- After completion, report: "N succeeded, M failed" with failure reasons
- On failure, roll back the failed asset to its original state


### Workflow 2: Scene Scaffolding (Requirement 2)

**To quickly build a scene (e.g., "Create a 3D first-person scene"):**

**Step-by-step:**
1. **Identify scene type** — Confirm which Scene_Scaffold the developer needs
2. **Load scaffold** — Read the matching JSON scaffold from `templates/scaffolds/`
3. **(Conditional) `manage_ui` availability** — skip this step unless the scaffold or the request includes UI Toolkit elements *and* `manage_ui` is reported as not existing. `manage_ui` is declared in the `ui` group, reported off by default but callable without activation on the live-verified install; if it really is missing, run `manage_tools(action: "activate", group: "ui")` and expect the MCP client may need a refresh or reconnect. Legacy uGUI needs none of this — it goes through `manage_gameobject` + `manage_components`
4. **Create scene** — `manage_scene(action: "create", name: "NewScene")`
5. **Check conflicts** — `find_gameobjects(search_term: name, search_method: "by_name")` for each planned object name, to detect name conflicts with existing objects (there is no generic `filter` param; only `search_term` is required, and `search_method` values carry the `by_` prefix)
6. **Build hierarchy** — `batch_execute(commands: [{tool: "manage_gameobject", params: {action: "create", ...}} × N])` following the scaffold's hierarchy definition (each command uses `params`, not `args`; keep each batch within the command cap — default 25, hard max 100), including:
   - `manage_gameobject` for standard objects
   - `manage_camera(action: "create_camera", ...)` for camera objects — note this creates a Cinemachine-aware camera if Cinemachine is installed, or a basic Camera otherwise
   - `manage_ui` for UI Toolkit elements (UXML/USS); for legacy uGUI Canvas/Button/Text/Image, create them via `manage_gameobject` + `manage_components` (e.g. add `UnityEngine.UI.Canvas`, `UnityEngine.UI.Button` component types directly)
   - `manage_components` for adding components to objects. **A built-in type takes its short name (`Rigidbody2D`); a script from this project needs `"TypeName, Assembly-CSharp"`** or the add fails with `Component type '...' not found` ([`component_type`: built-in vs. user script](#component_type-built-in-vs-user-script)). If the scaffold wrote the script in this same run, the compile must also have finished first — and `wait_for_ready` does not guarantee that ([`wait_for_ready` does not wait](#wait_for_ready-does-not-wait))
   - **Address every object by the NAME the scaffold gave it, not by an id the previous step returned.** The `instanceID` a `create` returns is transient and negative, it changes once Unity registers the object, and a recompile renumbers everything ([instance IDs are volatile](#instance-ids-are-volatile--never-cache-one)). So pass the scaffold's name as `target` to `manage_gameobject`, `manage_components` and `manage_prefabs` — a name is the only handle all three resolve ([the three `target` conventions](#the-three-target-conventions)). If a step genuinely needs an id, re-resolve it with `find_gameobjects(search_term: "<name>", search_method: "by_name")` **immediately before** the call that consumes it, and never reuse it afterwards
   - If the scaffold duplicates an object, remember `manage_gameobject(action: "duplicate")` **ignores `name`** and produces Unity's `<original>_Copy`; rename it with a follow-up `action: "modify"` targeted at that auto-name ([`duplicate` does not honour `name`](#duplicate-does-not-honour-name))
7. **Save scene — not optional** — `manage_scene(action: "save")`. Everything steps 4–6 built exists only **in memory** until this call; a scene switch or reload would silently discard it, and re-loading the scene from disk resurrects the old contents instead ([scene edits live in memory until you save](#scene-edits-live-in-memory-until-you-save)). `manage_scene`'s `create`, `save` and `load` are all **VERIFIED on 10.3.0**, and `create` auto-creates its target folder. If the developer asked for a preview rather than a committed scene, say explicitly in the report that the scene was **not** saved
8. **Report** — Display generation summary: total objects created, component list, and whether the scene was saved

**Conflict handling:**
- If the target scene already contains objects with the same name, ask the developer: Overwrite / Rename / Cancel

**Built-in scaffolds (5 types — these templates work for any Unity project):**
- `2d-platformer` — 2D side-scrolling scene (games, educational apps, interactive stories)
- `3d-first-person` — 3D first-person scene (FPSController, MainCamera, Terrain, Lights, HUD) — also suitable for architectural walkthroughs and training simulations
- `ui-menu` — UI menu scene (settings screens, dashboards, data displays)
- `open-world-base` — Open world base scene (exploration, visualization, large environments)
- `multiplayer-lobby` — Multiplayer lobby scene (collaborative tools, multi-user experiences)

> **Alternative use case**: For an architectural visualization project, replace the 3D scene with a building walkthrough, replace gameplay mechanics with measurement tools and material inspectors, and run the same quality/performance checks.


### Workflow 3: Build Automation (Requirement 3)

**To build the project (e.g., "Build for Windows"):**

**Step-by-step:**
1. **Load config** — Read the matching BuildConfig from `templates/build-configs/` or the developer's custom config
2. **Trigger build** — `manage_build(action: "build", target: "windows64", scenes: "[\"Assets/Scenes/Main.unity\"]", output_path: "Builds/Windows/MyGame.exe", development: false)` — **use `manage_build`, not `manage_editor`; `manage_editor` has no build action.** Valid `target` values: `windows64`, `osx`, `linux64`, `android`, `ios`, `webgl`, `uwp`, `tvos`, `visionos`
3. **Monitor progress** — Poll `manage_build(action: "status", job_id: ...)` for the build job, and `read_console()` for compile logs
4. **Handle result:**
   - On success → report build output path and summary
   - On failure → parse console logs, extract errors, provide structured error summary with fix suggestions
5. **Report** — Build result with duration, output size, and any warnings

**Multi-platform builds:**
- Use `manage_build(action: "batch", targets: [...])` (or `profiles: [...]` for Unity 6+ Build Profiles) to build multiple targets in one call, with `output_dir` as the base output directory

**Build Profiles on Unity 6.4:**
- New projects **hide the classic platform list by default** in the Build Profiles window, and the Platform Browser has been regrouped. If the developer cannot find the platform they expect, point them at `Project Settings > Editor > Build Profiles > Hide Classic Platforms` to show it again — the platform is not missing, just hidden
- `profile`/`profiles` take Build Profile **asset paths** and are Unity 6+ only

**Reading or writing a build setting:**
- `manage_build(action: "settings", property: "...")` reads; add `value` to write. Always pass `property` — see [`manage_build` parameters](#manage_build-parameters) for the accepted properties, for the `options`/`subtarget` vocabulary, and for why "`property` is required" is currently labelled **UNVERIFIED** rather than asserted

> **Before anything else in this workflow**: if a `manage_build` call comes back as *denied by permissions*, the IDE's permission layer blocked it before Unity saw it — on the verification machine a `capability: mcp` / `effect: deny` rule in `~/.kiro/settings/permissions.yaml` matching `power-kiro-unity-accelerator-unity-mcp/manage_build` made this entire workflow unrunnable. See [Tool denied by the IDE's own permission rules](#tool-denied-by-the-ides-own-permission-rules). Do not work around it; report the matched rule to the developer.

**Common build error patterns:**
- `CS` compilation errors → suggest code fixes
- Missing references → suggest package installation
- Shader errors → suggest shader alternatives for target platform

**Built-in build configs:**
- `windows-dev` — Windows development build
- `android-release` — Android release build
- `ios-release` — iOS release build
- `webgl-release` — WebGL release build


### Workflow 4: Cross-Platform Testing (Requirement 4)

**To run cross-platform tests (e.g., "Run EditMode and PlayMode tests"):**

**Step-by-step:**
1. **Start with step 3 — activate the `testing` group only if you have to.** `run_tests` and `get_test_job` are declared in the `testing` group, which the bridge reports as off by default, but on the live-verified install they were callable with no activation at all. Only if a call is rejected with *tool does not exist*: `manage_tools(action: "list_groups")` → `manage_tools(action: "activate", group: "testing")`, then `manage_tools(action: "sync")` if that was not enough, and tell the developer the MCP client may need a refresh or reconnect. If instead the call is refused with a permission message, see [Tool denied by the IDE's own permission rules](#tool-denied-by-the-ides-own-permission-rules) — no amount of activation will help
2. **Discover tests (optional, no group needed)** — read `mcpforunity://tests`, or `mcpforunity://tests/EditMode` / `mcpforunity://tests/PlayMode`, to see what exists before running anything
3. **Start tests** — `run_tests(mode: "EditMode")` or `run_tests(mode: "PlayMode")` to execute Unity Test Framework tests. This returns `{job_id}` immediately — `run_tests` is asynchronous, not a blocking call. There is no `platform` param on `run_tests`; Unity Test Framework runs in the Editor (EditMode/PlayMode), not against a specific build target, so "testing for Android" in practice means building for that platform first (`manage_build`) and then reasoning about platform-specific code paths, not passing `platform` to `run_tests`
4. **Poll for completion** — `get_test_job(job_id: ..., wait_timeout: 30)` until `status` is no longer `"running"`; use `include_failed_tests: true` to get failure details without a huge payload. Report live progress from `progress.completed` / `progress.total`, and failures as they arrive from `progress.failures_so_far`; `progress.blocked_reason` explains a job that is not advancing, and a long run may report `progress.stuck_suspected` while the server briefly focuses the Unity window to unstick it. **This `run_tests` → `get_test_job` lifecycle is VERIFIED on 10.3.0** (`running` → `succeeded` in ~7.5 s). **What is NOT verified is the pass/fail reporting**: the verification project had no test assemblies, so the run completed with `completed: 0, total: 0`. Treat the first real run's result formatting as the step that proves it
5. **Format results** — Structure results into pass rate + failed test case list
6. **Report** — Display structured test results


### Workflow 5: Workflow Automation (Requirement 5)

**To automate a multi-step process (e.g., "Import assets, configure them, then build"):**

**Step-by-step:**
1. **Load template** — Read the matching WorkflowTemplate from `templates/workflows/` or the developer's custom template
2. **Validate dependencies** — Check that step dependencies form a valid DAG (no cycles, all referenced steps exist)
3. **Execute steps** — Run each step's MCP tool call in topological order, respecting `dependsOn` constraints
4. **Track progress** — After completing step K of N, progress = K/N × 100%
5. **Handle failures** — If a step fails:
   - Pause execution immediately
   - Record the error message
   - Offer the developer three options: Retry / Skip / Abort
6. **Report** — Final summary of all steps executed, skipped, or failed

**Built-in workflow templates (3 types):**
- `asset-import-setup` — Asset import and configuration workflow
- `build-and-deploy` — Build and deployment workflow
- `test-execution` — Test execution workflow

**Dependency validation rules:**
- Each step's `dependsOn` must reference existing step IDs
- Dependencies must be resolvable via topological sort (no circular dependencies)
- If validation fails, reject the workflow before execution


### Workflow 6: Performance Analysis (Requirement 6)

**To analyze performance (e.g., "Analyze the current scene's performance"):**

**Step-by-step:**
1. **Go straight to step 2.** `manage_profiler` is declared in the `profiling` group, reported off by default, yet it answered without any activation on the live-verified install. Only if a `manage_profiler` call is rejected with *tool does not exist*: `manage_tools(action: "activate", group: "profiling")`, then `manage_tools(action: "sync")` if needed, and warn the developer the MCP client may need a refresh or reconnect. `manage_graphics` and `read_console` are `core` regardless
2. **Collect metrics** — `manage_graphics(action: "stats_get")` for Draw Calls, batches, triangles, etc. (this is the real action name — there is no `get_rendering_stats`); `manage_profiler(action: "get_frame_timing")` for frame-time data; `manage_profiler(action: "get_counters", category: "Memory")` for GC/memory counters. The `mcpforunity://rendering/stats` resource gives the same snapshot with no tool group required
3. **Read logs** — `read_console()` to collect performance-related logs
4. **Locate bottlenecks** — `find_gameobjects(search_term: "MeshRenderer", search_method: "by_component")` to identify objects with heavy renderers (the param is `search_term` plus an optional prefixed `search_method`, not `filter`). Treat the returned instance IDs as opaque tokens — do not sort or parse them — and use them in the same step that fetched them: they do not survive a recompile or any other domain reload ([instance IDs are volatile](#instance-ids-are-volatile--never-cache-one))
5. **Compare thresholds** — Compare collected metrics against thresholds (custom from `Assets/UnityAccelerator/Config/thresholds.json` or built-in defaults)
6. **Generate report** — Create a PerformanceReport containing:
   - Draw Calls (average, peak) — **on Unity 6.4, attribute them**: the redesigned Rendering Statistics window separates draw calls optimised by the SRP Batcher, the GPU Resident Drawer, BatchRendererGroup and GPU instancing, and reports more accurate frame times. Say which batching path absorbed the calls instead of quoting one draw-call number, because the optimisation advice differs per path
   - GC Allocation (average, peak)
   - Shader Complexity (average, peak)
   - Frame Rate (average, min)
   - Bottleneck objects with specific optimization suggestions
7. **Report** — Present findings with color-coded severity (green = OK, yellow = warning, red = error)

**Optimization suggestions (examples):**
- High Draw Calls → "Consider using LOD groups, mesh combining, or GPU instancing"
- High GC Allocation → "Avoid allocations in Update(). Use object pooling"
- Complex Shaders → "Simplify shader or use mobile-friendly alternatives"
- Low Frame Rate → "Reduce polygon count, optimize scripts, check physics settings"

**Adaptive sampling:**
- If Unity Editor frame rate drops below 10 FPS during analysis, automatically reduce sampling frequency


### Workflow 7: Code Quality & Architecture Check (Requirement 7)

**To check code quality (e.g., "Check the project's code architecture"):**

**Step-by-step:**
1. **Get project info — prefer the resource** — read `mcpforunity://project/info` for the Unity version, project root and platform. It needs no tool group. Use `manage_packages(action: "list_packages")` (`core`, asynchronous) for the package inventory. Only if you genuinely need to evaluate C# in the Editor, call `execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")` directly, keeping to C# 6 syntax unless Roslyn is confirmed installed — and reach for `manage_tools(action: "activate", group: "scripting_ext")` only if `execute_code` is reported as not existing
2. **List scripts** — `manage_asset(action: "search", path: "Assets/", search_pattern: "t:MonoScript")` to get all C# script paths (`manage_script` has no `list` action). **`t:MonoScript`, not `"*.cs"`**: `search_pattern` is an AssetDatabase filter and a glob matches nothing while still reporting success ([`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob)). Paging is `page_size` + `page_number`
3. **Read scripts** — `manage_script(action: "read", name: scriptName, path: folderPath)` to read script content (both `name` and `path` are required — `path` is the containing folder, not the full file path). For a targeted lookup inside one large script, `find_in_file(uri: ..., pattern: ...)` is cheaper than reading the whole script — it searches **C# scripts only**, so never aim it at a scene or prefab
4. **Load rules** — Read enabled ArchitectureRule definitions from `templates/architecture-rules/`
5. **Analyze** — Check each script against the active rules, looking for:
   - Naming convention violations
   - Layer dependency violations
   - Inheritance constraint violations
   - Cyclic dependencies
6. **Generate report** — Each violation includes: file path, line number, rule name, fix suggestion
7. **Detect cycles** — If cyclic dependencies are found, describe the cycle path textually

**Built-in architecture rules (3 patterns):**
- `mvc-pattern` — MVC architecture rules
- `ecs-pattern` — ECS (Entity Component System) architecture rules
- `scriptableobject-pattern` — ScriptableObject architecture rules

**Incremental checking:**
- When a developer saves a C# script, run incremental architecture check on that file only
- Incremental results must be consistent with full-project check results


### Workflow 8: Knowledge Management (Requirement 8)

**To manage documentation (e.g., "What docs do we have about the inventory system?"):**

**Step-by-step:**
1. **Search** — Query the Knowledge_Base by keyword and tags, results sorted by relevance
2. **Asset lookup** — When the developer selects a script or component, find related documents via `relatedAssets` matching
3. **API change detection** — When Unity API updates, compare the project's used APIs against the change list to generate migration guides. To check an API against the *connected* Editor rather than against memory, call `unity_reflect(action: "get_type", class_name: "...")` to confirm the type exists (its `obsolete_members` list also tells you which members are deprecated on that Editor) and `unity_docs(action: "get_doc", class_name: "...")` for usage. The parameter is `class_name`, not `type_name`. **Pass `unity_docs` the unqualified class name** — a namespace-qualified one comes back `success: true` / `found: false`, a silent miss that must never be read as "the API does not exist"; `unity_reflect` accepts either form. These two live in the `docs` group, reported off by default but callable without activation on the live-verified install — so only if one of them is reported as not existing, run `manage_tools(action: "activate", group: "docs")`, then `sync`, and expect that the MCP client may need a refresh
4. **Onboarding** — For new team members, auto-generate an onboarding checklist based on project structure and existing docs
5. **Staleness check** — Flag documents not updated in 180+ days as "NeedsReview" and notify the document owner

**Knowledge_Base storage:**
- Location: `Assets/UnityAccelerator/Knowledge/` (JSON + Markdown files)
- Each entry has: title, content, tags, relatedAssets, author, timestamps, status


### Workflow 9: Platform Compatibility Check (Requirement 9)

**To check platform compatibility (e.g., "Check Android compatibility"):**

**Step-by-step:**
1. **Load profile** — Read the target PlatformProfile from `templates/platform-profiles/`
2. **Scan shaders** — `manage_asset(action: "search", path: "Assets/", search_pattern: "t:Shader")` to enumerate shader assets — this is a `core` call and needs no group. **`t:Shader`, not `"*.shader"`**: `search_pattern` is an AssetDatabase filter, and a glob returns zero assets with `success: true` ([`search_pattern` is an AssetDatabase filter, not a glob](#search_pattern-is-an-assetdatabase-filter-not-a-glob)). To read a shader's contents, call `manage_shader` directly; it is declared in the `vfx` group, reported off by default but callable without activation on the live-verified install — **only if it is reported as not existing** run `manage_tools(action: "activate", group: "vfx")` (then `manage_tools(action: "sync")`, then expect a possible client refresh). `manage_shader` itself has no `list` action — it only reads/creates/updates/deletes a shader by `name`+`path` — so use `manage_shader(action: "read", name: ..., path: ...)` per shader for content inspection
3. **Get graphics settings** — `manage_graphics(action: "pipeline_get_info")` and `manage_graphics(action: "pipeline_get_settings")` to get current render pipeline configuration (there is no `get_settings` action). `mcpforunity://pipeline/renderer-features` lists the renderer features on the active URP renderer
4. **Check shader compatibility** — Compare shader features against the platform's supported feature list
5. **Estimate memory** — `manage_asset(action: "get_info", path: assetPath)` per asset to estimate memory usage against the platform's memory budget
6. **Generate report** — Classify issues into three severity levels:
   - **Error** — Build will fail (e.g., unsupported shader feature)
   - **Warning** — May cause issues on specific devices (e.g., high memory usage)
   - **Suggestion** — Optimization opportunity (e.g., texture compression recommendation)
7. **Shader alternatives** — For incompatible shader features, suggest alternatives from the PlatformProfile

**Built-in platform profiles (4 platforms):**
- `ios` — iOS platform profile (Metal shaders, memory constraints)
- `android` — Android platform profile (OpenGL ES / Vulkan, ASTC compression)
- `console` — Console platform profile (platform-specific constraints)
- `webgl` — WebGL platform profile (WebGL 2.0 limitations, strict memory budget)

**Auto-check on platform switch:**
- When the developer switches the Unity Editor build target, automatically run a quick compatibility check and display a summary in the Console


### Workflow 10: Asset Dependency Management (Requirement 10)

**To analyze asset dependencies (e.g., "Analyze dependencies of hero.fbx"):**

**Step-by-step:**
1. **Call `execute_code` directly; activate its group only if you must.** This whole workflow depends on `execute_code`, declared in the `scripting_ext` group — reported off by default, but callable with no activation on the live-verified install. Only if it is reported as not existing: `manage_tools(action: "activate", group: "scripting_ext")`, then `manage_tools(action: "sync")`, and tell the developer the MCP client may need a refresh or reconnect. Keep generated snippets to C# 6 syntax unless Roslyn is confirmed installed, and leave `safety_checks` at its default `true`
2. **Get dependencies** — `manage_asset` has **no `get_dependencies` action**. Use `execute_code` to call Unity's own API directly: `execute_code(action: "execute", code: "return string.Join(\",\", UnityEditor.AssetDatabase.GetDependencies(\"Assets/Characters/hero.fbx\", false));")` — the `false` argument means direct (non-recursive) dependencies only
3. **Recursive analysis** — Either pass `true` as the second argument to `GetDependencies` to get the full transitive closure in one call, or call it per-asset with `false` and walk the graph manually if you need per-level structure
4. **Build tree** — Construct a complete dependency tree (DependencyTree JSON) from the `execute_code` results
5. **Detect cycles** — Check for circular references in the dependency graph (note: `AssetDatabase.GetDependencies` on a Unity project's actual asset graph rarely produces true cycles since Unity's import pipeline doesn't allow them for most asset types — cyclic-reference concerns mostly apply to C# script namespace dependencies, covered in `code-quality.md`, not asset dependencies)
6. **Report** — Present the dependency tree structure textually, highlight any circular references with resolution suggestions

> **Unity 6.4 note**: artifact dependencies in the Asset Database were narrowed — a dependent asset now reimports only when the dependency's *import result* changes, not merely when the dependency is touched. Custom `ScriptedImporter`/`AssetPostprocessor` code may therefore need explicit `DependsOnSourceAsset`/`DependsOnArtifact` declarations to keep reimporting correctly. Flag this when a project's dependency graph and its reimport behaviour disagree.

**Orphaned asset detection:**
- Scan the entire project's asset reference graph
- Identify assets with zero in-degree (not referenced by any scene or other asset)
- Present the orphaned asset list for the developer's review

**Delete impact analysis:**
- Before deleting an asset, check all direct and indirect dependents
- List all scenes and assets that reference the target asset
- Require the developer's confirmation before proceeding

**AssetBundle duplication detection:**
- Analyze AssetBundle configurations
- If two or more bundles contain the same asset path, warn about duplication
- Report all duplicate items with their bundle names

**Circular reference resolution:**
- When circular references are detected, visually describe the cycle path
- Suggest strategies to break the cycle (e.g., extract shared dependency, use indirect references)


## Preset Templates

The `templates/` directory contains pre-built JSON templates that can be used directly or as a base for customization. Developers can also create custom templates stored in `Assets/UnityAccelerator/Config/` within their Unity project.

**Loading priority:** Custom templates (Unity project) take precedence over built-in templates (this Power package). If a custom template doesn't exist, fall back to the built-in version.

### Template Directories

| Directory | Content | Used By |
|-----------|---------|---------|
| `templates/presets/` | Asset_Preset JSON templates (import settings for models, textures, audio, etc.) | Workflow 1: Asset Batch Configuration |
| `templates/scaffolds/` | Scene_Scaffold JSON templates (GameObject hierarchies, components, properties) | Workflow 2: Scene Scaffolding |
| `templates/build-configs/` | BuildConfig JSON templates (target platform, build options, output paths) | Workflow 3: Build Automation |
| `templates/platform-profiles/` | PlatformProfile JSON templates (shader support, memory budgets, scripting constraints) | Workflow 9: Platform Compatibility |
| `templates/architecture-rules/` | ArchitectureRule JSON templates (naming conventions, layer dependencies, patterns) | Workflow 7: Code Quality |
| `templates/workflows/` | WorkflowTemplate JSON templates (multi-step automated workflows) | Workflow 5: Workflow Automation |


### Built-in Asset Presets (`templates/presets/`)

| File | Description | Key Settings |
|------|-------------|--------------|
| `3d-character.json` | 3D character models | Humanoid rig, material import, normal maps, medium mesh compression |
| `3d-environment.json` | 3D environment/prop models | No rig, mesh compression, generate colliders |
| `2d-sprite.json` | 2D sprite textures | Sprite texture type, point filter mode, no mip maps |
| `ui-texture.json` | UI textures | UI texture settings, bilinear filter, no compression |
| `audio-sfx.json` | Sound effects | Audio import settings optimized for SFX |

### Built-in Scene Scaffolds (`templates/scaffolds/`)

| File | Description | Key Objects |
|------|-------------|-------------|
| `2d-platformer.json` | 2D platformer game | Main Camera (orthographic), Player, Ground, Background, UI Canvas |
| `3d-first-person.json` | 3D first-person scene | FPSController + MainCamera, Directional Light, Terrain, HUD Canvas |
| `ui-menu.json` | UI menu scene | EventSystem, Canvas (Screen Space), Panels, Buttons, Navigation |
| `open-world-base.json` | Open world base | Terrain, Skybox, Directional Light, Player Spawn, LOD Groups |
| `multiplayer-lobby.json` | Multiplayer lobby | NetworkManager, Lobby UI, Player List, Chat, Ready System |

### Built-in Build Configs (`templates/build-configs/`)

| File | Description | Key Options |
|------|-------------|-------------|
| `windows-dev.json` | Windows dev build | StandaloneWindows64, Development=true, Mono backend |
| `android-release.json` | Android release | Android, IL2CPP, Lz4HC compression |
| `ios-release.json` | iOS release | iOS, IL2CPP, Lz4HC compression |
| `webgl-release.json` | WebGL release | WebGL, IL2CPP, Lz4HC compression |


### Built-in Platform Profiles (`templates/platform-profiles/`)

| File | Description | Key Checks |
|------|-------------|------------|
| `ios.json` | iOS platform | Metal shaders (compute-capable, supports GPU Resident Drawer), memory budget ~1GB, no JIT |
| `android.json` | Android platform | Vulkan recommended / OpenGL ES 3.0 fallback, ASTC textures, memory budget ~1.5GB |
| `console.json` | Console platform | Platform-specific shader features, generous memory |
| `webgl.json` | WebGL platform | WebGL 2.0 limits, strict memory budget ~256MB, no threads, no compute shaders (GPU Resident Drawer unavailable) |
| `xr.json` | XR/VR platform | OpenXR (OculusXR reported deprecated/removed per Unity's roadmap — verify via `manage_packages` before citing a version), 72-90fps frame budget, comfort guidelines |

### Built-in Architecture Rules (`templates/architecture-rules/`)

| File | Description | Rule Types |
|------|-------------|------------|
| `mvc-pattern.json` | MVC architecture | Naming conventions, layer dependencies (View→Controller→Model) |
| `ecs-pattern.json` | ECS architecture | Component data-only, System logic-only, no MonoBehaviour mixing |
| `scriptableobject-pattern.json` | ScriptableObject pattern | Data in SO, logic in MonoBehaviour, event-driven communication |

### Built-in Workflow Templates (`templates/workflows/`)

| File | Description | Steps |
|------|-------------|-------|
| `asset-import-setup.json` | Asset import & config | Scan folder → Detect types → Apply presets → Generate summary |
| `build-and-deploy.json` | Build & deploy | Load config → Build → Monitor → Report |
| `test-execution.json` | Test execution | Run tests → Format results → Report |

### Custom Template Storage (Unity Project)

Developers can create custom templates in their Unity project:

| Type | Custom Location |
|------|----------------|
| Asset_Preset | `Assets/UnityAccelerator/Config/Presets/` |
| Scene_Scaffold | `Assets/UnityAccelerator/Config/Scaffolds/` |
| BuildConfig | `Assets/UnityAccelerator/Config/Builds/` |
| WorkflowTemplate | `Assets/UnityAccelerator/Config/Workflows/` |
| ArchitectureRule | `Assets/UnityAccelerator/Config/Rules/` |
| PlatformProfile | `Assets/UnityAccelerator/Config/Platforms/` |
| Knowledge_Base | `Assets/UnityAccelerator/Knowledge/` |
| PerformanceReport | `Assets/UnityAccelerator/Reports/` |
| PerformanceThresholds | `Assets/UnityAccelerator/Config/thresholds.json` |


## Steering Files

The `steering/` directory contains domain-specific knowledge files that guide the AI on how to effectively use MCP tools for each capability area. These are automatically loaded based on the developer's request context.

There are **15** files in `steering/`, and this table lists all of them:

| File | Domain | Loaded When |
|------|--------|-------------|
| `unity-general.md` | General Unity best practices, MCP health checks, error handling | Always (base knowledge) |
| `asset-automation.md` | Asset pipeline, import settings, naming conventions, batch operations | Asset-related requests |
| `scene-scaffolding.md` | Scene architecture, GameObject hierarchies, conflict handling | Scene creation requests |
| `build-automation.md` | Build process (`manage_build`), error parsing | Build-related requests |
| `cross-platform-testing.md` | Test execution, result formatting, device testing | Testing requests |
| `workflow-automation.md` | Multi-step workflows, dependency validation, progress tracking | Workflow requests |
| `performance-analysis.md` | Profiling, metrics, thresholds, optimization suggestions | Performance requests |
| `code-quality.md` | Architecture patterns, violation detection, cyclic dependencies | Code quality requests |
| `knowledge-management.md` | Documentation, API changes, onboarding, staleness detection | Knowledge requests |
| `platform-compatibility.md` | Shader compatibility, memory budgets, platform constraints | Platform check requests |
| `asset-dependencies.md` | Dependency trees, orphaned assets, bundle duplication, circular refs | Dependency requests |
| `level-design-tooling.md` | Editor extension script generation, ScriptableObject templates, batch scene-object setup | Level design / Editor tooling requests |
| `ui-dependency-analysis.md` | UI component reference detection, event call chains, coupling metrics, refactor suggestions | UI analysis requests |
| `project-organization.md` | Folder structure, naming rules, `.meta` handling, Prefab practice, version control | Project structure / VCS requests |
| `language-zh-tw.md` | Response-language preference and defaults | Loaded when responding in Traditional Chinese |

## Error Handling

### Error Categories

| Category | Example | Response |
|----------|---------|----------|
| MCP connection failure | Server not started, network issue | Prompt the developer to confirm Unity Editor is open with a project loaded, that `Window → MCP for Unity` shows **Connected** (`Restart Server` if not), and that the URL's port matches the one shown in that window |
| **A documented tool is reported as not existing** | `Tool 'manage_profiler' does not exist on server 'power-kiro-unity-accelerator-unity-mcp'`, or the tool is absent from the tool list | *Then* — not before — treat tool groups as the suspect: `manage_tools(action: "list_groups")`, `manage_tools(action: "sync")` to adopt the Unity Tools-window toggles, `manage_tools(action: "activate", group: "...")`, then **refresh or reconnect the MCP client** (many clients cache the tool list, so a successful activation can look like it did nothing). Note that on the live-verified install every non-core tool was callable with no activation, and `list_groups`' `enabled`/`default_enabled` fields read `false` for groups whose tools worked — so those fields never prove a tool is unavailable. Also check that nobody ran `manage_tools(action: "deactivate", ...)` earlier in the session: deactivation *is* enforced |
| **Tool call denied by the IDE's permissions** | `Tool call denied by user's permissions. Rule: deny mcp matching "power-<powerName>-<serverName>/<tool>"` | The IDE blocked the call before Unity saw it; this is neither a bridge nor a tool-group problem. Check `~/.kiro/settings/permissions.yaml` (and the workspace-level file) for `capability: mcp` entries with `effect: deny`, report the matched rule to the developer, and stop — do not retry and do not route around it. Full detail: [Tool denied by the IDE's own permission rules](#tool-denied-by-the-ides-own-permission-rules) |
| **"Unknown action" raised inside `batch_execute`** | A batched `manage_editor(action: "telemetry_status")` fails with `Unknown action: 'telemetry_status'` although the direct call succeeds | `batch_execute` bypasses the Python server layer, so server-layer actions fail inside a batch with a misleading message. Retest the action as a **direct** call before concluding it does not exist, and keep server-layer actions out of batches: [`batch_execute` and server-layer actions](#batch_execute-and-server-layer-actions) |
| **Duplicate Unity MCP server registrations** | Two Unity servers in the IDE's MCP panel, duplicated or oddly prefixed tool names, calls landing on the wrong server | This Power's `mcp.json` and Unity's `Configure All Detected Clients` both write into `~/.kiro/settings/mcp.json` under different names (`unity-mcp` vs `unityMCP`). Pick exactly one path (see [Onboarding](#1-pick-exactly-one-mcp-registration-path)), disable the other entry, restart the IDE |
| **`resources/read` unknown-server error** | Reading `mcpforunity://...` fails with an unknown or ambiguous server key | Some clients need the server discovery key passed alongside the URI. List the resources first and reuse the server key exactly as the client reports it; if two Unity servers are registered, fix that first (row above) |
| MCP tool schema mismatch | "Unknown action" or Pydantic validation error naming valid values, **on a direct call** | The connected bridge version differs from what this Power expects — trust the error message's list of valid values over this document, and suggest the developer update `com.coplaydev.unity-mcp` to v10.3.0 or newer if core actions seem missing. **Direct calls only**: the same error from inside `batch_execute` means nothing (row above) |
| **`no_unity_session` — "Unity session not available; please retry"** | `{"success": false, "error": "Unity session not available; please retry", "data": {"reason": "no_unity_session", "retry_after_ms": 250}}` on every Unity-dependent call, while `debug_request_context` still answers normally | **First suspect: the C# UPM package and the Python server are on different versions.** VERIFIED 2026-10-21 — with C# at 10.3.0 and Python still at 9.6.8 this was the exact symptom, and it is *selective*, so the server looks healthy. Compare `debug_request_context`'s `server.version` against the package version from `manage_packages(action: "list_packages")`; if they differ, run the [ordered upgrade procedure](#ordered-upgrade-procedure). If the two already match, then check the Editor — closed, compiling, or not running the bridge. **Do not confuse this with `Session not found`** (row below): retrying or reconnecting the client will not fix it |
| **`Session not found` (JSON-RPC `-32600`)** | `{"jsonrpc": "2.0", "id": "server-error", "error": {"code": -32600, "message": "Session not found"}}` | The **MCP transport session** died: the server restarted and never issued the session id the client is presenting. VERIFIED 2026-10-21 immediately after a bridge restart. Reconnect the client (the IDE's MCP Server panel → reconnect, or restart the IDE) to get a new session and re-read the tool list. Every server restart — and therefore **every bridge upgrade** — causes this. Distinct from `no_unity_session`, which is the Unity bridge layer rather than the transport: see [The client session does not survive a server restart](#the-client-session-does-not-survive-a-server-restart) |
| **A target GameObject "is not found" although it exists** | `Target GameObject ('-5560') not found using method 'by_id'`, or a `manage_prefabs` call reporting `GameObject '50436' not found in the active scene or prefab stage` | A stale or wrong-convention `target`. Instance IDs are volatile — a `create`'s negative id stops resolving once the object is registered, and a domain reload renumbers every object ([instance IDs are volatile](#instance-ids-are-volatile--never-cache-one)). Re-resolve by name: pass the object's **name** as `target`, which is the one form all three object tools accept ([the three `target` conventions](#the-three-target-conventions)). Do not keep retrying the id |
| MCP operation timeout | Unity compiling or building | Wait and retry; inform the developer Unity may be busy. If the error text is specifically `no_unity_session`, it is not a timeout — see that row above |
| MCP tool error | Asset path not found, invalid params | Parse error, suggest correct path or parameters |
| Asset operation error | Preset apply failed, file locked | Record failure, continue with remaining assets, report at end |
| Build error | Compilation failed, missing dependency | Parse `read_console` logs and `manage_build(action: "status")`, provide structured error summary |
| Async job stuck/failed | `run_tests`, `manage_build`, or `manage_packages` job never reaches a terminal status | Poll with a reasonable timeout (e.g. `get_test_job(..., wait_timeout: 30)`); if still running after several polls, inform the developer rather than polling indefinitely |
| Workflow error | Step execution failed | Pause workflow, offer Retry / Skip / Abort |
| Template load error | Invalid JSON, file not found | Fall back to built-in template, inform the developer |
