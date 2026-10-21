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

- **Path A — let this Power register the server.** Install the Power and leave its `mcp.json` alone. A Legacy (`POWER.md`) power's MCP servers are registered into `~/.kiro/settings/mcp.json` under the Powers section, with the server name namespaced by the IDE.
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
5. **Composable Architecture**: Complex workflows are composed from multiple MCP tool calls chained via `batch_execute`
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
- **Render pipeline**: Always check the project's render pipeline (URP/HDRP/Built-in) before importing or recommending assets — verify via `manage_graphics(action: "pipeline_get_info")`, which is in the default-on `core` group, rather than assuming. Do **not** read `GraphicsSettings.currentRenderPipeline` through `execute_code` for this: `execute_code` lives in the `scripting_ext` group, which is off by default, and `pipeline_get_info` returns the same answer with no group activation. Flag shader incompatibilities immediately. URP is the default and Unity-recommended pipeline for new Unity 6 projects; Built-in remains usable for existing projects and Unity has not committed to a firm removal version.
- **Play Mode**: Never make permanent scene changes while in Play Mode. Verify editor state before modifying and saving scenes.
- **Batch operations**: When placing multiple objects, ensure proper physics, vary rotation/scale for natural appearance, check performance impact for large quantities (50+), and respect the project's existing organizational structure.

#### Unity 6.4 Baseline

This Power targets **Unity 6.4** (release stream `6000.4`) and the MCP tool surface of **[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)** at **v10.3.0 or newer (minimum v10.0.0)**.

| Item | Value |
|---|---|
| Primary target / verified baseline | **Unity 6.4 (`6000.4`)**, pinned patch **`6000.4.12f1`** (released 17 Jun 2026) |
| Minimum supported Editor for this Power | **Unity 6.0 (`6000.0`)** — below that, the Build Profiles params on `manage_build` (Unity 6+ only) and the Render Graph / GPU Resident Drawer guidance throughout `steering/` simply do not apply |
| Minimum Editor for the bridge itself | **Unity 2021.3 LTS** — the bridge's floor is lower than this Power's |
| Live-verified pairing | Unity `6000.4.6f1` + URP 17.4.0 + MCP for Unity 9.6.8, Windows Editor, 2026-10-21 |

**Forward compatibility.** This Power is expected to work on Unity 6.5, 6.6 and later 6.x releases — but those streams were **not** live-verified here, so treat any 6.5+-specific behaviour as forward-looking and unverified until a call on the connected Editor proves it.

**Version-support reality, and what to recommend.** Unity 6.4 is an Update release, and an Update release is supported only until the next one ships; 6.4's patch stream ended 17 Jun 2026, so it receives no further fixes ([unity.com/releases](https://unity.com/releases/) and [endoflife.date/unity](https://endoflife.date/unity), both retrieved 2026-10-21). Consequences for advice this Power gives:

- A project locking down for production should move to **Unity 6.3 LTS** (supported through Dec 2027) or forward onto the current Update release.
- **Unity 6.0 LTS support ended 16 Oct 2026 — never recommend it**, including as a "safe older version".
- Unity 6.4 remains the right target for *this* Power's claims, because it is the only stream anything here was actually checked against.

If a tool call fails with an "Unknown action" or a validation error, the connected bridge build is likely older than v10.0.0 — tell the developer to update `com.coplaydev.unity-mcp` rather than working around it with legacy syntax.

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
   - **Git URL (default)**: Unity Editor → Window → Package Manager → Add package from git URL: `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`
   - **Pin a release** instead of tracking `main` by replacing `#main` with a tag, e.g. `#v10.3.0`
   - **OpenUPM**: `openupm add com.coplaydev.unity-mcp`
   - **Asset Store**: the "MCP for Unity" listing, then Package Manager → My Assets

2. **Install this Power in the IDE**:
   - Open the IDE → Powers panel → Install this Power

3. **Finish the MCP for Unity setup in Unity**:
   - On first import the package opens a **setup wizard**; the persistent UI afterwards is `Window → MCP for Unity`, which starts/stops the server, switches transport, and reconfigures clients
   - Confirm the status panel reads **Connected**. `Restart Server` is the recovery action
   - The server listens on a local MCP endpoint whose port the window displays (local-only loopback — communication that stays on the local computer and is not accessible from the network — see Security Note below)
   - Then pick **exactly one** registration path as described in [Onboarding](#1-pick-exactly-one-mcp-registration-path)

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
MCP for Unity's default transport is streamable HTTP, and the default local endpoint is `http://127.0.0.1:8080/mcp` — that value is the Unity-side default (`HttpEndpointUtility.DefaultLocalBaseUrl`) and the Python server default, so it is what this Power's `mcp.json` ships with.

**The port is user-editable and 8080 collides with other services** (upstream names Tailscale as an example and suggests moving to 8090). Do the steps in this order:

1. **Let Unity write the config.** `Window → MCP for Unity` → confirm the transport is HTTP → **Configure All Detected Clients** (or select the IDE and **Configure Selected**). The IDE is a first-class supported client, so this writes a port-accurate entry for you.
2. **Read the real port.** The MCP for Unity window shows the server endpoint. If it is not 8080, the URL is `http://127.0.0.1:<that port>/mcp`.
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

> **Note**: the HTTP mode above works without understanding any of this. stdio is only a fallback. Unity's own configurator writes a version-pinned `--from mcpforunityserver==<package version>`; the unpinned form above tracks the newest server.

> **stdio-only behaviour**: `set_active_instance` accepts a bare port number only in stdio mode. Over HTTP the `instance` argument must be `Name@hash` (or an unambiguous hash prefix).

### Connection Health Check

Before executing any MCP operation, perform a lightweight health check:
1. Attempt one cheap read-only call: `manage_scene(action: "get_active")`. Use this call and no other — it is in the `core` tool group, which is the only group enabled by default
2. If successful → MCP connection is healthy
3. If failed → prompt the developer to:
   - Confirm Unity Editor is open with a project loaded
   - Open `Window → MCP for Unity` and confirm the status panel reads **Connected**; use `Restart Server` if it does not
   - Read the server port shown in that window and confirm the URL in `mcp.json` (or the IDE's MCP panel) matches it — do not assume 8080
   - Confirm only one Unity MCP server is registered (see [Onboarding](#1-pick-exactly-one-mcp-registration-path))

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
> **2026-10-21** against MCP for Unity **9.6.8** connected to Unity **6000.4.6f1** (Windows
> Editor, URP 17.4.0) — read-only calls only; nothing in the project was mutated. Items that
> could not be exercised on that machine were reconciled against the MCP for Unity **v10.3.0**
> generated tool reference and Python tool registry, and are marked as such. Not exercised live:
> every mutating action (`create`/`modify`/`delete`/`build`/`play`), `run_tests`/`get_test_job`
> end-to-end, `manage_probuilder` (package absent), memory-snapshot actions
> (`com.unity.memoryprofiler` absent), Cinemachine-dependent `manage_camera` paths (package
> absent), and the `asset_gen` group (absent at 9.6.8). If a call fails with an "Unknown action"
> or a validation error, that error message lists the real valid values and **overrides this
> document**.

No tool was renamed or removed between bridge 9.6.8 and v10.3.0 — the difference is purely additive, so a tool documented here exists on both.

### Tool Groups

**Read this before using any tool outside the `core` group.** MCP for Unity partitions its entrypoints into **10 groups**, and **only `core` is enabled by default**. Nine groups are opt-in:

| Group | Default | Tools |
|---|---|---|
| `core` | **on** | `apply_text_edits`, `batch_execute`, `create_script`, `debug_request_context`, `delete_script`, `execute_custom_tool`, `execute_menu_item`, `find_gameobjects`, `find_in_file`, `get_sha`, `manage_asset`, `manage_build`, `manage_camera`, `manage_components`, `manage_editor`, `manage_gameobject`, `manage_graphics`, `manage_material`, `manage_packages`, `manage_physics`, `manage_prefabs`, `manage_scene`, `manage_script`, `manage_script_capabilities`, `manage_tools`, `read_console`, `refresh_unity`, `script_apply_edits`, `set_active_instance`, `validate_script` |
| `animation` | off | `manage_animation` |
| `asset_gen` | off | `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model`, `import_model_file` |
| `docs` | off | `unity_docs`, `unity_reflect` |
| `probuilder` | off | `manage_probuilder` (also needs `com.unity.probuilder`) |
| `profiling` | off | `manage_profiler` |
| `scripting_ext` | off | `execute_code`, `manage_scriptable_object` |
| `testing` | off | `get_test_job`, `run_tests` |
| `ui` | off | `manage_ui` |
| `vfx` | off | `manage_shader`, `manage_texture`, `manage_vfx` |

`manage_tools` itself is declared with **no group** (`group=None`) in the bridge source, so it is always visible and cannot be switched off — that is what makes it a usable recovery lever. The other four server meta-tools (`set_active_instance`, `manage_script_capabilities`, `debug_request_context`, `execute_custom_tool`) are listed under **`core`** in the v10.3.0 catalog, which is the only default-on group; at bridge 9.6.8 the live `list_groups` response reported them outside `core`. Either way all five are callable without activating anything.

**`manage_tools` — the control surface:**

| Action | Params | Effect |
|---|---|---|
| `list_groups` | — | returns every group with `name`, `description`, `enabled`, `default_enabled`, `tools`, `tool_count` |
| `activate` | `group` (required) | the group's tools appear in the next tool listing |
| `deactivate` | `group` (required) | hides them again |
| `sync` | — | adopts the Unity Editor's per-tool toggles (`Window > MCP for Unity > Tools`) into this session. Errors with an "update the MCPForUnity package" message if the Editor is too old to report tool states |
| `reset` | — | back to `core` only |

Valid `group` values: `animation`, `asset_gen`, `core`, `docs`, `probuilder`, `profiling`, `scripting_ext`, `testing`, `ui`, `vfx`.

**Recovery sequence when a documented tool is missing from the tool list:**

```
manage_tools(action: "list_groups")              # see the catalog
manage_tools(action: "sync")                     # adopt the Unity Tools-window toggles
manage_tools(action: "activate", group: "...")   # enable what this workflow needs
manage_tools(action: "reset")                    # back to core-only when finished
```

**Enforcement semantics — read these distinctions carefully:**

- **VERIFIED**: the gate is a *tool-listing* filter (per-session component visibility keyed on a `group:<name>` tag), and the server-level default that hides non-`core` groups at startup is applied **only on HTTP transport**. On stdio every group is enabled at startup and then reconciled against Unity's toggles.
- **VERIFIED**: `list_groups`' `enabled` field reports the session's own rule **only if an `activate`/`deactivate` has been issued in this session — otherwise it reports the group's DEFAULT.** So after the Editor's toggle sync has already made a group's tools visible, `list_groups` can still show `enabled: false` for it. **It is not a reliable readout of what is actually callable.** This is the single most confusing behaviour in the group system.
- **UNVERIFIED**: whether invoking a tool whose group is currently hidden returns an unknown-tool error rather than executing. A hidden group's tools do not appear in the tool list, so the agent normally never selects them; whether a hand-written call to a hidden tool still succeeds was not observed. **Do not claim that a deactivated group blocks the call.**
- Some MCP clients **cache the tool list** until the server is restarted or the client refreshes. After `activate`, a tool may not appear until the client reconnects — so always tell the developer that a refresh may be needed rather than assuming the activation failed.

### Server & Session Meta-Tools

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_tools` | `list_groups`, `activate`, `deactivate`, `sync`, `reset` | Tool-group gating — see [Tool Groups](#tool-groups) above. Params: `action` (required), `group`. Never reaches Unity; always visible |
| `set_active_instance` | N/A — param: `instance` (required) | Routes this client/session to one of several connected Editors. Accepts `Name@hash` (where `Name` is Player Settings `productName` and `hash` is a stable 8-character hash of the project path) or an unambiguous hash prefix; **a bare port number works only in stdio mode**. Discover instances via the `mcpforunity://instances` resource. A per-call `unity_instance` argument routes a single call without changing the session default |
| `manage_script_capabilities` | N/A — no params | Returns the script-editing contract: `ops`, `text_ops`, `max_edit_payload_bytes`, `guards`. Call this before a large `apply_text_edits` to learn the payload ceiling instead of discovering it by failing |
| `execute_custom_tool` | N/A — params: `tool_name` (required), `parameters` | Invokes a project-scoped custom tool registered by the Unity project. Discover candidates via the `mcpforunity://custom-tools` resource. If the server was started with project-scoped tools disabled, this tool is not registered at all — its absence is not a connection fault |
| `debug_request_context` | N/A — no params | Returns the FastMCP request context (`client_id`, `session_id`, metadata dump). Use it when a client appears to be talking to the wrong server key or the wrong session |

### Asset Management

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_asset` | `import`, `create`, `modify`, `delete`, `duplicate`, `move`, `rename`, `search`, `get_info`, `create_folder`, `get_components` | There is **no `list` action** — use `search` with `path` + `search_pattern` (e.g. `"*.fbx"`) to enumerate assets. Use `get_info` for import settings/metadata on a single asset. **`path` is required on every action.** `asset_type` is required for `create`. Paging on `search` uses **`page_size` + `page_number` (1-based), not `cursor`**. `search_pattern` also accepts AssetDatabase filter syntax such as `t:MonoScript`. Other params: `properties`, `destination`, `filter_type`, `filter_date_after`. Leave `generate_preview` at its default `false` — enabling it returns large base64 payloads |
| `manage_material` | `ping`, `get_material_info`, `create`, `set_material_shader_property`, `set_material_color`, `assign_material_to_renderer`, `set_renderer_color` | `assign_material_to_renderer` also takes a `search_method` using the same `by_*` vocabulary as `find_gameobjects` |
| `manage_texture` | `create`, `modify`, `delete`, `create_sprite`, `apply_pattern`, `apply_gradient`, `apply_noise`, `set_import_settings` | Procedural texture generation, not just import-setting management. **Group `vfx` — off by default**, activate with `manage_tools(action: "activate", group: "vfx")` |
| `manage_shader` | `read` (read-only); `create`, `update`, `delete` (modifying) | Requires `name` + `path`; there is no `list` action — use `manage_asset(action: "search", search_pattern: "*.shader")` to enumerate shaders first. **Group `vfx` — off by default**, activate with `manage_tools(action: "activate", group: "vfx")` |

### Scene & GameObject Management

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_scene` | Read-only: `get_hierarchy`, `get_active`, `get_build_settings`, `get_loaded_scenes`, `scene_view_frame`. Modifying: `create`, `load`, `save`, `close_scene`, `set_active_scene`, `move_to_scene`, `validate` | No `list` action — use `get_loaded_scenes` for currently loaded scenes or `get_build_settings` for the Build Settings scene list |
| `manage_gameobject` | `create`, `modify`, `delete`, `duplicate`, `move_relative`, `look_at` | For CRUD only. Use `find_gameobjects` to search |
| `manage_components` | `add`, `remove`, `set_property` | Requires `target` (instance ID preferred) + `component_type`. Treat the instance ID as an **opaque token** — see the `find_gameobjects` note below |
| `manage_prefabs` | `get_info`, `get_hierarchy`, `create_from_gameobject`, `modify_contents`, `open_prefab_stage`, `save_prefab_stage`, `close_prefab_stage` | `modify_contents` supports `create_child`/`delete_child`/`component_properties` for headless prefab edits |

### UI & Visual

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_ui` | Read-only: `ping`, `read`, `get_visual_tree`, `list`. Modifying: `create`, `update`, `delete`, `attach_ui_document`, `detach_ui_document`, `create_panel_settings`, `update_panel_settings`, `modify_visual_element`, `render_ui`, `link_stylesheet` | This manages **UI Toolkit** (UXML/USS/UIDocument), not legacy uGUI Canvas/Button/Text. For legacy uGUI, create the GameObject + components via `manage_gameobject`/`manage_components` directly. **Group `ui` — off by default**, activate with `manage_tools(action: "activate", group: "ui")` |
| `manage_camera` | `ping`, `ensure_brain`, `get_brain_status`, `create_camera`, `set_target`, `set_priority`, `set_lens`, `set_body`, `set_aim`, `set_noise`, `add_extension`, `remove_extension`, `set_blend`, `force_camera`, `release_override`, `list_cameras`, `screenshot`, `screenshot_multiview` | `create_camera` supports presets (`third_person`, `freelook`, `follow`, `dolly`, `static`, `top_down`, `side_scroller`) and works with or without Cinemachine installed. To *read* the camera setup prefer the `mcpforunity://scene/cameras` resource. Cinemachine-specific paths are **UNVERIFIED** (package absent on the verification machine) |
| `manage_animation` | Prefixed actions: `animator_*`, `controller_*`, `clip_*` | Action-specific params go in the `properties` dict. **Group `animation` — off by default**, activate with `manage_tools(action: "activate", group: "animation")` |
| `manage_vfx` | Prefixed actions: `particle_*`, `vfx_*`, `line_*`, `trail_*` | ParticleSystem, VisualEffect, LineRenderer, TrailRenderer. **Group `vfx` — off by default** |
| `manage_probuilder` | `create_shape`, `extrude_faces`, `bevel_edges`, `subdivide`, `get_mesh_info`, and many more mesh-editing actions | Requires `com.unity.probuilder` package. **Group `probuilder` — off by default.** Not exercised live (package absent on the verification machine) |
| `manage_graphics` | Action-prefixed by area — `stats_get`/`stats_list_counters`/`stats_get_memory` (rendering stats); `pipeline_get_info`/`pipeline_get_settings`/`pipeline_set_settings`/`pipeline_set_quality` (render pipeline); `feature_list`/`feature_add`/`feature_remove`/`feature_configure`/`feature_toggle` (URP renderer features); `skybox_get`/`skybox_set_*` (environment/fog/ambient); `volume_*` (Volume/post-processing, requires URP/HDRP); `bake_*` (lightmap/probe baking, Edit mode only) | There is **no `get_settings` or `get_rendering_stats` action** — those are `pipeline_get_settings` and `stats_get` respectively. **Unity 6.4 reading note for `stats_get`**: the redesigned Rendering Statistics window separates draw calls optimised by the SRP Batcher, the GPU Resident Drawer, BatchRendererGroup and GPU instancing, and reports more accurate frame times — report *which batching path absorbed the draw calls* rather than treating "draw calls" as one number. **Unity 6.4 caveat for `volume_*`**: SRP Core now takes `com.unity.modules.physics` as a soft dependency, so a project that disabled the physics module to shrink its build loses local Volumes (global Volumes are unaffected); `IVolume` was also removed in favour of `VolumeGizmoDrawer` |

### Project & Editor

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `manage_packages` | `list_packages`, `search_packages`, `get_package_info`, `add_package`, `remove_package`, `list_registries`, `add_registry`, `remove_registry`, `embed_package`, `resolve_packages`, `ping`, `status` | **Asynchronous**: `list_packages`/`search_packages`/`add_package`/`remove_package` return `{job_id}` immediately with `_mcp_status: "pending"`; poll with `action: "status", job_id: "..."` until it resolves |
| `manage_build` | `build`, `status`, `platform`, `settings`, `scenes`, `profiles`, `batch`, `cancel` | **This is the build tool — `manage_editor` has no build action.** Supports Build Profiles (Unity 6+) via the `profile`/`profiles` params, and `batch` for multi-target builds. See the parameter detail immediately below this table |
| `manage_editor` | `play`, `pause`, `stop`, `set_active_tool`, `add_tag`, `remove_tag`, `add_layer`, `remove_layer`, `deploy_package`, `restore_package`, `undo`, `redo`. Params: `tool_name`, `tag_name`, `layer_name` (each optional, used by the matching action) | Does **not** build or refresh — use `manage_build` for builds and `refresh_unity` for asset-database refresh/recompile. Prefab-stage operations live in `manage_prefabs`. **To read editor state, project info, tags, layers, selection, windows, prefab stage or the active tool, use the resources in [MCP Resources](#mcp-resources-read-only) — not this tool.** The `telemetry_status`/`telemetry_ping` actions do exist, but they are **server-side telemetry diagnostics** handled in the Python layer; they return only whether telemetry is enabled / that a ping was queued, and report **nothing** about editor state or compilation. Never use them as a readiness probe |
| `refresh_unity` | N/A (single-purpose) | Params: `mode`, `scope`, `compile`, `wait_for_ready`. Use after script/asset changes made outside Unity's own import pipeline |
| `create_script` / `delete_script` / `validate_script` / `get_sha` | N/A (single-purpose each) | Modern script CRUD; prefer these over the legacy `manage_script` router. See the `uri` and edit-shape detail below this table |
| `apply_text_edits` / `script_apply_edits` | N/A | Line/column-based and structured (method/class-level) C# edits respectively; prefer `script_apply_edits` for method-level changes. See the edit-shape detail below this table |
| `manage_script` | `create`, `read`, `delete` only | Legacy compatibility router — **no `list` or `get_info` action**. To enumerate scripts, use `manage_asset(action: "search", search_pattern: "*.cs")` |
| `manage_scriptable_object` | `create`, `modify` | Uses SerializedObject property paths for patches. **Group `scripting_ext` — off by default**, activate with `manage_tools(action: "activate", group: "scripting_ext")` |
| `manage_physics` | `ping`, `get_settings`, `set_settings`, collision matrix, materials, joints, raycasts, `apply_force`, `simulate_step`, `validate` | 3D and 2D via the `dimension` param |
| `execute_menu_item` | N/A — param: `menu_path` | Executes a Unity menu item by its menu path. Enumerate the available paths with the `mcpforunity://menu-items` resource before guessing a path |

#### `manage_build` parameters

- **`action: "settings"` requires a `property` argument.** Valid properties: `product_name`, `company_name`, `version`, `bundle_id`, `scripting_backend`, `defines`, `architecture`. Pass `value` to write; omit `value` to read. A bare `manage_build(action: "settings")` is rejected by Unity.
- **`scripting_backend` accepts only `mono` or `il2cpp`.** There is no `coreclr` option — whatever the Editor's own enum contains, this Power cannot select CoreCLR through `manage_build`.
- **`options`** takes a JSON array drawn from: `clean_build`, `auto_run`, `deep_profiling`, `compress_lz4`, `strict_mode`, `detailed_report`. Map any local build-config vocabulary onto these names.
- **`subtarget`**: `player` or `server`.
- **`profile` / `profiles`**: Build Profile asset paths, **Unity 6+ only**. `targets` + `output_dir` for `batch`. `job_id` for `status`/`cancel`.
- `target` values are the *bridge's* alias list, not Unity's full `BuildTarget` enum — read the live target with `manage_build(action: "platform")`.

#### Script-tool parameters

- The `uri` argument of `apply_text_edits` / `script_apply_edits` / `get_sha` / `validate_script` / `delete_script` / `find_in_file` accepts three forms: a project-relative `Assets/...` path, `mcpforunity://path/Assets/...`, or `file://...`.
- `apply_text_edits` takes `edits: [{startLine, startCol, endLine, endCol, newText}]` and the coordinates are **1-indexed**. It also accepts `precondition_sha256` (pair it with `get_sha` for a safe read-modify-write) and `strict`.
- `validate_script` takes `level` (`basic` or `standard`) and `include_diagnostics`.
- Call `manage_script_capabilities` first to read `max_edit_payload_bytes` before sending a large edit.
- `manage_script(action: "read")` requires both `name` and `path`, where `path` is the **containing folder**, not the full file path.

### Execution & Query

| Tool | Key Actions | Notes |
|------|-------------|-------|
| `run_tests` | N/A — params: `mode` (`EditMode`/`PlayMode`), `test_names`, `category_names`, `assembly_names` | **Asynchronous**: returns `{job_id}` immediately; poll with `get_test_job(job_id, wait_timeout: 30)` until the run completes. There is no `platform` filter param — filtering is by test mode/category/assembly, not target platform. **Group `testing` — off by default.** End-to-end behaviour is **UNVERIFIED** (not exercised on the verification machine) |
| `get_test_job` | N/A | Poll target for `run_tests`; supports `wait_timeout` (seconds) to reduce polling round-trips. May report `progress.stuck_suspected` / `progress.focus_nudge_status`, and the server may briefly focus the Unity window during a stalled run (suppress by setting `UNITY_MCP_DISABLE_FOCUS_NUDGE=1` on the Python server). **Group `testing` — off by default** |
| `read_console` | `get` (default), `clear` | Supports `filter_text`, `types`, `page_size`/`cursor` for paging |
| `batch_execute` | N/A | Each command is `{"tool": "...", "params": {...}}` — **the per-command key is `params`, not `args`**. Supports `parallel`/`fail_fast`/`max_parallelism`. **`fail_fast` defaults to `true`** — pass `fail_fast: false` explicitly for any "record the failure and continue" workflow. **Command cap**: configurable in the Unity MCP Tools window, **default 25, hard maximum 100** — split larger jobs into successive batches |
| `find_in_file` | N/A — params: `uri` (required), `pattern` (required, regex), `project_root`, `max_results`, `ignore_case` | Regex search inside one file; returns line numbers plus excerpts. Cheaper and safer than reading a whole script when only a symbol's location is needed |
| `find_gameobjects` | N/A — params: `search_term` (**required**); optional: `search_method`, `include_inactive`, `page_size`, `cursor` | **No `filter` param.** Only `search_term` is required — `search_method` is optional. Valid `search_method` values are prefixed: `by_name`, `by_tag`, `by_layer`, `by_component`, `by_path`, `by_id`. Returns instance IDs only (paginated); fetch full data via the `mcpforunity://scene/gameobject/{id}` resource. **Unity 6.4 caveat**: `InstanceID` is deprecated in favour of the new `EntityId` type, and Unity's own guidance warns against casting ids to/from `int`, sign-based asset checks, `GetHashCode`, `ToString`-then-parse, and sorting by id to infer creation order. **Treat the returned id as an opaque token** — pass it straight back to the bridge; never do arithmetic on it, sort by it, or parse it |
| `execute_code` | `execute`, `get_history`, `replay`, `clear_history` | Runs arbitrary C# in-Editor. **Group `scripting_ext` — off by default.** Default `compiler: "auto"` falls back to `codedom` (C# 6 syntax only) unless Roslyn is installed — avoid C# 7+ syntax (e.g. `var x = (a, b);` tuples, pattern matching) unless you've confirmed Roslyn is available. `safety_checks` (bool, **default `true`**) rejects patterns such as `File.Delete`, `Process.Start` and obvious infinite loops; it is explicitly **not a full sandbox**, so it is no substitute for reading the snippet before running it. `index` selects which history entry `replay` re-runs; `limit` (1–50, default 10) bounds `get_history` |
| `manage_profiler` | Session: `profiler_start/stop/status/set_areas`. Counters: `get_frame_timing`, `get_counters`, `get_object_memory`. Memory: `memory_take_snapshot/list_snapshots/compare_snapshots`. Frame Debugger: `frame_debugger_*` | Memory snapshot actions require `com.unity.memoryprofiler` package (**UNVERIFIED** — absent on the verification machine). **Group `profiling` — off by default**, activate with `manage_tools(action: "activate", group: "profiling")` |
| `unity_docs` / `unity_reflect` | `get_doc`/`get_manual`/`get_package_doc`/`lookup`; `get_type`/`get_member`/`search` | **Group `docs` — off by default**, activate with `manage_tools(action: "activate", group: "docs")`. Use `unity_reflect` to confirm an API exists on the connected Editor version before writing code against it, then `unity_docs` for usage examples. **Parameter names**: `unity_reflect(action: "get_type", class_name: "...")`; `get_member` needs `class_name` + `member_name`; `search` needs `query` and takes an optional `scope`. `unity_docs(action: "get_doc", class_name: "...")` with optional `member_name` and `version`. The parameter is **`class_name`** — `type_name` is rejected |

### Generative Tools (`asset_gen` group) — awareness only

The `asset_gen` group (new in bridge v10.0.0, **off by default**) adds six entrypoints: `generate_model`, `generate_image`, `generate_audio`, `import_model`, `import_model_file` and `blender_bridge`. They call third-party services (Tripo/Meshy, fal.ai/OpenRouter, Sketchfab) on a bring-your-own-key basis; keys are entered in the Unity Editor's Asset Gen tab and held in the OS secure store (Keychain / Windows Credential Manager / libsecret), never in MCP parameters or project assets. Calls are asynchronous: they return a `job_id` to poll with `action: "status"`. `blender_bridge` talks to a BlenderMCP-connected Blender over a socket (default `127.0.0.1:9876`, configured under `Window > MCP for Unity > Generative > Blender Bridge`). Importing GLB/glTF results needs **glTFast**; FBX does not.

**Rule: no workflow, steering file or template in this Power may route to `asset_gen`.** These tools spend the developer's third-party API credits, so they are documented here only so an agent recognises them when the group is active — never selected implicitly. Use them only on an explicit, specific request from the developer. This group was absent at bridge 9.6.8 and is **UNVERIFIED** here.

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

**Not a resource, but a URI form to remember**: `mcpforunity://path/Assets/...` is one of the three accepted forms for the script tools' `uri` **parameter** (alongside a plain `Assets/...` path and `file://...`), used by `apply_text_edits`/`script_apply_edits`/`find_in_file`/`get_sha`/`validate_script`/`delete_script`. It is not something you read with `resources/read`.

> **Client note**: some MCP clients require the server's discovery key to be supplied separately on a `resources/read` call (for example `server: "unityMCP"` alongside `uri: "mcpforunity://custom-tools"`). If a resource read fails with an unknown-server error, list the available resources first and use the server key exactly as the client reports it — this Power's `mcp.json` registers the server as `unity-mcp`, while Unity's own configurator writes `unityMCP`.


## Workflow Guides

### Workflow 1: Asset Batch Configuration (Requirement 1)

**To batch-configure assets (e.g., "Set all models in Characters folder to Humanoid rig"):**

**Step-by-step:**
1. **Scan** — `manage_asset(action: "search", path: "Assets/Characters/", search_pattern: "*.fbx")` (repeat per extension, e.g. `*.obj`; `manage_asset` has no `list` action)
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
3. **Activate the `ui` group — only if the scaffold or the request includes UI Toolkit elements** — `manage_tools(action: "activate", group: "ui")`, because `manage_ui` is not in the default-on `core` group. The MCP client may need a refresh or reconnect before `manage_ui` appears in its tool list. Skip this step entirely for a scene with no UI Toolkit content, or one using legacy uGUI (which goes through `manage_gameobject` + `manage_components` and needs no group)
4. **Create scene** — `manage_scene(action: "create", name: "NewScene")`
5. **Check conflicts** — `find_gameobjects(search_term: name, search_method: "by_name")` for each planned object name, to detect name conflicts with existing objects (there is no generic `filter` param; only `search_term` is required, and `search_method` values carry the `by_` prefix)
6. **Build hierarchy** — `batch_execute(commands: [{tool: "manage_gameobject", params: {action: "create", ...}} × N])` following the scaffold's hierarchy definition (each command uses `params`, not `args`; keep each batch within the command cap — default 25, hard max 100), including:
   - `manage_gameobject` for standard objects
   - `manage_camera(action: "create_camera", ...)` for camera objects — note this creates a Cinemachine-aware camera if Cinemachine is installed, or a basic Camera otherwise
   - `manage_ui` for UI Toolkit elements (UXML/USS); for legacy uGUI Canvas/Button/Text/Image, create them via `manage_gameobject` + `manage_components` (e.g. add `UnityEngine.UI.Canvas`, `UnityEngine.UI.Button` component types directly)
   - `manage_components` for adding components to objects
7. **Save scene** — `manage_scene(action: "save")`
8. **Report** — Display generation summary: total objects created, component list

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
- `manage_build(action: "settings", property: "...")` reads; add `value` to write. `property` is **required** — see [`manage_build` parameters](#manage_build-parameters) for the accepted properties and for the `options`/`subtarget` vocabulary

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
1. **Activate the `testing` group** — `manage_tools(action: "activate", group: "testing")`. `run_tests` and `get_test_job` are **not** in the default-on `core` group, so without this step they may be absent from the tool list entirely. If they still do not appear, run `manage_tools(action: "sync")` to adopt the Unity Tools-window toggles, and tell the developer the MCP client may need a refresh or reconnect before a newly activated tool shows up
2. **Discover tests (optional, no group needed)** — read `mcpforunity://tests`, or `mcpforunity://tests/EditMode` / `mcpforunity://tests/PlayMode`, to see what exists before running anything
3. **Start tests** — `run_tests(mode: "EditMode")` or `run_tests(mode: "PlayMode")` to execute Unity Test Framework tests. This returns `{job_id}` immediately — `run_tests` is asynchronous, not a blocking call. There is no `platform` param on `run_tests`; Unity Test Framework runs in the Editor (EditMode/PlayMode), not against a specific build target, so "testing for Android" in practice means building for that platform first (`manage_build`) and then reasoning about platform-specific code paths, not passing `platform` to `run_tests`
4. **Poll for completion** — `get_test_job(job_id: ..., wait_timeout: 30)` until `status` is no longer `"running"`; use `include_failed_tests: true` to get failure details without a huge payload. A long run may report `progress.stuck_suspected`, and the server may briefly focus the Unity window to unstick it
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
1. **Activate the `profiling` group** — `manage_tools(action: "activate", group: "profiling")`. `manage_profiler` is **not** in the default-on `core` group. If it still does not appear, run `manage_tools(action: "sync")` and warn the developer the MCP client may need a refresh or reconnect. `manage_graphics` and `read_console` are `core` and need no activation, so a graphics-only pass can skip this step
2. **Collect metrics** — `manage_graphics(action: "stats_get")` for Draw Calls, batches, triangles, etc. (this is the real action name — there is no `get_rendering_stats`); `manage_profiler(action: "get_frame_timing")` for frame-time data; `manage_profiler(action: "get_counters", category: "Memory")` for GC/memory counters. The `mcpforunity://rendering/stats` resource gives the same snapshot with no tool group required
3. **Read logs** — `read_console()` to collect performance-related logs
4. **Locate bottlenecks** — `find_gameobjects(search_term: "MeshRenderer", search_method: "by_component")` to identify objects with heavy renderers (the param is `search_term` plus an optional prefixed `search_method`, not `filter`). Treat the returned instance IDs as opaque tokens — do not sort or parse them
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
1. **Get project info — prefer the resource** — read `mcpforunity://project/info` for the Unity version, project root and platform. It needs no tool group. Use `manage_packages(action: "list_packages")` (`core`, asynchronous) for the package inventory. Only if you genuinely need to evaluate C# in the Editor, **activate the group first** — `manage_tools(action: "activate", group: "scripting_ext")` — because `execute_code` is not in the default-on `core` group; then `execute_code(action: "execute", code: "return UnityEngine.Application.unityVersion;")`, keeping to C# 6 syntax unless Roslyn is confirmed installed
2. **List scripts** — `manage_asset(action: "search", path: "Assets/", search_pattern: "*.cs")` to get all C# script paths (`manage_script` has no `list` action). `search_pattern` also accepts AssetDatabase filters such as `t:MonoScript`, and paging is `page_size` + `page_number`
3. **Read scripts** — `manage_script(action: "read", name: scriptName, path: folderPath)` to read script content (both `name` and `path` are required — `path` is the containing folder, not the full file path). For a targeted lookup inside one large file, `find_in_file(uri: ..., pattern: ...)` is cheaper than reading the whole script
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
3. **API change detection** — When Unity API updates, compare the project's used APIs against the change list to generate migration guides. To check an API against the *connected* Editor rather than against memory, **activate the `docs` group first** — `manage_tools(action: "activate", group: "docs")` — because `unity_reflect` and `unity_docs` are not in the default-on `core` group; then `unity_reflect(action: "get_type", class_name: "...")` to confirm the type exists and `unity_docs(action: "get_doc", class_name: "...")` for usage. The parameter is `class_name`, not `type_name`. If the tools do not appear, run `manage_tools(action: "sync")` and expect that the MCP client may need a refresh
4. **Onboarding** — For new team members, auto-generate an onboarding checklist based on project structure and existing docs
5. **Staleness check** — Flag documents not updated in 180+ days as "NeedsReview" and notify the document owner

**Knowledge_Base storage:**
- Location: `Assets/UnityAccelerator/Knowledge/` (JSON + Markdown files)
- Each entry has: title, content, tags, relatedAssets, author, timestamps, status


### Workflow 9: Platform Compatibility Check (Requirement 9)

**To check platform compatibility (e.g., "Check Android compatibility"):**

**Step-by-step:**
1. **Load profile** — Read the target PlatformProfile from `templates/platform-profiles/`
2. **Scan shaders** — `manage_asset(action: "search", path: "Assets/", search_pattern: "*.shader")` to enumerate shader assets — this is a `core` call and needs no group. **To read a shader's contents, activate the `vfx` group first**: `manage_tools(action: "activate", group: "vfx")`, because `manage_shader` is not in the default-on `core` group (if it does not appear, `manage_tools(action: "sync")`, then expect a possible client refresh). `manage_shader` itself has no `list` action — it only reads/creates/updates/deletes a shader by `name`+`path` — so use `manage_shader(action: "read", name: ..., path: ...)` per shader for content inspection
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
1. **Activate the `scripting_ext` group** — `manage_tools(action: "activate", group: "scripting_ext")`. This whole workflow depends on `execute_code`, which is **not** in the default-on `core` group; without the activation it may be absent from the tool list. If it still does not appear, run `manage_tools(action: "sync")` and tell the developer the MCP client may need a refresh or reconnect. Keep generated snippets to C# 6 syntax unless Roslyn is confirmed installed, and leave `safety_checks` at its default `true`
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
| **Tool missing because its group is not active** | A documented tool such as `manage_profiler`, `manage_ui`, `run_tests`, `execute_code` or `manage_shader` is absent from the tool list | Only `core` is enabled by default. Run `manage_tools(action: "list_groups")`, then `manage_tools(action: "sync")` to adopt the Unity Tools-window toggles, then `manage_tools(action: "activate", group: "...")`. Then **refresh or reconnect the MCP client** — many clients cache the tool list, so a successful activation can look like it did nothing. Remember that `list_groups`' `enabled` field reports the group's *default* unless this session has already activated or deactivated it, so do not use it to prove a tool is unavailable |
| **Duplicate Unity MCP server registrations** | Two Unity servers in the IDE's MCP panel, duplicated or oddly prefixed tool names, calls landing on the wrong server | This Power's `mcp.json` and Unity's `Configure All Detected Clients` both write into `~/.kiro/settings/mcp.json` under different names (`unity-mcp` vs `unityMCP`). Pick exactly one path (see [Onboarding](#1-pick-exactly-one-mcp-registration-path)), disable the other entry, restart the IDE |
| **`resources/read` unknown-server error** | Reading `mcpforunity://...` fails with an unknown or ambiguous server key | Some clients need the server discovery key passed alongside the URI. List the resources first and reuse the server key exactly as the client reports it; if two Unity servers are registered, fix that first (row above) |
| MCP tool schema mismatch | "Unknown action" or Pydantic validation error naming valid values | The connected bridge version differs from what this Power expects — trust the error message's list of valid values over this document, and suggest the developer update `com.coplaydev.unity-mcp` to v10.3.0 or newer if core actions seem missing |
| MCP operation timeout | Unity compiling or building | Wait and retry; inform the developer Unity may be busy |
| MCP tool error | Asset path not found, invalid params | Parse error, suggest correct path or parameters |
| Asset operation error | Preset apply failed, file locked | Record failure, continue with remaining assets, report at end |
| Build error | Compilation failed, missing dependency | Parse `read_console` logs and `manage_build(action: "status")`, provide structured error summary |
| Async job stuck/failed | `run_tests`, `manage_build`, or `manage_packages` job never reaches a terminal status | Poll with a reasonable timeout (e.g. `get_test_job(..., wait_timeout: 30)`); if still running after several polls, inform the developer rather than polling indefinitely |
| Workflow error | Step execution failed | Pause workflow, offer Retry / Skip / Abort |
| Template load error | Invalid JSON, file not found | Fall back to built-in template, inform the developer |
