# Unity 6.4 / MCP for Unity compatibility — research & design record

**Task:** update the `kiro-unity-accelerator` Kiro Power so it accurately describes Unity 6.4
and the CoplayDev MCP for Unity bridge. This is a documentation-accuracy product: the Power
teaches an AI agent which MCP tools/actions/params exist. Wrong names or wrong connection
config mean the agent cannot drive Unity — the reported bug.

**All web retrievals in this document were performed 2026-10-21** unless a different date is
given inline. Upstream bridge source/docs were read at git tag `v10.3.0` (and `v9.6.8` /
`v10.0.0` where a version comparison was needed) via the GitHub API.

**Authority order used throughout:**

1. `.agents/tasks/unity-6.4-compat-update/live-verification.md` — observed tool output against
   the user's running Editor on 2026-10-21. Authoritative over everything else.
2. Upstream source code at a pinned tag (`Server/src/**`, `MCPForUnity/Editor/**`).
3. Upstream generated reference docs (`website/docs/reference/**` — generated from the tool
   registry, so they track the code).
4. Upstream prose docs / README (these were found to be stale in two places; see §3.2).

Content from external sources is paraphrased, not quoted at length. *Content was rephrased for
compliance with licensing restrictions.*

---

## 1. Repository state as read (worktree `chore/unity-6.4-compat-update`)

Files read in full: `POWER.md`, `mcp.json`, `package.json`, `CONTRIBUTING.md`, `README.md`,
`hooks/pre-unity-tool.kiro.hook`, `src/mcp-integration.ts`, `src/mcp-health.ts`,
`src/compatibility-check.ts`. All 15 `steering/*.md`, all `templates/**/*.json`, both
`workshop/*.md` and the remaining `src/*.ts` were inventoried by targeted grep for
tool/action/param/version/port strings.

Facts about the repo that the plan depends on:

| Fact | Evidence |
|---|---|
| `steering/` contains **15** files | directory listing; `README.md` says "14 domain knowledge files" (wrong) |
| `POWER.md` has **no YAML frontmatter** | file begins `# Unity Accelerator Power` |
| `tsconfig.json`, `jest.config.ts`, `tests/`, `node_modules/` **do not exist** | `Test-Path` returned False for each |
| `README.md` "Project Structure" lists `tests/`, `tsconfig.json`, `jest.config.ts` | README lines ~255-275 — documents files that are absent |
| `package.json` version `0.1.0`, no runtime deps, scripts call `jest` (not installed) | `package.json` |
| `CONTRIBUTING.md` mandates `npx tsc --noEmit` before submitting | CONTRIBUTING "Project-Specific Guidelines" |
| Node v24.14.0 / npm 11.9.0 available locally | `node --version`, `npm --version` |

**Consequence for verification:** the project's documented build/test commands cannot run in this
repo as it stands. See §9 for the verification commands the implementer must actually use, and
why adding a minimal `tsconfig.json` is in scope.

---

## 2. Unity 6.4 version policy

### 2.1 The release facts

| Claim | Value | Source (retrieved 2026-10-21) |
|---|---|---|
| Unity 6.4 == stream `6000.4` | yes | [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) — opens by naming the release "Unity 6.4 (6000.4)" |
| Unity 6.4 initial release | 18 Mar 2026 | [endoflife.date/unity](https://endoflife.date/unity) (page last updated 16 Oct 2026) |
| **Newest 6000.4.x patch = `6000.4.12f1`** | released 17 Jun 2026 | [endoflife.date/unity](https://endoflife.date/unity); release notes page exists at [6000.4.12f1](https://unity.com/releases/editor/whats-new/6000.4.12f1) |
| `6000.4.13f1` does not exist | HTTP 404 | fetch of `https://unity.com/releases/editor/whats-new/6000.4.13f1` returned 404 |
| 6.4 patch stream has **ended** | security support ended 17 Jun 2026 | [endoflife.date/unity](https://endoflife.date/unity) |
| User's Editor | `6000.4.6f1` | live-verification.md (`Application.unityVersion`) |
| Unity 6.5 | released 15 Jun 2026, support ended 31 Aug 2026, newest `6000.5.11f1` (02 Sep 2026) | [endoflife.date/unity](https://endoflife.date/unity) |
| Unity 6.6 | released 31 Aug 2026, **currently supported**, newest `6000.6.6f1` (15 Oct 2026) | [endoflife.date/unity](https://endoflife.date/unity); [6000.6.6f1 notes](https://unity.com/releases/editor/whats-new/6000.6.6f1) |
| Unity 6.7 | **pre-release (beta)** | [6000.7.0b1 beta page](https://unity.com/releases/editor/beta/6000.7.0b1) |
| Unity 6.3 LTS | supported to Dec 2027; newest `6000.3.26f1` (08 Oct 2026) | [unity.com/releases/](https://unity.com/releases/); [endoflife.date/unity](https://endoflife.date/unity) |
| Unity 6.0 LTS | support ran through Oct 2026 — **ended 16 Oct 2026** | [unity.com/releases/](https://unity.com/releases/); [endoflife.date/unity](https://endoflife.date/unity) |
| Update-release support rule | an Update release is supported until the next release is published; LTS gets two years (three for Enterprise/Industry) | [unity.com/releases/](https://unity.com/releases/) |

So: **6.4 is an Update release whose support window closed when 6.5 shipped.** 6.5 is likewise
closed. 6.6 is the only supported non-LTS stream today, and 6.3 is the current LTS.

### 2.2 Decision: the version policy to apply repo-wide

The user asked for Unity 6.4. Taking that literally while staying truthful about Unity's support
model:

- **Supported baseline / primary target: Unity 6.4 (`6000.4`), pinned patch `6000.4.12f1`.**
  Every place the repo names a Unity version adopts this. Rationale: it is the version the user
  asked for and the version the live verification was performed against, so it is the only
  stream any claim in this repo has been checked on.
- **Minimum supported Editor version: Unity 6.0 (`6000.0`).** Rationale: `manage_build`'s
  `profile`/`profiles` params are documented by the bridge as "Unity 6+ only" (see §4.4), and
  the GPU Resident Drawer / Render Graph guidance throughout `steering/` is Unity 6-era. Below
  6.0 large parts of the Power's advice are simply inapplicable. The *bridge* floor is lower
  (Unity 2021.3 LTS, §3.3) — say so, and say the Power's floor is higher than the bridge's.
- **Forward-compatibility note (one paragraph, reused verbatim across files):** the Power is
  expected to work on 6.5, 6.6 and later 6.x; those streams were **not** live-verified here.
  Unity 6.4 itself no longer receives patches, so a project locking production should move to
  **Unity 6.3 LTS** (supported to Dec 2027) or forward to the current Update release; Unity 6.0
  LTS support ended 16 Oct 2026 and must not be recommended anywhere.
- **Kill the "Unity 6.7 Baseline" section.** `POWER.md:61-63` claims the Power targets Unity 6.7.
  6.7 is beta-only as of 2026-10-21 and the user runs 6.4. Replace the section heading and body
  with "Unity 6.4 Baseline" carrying the three bullets above.
- **Stop citing uncheckable minor versions as fact.** `steering/unity-general.md:111` enumerates
  "6.0, 6.1, ... 6.7+"; lines 115/118/120/121 and `steering/code-quality.md:179`,
  `steering/performance-analysis.md:160`, `steering/build-automation.md:190` attach behaviour to
  6.5/6.6/6.7/6.8 from community threads. Keep the existing (good) "verify against the connected
  project" discipline, but reword so the *baseline* is 6.4 and anything past 6.4 is labelled
  forward-looking and unverified.

### 2.3 Unity 6.4 changes that actually affect this Power

From [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) and
[Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64),
both retrieved 2026-10-21:

| 6.4 change | Repo impact | Files |
|---|---|---|
| **URP Compatibility Mode fully removed** for custom render passes; the `URP_COMPATIBILITY_MODE` scripting define is also removed | Two files currently describe Compatibility Mode as an existing legacy escape hatch / "technical debt toggle". On 6.4 it does not exist. Must be rewritten to "removed in 6.4 — Render Graph is the only path". | `steering/performance-analysis.md:156`, `steering/unity-general.md:116` |
| **`InstanceID` deprecated in favour of a new `EntityId` type**; docs warn against casting to/from `int`, sign-based asset checks, `GetHashCode`, `ToString`+`int.Parse`, and sorting by id for creation order | `find_gameobjects` returns instance IDs and `manage_components`/resources key on them. Add a caveat: treat the id as an opaque token, pass it straight back to the bridge, never arithmetic/sort/parse it. | `POWER.md` (find_gameobjects + resources), `steering/performance-analysis.md:103`, `steering/scene-scaffolding.md`, `steering/unity-general.md:223-229`, `src/scene-batch-config.ts` |
| **Redesigned Rendering Statistics window**: now separates draw calls optimised by SRP Batcher, GPU Resident Drawer, BatchRendererGroup and GPU instancing, and reports more accurate frame times | `manage_graphics(stats_get)` interpretation guidance should say which batching path absorbed the draw calls rather than treating "draw calls" as one number. | `steering/performance-analysis.md`, `POWER.md` Workflow 6 |
| **PVRTC removed** — can no longer be targeted on import; use ASTC or ETC | The repo never names PVRTC (grep: zero hits), so nothing to delete, but the iOS texture guidance should state ASTC-only on 6.4 so an agent never suggests PVRTC. | `steering/asset-automation.md:124`, `templates/platform-profiles/ios.json`, `steering/platform-compatibility.md` |
| **Web: multithreading enabled for Burst-compiled jobs** (`[BurstCompile]` jobs run on background workers; non-Burst jobs stay on the main thread) | Three places flatly say WebGL has no multithreading. That is now too strong. Qualify: no general-purpose threads, but Burst jobs can be multithreaded on 6.4+. | `steering/build-automation.md:182`, `steering/platform-compatibility.md:36`, `templates/platform-profiles/webgl.json:12,18,29,41` |
| Web: Microphone API support; PSO tracing/warming for WebGPU | Minor additions to the WebGL profile notes. | `templates/platform-profiles/webgl.json` |
| **2D: custom render pass can be injected into the URP frame loop** ("Custom rendering and post-processing for 2D in URP") | New capability for 2D projects; both workshops are 2D/URP. Add as a 6.4 capability note. | `steering/performance-analysis.md`, `workshop/2d-platformer-game.md`, `workshop/2d-shooter-game.md` |
| **Project Auditor migrated into the Editor** (no separate package); several analyzer APIs became internal | Code-quality guidance can point at the built-in Project Auditor on 6.4 instead of a package install. | `steering/code-quality.md`, `src/optimization-advisor.ts:344` (currently says "Sprite Atlas Analyzer (Unity 6.3)") |
| **Entities / Collections / Mathematics / Entities Graphics are Core packages** shipping with the Editor | An agent should not try to `add_package` them on 6.4. | `templates/architecture-rules/ecs-pattern.json`, `steering/code-quality.md` |
| **Build Profiles UI**: classic platform list hidden by default in new projects (`Project Settings > Editor > Build Profiles > Hide Classic Platforms`); Platform Browser regrouped | Build guidance that tells a user to pick a classic platform in the Build Profiles window needs the new default called out. | `steering/build-automation.md`, `POWER.md` Workflow 3 |
| **`LightShadowCasterMode` renames**: `NonLightmappedOnly`→`ShadowMask`, `Everything`→`DistanceShadowMask` (auto-updated by the API updater) | Any generated/inspected lighting code. Worth one line in the API-change knowledge base. | `steering/knowledge-management.md` |
| **`Object.Destroy` now invokes `OnDisable` on all descendants** (matches `DestroyImmediate`); manual propagation workarounds now double-fire | Add to the 6.4 API-change list; relevant when the Power generates teardown code. | `steering/knowledge-management.md`, `steering/code-quality.md` |
| **SRP Core → `com.unity.modules.physics` is now a soft dependency**; the module can be disabled to shrink builds, but local Volumes stop working; **`IVolume` removed** → use `VolumeGizmoDrawer` | `manage_graphics(volume_*)` guidance should note the physics-module dependency for local volumes. | `steering/performance-analysis.md`, `POWER.md` `manage_graphics` row |
| **Asset Database artifact dependencies narrowed** — dependents only reimport when the dependency's *import result* changes; some `ScriptedImporter`/`AssetPostprocessor` code needs explicit `DependsOnSourceAsset`/`DependsOnArtifact` | Directly relevant to the dependency-analysis domain. | `steering/asset-dependencies.md`, `steering/asset-automation.md` |
| **Apple platforms**: runtime libs moved to `XcodeFolder/Frameworks/UnityRuntime.framework/UnityRuntime` (static framework for both device and simulator) | Build post-processing scripts that hard-code the old `Libraries/` path break. | `steering/build-automation.md`, `templates/build-configs/ios-release.json` |
| **HoloLens 2 support and plug-in deprecated** → migrate to the OpenXR plug-in | Add to the XR profile alongside the existing OculusXR→OpenXR note. | `templates/platform-profiles/xr.json`, `steering/knowledge-management.md:67-84`, `steering/platform-compatibility.md:129` |
| `[SerializeReference]`: Unity now warns if the assigned class or any ancestor lacks `[Serializable]` | One line in the ScriptableObject/serialization guidance. | `steering/code-quality.md`, `templates/architecture-rules/scriptableobject-pattern.json` |
| Input System package on the user's machine is **1.19.0** (live) and 6.4 adds `OnMouse*` event support to the Input System package as an Input-Manager migration path | The workshops already tell the reader to check `Active Input Handling`; add the 6.4 `OnMouse*` migration note. | `workshop/*.md`, `steering/unity-general.md` |
| URP package on the user's machine is **17.4.0** (live) | Pin "URP 17.4" as the verified pairing for 6.4 rather than the generic "URP 17+". | `steering/performance-analysis.md:156`, `steering/unity-general.md:116` |

---

## 3. The MCP bridge: version decision, transport, install

### 3.1 Release timeline (GitHub API, `repos/CoplayDev/unity-mcp/releases`, retrieved 2026-10-21)

| Tag | Published (UTC) | Pre-release |
|---|---|---|
| `v9.6.8` | 2026-04-27T01:31:00Z | no — **this is what the user has installed** |
| `v9.7.0` | 2026-05-22 | no |
| `v9.7.3` | 2026-06-15 | no |
| `v10.0.0` | 2026-06-30T20:03:19Z | no |
| `v10.0.2` | 2026-07-13 | no |
| `v10.1.0` | 2026-07-13 | no |
| `v10.1.2` | 2026-08-02 | no |
| `v10.2.0` | 2026-09-01 | no |
| **`v10.3.0`** | **2026-10-04T02:52:24Z** | no — **current latest** |

PyPI `mcpforunityserver` latest is likewise **10.3.0**, uploaded 2026-10-04T02:52:47Z, requiring
Python >= 3.10 ([PyPI JSON API](https://pypi.org/pypi/mcpforunityserver/json)). `9.6.8` is also on
PyPI, so the user's pairing is self-consistent.

### 3.2 Reconciling "upstream is v10.0.0" and "48 entrypoints"

`live-verification.md` records upstream as v10.0.0 (2026-06-30), sourced from the upstream README.
That is correct **as a reading of the README**: the README's auto-generated "Recent Updates" block
still lists v10.0.0 as the newest release even in the `v10.3.0` tag itself (verified by reading
`README.md` at `ref=v10.3.0`). The block is stale. The release list in §3.1 is authoritative:
**latest is v10.3.0**. This is an addition to live-verification.md, not a contradiction of it.

Same cause for the tool count. The README prose and the tool-groups guide both say "48 tools"
([tool-groups guide](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/tool-groups.md)),
but the **auto-generated** catalog — produced from the Python `@mcp_for_unity_tool` registry by
`tools/generate_docs_reference.py` — gives exact per-group counts:

| Group | at `v10.0.0` | at `v10.3.0` | live `9.6.8` |
|---|---|---|---|
| `core` | 30 | 30 | 25 + 5 always-visible meta-tools |
| `asset_gen` | 4 | 6 | — (group does not exist) |
| `animation` | 1 | 1 | 1 |
| `docs` | 2 | 2 | 2 |
| `probuilder` | 1 | 1 | 1 |
| `profiling` | 1 | 1 | 1 |
| `scripting_ext` | 2 | 2 | 2 |
| `testing` | 2 | 2 | 2 |
| `ui` | 1 | 1 | 1 |
| `vfx` | 3 | 3 | 3 |
| **total** | **47** | **49** | **43** |

Sources: [tools/index.md @ v10.3.0](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/tools/index.md),
the same file at `ref=v10.0.0`, and live-verification.md for the 43.
The [v10 migration notes](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/migrations/v10.md)
independently state 47 entrypoints across 10 groups for the v10 release, which matches the
generated catalog. **So "48" is prose rounding; 47 (v10.0.0) / 49 (v10.3.0) are the real numbers,
and the 43→47 gap is entirely the four original `asset_gen` tools.**

The 43→49 reconciliation in full:

- 43 live = 25 `core` + 13 non-core + 5 tools the 9.6.8 registry declared with `group=None`
  (always visible): `manage_tools`, `set_active_instance`, `manage_script_capabilities`,
  `debug_request_context`, `execute_custom_tool`. (Live `list_groups` showed `core` with 25 tools
  and 9 groups totalling 38; the remaining 5 of the 43 are exactly the meta-tools, consistent with
  the live server note that `group=None` tools are always visible.)
- At v10.3.0 those 5 meta-tools are listed under `core`, which is why `core` reads 30.
- `+4` = `generate_image`, `generate_model`, `import_model`, `import_model_file` (new in v10.0.0).
- `+2` = `generate_audio`, `blender_bridge` (added between v10.0.0 and v10.3.0).
- **No tool was renamed or removed between 9.6.8 and 10.3.0.** The delta is purely additive.

### 3.3 Decision: target bridge version

**Target `v10.3.0` (the current release) as the documented floor-and-recommended version, written
as "MCP for Unity v10.3.0 or newer (minimum v10.0.0)", and tell users on 9.6.8 to upgrade.**

Reasoning:

- Everything the repo documents today exists unchanged in v10.3.0 — there is no breaking tool
  rename to absorb (§3.2, §5).
- v10.x is the only line receiving releases; 9.6.8 is five months and one major behind.
- The one place where documenting 10.x vs 9.6.8 changes the *text* is `manage_editor`'s telemetry
  actions (§4.1) and the `asset_gen` group (§4.6). Both are additive and both are handled below.
- Targeting v10.3.0 rather than v10.0.0 matters because v10.3.0 is what `#main` resolves to today,
  and `#main` is the install ref the upstream README gives. Documenting v10.0.0 as the target
  while the install instruction pulls v10.3.0 would reintroduce exactly the drift this task is
  fixing. The repo should therefore state the **minimum** (v10.0.0, the first release with the
  group-gated 47-tool surface) and the **verified-current** version (v10.3.0).

### 3.4 Install reference (UPM)

From [getting-started/install.md @ v10.3.0](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/getting-started/install.md)
and the README at the same tag:

| Path | Value |
|---|---|
| Git URL as upstream prints it (**but see the Round-4 correction below**) | `https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main` |
| Pin a release — **this is what the repo now documents** | append a `#v10.3.0` style tag instead of `#main` |
| Beta line | `...#beta` |
| OpenUPM | `openupm add com.coplaydev.unity-mcp` |
| Asset Store | "MCP for Unity" listing, then Package Manager → My Assets |
| Bridge prerequisites | **Unity 2021.3 LTS or newer**; Python 3.10+ with `uv` |

> **REVERSED IN ROUND 4 (§15, E-2).** This section originally concluded that the repo's existing
> `?path=/MCPForUnity#main` URL "is correct — do not change it". That was wrong, and Round 4
> reproduced the failure on a real install: Unity resolves a git UPM dependency **once** and caches
> the resolved commit, so `#main` does not track the branch. The verification machine's manifest
> said `#main` while the resolved package was 9.6.8 and upstream was 10.3.0. The documented install
> ref in `POWER.md` and all five READMEs is now the pinned tag **`#v10.3.0`**, and `#main` is no
> longer offered as an option anywhere. The rest of this section stands: the "pin a tag" and
> OpenUPM alternatives and the Python/`uv` prerequisite were all added as described.

After import the package opens a **setup wizard**; the persistent UI is **Window → MCP for Unity**,
which start/stops the server, switches transport, and reconfigures clients, and whose status panel
reads `Connected`. The repo's "Window → MCP for Unity → Start Server" (POWER.md:84, README step 3,
both workshops) is close but the current docs describe a status panel plus
**Configure All Detected Clients** / **Configure Selected**, and `Window → MCP for Unity → Restart Server`
as the recovery action.

### 3.5 Transport, host, port, path — VERIFIED from source

From [architecture/transports.md @ v10.3.0](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/architecture/transports.md),
`Server/src/main.py`, `Server/src/core/config.py`, `Server/src/cli/utils/config.py` and
`MCPForUnity/Editor/Helpers/HttpEndpointUtility.cs`, all at `v10.3.0`:

| Item | Value | Where it comes from |
|---|---|---|
| Default transport for MCP clients | **HTTP** (streamable HTTP), the mode the Unity UI selects unless you switch it | transports.md names HTTP "(default)" |
| Documented HTTP endpoint | `http://localhost:8080/mcp` | transports.md, install.md, `Server/README.md`, `docs/i18n/README-zh.md`, `.claude/mcp.json` |
| **Unity-side default local base URL** | **`http://127.0.0.1:8080`** | `HttpEndpointUtility.cs`: `DefaultLocalBaseUrl = "http://127.0.0.1:8080"`, persisted in EditorPrefs under `EditorPrefKeys.HttpBaseUrl` |
| Python server env defaults | `UNITY_MCP_HTTP_URL` → `http://127.0.0.1:8080`; `UNITY_MCP_HTTP_HOST` → `localhost`; `UNITY_MCP_HTTP_PORT` → `8080`; `UNITY_MCP_TRANSPORT` → `stdio` | `Server/src/main.py` |
| CLI defaults | host `127.0.0.1`, port `8080`, timeout 30 | `Server/src/cli/utils/config.py`, [reference/cli.md](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/cli.md) |
| Bind address | loopback only (`127.0.0.1` / `::1`); binding `0.0.0.0`/`::` needs **Advanced Settings → Allow LAN Bind (HTTP Local)** | transports.md |
| Remote endpoints | must be `https://`; plaintext remote needs **Allow Insecure Remote HTTP**. Both guards fail closed. | transports.md |
| Unity↔server legacy TCP bridge port | `unity_port = 6400` | `Server/src/core/config.py` |
| `mcp_port` dataclass field | `6500` | `Server/src/core/config.py` — this is the legacy/internal MCP port, **not** the HTTP endpoint port |
| Port is **not** a safe constant | upstream troubleshooting recommends switching to 8090 because 8080 collides with services such as Tailscale; it is editable in MCP for Unity settings and via `UNITY_MCP_HTTP_PORT` | [troubleshooting.md](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/troubleshooting.md) |

**Resolution of the "MCP 6500" claim in the brief:** `6500` is the `mcp_port` field in the server
config dataclass and is not the HTTP endpoint. The HTTP endpoint port is `8080` by default from
both sides (Unity `HttpEndpointUtility` and the Python server). `6400` is the Unity TCP bridge.
The PyPI 9.6.6 description showing `http://localhost:8080/mcp` is consistent.

**Resolution of `127.0.0.1` vs `localhost`:** both are used upstream; the Unity side's own default
is the literal `127.0.0.1`. Since the server binds both loopback families and `localhost` can
resolve to `::1` first on Windows, **`127.0.0.1` is the safer literal** and is what the repo
already has. Keep `127.0.0.1`. Flag `localhost` only as the form upstream docs print.

**Therefore `mcp.json`'s `http://127.0.0.1:8080/mcp` is the correct default URL and must not be
changed.** The URL is not the connection bug. The bug candidates are the *shape* of the file and
the *duplicate registration* — §6.

### 3.6 Decision: how to document the port

Do **not** present `8080` as a constant. Document, in this order:

1. **Primary path — let Unity write the config.** `Window → MCP for Unity` → confirm transport is
   HTTP → **Configure All Detected Clients** (or select Kiro and **Configure Selected**). Kiro is a
   first-class supported client (§6.1), so this writes a correct, port-accurate entry.
2. **Read the real port.** The MCP for Unity window shows the server endpoint/port. If it is not
   8080, the URL is `http://127.0.0.1:<that port>/mcp`.
3. **Manual edit, last.** Give the exact JSON (§6.3) with `8080` as the default and an explicit
   "replace the port with the one shown in the Unity window" instruction.
4. **Port conflict remedy.** Change the port in MCP for Unity settings (upstream suggests 8090),
   then re-run Configure, then restart Kiro.

### 3.7 stdio fallback — the repo's current invocation is wrong

The repo documents (POWER.md:115-133 and all five READMEs):

```json
{ "mcpServers": { "unity-mcp": { "command": "uvx", "args": ["unity-mcp"], "transport": "stdio" } } }
```

Nothing about that is right. The real invocation, from
[transports.md](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/architecture/transports.md) /
[install.md](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/getting-started/install.md)
and confirmed in source (`MCPForUnity/Editor/Helpers/ConfigJsonBuilder.cs` → `BuildUvxArgs`,
`MCPForUnity/Editor/Helpers/AssetPathUtility.cs` → `GetUvxCommandParts`,
`GetMcpServerPackageSource`, `GetBetaServerFromArgsList`):

- PyPI distribution name: **`mcpforunityserver`** (there is no `unity-mcp` PyPI package).
- Console entrypoint executed by `uvx`: **`mcp-for-unity`**.
- `--transport stdio` is a **required argument**, appended by the configurator.
- Documented macOS/Linux form:
  `uvx --from mcpforunityserver mcp-for-unity --transport stdio`
- What the Unity configurator actually writes: `--from mcpforunityserver==<unity-package-version>`
  (a version-pinned `--from`), or `--prerelease explicit --from "mcpforunityserver>=0.0.0a0"` when
  the installed package is a semver pre-release, or `--from <override>` when `GitUrlOverride` is set.
- Windows: the install docs use an absolute `uvx.exe` path, e.g.
  `C:/Users/<you>/AppData/Local/Microsoft/WinGet/Links/uvx.exe`. The upstream FAQ specifically
  recommends pinning the **WinGet Links shim** (`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`) via
  "Choose UV Install Location" because several `uv.exe` copies on PATH cause launch failures and
  config rewrites on every restart. **The user is on Windows — document the Windows form first.**
- The JSON key for the mode is **`type`**, not `transport` (§6.3).
- `set_active_instance` accepts a bare port number **only in stdio mode**; HTTP requires
  `Name@hash` (or an unambiguous hash prefix) — [transports.md], [multi-instance.md].

So the corrected stdio block for Kiro on Windows is:

```json
{
  "mcpServers": {
    "unityMCP": {
      "command": "C:/Users/<you>/AppData/Local/Microsoft/WinGet/Links/uvx.exe",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"],
      "type": "stdio",
      "env": {},
      "disabled": false
    }
  }
}
```

A note the implementer must carry: in **stdio** mode the server enables **all** tool groups at
startup and then syncs from Unity's toggles; in **HTTP** mode it disables non-default groups at
startup and relies on Unity's `register_tools` to re-enable (§4.2). That asymmetry is in
`Server/src/services/tools/__init__.py` and is load-bearing for the troubleshooting text.

---

## 4. Tool groups, `manage_tools`, and enforcement semantics

### 4.1 Groups and defaults — VERIFIED

`Server/src/services/registry/tool_registry.py` @ `v10.3.0` declares:

```
TOOL_GROUPS = { core, docs, vfx, animation, ui, scripting_ext, testing, probuilder, profiling, asset_gen }
DEFAULT_ENABLED_GROUPS = { "core" }
```

and the decorator defaults to `group="core"`. `group=None` means "always visible, cannot be
disabled by the group system" and is used for server meta-tools. The same two constants are present
verbatim at `v9.6.8`, minus `asset_gen`. This matches live-verification.md's 9-group table exactly
and extends it by one group. **Only `core` is enabled by default; all other groups are opt-in** —
stated in both source and the [tool-groups guide](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/tool-groups.md).

`manage_tools` (source: `Server/src/services/tools/manage_tools.py` @ `v10.3.0`):

| Action | Params | Effect |
|---|---|---|
| `list_groups` | — | every group with `name`, `description`, `enabled`, `default_enabled`, `tools`, `tool_count`, plus a note that `group=None` meta-tools are always visible |
| `activate` | `group` (required) | `ctx.enable_components(tags={"group:<g>"}, components={"tool"})` — the group's tools appear in the next tool listing |
| `deactivate` | `group` (required) | `ctx.disable_components(...)` — hides them |
| `sync` | — | pulls the Unity Editor's per-tool toggle states (`Window > MCP for Unity > Tools`) into the session; errors with an "update the MCPForUnity package" message if Unity is too old to answer `get_tool_states` |
| `reset` | — | `ctx.reset_visibility()` → back to `core` only |

`manage_tools` is declared with `unity_target=None, group=None`, so it is always visible and never
reaches Unity. Its docstring states it works on all transports via FastMCP 3.x native per-session
visibility.

**`manage_tools` is entirely absent from `POWER.md` today.** It must be added as a first-class
tool with its five actions and the ten valid group names.

### 4.2 Enforcement semantics — the mechanism, and why the live session saw callable "disabled" tools

**VERIFIED (source-level):** group gating is implemented as **FastMCP component visibility keyed on
a `group:<name>` tag**. The registry docstring says groups "map to FastMCP tags which drive the
per-session visibility system"; `manage_tools` calls `enable_components` / `disable_components` /
`reset_visibility`; the tool-groups guide describes activation as making tools "appear in the next
tool listing". There is no name-based call-time rejection anywhere in `manage_tools`.

**VERIFIED (source-level):** `Server/src/services/tools/__init__.py` → `register_all_tools()`
applies defaults **asymmetrically by transport**:

- **HTTP:** after registration it calls `mcp.disable(tags={"group:<g>"}, components={"tool"})` for
  every non-default group, so a *fresh* session sees only `core` + meta-tools. The in-source
  comment states that Unity then **re-enables groups via `register_tools`
  (`PluginHub._sync_server_tool_visibility`) once it connects**.
- **stdio:** this step is skipped entirely — all groups are enabled at startup, because the legacy
  TCP bridge has no `register_tools` message and disabled groups would otherwise stay invisible for
  the whole session. The server then calls `sync_tool_visibility_from_unity()`, which asks Unity for
  `get_tool_states`, filters to `enabled: true`, and feeds that into
  `PluginHub._sync_server_tool_visibility`.

**This explains the live observation without contradicting it.** live-verification.md records that
`manage_tools(list_groups)` reported 8 groups as `enabled: false` while `manage_profiler`,
`manage_ui` and `execute_code` all executed. Reading `_list_groups`, the `enabled` field is computed
as: use the session's visibility rules if any rule tagged `group:<name>` exists, **otherwise fall
back to `name in DEFAULT_ENABLED_GROUPS`**. If no per-session `activate`/`deactivate` had been
issued, `list_groups` reports the *defaults* regardless of what server-level visibility Unity's
`register_tools` sync had already set. So a session can legitimately show
`enabled: false, default_enabled: false` for a group whose tools are visible and callable because
the Unity Editor had them toggled on.

**Conclusions to write into the docs:**

- **VERIFIED:** the gate is a tool-*listing* filter (FastMCP component visibility), per session,
  with a server-level default applied only on HTTP. `core` is the only default-on group.
- **VERIFIED:** `manage_tools(list_groups)`'s `enabled` field reports the session rule if one exists
  and otherwise reports the *default*, so it is **not** a reliable readout of actual visibility
  after Unity's toggle sync. Say this explicitly; it is the single most confusing behaviour here.
  **Round-2 addition:** it reported `enabled: false` for all eight non-core groups both before and
  after `reset` while those tools were demonstrably callable, so the field is simply misleading.
- ~~**UNVERIFIED:** whether invoking a tool whose group is currently hidden returns an unknown-tool
  error rather than executing.~~ **RESOLVED IN ROUND 2 — VERIFIED:** deactivation *is* enforced.
  After `manage_tools(deactivate, group:"profiling")`, `manage_profiler` returned
  `Tool 'manage_profiler' does not exist on server 'power-kiro-unity-accelerator-unity-mcp'`.
  What is now also VERIFIED, and points the other way, is that the **default** session exposed all
  43 tools with no activation at all — so "the group is off" was *not* why anything failed here.
- **Do not present "tool group not enabled" as THE root cause.** It is a ranked candidate (§8),
  and on the verified install it was **not** the cause. Round 2 demotes group activation from a
  required preamble to **conditional troubleshooting** — run it only when a tool is actually
  reported as not existing (§Round 2, C-3).

**Recovery path to document regardless (safe in all cases):**

```
manage_tools(action: "list_groups")          # see the catalog
manage_tools(action: "sync")                 # adopt the Unity Tools-window toggles
manage_tools(action: "activate", group: "…") # enable what this workflow needs
manage_tools(action: "reset")                # back to core-only
```

Plus the client-side half, from the [v10 migration notes](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/migrations/v10.md):
some MCP clients **cache the tool list** until the server is restarted or refreshed, so after
activating a group the client may need a refresh/reconnect. That is a real and separately
documented failure mode.

### 4.3 Workflows in this repo that depend on default-OFF groups

> **ROUND-2 CORRECTION to this whole table.** Every "prepend an activate step" fix below is
> superseded. On the verified install all 43 tools were callable with no activation, so the right
> shape is **conditional**: call the tool, and activate its group only if the tool is reported as
> not existing. Read "prepend an activate step" as "name the owning group so a *missing* tool can
> be diagnosed". The `templates/workflows/test-execution.json` activation step was accordingly
> moved out of `steps` into a `conditionalRecoverySteps` field, and the workshops' mandatory
> "Step 0 — enable the tool groups" block was replaced by a connection check plus conditional
> recovery. See §Round 2, C-3.

| Repo location | Tool used | Group | Fix |
|---|---|---|---|
| `POWER.md` Connection Health Check (line ~140) | `execute_code` as a health probe | `scripting_ext` (off) | **Make `manage_scene(action:"get_active")` the only health probe.** Drop `execute_code` from the health check entirely. Same fix in `steering/unity-general.md:136`. |
| `POWER.md` Workflow 4, `steering/cross-platform-testing.md`, `templates/workflows/test-execution.json` | `run_tests`, `get_test_job` | `testing` (off) | prepend an "activate `testing`" step |
| `POWER.md` Workflow 6, `steering/performance-analysis.md` | `manage_profiler` | `profiling` (off) | prepend an "activate `profiling`" step |
| `POWER.md` Workflow 2, `steering/scene-scaffolding.md`, all 5 `templates/scaffolds/*.json` | `manage_ui` | `ui` (off) | prepend an "activate `ui`" step (only when UI Toolkit elements are requested) |
| `POWER.md` Workflow 7 step 1, `steering/code-quality.md:11,58`, `steering/knowledge-management.md:26`, `steering/asset-dependencies.md`, `steering/platform-compatibility.md`, `steering/build-automation.md`, `steering/unity-general.md` | `execute_code` | `scripting_ext` (off) | where a resource can replace it, use the resource (§5.3); otherwise prepend an "activate `scripting_ext`" step |
| `POWER.md` "confirm an API exists via `unity_reflect`" | `unity_reflect`, `unity_docs` | `docs` (off) | prepend an "activate `docs`" step |
| `steering/platform-compatibility.md`, `steering/build-automation.md` | `manage_shader` | `vfx` (off) | prepend an "activate `vfx`" step |
| `templates/platform-profiles/*.json` note fields | `manage_packages` | `core` ✓ | no group step needed |
| both `workshop/*.md` | prompt-driven; an agent following them will reach `manage_ui` / `execute_code` / `run_tests` | `ui`, `scripting_ext`, `testing` | add a "Step 0 — enable the tool groups this workshop needs" block with the literal `manage_tools` calls |

### 4.4 `manage_build` — verified parameter surface

From [reference/tools/core/manage_build.md @ v10.3.0](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/tools/core/manage_build.md):

- Actions: `build, status, platform, settings, scenes, profiles, batch, cancel` — matches `POWER.md`.
- `target` values: `windows64, osx, linux64, android, ios, webgl, uwp, tvos, visionos` — **exactly
  the list already in `POWER.md:…` Workflow 3. VERIFIED CORRECT; do not change it.** Note this is
  the *bridge's* alias list, not Unity's full `BuildTarget` enum; say so, and point at
  `manage_build(action:"platform")` to read the live target (which returned
  `StandaloneWindows64` / `Standalone` / `Player` on the user's machine).
- `property` (for `action:"settings"`) accepted values: `product_name, company_name, version,
  bundle_id, scripting_backend, defines, architecture`; `value` sets it, omitting `value` reads it.
  ~~Live-verification proved Unity rejects `settings` without `property`.~~ **ROUND-2 CORRECTION:
  that rejection came through `batch_execute`, which is not equivalent to a direct call, and
  `manage_build` is permission-denied on this machine — so "`property` is required" is UNVERIFIED,
  not proven (§Round 2, C-6).** `POWER.md` should still document `property`/`value` as the shape to
  use, but must not assert the requirement.
- `scripting_backend` accepts **`mono` or `il2cpp` only** (documented as a persistent change).
  **There is no `coreclr` option.** This bounds the CoreCLR discussion in
  `steering/build-automation.md:190`, `steering/code-quality.md:179`,
  `steering/performance-analysis.md:160`, `steering/unity-general.md:118`: whatever the Editor enum
  contains, the Power cannot select CoreCLR through `manage_build`. Say that.
- `options` accepts a JSON array from: `clean_build, auto_run, deep_profiling, compress_lz4,
  strict_mode, detailed_report`. **Not documented in the repo at all** — the four
  `templates/build-configs/*.json` encode build options in their own vocabulary and should map to
  these names.
- `subtarget`: `player` or `server`. `profile`/`profiles`: Build Profile asset paths, "Unity 6+ only".
  `targets`/`output_dir` for batch. `job_id` for status/cancel.

### 4.5 `batch_execute` — verified

Command key is **`params`** (confirmed by both live and the generated reference), supports
`parallel`, `fail_fast`, `max_parallelism`. Two additions the repo lacks:

- **`fail_fast` defaults to `true`** per the reference doc's examples section. live-verification
  confirmed `fail_fast: false` is honoured when passed. `POWER.md` should state the default, because
  Workflow 1's "record the failure and continue" semantics require `fail_fast: false` explicitly.
- Batch size: configurable in the Unity MCP Tools window, **default 25, hard max 100** (identical
  wording in the live tool description and the generated doc). Workflow 1 and Workflow 2 both
  generate N-command batches with no mention of the cap.
- The reference examples use `search_method: "by_name"` on `manage_material`
  (`assign_material_to_renderer`) too — the `by_*` prefix is not unique to `find_gameobjects`.
- **ROUND-2 ADDITION, VERIFIED and load-bearing:** `batch_execute` forwards commands straight to
  Unity's C# handler and **bypasses action handlers implemented in the Python server layer**. A
  server-layer action therefore fails inside a batch with `Unknown action: '...'` even though the
  direct call succeeds — reproduced deterministically with `manage_editor`'s `telemetry_status` and
  `telemetry_ping`, where the batch-path error listed only the 12 Unity-side actions. Consequences
  the docs must carry: server-layer actions are called directly and never batched; an
  `Unknown action` error from inside a batch is **not** evidence the action does not exist; and the
  "a live Unknown-action/Pydantic error outranks the doc" rule applies to **direct calls only**.
  Only these two actions are established as server-layer — there is no enumerated catalog, so do
  not present a broader list. See §Round 2, C-2.

### 4.6 `asset_gen` (new in v10.0.0) — scope decision

From the [v10 migration notes](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/migrations/v10.md)
and the generated `asset_gen` index: `generate_model` (Tripo/Meshy), `generate_image`
(fal.ai/OpenRouter), `generate_audio` (fal.ai), `import_model` (Sketchfab), `import_model_file`
(local FBX/OBJ/glTF), `blender_bridge` (socket to a BlenderMCP-connected Blender, default
`127.0.0.1:9876`, configured under Window > MCP for Unity > Generative > Blender Bridge).
Bring-your-own-key; keys live in the Unity Editor's Asset Gen tab and are stored in the OS secure
store (Keychain / Windows Credential Manager / libsecret), never in MCP params or project assets.
Async job semantics: the call returns a `job_id`, poll with `action:"status"`. GLB/glTF import needs
**glTFast**; FBX does not.

**Decision: document the `asset_gen` group's existence, names, default-off status, async pattern and
BYO-key/cost caveat in one short `POWER.md` subsection — and do not build any workflow on it.**
Reasoning: it is six real entrypoints an agent will see once the group is activated, so omitting it
repeats the `manage_tools` mistake; but it spends the user's third-party API credits, so this Power
should never route to it implicitly. No steering file, template or workflow should reference it.

---

## 5. Per-tool reconciliation — POWER.md vs live 9.6.8 vs v10.3.0

Column meanings: **POWER.md** = what the repo says today. **Live 9.6.8** = observed in
live-verification.md. **v10.3.0** = the generated reference at
`https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/tools/<group>/<tool>.md`
plus the Python source under `Server/src/services/tools/`, both retrieved 2026-10-21.

Every tool name below exists in v10.3.0. **Nothing in this table is a rename or removal between
9.6.8 and 10.3.0** — the only version-dependent row is `manage_editor`.

### 5.1 The 49 tools of v10.3.0, by group

| Group | Default | Tools |
|---|---|---|
| `core` (30) | **on** | `apply_text_edits`, `batch_execute`, `create_script`, `debug_request_context`, `delete_script`, `execute_custom_tool`, `execute_menu_item`, `find_gameobjects`, `find_in_file`, `get_sha`, `manage_asset`, `manage_build`, `manage_camera`, `manage_components`, `manage_editor`, `manage_gameobject`, `manage_graphics`, `manage_material`, `manage_packages`, `manage_physics`, `manage_prefabs`, `manage_scene`, `manage_script`, `manage_script_capabilities`, `manage_tools`, `read_console`, `refresh_unity`, `script_apply_edits`, `set_active_instance`, `validate_script` |
| `animation` (1) | off | `manage_animation` |
| `asset_gen` (6) | off | `blender_bridge`, `generate_audio`, `generate_image`, `generate_model`, `import_model`, `import_model_file` |
| `docs` (2) | off | `unity_docs`, `unity_reflect` |
| `probuilder` (1) | off | `manage_probuilder` (needs `com.unity.probuilder`) |
| `profiling` (1) | off | `manage_profiler` |
| `scripting_ext` (2) | off | `execute_code`, `manage_scriptable_object` |
| `testing` (2) | off | `get_test_job`, `run_tests` |
| `ui` (1) | off | `manage_ui` |
| `vfx` (3) | off | `manage_shader`, `manage_texture`, `manage_vfx` |

### 5.2 Corrections table

| # | Tool | POWER.md today | Live 9.6.8 | v10.3.0 | Verdict / required edit |
|---|---|---|---|---|---|
| C1 | `manage_editor` | lists read-only `telemetry_status`, `telemetry_ping` | **CORRECTED IN ROUND 2 — this row's "Live 9.6.8" column was wrong.** The `Unknown action: 'telemetry_status'` rejection came from a call made *inside* `batch_execute`. Round-2 **direct** calls both SUCCEED: `telemetry_status` → `{"success":true,"telemetry_enabled":true}`, `telemetry_ping` → `{"success":true,"message":"telemetry ping queued"}` | `action` Literal **does include** `telemetry_status`/`telemetry_ping`, and `Server/src/services/tools/manage_editor.py` short-circuits them in Python before contacting Unity, returning `{success, telemetry_enabled}` / `{success, "telemetry ping queued"}`. The same short-circuit is present at `v9.6.8` and as far back as `v9.0.0`. | **NOT A CORRECTION — POWER.md's original wording was right.** `telemetry_status` / `telemetry_ping` are real, working read-only actions of `manage_editor`; restore them to the read-only list. The accurate caveats are (a) they report nothing about Editor state or compilation, so they are not a readiness probe (use `mcpforunity://editor/state`), and (b) being server-layer actions they **must be called directly — inside `batch_execute` they fail with a misleading `Unknown action`** (§Round 2, C-2). Keep the "`manage_editor` has no build action, use `manage_build`" and "prefab stage lives in `manage_prefabs`" notes. Params: `tool_name`, `tag_name`, `layer_name` (all optional). |
| C2 | MCP resources | "Do not assume other resource URIs exist (e.g. a `project_info` or `editor_state` resource)"; "current selection: not directly exposed" | the `manage_editor` error directed callers to resources for editor state, project info, tags, layers, selection, windows, prefab stage and active tool | the generated [resource reference](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/resources/index.md) lists **24 resources** including `mcpforunity://project/info`, `mcpforunity://editor/state`, `mcpforunity://editor/selection`, `mcpforunity://project/tags`, `mcpforunity://project/layers`, `mcpforunity://editor/windows`, `mcpforunity://editor/prefab-stage`, `mcpforunity://editor/active-tool` | **The warning is actively wrong and must be deleted.** Replace with the full table in §5.3. Same deletion in `steering/unity-general.md:223`. |
| C3 | `find_gameobjects.search_method` | `name/tag/layer/component/path` | Unity rejected `"name"`, requiring `by_name, by_tag, by_layer, by_component, by_path, by_id` | `Literal['by_name','by_tag','by_layer','by_component','by_path','by_id']` | **POWER.md's parameter table is wrong; its own Workflow 2/6 examples are right.** Use the `by_*` names everywhere, and add `by_id`. |
| C4 | `find_gameobjects.search_method` requiredness | "both `search_term` and `search_method` are required" | schema: `search_term` required, `search_method` optional | `search_term` required; `search_method`, `include_inactive`, `page_size`, `cursor` optional | Fix the sentence: only `search_term` is required. Keep "no `filter` param" (VERIFIED — no such param in the schema). |
| C5 | `manage_build(action:"settings")` | bare action | **DOWNGRADED TO UNVERIFIED IN ROUND 2.** `'property' parameter is required.` was observed only through `batch_execute`, which Round 2 proved is not equivalent to a direct call; and `manage_build` cannot be called directly on this machine because an IDE permission rule denies it (§Round 2, C-5). So the direct-call contract is unconfirmed | `property` ∈ {`product_name, company_name, version, bundle_id, scripting_backend, defines, architecture`}, `value` to write / omit to read (documentation-derived) | Document `property` + `value` as the shape to use, but **do not assert that a bare `settings` call is rejected** — label it UNVERIFIED until someone with `manage_build` permitted retests it directly. See §4.4 and §Round 2, C-6. |
| C6 | `unity_reflect` | — (POWER.md lists actions only) / repo elsewhere | `type_name` rejected: *Unexpected keyword argument*. Real: `get_type`→`class_name`; `get_member`→`class_name`+`member_name`; `search`→`query`, optional `scope` | same tool, group `docs` | Use **`class_name`**. `unity_docs`: `get_doc`→`class_name`, optional `member_name`, `version`. Repo grep found zero `type_name` occurrences, so this is a "don't regress" item plus an addition to the param tables. |
| C7 | `batch_execute` limits | not mentioned | "configurable in the Unity MCP Tools window (default 25, hard max 100)" | identical wording in the generated doc | Add the cap, and add that `fail_fast` defaults to `true`. |
| C8 | `execute_code` params | `execute/get_history/replay/clear_history`, `compiler` caveat | undocumented `safety_checks` (default `true`) | `action` Literal (4 values); `code`; **`safety_checks: bool`, default true**, blocks patterns such as `File.Delete` / `Process.Start` / infinite loops and is explicitly *not a full sandbox*; `index` (replay); `limit` 1-50 default 10 (get_history); `compiler` ∈ `auto`/`roslyn`/`codedom` | Add `safety_checks`, `index`, `limit`. **Keep the Roslyn/codedom C# 6 caveat — live-verified load-bearing on this machine** (`"compiler":"codedom"` under default `auto`). Add the one-click Roslyn install path (§7.4). |
| K1 | `manage_asset` | no `list` action; use `search` with `path`+`search_pattern` | confirmed; also **`path` is required** | `action` Literal `import, create, modify, delete, duplicate, move, rename, search, get_info, create_folder, get_components`; **`path` required**; `asset_type` (required for create); `properties`; `destination`; `generate_preview` (default false, warns about large base64); `search_pattern` (supports AssetDatabase filters like `t:MonoScript`); `filter_type`; `filter_date_after`; **`page_size` / `page_number` (1-based)** | **KEEP AS-IS**, and add: `path` required, `page_size`/`page_number` paging (note: *not* `cursor`), keep `generate_preview` false, and that `search_pattern` takes `t:` filters. |
| K2 | `batch_execute` per-command key | `params`, not `args` | confirmed working | `commands: list[dict]` with `tool` and `params` keys | **KEEP.** |
| K3 | `manage_graphics` | `stats_get` / `stats_list_counters` / `pipeline_get_info` …; "no `get_settings` or `get_rendering_stats`" | all three verified working | same tool; description covers volumes, post-processing, light baking, rendering stats, pipeline settings, URP renderer features | **KEEP** the whole action-prefix table. Add the 6.4 Rendering-Statistics-window note (§2.3) and the SRP-Core/physics dependency note for `volume_*`. |
| K4 | `manage_packages` async | returns `{job_id}` with `_mcp_status: "pending"`, poll `action:"status"` | confirmed (`_mcp_poll_interval: 1.0`) | same | **KEEP.** Fix `templates/platform-profiles/xr.json:39` which says `manage_packages(action: 'list')` — the action is **`list_packages`**. |
| K5 | `run_tests` / `get_test_job` async | returns `{job_id}`, poll with `wait_timeout`; no `platform` filter | not exercised end-to-end | same tools, group `testing` | **KEEP.** Add: `get_test_job` may report `progress.stuck_suspected` / `progress.focus_nudge_status` and the server may briefly focus Unity during a stalled run (disable with `UNITY_MCP_DISABLE_FOCUS_NUDGE=1` on the Python server) — [troubleshooting.md]. Mark end-to-end behaviour UNVERIFIED here. |
| K6 | builds go through `manage_build` | yes | confirmed by `manage_editor`'s own action list | `manage_build` is the build tool | **KEEP.** And fix the four `templates/build-configs/*.json`, which set `"primaryTool": "manage_editor"` — a hard bug (§5.5). |
| K7 | `find_gameobjects` returns instance IDs only, paginated | yes | `{instanceIDs, pageSize, cursor, nextCursor, totalCount, hasMore}` | same; description tells you to follow up with `mcpforunity://scene/gameobject/{id}` | **KEEP.** Add the Unity 6.4 `EntityId` caveat (§2.3): treat the id as opaque. |
| K8 | `manage_ui` actions | `ping, read, get_visual_tree, list, create, update, delete, attach_ui_document, detach_ui_document, create_panel_settings, update_panel_settings, modify_visual_element, render_ui, link_stylesheet` | live description confirms all 14 | group `ui` (off by default) | **KEEP**, add the group-activation prerequisite. |
| K9 | `manage_camera` actions | 18 actions incl. `screenshot_multiview`, presets, works with/without Cinemachine | `list_cameras`, `ping` verified | same | **KEEP.** Cinemachine-specific paths remain **UNVERIFIED** (package absent on the user's machine); add the `mcpforunity://scene/cameras` resource as the read path. |
| K10 | `manage_physics` | `ping, get_settings, set_settings`, collision matrix, materials, joints, raycasts, `apply_force`, `simulate_step`, `validate`; `dimension` param | `get_settings` verified | same | **KEEP.** |
| K11 | `manage_prefabs` | `get_info, get_hierarchy, create_from_gameobject, modify_contents, open_prefab_stage, save_prefab_stage, close_prefab_stage` | — | same; `manage_editor` error confirms prefab-stage ops belong here | **KEEP.** Add the `mcpforunity://prefab/{encoded_path}` and `.../hierarchy` resources. |
| K12 | `manage_scene` | read-only `get_hierarchy, get_active, get_build_settings, get_loaded_scenes, scene_view_frame`; modifying `create, load, save, close_scene, set_active_scene, move_to_scene, validate`; no `list` | `get_active`, `get_hierarchy`, `get_build_settings` verified | same | **KEEP.** `manage_scene(action:"get_active")` becomes the sole health probe (§4.3). |
| K13 | script tools | `create_script`/`delete_script`/`validate_script`/`get_sha`; `apply_text_edits`/`script_apply_edits`; `manage_script` legacy `create/read/delete` only | — | all present in `core`; `uri` accepts `Assets/...`, `mcpforunity://path/Assets/...` or `file://...`; `apply_text_edits` takes `edits:[{startLine,startCol,endLine,endCol,newText}]` 1-indexed plus `precondition_sha256`, `strict`; `validate_script` takes `level` ∈ `basic`/`standard` and `include_diagnostics` | **KEEP**, add the `uri` forms, the 1-indexed edit shape, `precondition_sha256`, and `validate_script`'s `level`. Note `manage_script(action:"read")` requires `name` + `path`-as-folder (as POWER.md Workflow 7 already says). |
| K14 | `refresh_unity` | params `mode, scope, compile, wait_for_ready` | — | present in `core`; "request a Unity asset database refresh and optionally a script compilation" | **KEEP.** |
| K15 | `read_console` | `get` (default) / `clear`, `filter_text`, `types`, `page_size`/`cursor` | `get` verified | present in `core` | **KEEP.** |
| N1 | `manage_tools` | **absent** | present, 5 actions, 9 groups | present, 5 actions, **10 groups** | **ADD** (§4.1). |
| N2 | `execute_menu_item` | **absent** | `menu_path` param | `core` | **ADD.** Pair with the `mcpforunity://menu-items` resource for discovery. |
| N3 | `execute_custom_tool` | **absent** | `tool_name` (required), `parameters` | `core` | **ADD.** Pair with `mcpforunity://custom-tools`. Note the server can be started with project-scoped tools disabled, in which case this tool is not registered at all. |
| N4 | `set_active_instance` | **absent** | `instance` (required): `Name@hash`, hash prefix, or port number (stdio only) | `core`; [multi-instance guide](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/multi-instance.md): `Name` = Player Settings `productName`, `hash` = stable 8-char hash of the project path; discover via `mcpforunity://instances`; a per-call `unity_instance` arg routes one call without changing the session default | **ADD**, with the HTTP-vs-stdio difference from §3.7. |
| N5 | `manage_script_capabilities` | **absent** | no params; returns `ops`, `text_ops`, `max_edit_payload_bytes`, `guards` | `core` | **ADD** — it is the right way to discover the edit-payload ceiling before a large `apply_text_edits`. |
| N6 | `find_in_file` | mentioned only in passing | `uri` (required), `pattern` (required), `project_root`, `max_results`, `ignore_case` | `core` | **PROMOTE** to a documented tool. |
| N7 | `debug_request_context` | **absent** | no params; returns FastMCP `client_id`, `session_id`, meta dump | `core` | **ADD** as a diagnostic (useful when a client reports the wrong server key). |
| N8 | `asset_gen` group (6 tools) | **absent** | group absent at 9.6.8 | present, off by default | **ADD** as a short awareness subsection only (§4.6). |

### 5.3 MCP resources — the authoritative list to put in POWER.md

All 24, from the generated [resource reference](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/resources/index.md)
(retrieved 2026-10-21). Resources are read-only; tools mutate.

| URI | What it returns |
|---|---|
| `mcpforunity://project/info` | static project info: root path, Unity version, platform |
| `mcpforunity://editor/state` | **canonical editor-readiness snapshot, including `advice` and server-computed staleness** |
| `mcpforunity://editor/selection` | current selection (GameObjects, assets) with properties |
| `mcpforunity://editor/windows` | open editor windows: titles, types, positions, focus |
| `mcpforunity://editor/active-tool` | active editor tool and transform-handle settings |
| `mcpforunity://editor/prefab-stage` | prefab isolation context, `isOpen=false` when none |
| `mcpforunity://project/tags` | all project tags — read before `add_tag`/`remove_tag` |
| `mcpforunity://project/layers` | all layers with indices 0-31 — read before `add_layer`/`remove_layer` |
| `mcpforunity://scene/gameobject/{instance_id}` | one GameObject: name, tag, layer, active, transform, parent/children ids, component type list |
| `mcpforunity://scene/gameobject/{instance_id}/components` | all components with full property serialization; `page_size`, `cursor`, `include_properties` |
| `mcpforunity://scene/gameobject/{instance_id}/component/{component_name}` | one fully serialized component |
| `mcpforunity://scene/gameobject-api` | usage doc for the GameObject resource family |
| `mcpforunity://scene/cameras` | all cameras incl. Cinemachine priorities, Brain state, follow/lookAt |
| `mcpforunity://scene/volumes` | all Volume components with profiles, effects, settings |
| `mcpforunity://rendering/stats` | rendering stats snapshot: draw calls, batches, triangles, frame time |
| `mcpforunity://pipeline/renderer-features` | URP renderer features on the active renderer: type, name, active |
| `mcpforunity://prefab/{encoded_path}` | prefab asset info: type, root name, component types, child count, variant info |
| `mcpforunity://prefab/{encoded_path}/hierarchy` | full prefab hierarchy with nesting depth |
| `mcpforunity://prefab-api` | usage doc for the prefab resource family |
| `mcpforunity://tests` | first page of Unity tests (default 50) |
| `mcpforunity://tests/{mode}` | first page for `EditMode` or `PlayMode` |
| `mcpforunity://menu-items` | all menu items (pairs with `execute_menu_item`) |
| `mcpforunity://custom-tools` | custom tools available for the active project |
| `mcpforunity://tool-groups` | the group catalog (pairs with `manage_tools`) |
| `mcpforunity://instances` | all connected Unity Editor instances (pairs with `set_active_instance`) |

Two non-resource URI facts to keep:

- `mcpforunity://path/Assets/...` is a **URI form for the script tools' `uri` parameter**, not a
  resource. POWER.md:229 is therefore correct; keep it but label it as a parameter form, not a
  resource. Source: `Server/src/services/tools/manage_script.py` and `find_in_file.py` both strip
  the `mcpforunity://path/` prefix; the `get_sha`/`delete_script`/`validate_script`/`apply_text_edits`
  reference docs all list the three accepted forms.
- Some clients want the server discovery key supplied separately on `resources/read`. Upstream
  documents this for Codex (`server: "unityMCP"`, `uri: "mcpforunity://custom-tools"`) and advises
  listing resources first and using the key exactly as returned — [troubleshooting.md]. Worth one
  line, because this repo's `mcp.json` names the server `unity-mcp` while the upstream configurator
  names it `unityMCP` (§6.2).

**Direct consequence for `src/`:** `mcpforunity://editor/state` is described as the canonical
readiness snapshot *including an `advice` block*, and `src/mcp-integration.ts:isUnityCompiling()`
already looks for `advice.ready_for_tools === false` — it is reading the right field from the wrong
place (it calls `manage_editor(telemetry_status)`). The fix is to read this resource. See §5.5.

### 5.4 POWER.md claims that are CORRECT and must survive the edit

Do not "clean up" any of these — each was live-proven or source-confirmed:
`manage_asset` has no `list` action and requires `path`; `batch_execute` uses `params` not `args`;
`manage_graphics` uses `stats_get`/`stats_list_counters`/`pipeline_get_info` and has no
`get_settings`/`get_rendering_stats`; `manage_packages` and `run_tests`/`get_test_job` are async
job/poll APIs; builds go through `manage_build` and `manage_editor` has no build action;
`find_gameobjects` returns instance IDs only and is paginated; `manage_shader` and `manage_scene`
have no `list` action; `manage_script` is a legacy `create/read/delete` router with no `list`;
the Roslyn/codedom C# 6 caveat on `execute_code`; the `windows64…visionos` build-target list;
`manage_asset` has no `get_dependencies` action (Workflow 10's `AssetDatabase.GetDependencies` via
`execute_code` is the right workaround — but it now needs a `scripting_ext` activation step).

### 5.5 `src/*.ts` corrections

| File | Problem | Fix |
|---|---|---|
| `src/mcp-health.ts:124` | reads `unity://project_info` — **wrong scheme and wrong path**; no `unity://` scheme exists | `mcpforunity://project/info` |
| `src/mcp-health.ts:4,100` | doc comments say "the `project_info` resource" | update to the real URI |
| `src/mcp-health.ts:75` | hard-codes "localhost:8080" in the Host-Unreachable hint | parameterise from the checked `serverUrl`, or reword to "the configured port (default 8080, shown in the MCP for Unity window)" |
| `src/mcp-health.ts:56-62` | "Open Window > MCP for Unity > Start Server" | current UI wording: Window → MCP for Unity, status panel reads `Connected`; recovery is Restart Server |
| `src/mcp-integration.ts:67-85` | `isUnityCompiling()` calls `manage_editor(action:'telemetry_status')`, which returns only `{success, telemetry_enabled}` — it can never report compilation state | read `mcpforunity://editor/state` and inspect `advice.ready_for_tools` (the field the code already looks for) |
| `src/mcp-integration.ts:113-120` | `refreshUnityEditor()` calls `manage_editor(action:'play')` **before** `refresh_unity` — this **enters Play Mode**, contradicting POWER.md's "never make permanent scene changes while in Play Mode" rule | delete the `manage_editor(play)` call; call `refresh_unity` only |
| `src/mcp-integration.ts` / `src/types.ts` / `src/scene-batch-config.ts` | internal `McpToolCall` uses an `args` key while the wire format is `params` | rename to `params` for consistency with the documented protocol (internal-only, but the mismatch is exactly the confusion this task exists to remove) |
| `src/optimization-advisor.ts:344` | "Use Sprite Atlas Analyzer (Unity 6.3)" | on 6.4 the Project Auditor ships in the Editor; reword without the 6.3 pin |
| `src/compatibility-check.ts` | no versions, ports or tool names | **no change needed** |

---

## 6. Kiro-side packaging: Power format, `mcp.json`, and the hook

### 6.1 Kiro is a first-class MCP for Unity client — VERIFIED

`MCPForUnity/Editor/Clients/Configurators/KiroConfigurator.cs` @ `v10.3.0` exists and is
auto-discovered by `McpClientRegistry`. It declares:

| Field | Value |
|---|---|
| `name` | `Kiro` |
| config path (Windows/mac/Linux) | `<UserProfile>/.kiro/settings/mcp.json` |
| `EnsureEnvObject` | `true` → an empty `"env": {}` is written |
| `DefaultUnityFields` | `{ "disabled": false }` |

Its installation steps tell the user to open Kiro → File > Settings > Settings → search "MCP" →
Open Workspace MCP Config, or edit the file at that path.

`MCPForUnity/Editor/Helpers/ConfigJsonBuilder.cs` → `PopulateUnityNode()` shows exactly what gets
written. The server key is the literal **`unityMCP`**, under `mcpServers` (or `servers` for VS Code
layout). HTTP mode writes `url` = `HttpEndpointUtility.GetMcpRpcUrl()` and `"type": "http"`, and
removes any stale `command`/`args`/`serverUrl`/`headers`. stdio mode writes `command` + `args`
(§3.7) and `"type": "stdio"`, removing `url`/`serverUrl`. `headers` carrying the API-key header are
added only in remote-hosted scope.

So the Kiro entry the auto-configurator produces is:

```json
{
  "mcpServers": {
    "unityMCP": {
      "url": "http://127.0.0.1:8080/mcp",
      "type": "http",
      "env": {},
      "disabled": false
    }
  }
}
```

### 6.2 How that interacts with this repo's `mcp.json` — the collision

From [kiro.dev/docs/powers/installation](https://kiro.dev/docs/powers/installation/) (retrieved
2026-10-21): there are two Power formats — **Agent Plugins (`plugin.json`)**, whose MCP servers Kiro
manages internally and does *not* add to `~/.kiro/settings/mcp.json`, and **Legacy (`POWER.md`)**,
whose MCP servers **are registered in `~/.kiro/settings/mcp.json` under the Powers section**. Kiro
namespaces power server names to avoid conflicts. Every power must have a valid `plugin.json` or
`POWER.md` at its package root.

This repo is a **Legacy POWER.md power**. Therefore:

- The Power's `mcp.json` **is** read and its `unity-mcp` server gets registered into
  `~/.kiro/settings/mcp.json` under the Powers section, namespaced.
- The MCP for Unity auto-configurator writes `unityMCP` into the **same file**, outside that section.
- A user who follows both the README (install the Power) *and* the upstream quickstart (Configure
  All Detected Clients) ends up with **two server entries pointing at the same Unity Editor**, under
  two different names, with two different JSON shapes. Duplicate tool surfaces, ambiguous
  `resources/read` server keys, and a tool-name namespace that does not match what POWER.md
  documents. **This is a top-ranked root-cause candidate (§8 RC-2).**

**Decision:** keep `mcp.json` (removing it would break the Legacy-format contract), fix its shape
(§6.3), and add an explicit, prominent "pick exactly one" section to `POWER.md` and all five
READMEs:

> Either let the Power register the server (install the Power and leave `mcp.json` alone), **or**
> let Unity configure Kiro (Configure All Detected Clients, which writes `unityMCP` into
> `~/.kiro/settings/mcp.json`). If you see two Unity MCP servers in Kiro's MCP panel, disable one.

Also document the file locations plainly: user-level `~/.kiro/settings/mcp.json`, workspace-level
`.kiro/settings/mcp.json`, and the Power's own `mcp.json`.

**UNVERIFIED:** the exact namespacing Kiro applies to a Legacy power's server name, and therefore
the exact prefix Unity MCP tool names carry inside a Kiro session. I could not confirm this from
the published docs. The implementer must not invent a prefix; POWER.md should keep referring to
bare tool names (`manage_scene`, …) and add one sentence saying the client may show them under a
server prefix. User check: open Kiro's MCP panel and read the server name and tool names as listed.

### 6.3 `mcp.json` — required shape change

Current:

```json
{ "mcpServers": { "unity-mcp": { "url": "http://127.0.0.1:8080/mcp", "transport": "http" } } }
```

Evidence that `transport` is not the right key:

- Kiro's own curated powers use `url` + `disabled`, with **no `transport` field** —
  [kirodotdev/powers/postman/mcp.json](https://github.com/kirodotdev/powers/blob/main/postman/mcp.json)
  (retrieved 2026-10-21) is `{"mcpServers":{"postman":{"url":"https://mcp.postman.com/minimal","disabled":false}}}`.
- The MCP for Unity configurator writes `type`, never `transport`, and its code comment states
  `type` is "the standard MCP protocol field" included so clients do not fall back to SSE on seeing
  a bare `url`.
- Kiro's remote-MCP support is documented as URL + custom HTTP headers over streamable HTTP
  ([kiro.dev/blog/introducing-remote-mcp](https://kiro.dev/blog/introducing-remote-mcp/)).

**Decision — write the file to match what the upstream Kiro configurator produces**, since that
configurator is maintained against Kiro's actual schema:

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

Keep the key `unity-mcp` (changing it to `unityMCP` would guarantee a collision with the
auto-configurator's entry rather than merely risk one), keep `127.0.0.1:8080/mcp`, drop `transport`,
add `type`/`env`/`disabled`.

**UNVERIFIED:** whether Kiro silently ignores an unknown `transport` key or rejects the server
entry. The kiro.dev configuration page is client-rendered and I could not read its field table.
If it rejects, this alone explains "cannot drive Unity" — hence RC-1 in §8. User check: open Kiro's
MCP panel; a rejected entry shows as failed/not-connected rather than listing tools.

### 6.4 POWER.md is missing its frontmatter — likely fatal

Kiro's own curated powers begin POWER.md with YAML frontmatter.
[kirodotdev/powers/postman/POWER.md](https://github.com/kirodotdev/powers/blob/main/postman/POWER.md)
(retrieved 2026-10-21) starts:

```yaml
---
name: "postman"
displayName: "API Testing with Postman"
description: "..."
keywords: ["postman", "api", "testing", "collections", "rest", "http", "automation"]
author: "Postman"
---
```

and the body is organised as `# Onboarding`, `# Overview`, `## Available MCP Servers`, workflows.
Kiro's docs describe keyword-driven activation ("when you mention relevant keywords, Kiro loads the
power's context and tools" — [kiro.dev/docs/powers](https://kiro.dev/docs/powers/)), which requires
`keywords`.

**This repo's `POWER.md` has no frontmatter at all.** The repo's own hook instructs the agent to
call `kiroPowers(action="activate", powerName="kiro-unity-accelerator")` — a name that appears
nowhere in POWER.md and can only be the directory name.

**Decision: add frontmatter as the very first edit of the whole task.**

```yaml
---
name: "kiro-unity-accelerator"
displayName: "Unity Accelerator"
description: "Drive the Unity Editor from natural language via the MCP for Unity bridge — assets, scenes, builds, tests, profiling, code quality."
keywords: ["unity", "unity3d", "unity editor", "urp", "gameobject", "prefab", "scene", "shader", "il2cpp", "build", "mcp for unity", "unity-mcp", "game development"]
author: "kiro-unity-accelerator contributors"
---
```

The `name` must be exactly `kiro-unity-accelerator` so the hook's `powerName` resolves.
**UNVERIFIED:** whether Kiro hard-fails a Legacy power that lacks frontmatter or falls back to the
directory name. Marked UNVERIFIED; ranked RC-3 in §8. Either way, adding it is correct and
zero-risk, and it is the only change that could explain "the Power loads but knows nothing".

### 6.5 The hook — three-way mismatch and the design decision

**The mismatch, stated precisely:**

| Source | Claims |
|---|---|
| `POWER.md` "Pre-Tool Hook" section | file is `hooks/pre-unity-tool.json`; a `preToolUse` hook over ~34 enumerated unity-mcp tool names |
| on disk | `hooks/pre-unity-tool.kiro.hook`; `{name, version, description, when:{type:"promptSubmit"}, then:{type:"askAgent", prompt}}`; **no `enabled` field** |
| `README.md` "Install Auto-Guidance Hook" | describes a `promptSubmit` hook and tells the user to `cp hooks/pre-unity-tool.kiro.hook .kiro/hooks/` |

So POWER.md describes a file that does not exist, with a trigger the file does not use, over a tool
list that is itself stale (it predates `manage_tools`, `execute_menu_item`, `execute_custom_tool`,
`set_active_instance`, `manage_script_capabilities`, `find_in_file`, `debug_request_context`).

**The current format — VERIFIED:** Kiro 1.0 moved hooks to standalone JSON files at
`.kiro/hooks/*.json` with a schema shared between the IDE and the CLI; this replaced the older IDE
`.kiro.hook` format ([kiro.dev/docs/ide/whats-new-v1/hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks/),
retrieved 2026-10-21). The schema:

```json
{
  "version": "v1",
  "hooks": [
    { "name": "…", "trigger": "PreToolUse", "matcher": "fs_write",
      "action": { "type": "command", "command": "./guard.sh" } }
  ]
}
```

`action.type` is `command` (shell, event on STDIN) or `agent` (a prompt injected into the
conversation — this starts an agent loop and costs credits). `enabled: false` disables without
deleting. Timeout defaults to 30s via `timeout_ms`; `cache_ttl_seconds` controls caching. Triggers
include `AgentSpawn`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, and the IDE adds
`SessionStart`, `PreTaskExec`, `PostTaskExec`, `PostFileCreate`, `PostFileSave`, `PostFileDelete`.
PascalCase is the current form; the CLI V3 migration guide notes legacy camelCase trigger strings
are kept as compatibility aliases and tells you to use PascalCase when hand-authoring
([kiro.dev/docs/cli/v3/migration-guide](https://kiro.dev/docs/cli/v3/migration-guide/)).
Source for the schema and semantics detail: the kiro.dev hooks pages, mirrored with their own fetch
date (2026-09-06) at
[rendu.ai/docs/reference/kiro-cli/hooks.md](https://github.com/dev-rb-hub/rendu.ai/blob/main/docs/reference/kiro-cli/hooks.md).

`matcher` matters a lot here: it accepts canonical tool names, aliases, `*` for all tools,
`@builtin`, **`@server` for every tool from one MCP server**, and `@server/tool` for one MCP tool.
MCP tools arrive at the hook under their namespaced name.

**The gating contract is the deciding factor.** For `PreToolUse`: exit 0 allows, exit 2 denies, and
**any other outcome — timeout, crash, unexecutable command — blocks the tool call (fail closed)**.
There is currently no per-hook fail-open opt-out.

**Decision: a single `UserPromptSubmit` hook with an `agent` action. Do not use `PreToolUse`.**

Rationale:
1. `UserPromptSubmit` fires once per user turn, strictly before any tool call, so it always
   precedes Unity MCP use — it achieves the stated goal.
2. `PreToolUse` fails closed. A `PreToolUse` hook over the Unity MCP server that misfires, times
   out, or whose verdict semantics for an `agent` action are undefined would **block every Unity
   tool call** — which is literally the bug being fixed. Taking that risk to deliver a reminder is
   not a trade worth making.
3. Cost: an `agent` action starts an agent loop. One per user turn is acceptable; one per tool call
   on a 25-command batch workflow is not.
4. It preserves the on-disk behaviour and the README's existing description, so only the file name,
   schema and prompt text change.

The replacement file, at package path **`hooks/unity-power-auto-activate.json`**:

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
        "prompt": "<the steering-selection prompt, updated per the table below>"
      }
    }
  ]
}
```

**Where the file must live:** Kiro loads hooks from the **workspace**, at
`.kiro/hooks/<id>.json`. A Power cannot install a hook by itself — Kiro's own Postman power proves
the pattern by putting the hook JSON inline in a POWER.md `# Onboarding` section and telling the
reader to save it under `.kiro/hooks/`. So:

- ship the template in the package at `hooks/unity-power-auto-activate.json`;
- `POWER.md` gains an `# Onboarding` section that contains the hook JSON inline and the install
  instruction (matching the official-power convention);
- README keeps a copy step, corrected to the new filename and destination:
  `.kiro/hooks/unity-power-auto-activate.json`;
- delete `hooks/pre-unity-tool.kiro.hook` and rewrite POWER.md's "Pre-Tool Hook" section to
  describe a `UserPromptSubmit` hook (not `preToolUse`) at the new filename, dropping the
  34-tool-name list entirely — the hook no longer needs one.

**UNVERIFIED:** whether the Kiro IDE still honours legacy `.kiro.hook` files for backward
compatibility. The 1.0 notes say the new schema "replaces" the old format. Since the official
powers repo still shows the old shape in prose, legacy files may still load. Either way, shipping
the v1 schema is the correct forward choice; the old file should go.

**Steering selection table in the hook prompt — must be corrected.** All 14 files the current hook
names exist in `steering/`:

`scene-scaffolding.md`, `asset-automation.md`, `build-automation.md`, `performance-analysis.md`,
`code-quality.md`, `platform-compatibility.md`, `asset-dependencies.md`, `cross-platform-testing.md`,
`workflow-automation.md`, `knowledge-management.md`, `level-design-tooling.md`,
`ui-dependency-analysis.md`, `project-organization.md`, `unity-general.md` — **all 14 verified
present**. The 15th file, `language-zh-tw.md`, exists on disk but is named by no selection table.

The three selection tables in the repo are inconsistent with each other and with the directory:

| Table | Lists | Missing |
|---|---|---|
| `POWER.md` "Steering-First Approach" | 13 | `project-organization.md`, `language-zh-tw.md` |
| `POWER.md` "Steering Files" section | 11 | `level-design-tooling.md`, `ui-dependency-analysis.md`, `project-organization.md`, `language-zh-tw.md` |
| hook prompt | 14 | `language-zh-tw.md` |

**Decision: make all three tables list all 15 files**, with `language-zh-tw.md` described as
"loaded when responding in Traditional Chinese", and fix `README.md`'s "14 domain knowledge files"
(appears in the intro line, the Architecture block and the Project Structure block) to 15 — in all
five READMEs.

---

## 7. Remaining in-scope items

### 7.1 Rewriting the "Available MCP Tools" preamble

Today it says the whole table was "Verified against a live connection." That is now only partly
true and the distinction is the whole point of this task. Required replacement, stating scope
precisely:

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

### 7.2 Core Behaviors

- **Render-pipeline guidance** (`POWER.md` Safety & Quality Checks): currently says to verify via
  `GraphicsSettings.currentRenderPipeline`, which requires `execute_code` (group `scripting_ext`,
  off by default). The same paragraph elsewhere correctly says `manage_graphics(pipeline_get_info)`.
  **Unify on `manage_graphics(action:"pipeline_get_info")`** — it is `core` and was live-verified
  (returned `UniversalRenderPipelineAsset`, `PC_RPAsset`, quality levels `["Mobile","PC"]`, linear
  colour space, `hasVolumeSystem: true`). Keep the URP-is-recommended-for-new-Unity-6-projects line.
- **GPU Resident Drawer notes** (`POWER.md` 6.7-baseline block, `steering/unity-general.md:117`,
  `steering/performance-analysis.md:154`, `steering/platform-compatibility.md:128`,
  `templates/platform-profiles/{ios,webgl,xr}.json`): the requirements (Forward+/Deferred+, compute
  shaders, not OpenGL ES, not VisionOS, not the 2D Renderer, Realtime GI off) are consistent across
  all of them and nothing in the 6.4 release notes contradicts them. **Keep the substance**; the
  only edits are (a) retarget the version wording from 6.7 to 6.4, (b) add that the 6.4 Rendering
  Statistics window now itemises GPU-Resident-Drawer-optimised draw calls, so
  `manage_graphics(stats_get)` output should be read with that breakdown in mind. The enable
  sequence (BatchRendererGroup Variants = Keep All → SRP Batcher on → GPU Resident Drawer =
  Instanced Drawing → Rendering Path = Forward+) was **not** re-verified; keep it marked as a
  procedure to confirm in Project Settings.
- **Build Profiles**: `POWER.md` already says Build Profiles are Unity 6+ and reachable via the
  `profile`/`profiles` params — matches the v10.3.0 reference ("Unity 6+ only"). Add the 6.4 UI
  change (classic platform list hidden by default; `Project Settings > Editor > Build Profiles >
  Hide Classic Platforms` to show it).
- **`Cloud_Assist` degradation**: there is no cloud layer in the tool surface. The repo is already
  half-cleaned — `POWER.md` carries two "Historical note" paragraphs saying the layer does not
  exist, and `README.md` Features still advertises "optional cloud-assisted acceleration" and
  "Local simulation testing" while the Troubleshooting table still has a "Cloud Assist failure"
  row. `src/cloud-assist-router.ts` exists as a module. **Decision: make the docs internally
  consistent by removing the user-facing cloud claims** — delete the README Features phrases and
  the Troubleshooting row in all five READMEs, and collapse POWER.md's two historical notes into a
  single short note under "Local First". Leave `src/cloud-assist-router.ts` on disk (deleting a
  module is out of scope for a docs-accuracy pass) but stop advertising it.

### 7.3 Templates

| File(s) | Issue | Fix |
|---|---|---|
| `templates/build-configs/{windows-dev,android-release,ios-release,webgl-release}.json` line 17 | `"primaryTool": "manage_editor"` — `manage_editor` has no build action | `"primaryTool": "manage_build"` |
| same four files | build options encoded in local vocabulary | map to the bridge's `options` names: `clean_build, auto_run, deep_profiling, compress_lz4, strict_mode, detailed_report`; `scriptingBackend` values must be `mono`/`il2cpp` (§4.4) |
| `templates/platform-profiles/xr.json:39` | `manage_packages(action: 'list')` | `manage_packages(action: "list_packages")` (async; poll `action:"status"` with `job_id`) |
| `templates/platform-profiles/xr.json:32,39`, `steering/platform-compatibility.md:129`, `steering/knowledge-management.md:67-84`, `steering/unity-general.md:120` | OculusXR deprecation pinned to "6.5 deprecated / 6.7 removed", flagged unverified | keep the migrate-to-OpenXR advice and the unverified labelling; **add the 6.4-documented fact**: HoloLens 2 platform and plug-in are deprecated, migrate to the OpenXR plug-in ([Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64)) |
| `templates/platform-profiles/webgl.json:12,18,29,41` | "MultiThreadedRendering" unsupported / `System.Threading.Thread` unsupported, read as "no threads at all" | qualify: multithreaded *rendering* is still unavailable, but Unity 6.4 runs `[BurstCompile]` jobs on background workers for Web builds; add Microphone API support and WebGPU PSO tracing |
| `templates/platform-profiles/ios.json:37` | Metal/compute/GPU-Resident-Drawer note is accurate | keep; **add** that PVRTC was removed in 6.4 — ASTC (or ETC) only |
| `templates/presets/*.json` (5) | reference `manage_asset` only; action names not encoded | verify each `config` key maps to `manage_asset(action:"modify", properties:{…})`; no known errors — treat as a review pass, not a rewrite |
| `templates/scaffolds/*.json` (5) | reference `manage_ui` (group off by default) | add a `requiresToolGroups: ["ui"]` field (or equivalent note) so the scaffold loader can emit the `manage_tools` activation step |
| `templates/workflows/test-execution.json` | `run_tests`/`get_test_job` (group off) | add the `testing` activation step |
| `templates/workflows/asset-import-setup.json`, `build-and-deploy.json` | `core`-only tools | no group step needed; verify action names against §5.2 |
| `templates/architecture-rules/ecs-pattern.json` | may imply installing Entities packages | on 6.4 Entities/Collections/Mathematics/Entities Graphics are Core packages shipped with the Editor |
| `templates/architecture-rules/scriptableobject-pattern.json` | — | add the 6.4 `[SerializeReference]`/`[Serializable]`-ancestor validation warning |
| every `templates/**/*.json` | — | must still parse as JSON after editing (§9) |

### 7.4 Roslyn — the user's `execute_code` is C# 6 only

Live-verified: Roslyn is not installed, so `execute_code` with default `compiler:"auto"` fell back
to `codedom` (C# 6). Keep the caveat *and* give the fix, from the
[Roslyn validation guide](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/roslyn.md):

- One-click: **Window → MCP for Unity →** the Scripts/Validation tab → **Install Roslyn DLLs**
  (also available as a menu item). It downloads the NuGet packages, places DLLs in
  `Assets/Plugins/Roslyn/`, and adds `USE_ROSLYN` to Scripting Define Symbols.
- Manual via NuGetForUnity: `Microsoft.CodeAnalysis` v5.0, `SQLitePCLRaw.core` v3.0.2,
  `SQLitePCLRaw.bundle_e_sqlite3` v3.0.2, then add `USE_ROSLYN` and restart Unity.
- Verify: the MCP for Unity status panel shows Roslyn as enabled, and `validate_script` performs
  semantic rather than structural analysis.
- Known conflict: on Unity 6.3+ with the **Unity AI Assistant** package installed, MCP for Unity's
  CodeAnalysis dependency wants `System.Collections.Immutable` v9 while AI Assistant bundles v10 —
  upstream's fix is to drop `System.Collections.Immutable` v9.0.0 into `Assets/Plugins/`
  ([troubleshooting.md](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/troubleshooting.md)).

Until Roslyn is installed, the Power must keep generating C# 6-compatible code for `execute_code`
(no tuples, no pattern matching, no `switch` expressions, no local functions).

### 7.5 Three-way MCP disambiguation (new POWER.md + README section)

| Project | Package / identity | How it connects | Status |
|---|---|---|---|
| **(a) CoplayDev MCP for Unity** — *what this Power uses* | UPM `com.coplaydev.unity-mcp`, repo [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp), PyPI server `mcpforunityserver`, MIT | HTTP (default) at `http://127.0.0.1:8080/mcp`, or stdio via `uvx --from mcpforunityserver mcp-for-unity --transport stdio`; Unity bridge on TCP 6400 | Active. Latest **v10.3.0** (2026-10-04). Unity floor 2021.3 LTS. 49 tools / 10 groups. |
| **(b) IvanMurzak/Unity-MCP** — *different project, not used here* | UPM `com.ivanmurzak.unity.mcp`, repo [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | separate `gamedev-mcp-server` binary auto-downloaded to `Library/mcp-server/<platform>/`; **port is derived deterministically as SHA256 of the project path mapped into 20000-29999** (plugin, server and CLI all compute it the same way, so no manual port config) | Active, **latest 1.3.0** (published ~2026-10-20 per the GitHub releases API; the figure "v0.76.1" is stale). Its tool names and port scheme do **not** match this Power — do not mix the two. |
| **(c) Unity's first-party in-Editor MCP server** | inside `com.unity.ai.assistant`, UI at **Edit > Project Settings > AI > Unity MCP** | MCP client connects directly to the in-Editor server | **Deprecated.** |

Deprecation statement for (c) — **verified against current docs on 2026-10-21**, as instructed:
Unity's own CLI documentation states that the MCP server inside the in-editor AI assistant package
is deprecated and that the Unity CLI (`unity mcp`) replaces it; the CLI ships its own MCP server
built on the Unity Pipeline package and speaks the same protocol
([Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)).
The package docs carry the same notice
([com.unity.ai.assistant@2.18 — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html)
and [Configure MCP servers](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/mcp-configure.html)).
**Crucially, the same Unity page states that third-party MCP packages installed from GitHub to give
agents access to Unity are unaffected by the deprecation** — so (a) is explicitly out of scope of
the deprecation, and the README must say so to stop users concluding this Power is dead. The page
also notes the CLI's MCP mode itself remains supported, and that AI Assistant 2.13+ fixes a
conflict between the CLI and the package.

Two more AI-Assistant interactions worth one line each in Troubleshooting (both upstream-reported):
the `System.Collections.Immutable` clash on Unity 6.3+ (§7.4), and a Unity 6.5 startup livelock
traced to pre-release `com.unity.ai.assistant` / `com.unity.ai.inference` /
`com.unity.asset-manager-for-unity` (Unity bug UUM-132096) which presents as an MCP connection
failure because the Editor never finishes loading.

### 7.6 Workshops

Both `workshop/*.md` are Chinese prompt-driven tutorials. They name no MCP tools, so there are no
tool-name corrections — but they do need:

1. **Step 0 — tool groups.** A prerequisite block with literal calls:
   `manage_tools(action:"list_groups")`, then `activate` for `ui` (UI Toolkit HUD),
   `scripting_ext` (`execute_code`) and `testing` (`run_tests`) as the tutorial requires, plus the
   note that the client may need a refresh before the new tools appear.
2. **Version wording**: "建議 Unity 6.x" → the 6.4 baseline policy (§2.2), and add URP 17.4 as the
   live-verified pairing.
3. **UI path**: "Window → MCP for Unity → Start Server" → the current UI (Window → MCP for Unity,
   status panel reads `Connected`; Restart Server to recover).
4. **Input System**: keep the existing `Active Input Handling` check; add that 6.4's Input System
   package adds `OnMouse*` events as an Input-Manager migration path.
5. **2D/URP**: mention 6.4's ability to inject a custom render pass into the URP 2D frame loop.

### 7.7 `package.json`

Bump `0.1.0` → **`0.2.0`** (breaking documentation/connection-contract change, no runtime deps).
Leave `devDependencies` as declared.

**`.gitignore` constraint — VERIFIED by reading the file.** It ignores `tsconfig.json`, `tests/`,
`.kiro/`, `node_modules/`, `package-lock.json`, `document/`. Consequences:

- `tsconfig.json` and `tests/` are **developer-local by design**, which is the real reason
  `npx tsc --noEmit` and `npm test` have never worked in a fresh clone. Do not try to commit
  either; typecheck with explicit `tsc` flags (§9 step 2) and say so in `CONTRIBUTING.md`.
- `.kiro/` being ignored confirms the hook-install model in §6.5: the Power ships a template under
  `hooks/` and the user copies it into their own (ignored) `.kiro/hooks/`.
- `.agents/` is **not** ignored, so the task artefacts sitting in this worktree are stageable.
  **Add `.agents/` to `.gitignore`** and never stage that directory.

Also fix `README.md`'s Project Structure block in all five languages so it stops listing `tests/`,
`tsconfig.json` and `jest.config.ts` as repository contents, and adjust the Development section to
show the flag-based typecheck command rather than a bare `npx tsc --noEmit`.

---

## 8. Ranked root causes of "users cannot drive Unity"

Ranked by (likelihood × blast radius). Each is marked VERIFIED or UNVERIFIED, with the exact user
step that settles it. Policy note: **no item here is concluded "already fine" from reading source
alone** — where I could not execute a check, it is marked UNVERIFIED and the user step is given.

**RC-1 — `mcp.json` uses a `transport` key that Kiro's own powers and the upstream configurator
never write. — UNVERIFIED (schema), VERIFIED (the mismatch itself).**
Kiro's curated `postman/mcp.json` uses `url` + `disabled`; MCP for Unity's `ConfigJsonBuilder`
writes `url` + `type` + `env` + `disabled` and never `transport`. If Kiro rejects or ignores the
entry, the Power registers a server that never connects, and every Unity tool is simply absent —
which matches the report exactly. Blast radius: total.
*User step:* open Kiro's MCP panel and look at the Unity server's state. If it is not connected, or
no Unity tools are listed, replace `mcp.json` with the §6.3 shape and restart Kiro.

**RC-2 — Two Unity MCP server registrations in `~/.kiro/settings/mcp.json`. — VERIFIED
(mechanism), UNVERIFIED (that it is this user's state).**
A Legacy POWER.md power's `mcp.json` is registered into `~/.kiro/settings/mcp.json` under the
Powers section with a namespaced name
([kiro.dev/docs/powers/installation](https://kiro.dev/docs/powers/installation/)), while MCP for
Unity's `KiroConfigurator` writes `unityMCP` into the same file. A user who installs the Power and
also runs Configure All Detected Clients gets both. Symptoms: duplicate/ambiguous tool names,
`resources/read` failing with an unknown-server error (upstream documents exactly this class of
failure for Codex), and tool names that do not match POWER.md.
*User step:* open `~/.kiro/settings/mcp.json` and Kiro's MCP panel; if two Unity MCP servers appear,
disable one and restart Kiro.

**RC-3 — `POWER.md` has no YAML frontmatter, so the Power may not register or activate under the
name the hook uses. — UNVERIFIED (hard-fail vs. fallback), VERIFIED (the frontmatter is absent and
Kiro's own powers all have it).**
Kiro activates powers on keyword match, which requires `keywords`. With no frontmatter there is no
`name`, `displayName` or `keywords`. The result would be a Power that is installed but never loads
its knowledge, so the agent uses whatever tool names it guesses — again matching the report.
*User step:* in the Powers panel, check whether the power shows a display name and whether
`kiroPowers(action="activate", powerName="kiro-unity-accelerator")` succeeds. Fix is §6.4 and is
zero-risk regardless of the answer.

**RC-4 — Wrong stdio fallback command. — VERIFIED.**
The documented fallback `{command:"uvx", args:["unity-mcp"], transport:"stdio"}` cannot work:
there is no `unity-mcp` PyPI package, `--from mcpforunityserver` is mandatory, the entrypoint is
`mcp-for-unity`, `--transport stdio` must be passed, and the key is `type` not `transport`
(§3.7, verified from `ConfigJsonBuilder.BuildUvxArgs` + `AssetPathUtility.GetUvxCommandParts` and
the upstream install/transports docs). Anyone who followed the README's "port 8080 is occupied →
switch to stdio" advice got a server that fails to launch. Blast radius: total, for that subset.
*User step:* if using stdio, replace with the §3.7 block (Windows: absolute `uvx.exe` path, ideally
the WinGet Links shim).

**RC-5 — Wrong port after a port conflict. — UNVERIFIED for this user; the default itself is
VERIFIED CORRECT.**
`http://127.0.0.1:8080/mcp` matches both the Unity-side default (`HttpEndpointUtility
.DefaultLocalBaseUrl`) and the server default, so the repo's URL is right out of the box. But the
port is user-editable and upstream specifically documents 8080 colliding with other services
(Tailscale is their example) and recommends moving to 8090. The repo hard-codes 8080 in `mcp.json`,
`README*.md` troubleshooting rows, `steering/unity-general.md:146` and `src/mcp-health.ts:75`, with
no instruction to read the real port.
*User step:* read the endpoint/port in the MCP for Unity window and make the URL match; or just run
Configure All Detected Clients.

**RC-6 — Bridge too old / Python-server↔Unity-package skew. — DISPROVEN FOR THIS INSTALL
(Round 2). Keep only as a generic "upgrade the bridge" recommendation.**
Round 2 performed the observation this item asked for. `debug_request_context` returned
`server.version` **9.6.8** — identical to the installed UPM package version — so **there is no
Python-server↔Unity-package skew here, and the "stale Python server" hypothesis (explanation (b))
is false.** The telemetry anomaly was explanation (a): the Round-1 call had been made inside
`batch_execute`, which forwards commands to Unity and bypasses the Python server layer (§4.5
Round-2 addition, §Round 2 C-2). Direct `manage_editor(telemetry_status)` / `(telemetry_ping)` both
succeed. What survives of this item: the user is still a major version behind (9.6.8 vs v10.3.0)
and upgrading is still recommended — but as hygiene, not as a diagnosed root cause.
Server argv from the same response, kept because it is the connection ground truth:
`mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools
--pidfile <project>\Library\MCPForUnity\RunState\mcp_http_8080.pid --unity-instance-token <token>`;
console script **`mcp-for-unity`** (not `unity-mcp`), resolved from the uv cache; `server.cwd`
`<user-home>\kiro-workshop`; `session_state.active_instance`
`kiro-workshop@b81f852b5f42fc9d`; `derived_key` `global`; `plugin_hub_configured` true;
`request_context.client_id`/`session_id` both null while `direct_properties.session_id` is set.

**RC-7 — Tool group not enabled / `manage_tools` never used. — NOT the cause on the verified
install (Round 2). Retained as a ranked candidate for other installs only.**
VERIFIED: the bridge declares `core` as the only default-on group; on HTTP the server disables
non-default groups at startup; `manage_tools` was undocumented in this repo, so neither the user nor
the agent knew the recovery existed. VERIFIED: clients may cache tool lists until
restarted/refreshed, so even a correct `activate` can appear to do nothing.
**VERIFIED IN ROUND 2, and it demotes this item:** the default session exposed **all 43 tools**,
callable before any `manage_tools` call and still callable immediately after `reset`; the server
runs with `--project-scoped-tools`, which may explain it. `list_groups` reported `enabled: false`
for all eight non-core groups the whole time — the field is misleading, not a readout.
**VERIFIED IN ROUND 2, the other direction:** `deactivate` *is* enforced —
`manage_tools(deactivate, group:"profiling")` then `manage_profiler` →
`Tool 'manage_profiler' does not exist on server 'power-kiro-unity-accelerator-unity-mcp'`.
So: group gating is a real mechanism and `manage_tools` stays fully documented (that gap was real),
but **"your tool groups are off" must not be asserted as the explanation for "cannot drive Unity"**
— here it was not. Activation is documented as conditional troubleshooting.
*User step:* only when a tool is reported as not existing — `manage_tools(action:"list_groups")`,
then `sync`, then `activate`, then refresh/restart the MCP client and retry.

**RC-7b — An IDE-side `permissions.yaml` MCP deny rule blocks the tool. — VERIFIED (Round 2),
and it was previously unconsidered.**
A direct `manage_build(action:"settings")` call was refused by the IDE, not Unity:
`Tool call denied by user's permissions. Rule: deny mcp matching
"power-kiro-unity-accelerator-unity-mcp/manage_build" Source:
<user-home>\.kiro\settings\permissions.yaml` — a `capability: mcp` / `effect: deny` rule at
roughly line 2281 of the user's own file. **Workflow 3 (Build Automation) therefore cannot run on
this machine at all**, for a reason that has nothing to do with Unity, the bridge or tool groups.
Namespace fact that makes this diagnosable: the IDE exposes a Power's MCP server as
**`power-<powerName>-<serverName>`** → `power-kiro-unity-accelerator-unity-mcp` (confirmed twice —
in the group-deactivation error and in this denial). That is the string permission rules match.
*User step:* read `~/.kiro/settings/permissions.yaml` (and the workspace-level file) and look for
`capability: mcp` entries with `effect: deny` matching `power-<powerName>-<serverName>/<tool>`.
The symptom is a client-side denial message, not a Unity error, so it is easy to misread as a bridge
fault. Do not edit a user's permission file on their behalf.
*Observation worth reporting upstream (flagged, not a verdict):* the direct `manage_build` call was
blocked, but a Round-1 `batch_execute` containing `manage_build(action:"settings")` was **not**
blocked and reached Unity (it came back with a Unity-side validation error). That suggests per-tool
MCP deny rules are enforced on the outer tool call only. Recorded here for an upstream report and
for a short security note in the docs; **not** to be documented as a bypass recipe, and no workflow
in this Power may rely on it.

**RC-8 — Hook not installed, or installed in a format Kiro no longer loads. — UNVERIFIED.**
The shipped `hooks/pre-unity-tool.kiro.hook` uses the pre-1.0 IDE schema that Kiro 1.0 replaced
with `.kiro/hooks/*.json` (VERIFIED from the 1.0 notes), omits `enabled`, and uses
`when.type: "promptSubmit"` — not one of the current PascalCase triggers and not obviously one of
the camelCase compatibility aliases (the alias set mirrors trigger names, and the current trigger is
`UserPromptSubmit`). A Power also cannot install a hook by itself; the README's `cp` step is the
only install path and is easy to skip. Blast radius: moderate — without the hook the agent may skip
activating the Power and reading steering, which degrades quality rather than hard-blocking Unity.
*User step:* check whether `.kiro/hooks/` contains the file and whether Kiro's hooks UI lists it as
active. Fix is §6.5.
**Counter-risk worth stating in the plan:** if anyone "fixes" this by writing a `PreToolUse` hook
over the Unity MCP server, `PreToolUse` **fails closed** — a hook that times out or errors blocks
every Unity tool call. That would *cause* the reported symptom. This is why §6.5 chooses
`UserPromptSubmit`.

**RC-9 — Roslyn absent, so `execute_code` is C# 6 only. — VERIFIED, narrow blast radius.**
Live-confirmed `"compiler":"codedom"`. This breaks only `execute_code` snippets using C# 7+ syntax,
not the bridge. It compounds RC-7 because `execute_code` is in the off-by-default `scripting_ext`
group *and* restricted in syntax, yet the repo's health check and three steering files route to it.
*User step:* §7.4's one-click installer, or accept C# 6 syntax.

**RC-10 — Stale/incorrect tool metadata in the docs themselves. — VERIFIED, cumulative.**
~~`manage_editor` telemetry framing (C1)~~ (**Round-2 correction: C1 was not a doc error — the
original telemetry wording was correct; see §Round 2, C-1**), the "resources don't exist" warning (C2), unprefixed
`search_method` values (C3), `search_method` wrongly required (C4), bare `manage_build(settings)`
(C5 — **Round-2: downgraded to UNVERIFIED, documented conditionally rather than asserted**),
`unity_reflect`'s `type_name` (C6), the missing `batch_execute` cap (C7), the missing
`safety_checks` (C8), `"primaryTool": "manage_editor"` in four build configs, and
`manage_packages(action:'list')` in `xr.json`. Each one costs an agent a failed call and a retry;
together they are enough to make a session look broken even when the connection is fine. This is
the bulk of the work and the reason the task exists.
*Verification:* §9.

---

## 9. Verification — what can and cannot be run

**Discovered reality:** `README.md` documents `npm install`, `npm test`, `npm run test:unit`,
`npm run test:property`, `npm run test:integration` and `npx tsc --noEmit`; `CONTRIBUTING.md`
mandates `npx tsc --noEmit`. But `tsconfig.json`, `jest.config.ts`, `tests/` and `node_modules/`
are all absent from the repo (checked with `Test-Path`). So `npm test` has nothing to run and
`npx tsc --noEmit` has no config to read. Node v24.14.0 / npm 11.9.0 are available.

**Verification commands the implementer must use (all runnable, all non-grep):**

1. **JSON validity — every JSON artefact this task touches.** PowerShell, no deps:
   ```powershell
   Get-ChildItem -Recurse -File -Include *.json -Path templates,hooks |
     ForEach-Object { try { Get-Content -Raw $_.FullName | ConvertFrom-Json > $null; "OK  $($_.Name)" }
                      catch { "FAIL $($_.FullName): $_"; $global:bad=1 } }
   Get-Content -Raw mcp.json   | ConvertFrom-Json > $null
   Get-Content -Raw package.json | ConvertFrom-Json > $null
   ```
   Expected: every file prints `OK`, no `FAIL`. This is the real build for a JSON-template repo and
   it catches the `build-configs`, `platform-profiles`, `scaffolds`, `presets`, `workflows`,
   `architecture-rules`, `mcp.json`, `package.json` and hook-file edits.

2. **TypeScript typecheck.** `.gitignore` lists **`tsconfig.json`** and **`tests/`**, so neither can
   be committed — this is why `npx tsc --noEmit` has never worked in a fresh clone despite
   CONTRIBUTING mandating it. **Do not add a committed `tsconfig.json`** (it would be ignored and
   the edit silently lost). Instead typecheck with explicit flags, no config file:
   ```powershell
   npm install
   npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck (Get-ChildItem src -Filter *.ts | ForEach-Object FullName)
   ```
   Expected: exit 0, no diagnostics. This gates the `src/mcp-health.ts`,
   `src/mcp-integration.ts`, `src/types.ts`, `src/scene-batch-config.ts` and
   `src/optimization-advisor.ts` edits. If `npm install` cannot reach the registry, use
   `npx -y typescript@5.6.3 tsc --noEmit …` with the same flags and record the result. If the
   registry is unreachable entirely, report the typecheck as **not run** rather than claiming it
   passed.

3. **YAML frontmatter parses.** After adding frontmatter to `POWER.md`, confirm the block is
   delimited by `---` on the first line and closed before the first heading, and that
   `name: "kiro-unity-accelerator"` matches the directory name used by the hook's `powerName`.
   Runnable check: read the first 10 lines and assert the delimiters, e.g.
   `(Get-Content POWER.md -TotalCount 1) -eq '---'` returns True.

4. **Hook file validates against the v1 schema.** Parse it (step 1 covers this) and assert
   `version -eq 'v1'`, `hooks[0].trigger -eq 'UserPromptSubmit'`,
   `hooks[0].action.type -eq 'agent'`, and `hooks[0].action.prompt` non-empty:
   ```powershell
   $h = Get-Content -Raw hooks/unity-power-auto-activate.json | ConvertFrom-Json
   $h.version; $h.hooks[0].trigger; $h.hooks[0].action.type; $h.hooks[0].action.prompt.Length
   ```

5. **Every steering file named in a selection table exists.** Runnable, not a content grep:
   ```powershell
   $declared = (Get-Content -Raw POWER.md) -split "`n" |
     Select-String -Pattern '([a-z0-9-]+\.md)' -AllMatches |
     ForEach-Object { $_.Matches.Value } | Sort-Object -Unique |
     Where-Object { $_ -notmatch 'README' }
   $declared | ForEach-Object { if (-not (Test-Path "steering/$_")) { "MISSING steering/$_" } }
   ```
   Expected: no `MISSING` lines, and `(Get-ChildItem steering -Filter *.md).Count` equals 15.

6. **Stale-string grep gate.** Strings that must be **ABSENT** from the repo (excluding
   `.agents/`, which deliberately records the history): `6.7` / `6000.7` as a Unity target,
   `type_name`, `search_method: "name"` (and the unprefixed `name/tag/layer/component/path`
   vocabulary), `get_rendering_stats`, `get_dependencies`, `Cloud_Assist`, a `transport` key in
   `mcp.json`, `args: ["unity-mcp"]`, `"primaryTool": "manage_editor"` in build configs.
   **Round-2 correction: `telemetry_status` and `telemetry_ping` were added to this gate by the
   first round and must be REMOVED from it.** They are legitimate, working action names that
   *should* appear in POWER.md's `manage_editor` row; the thing to grep for now is the opposite —
   that no file claims they do not exist, and that POWER.md documents the batch-path caveat. The
   rest of the gate stands.

7. **Cannot be verified here — must be stated as such in the deliverable.** Anything requiring a
   live MCP session: that Kiro accepts the new `mcp.json`, that the Power activates with the new
   frontmatter, that the v1 hook fires, and that v10.3.0's surface matches on this machine. For
   each, §8 gives the exact user step. The implementer must not claim any of these as verified.
   **Round-2 update:** the tool-group enforcement question and the RC-6 telemetry question are no
   longer open — both were observed directly in Round 2 (§Round 2, C-1/C-2/C-3/C-4).

---

## 10. New live observations I could not make

Listed explicitly, as required. All are **UNVERIFIED** and none may be presented as fact:

1. ~~Whether calling a tool whose group is currently hidden returns an unknown-tool error or executes
   (§4.2).~~ **ANSWERED IN ROUND 2 — VERIFIED: it is refused.** `manage_tools(deactivate,
   group:"profiling")` then `manage_profiler` → `Tool 'manage_profiler' does not exist on server
   'power-kiro-unity-accelerator-unity-mcp'`. Also answered, and more important: the default session
   exposed all 43 tools with no activation (§Round 2, C-3).
2. ~~The RC-6 telemetry question.~~ **ANSWERED IN ROUND 2.** Direct
   `manage_editor(telemetry_status)` / `(telemetry_ping)` both succeed; `server.version` is 9.6.8,
   equal to the package version, so the stale-server hypothesis is disproven. The Round-1 failure
   was the `batch_execute` path (§Round 2, C-1/C-2/C-4).
3. Whether Kiro accepts `transport` vs `type` in `mcp.json` — still unverified. **The namespace
   prefix is ANSWERED (Round 2): `power-<powerName>-<serverName>` →
   `power-kiro-unity-accelerator-unity-mcp`, confirmed twice** (§6.2, §6.3, §Round 2 C-5).
4. Whether Kiro hard-fails a POWER.md without frontmatter (§6.4).
5. Whether the Kiro IDE still loads legacy `.kiro.hook` files (§6.5).
6. The v10.3.0 tool surface against a live Editor — everything in §5 for v10.3.0 is source- and
   generated-doc-derived, not live-observed. The live column is 9.6.8 only. **Still true after
   Round 4**: the machine was upgraded to 10.3.0, but the restart invalidated the client's MCP
   session before any v10 tool could be called (§15, E-4).
7. Any mutating action, `run_tests`/`get_test_job` end-to-end, `manage_probuilder`, memory snapshots,
   Cinemachine `manage_camera` paths, and the entire `asset_gen` group.
8. The 6.4 GPU Resident Drawer enable sequence and the Build Profiles "Hide Classic Platforms"
   default — read from release notes, not exercised.

---

## 11. Decision summary

| # | Decision | Rationale (short) |
|---|---|---|
| D1 | Supported baseline **Unity 6.4 (`6000.4`)**, pinned patch **`6000.4.12f1`**; minimum Editor **6.0**; forward note for 6.5/6.6 marked unverified; recommend **6.3 LTS** for locked production; never recommend 6.0 LTS (support ended 16 Oct 2026) | what the user asked for and the only stream live-verified; 6.4 is an Update release whose patch window closed 17 Jun 2026 |
| D2 | Delete the "Unity 6.7 Baseline" section | 6.7 is beta-only as of 2026-10-21 |
| D3 | Target bridge **MCP for Unity v10.3.0 or newer (minimum v10.0.0)**; tell 9.6.8 users to upgrade | only maintained line; the 9.6.8→10.3.0 delta is purely additive, so there is no migration cost |
| D4 | Keep `mcp.json`'s `http://127.0.0.1:8080/mcp`; fix the shape to `url`/`type`/`env`/`disabled`; drop `transport` | the URL matches both sides' verified defaults; `transport` appears in neither Kiro's own powers nor the upstream configurator |
| D5 | Auto-configurator first, read-the-real-port second, hand-edit last; never present 8080 as a constant | upstream documents the port as user-editable and 8080 as collision-prone |
| D6 | stdio fallback = `uvx --from mcpforunityserver mcp-for-unity --transport stdio`, Windows absolute `uvx.exe` path shown first | verified from `ConfigJsonBuilder`/`AssetPathUtility` and the install docs; the current `["unity-mcp"]` cannot work |
| D7 | Add `POWER.md` YAML frontmatter with `name: "kiro-unity-accelerator"` | Kiro's own powers require it; keyword activation depends on it; zero-risk |
| D8 | Add a "pick exactly one registration path" warning (Power `mcp.json` **or** Configure All Detected Clients) | the two paths write different server names into the same file |
| D9 | Hook = **one `UserPromptSubmit` + `agent`** entry in `hooks/unity-power-auto-activate.json`, installed to `.kiro/hooks/`; delete the `.kiro.hook` file; rewrite POWER.md's hook section | `PreToolUse` fails closed and would block every Unity call; `UserPromptSubmit` already achieves the goal at one invocation per turn |
| D10 | Health check = `manage_scene(action:"get_active")` only; remove `execute_code` from it | `manage_scene` is `core`; `execute_code` is in an off-by-default group and is C#-6-limited here |
| D11 | Document `manage_tools` fully; **~~add a group-activation step to every workflow that needs a non-core tool~~ → REVISED IN ROUND 2: group activation is conditional troubleshooting, run only when a tool is reported as not existing**; state that `list_groups`' `enabled`/`default_enabled` fields are misleading (they read `false` for callable groups); `deactivate` *is* enforced (verified); the default session exposed all 43 tools (verified) | matches source *and* the Round-2 observations; stops overclaiming group-off as the cause |
| D11b | **ROUND 2:** document the IDE-side `permissions.yaml` MCP deny rule as a distinct root cause, with the `power-<powerName>-<serverName>` namespace it matches on | verified live; previously unconsidered, and it makes Workflow 3 unrunnable on the verification machine |
| D11c | **ROUND 2:** document that `batch_execute` bypasses the Python server layer, that server-layer actions must be called directly, and that the "live error outranks the doc" rule holds for direct calls only | verified live; it is what produced the one wrong correction in Round 1 |
| D12 | Replace the "resources don't exist" warning with the full 24-resource table; use `mcpforunity://editor/state` for readiness and `mcpforunity://project/info` for project info | generated resource reference; fixes `src/mcp-health.ts` and `src/mcp-integration.ts` |
| D13 | Document `asset_gen` for awareness only; no workflow, steering file or template may route to it | it spends the user's third-party credits |
| D14 | Remove user-facing cloud/Cloud_Assist claims from all five READMEs and collapse POWER.md's two historical notes into one | the layer is not in the tool surface; the docs currently contradict themselves |
| D15 | All three steering selection tables list all **15** files; fix "14 domain knowledge files" in all five READMEs | directory has 15; the three tables disagree today |
| D16 | `package.json` → **0.2.0**. Do **not** add `tsconfig.json` — `.gitignore` ignores it (and `tests/`), so it cannot be committed; typecheck with explicit `tsc` flags instead. Fix README's Project Structure to stop listing `tests/`, `tsconfig.json`, `jest.config.ts`, and note in CONTRIBUTING that `tsconfig.json` is developer-local | the ignore rules are the actual reason the documented commands never worked |
| D18 | Add `.agents/` to `.gitignore` | the task artefacts live in the worktree and must never be swept into a commit |
| D17 | Verification = JSON parse of every touched JSON + `npx tsc --noEmit` + frontmatter/hook/steering-existence assertions; everything needing a live MCP session is reported as UNVERIFIED with user steps | the repo's documented `npm test` has nothing to run |

---

## 12. Source index

Unity:
[unity.com/releases/](https://unity.com/releases/) ·
[endoflife.date/unity](https://endoflife.date/unity) ·
[6000.4.12f1 notes](https://unity.com/releases/editor/whats-new/6000.4.12f1) ·
[6000.4.11f1 notes](https://unity.com/releases/editor/whats-new/6000.4.11f1) ·
[6000.6.6f1 notes](https://unity.com/releases/editor/whats-new/6000.6.6f1) ·
[6000.7.0b1 beta](https://unity.com/releases/editor/beta/6000.7.0b1) ·
[New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) ·
[Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64) ·
[Unity 6.4 User Manual](https://docs.unity3d.com/6000.4/Documentation/Manual/UnityManual.html) ·
[Unity CLI replaces the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli) ·
[com.unity.ai.assistant@2.18 MCP get-started](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html) ·
[com.unity.ai.assistant@2.18 configure MCP](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/mcp-configure.html)

MCP for Unity (all read at tag `v10.3.0` unless noted):
[repo](https://github.com/CoplayDev/unity-mcp) ·
[README](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/README.md) ·
[tool catalog](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/tools/index.md) ·
[resource catalog](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/resources/index.md) ·
[tool groups](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/tool-groups.md) ·
[transports](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/architecture/transports.md) ·
[install](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/getting-started/install.md) ·
[v10 migration](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/migrations/v10.md) ·
[multi-instance](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/multi-instance.md) ·
[Roslyn](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/roslyn.md) ·
[remote server auth](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/remote-server-auth.md) ·
[troubleshooting](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/troubleshooting.md) ·
[client configurators](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/guides/client-configurators.md) ·
[CLI reference](https://github.com/CoplayDev/unity-mcp/blob/v10.3.0/website/docs/reference/cli.md) ·
docs site root [coplaydev.github.io/unity-mcp](https://coplaydev.github.io/unity-mcp/) ·
source: `Server/src/services/registry/tool_registry.py`, `Server/src/services/tools/__init__.py`,
`Server/src/services/tools/manage_tools.py`, `Server/src/services/tools/manage_editor.py`
(also read at `v9.6.8`, `v9.6.2`, `v9.6.0`, `v9.5.3`, `v9.4.7`, `v9.0.0`),
`Server/src/core/config.py`, `Server/src/main.py`, `Server/src/cli/utils/config.py`,
`MCPForUnity/Editor/Helpers/ConfigJsonBuilder.cs`,
`MCPForUnity/Editor/Helpers/AssetPathUtility.cs`,
`MCPForUnity/Editor/Helpers/HttpEndpointUtility.cs`,
`MCPForUnity/Editor/Clients/Configurators/KiroConfigurator.cs` ·
[PyPI mcpforunityserver](https://pypi.org/pypi/mcpforunityserver/json)

Kiro:
[Powers](https://kiro.dev/docs/powers/) ·
[Install powers](https://kiro.dev/docs/powers/installation/) ·
[Create powers](https://kiro.dev/docs/powers/create/) ·
[MCP configuration](https://kiro.dev/docs/mcp/configuration/) ·
[Remote MCP](https://kiro.dev/blog/introducing-remote-mcp/) ·
[Hooks](https://kiro.dev/docs/hooks/) ·
[Hook triggers](https://kiro.dev/docs/hooks/types/) ·
[What's new in 1.0 — hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks/) ·
[CLI V3 migration](https://kiro.dev/docs/cli/v3/migration-guide/) ·
[kirodotdev/powers — postman POWER.md](https://github.com/kirodotdev/powers/blob/main/postman/POWER.md) ·
[kirodotdev/powers — postman mcp.json](https://github.com/kirodotdev/powers/blob/main/postman/mcp.json) ·
[mirrored hooks reference (own fetch date 2026-09-06)](https://github.com/dev-rb-hub/rendu.ai/blob/main/docs/reference/kiro-cli/hooks.md)

Other MCP projects (disambiguation only):
[IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) — releases API for 1.3.0; port
derivation in `Unity-MCP-Plugin/Packages/com.ivanmurzak.unity.mcp/Runtime/UnityMcpPlugin.cs`,
`docs/agents/architecture.md`, `Unity-MCP-Plugin/Docs/agents/transport.md`, `cli/README.md`

*Content from all external sources above was paraphrased and summarised rather than reproduced;
no more than short identifier-level fragments are quoted. Content was rephrased for compliance with
licensing restrictions.*

---

## 13. Round 2 corrections applied (2026-10-21, second pass)

Round 1 of this task was implemented and approved, then a second round of **direct** MCP probes
(recorded in `live-verification.md` Part 2, "ROUND 2 — CORRECTIONS TO THIS FILE", items C-1..C-6)
showed that two Round-1 findings were wrong because they had been tested *inside* `batch_execute`
rather than as direct calls. This section records what this correction pass reverted, what it added,
and the corrected VERIFIED / UNVERIFIED labels. Where a claim earlier in this document was
contradicted, it was corrected in place as well as summarised here.

Probe environment unchanged: Unity `6000.4.6f1`, bridge `com.coplaydev.unity-mcp` 9.6.8, HTTP
transport. **Nothing about bridge v10.x was observed** — every v10 claim in this document remains
documentation-derived.

> **Superseded in part by §15 (Round 4).** That blanket sentence was accurate as of Round 2. Round 4
> upgraded the verification machine to 10.3.0 and observed the release metadata, the server CLI
> surface, the two-pin architecture and the upgrade's failure modes. It did **not** observe the
> v10.3.0 tool inventory or any per-tool contract — see §15 for the exact split.

### C-1 — REVERTED: `manage_editor`'s telemetry actions DO exist

- **Was claimed in Round 1 (FALSE):** `manage_editor` has no `telemetry_status` / `telemetry_ping`
  actions; POWER.md's "Read-only: `telemetry_status`, `telemetry_ping`" was a doc error.
- **Round-2 direct calls (VERIFIED):** `manage_editor(action:"telemetry_status")` →
  `{"success":true,"telemetry_enabled":true}`; `manage_editor(action:"telemetry_ping")` →
  `{"success":true,"message":"telemetry ping queued"}`. POWER.md's **original** wording was correct.
- **Reverted:** POWER.md's `manage_editor` row lists `telemetry_status` / `telemetry_ping` as real
  read-only actions again, with the accurate caveats (they report nothing about Editor state or
  compilation, so `mcpforunity://editor/state` remains the readiness probe; and being server-layer
  actions they must be called directly, never inside `batch_execute`).
- **Scope of the revert:** the Round-1 removal was narrower than feared. `git log -p --all
  -S telemetry_status` / `-S telemetry_ping` across the branch shows the only places the previous
  run touched these strings were **POWER.md** (the `manage_editor` row) and
  **`src/mcp-health.ts` / `src/mcp-integration.ts`** (which stopped using `telemetry_status` as a
  compilation probe). No steering file, README, workshop or template ever mentioned them, so there
  was nothing to restore there. The `src/*.ts` change is **kept**: `telemetry_status` genuinely
  cannot report compilation state and `mcpforunity://editor/state` is the right source — that
  rationale survives C-1 untouched.
- **Staleness gate:** `telemetry_status` / `telemetry_ping` were removed from the stale-string grep
  gate (§9 item 6). They are legitimate strings that *should* appear. The rest of the gate stands.
- **Labels:** telemetry actions exist = **VERIFIED (direct call)**. "They are a readiness probe" =
  still false. "They do not exist" = retracted.

### C-2 — ADDED: `batch_execute` bypasses the Python server layer

- **VERIFIED, deterministic:** both telemetry actions succeed as direct calls and fail inside
  `batch_execute` with `Unknown action: '...'`, where the batch-path error lists only the 12
  Unity-side `manage_editor` actions (`play, pause, stop, set_active_tool, add_tag, remove_tag,
  add_layer, remove_layer, deploy_package, restore_package, undo, redo`).
- **Conclusion (VERIFIED):** `batch_execute` forwards commands straight to Unity's C# handler and
  bypasses action handlers implemented in the Python server layer. Server-layer actions silently
  fail inside a batch with a misleading "Unknown action" message.
- **Documented in:** POWER.md — a new "`batch_execute` and server-layer actions" section, the
  `batch_execute` row, the `manage_editor` row, the Available-MCP-Tools verification-scope note, the
  Unity 6.4 Baseline note, Key Principle 5 and a new Error Handling row;
  `steering/unity-general.md` — a new subsection under the batch guide plus a failure-diagnosis row
  and a Tool Call Best Practices bullet; and every steering file that teaches batching
  (`asset-automation.md`, `cross-platform-testing.md`, `level-design-tooling.md`,
  `scene-scaffolding.md`, `ui-dependency-analysis.md`, `workflow-automation.md`); plus
  `templates/workflows/asset-import-setup.json` and all five READMEs (each in its own language).
- **Qualifier added where it matters:** POWER.md's verification rule ("a live Pydantic /
  Unknown-action error is authoritative over this doc") now says **direct calls only**.
- **Deliberately not overclaimed:** only these two actions are established as server-layer. No
  broader list is presented as enumerated.

### C-3 — REFRAMED: tool groups are not the root cause

- **VERIFIED (a):** deactivation is enforced — `manage_tools(deactivate, group:"profiling")` then
  `manage_profiler` → `Tool 'manage_profiler' does not exist on server
  'power-kiro-unity-accelerator-unity-mcp'`.
- **VERIFIED (b):** the default session exposed **all 43 tools**, callable before any `manage_tools`
  call and still callable right after `reset` returned `{"reset":true,"default_groups":["core"]}`.
- **VERIFIED (c):** `list_groups`' `enabled` / `default_enabled` are misleading — `false` for all
  eight non-core groups before and after `reset`, while those tools worked. The server runs with
  `--project-scoped-tools`, which may explain the full surface.
- **Changed:** group activation is demoted from a required preamble to **conditional
  troubleshooting** throughout — POWER.md (Tool Groups section, the per-tool "Group X" notes,
  Workflows 2/4/6/7/8/9/10, the Error Handling row), the nine steering files that carried a "Tool
  group prerequisite" block, all five READMEs, and both workshops (whose mandatory "Step 0 — enable
  the tool groups" block is now a connection check plus a conditional recovery block).
- **Templates:** `requiresToolGroups` / `optionalToolGroups` / `toolGroupNotes` were **not deleted**
  — they were made accurate. The five scaffolds' notes now carry the Round-2 observation and label
  the fields an ownership map for diagnosis. `templates/workflows/test-execution.json` moved
  `requiresToolGroups: ["testing"]` → `[]` with `optionalToolGroups: ["testing"]`, and moved the
  `activate-testing` step out of `steps` into a new `conditionalRecoverySteps` array (the test steps
  no longer depend on it), so the activation is preserved and documented without being mandatory.
- **Kept:** `manage_tools` stays fully documented — that documentation gap was real.
- **Labels:** "tool groups are a confirmed root cause of the reported breakage" = **retracted**; it
  stays in the ranked list (RC-7), relabelled with Round-2 evidence as *not* the cause here.

### C-4 — ADDED: connection facts; stale-Python-server hypothesis DISPROVEN

- **DISPROVEN:** `debug_request_context` reported `server.version` **9.6.8**, identical to the
  installed UPM package version. RC-6's explanation (b) — an older Python server behind a 9.6.8
  package — is false, and §8 RC-6 was rewritten accordingly. The telemetry anomaly was C-2.
- **VERIFIED server argv:** `mcp-for-unity --transport http --http-url http://127.0.0.1:8080
  --project-scoped-tools --pidfile <project>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>`; console script **`mcp-for-unity`** (not `unity-mcp`), resolved
  from the uv cache; `server.cwd` `<user-home>\kiro-workshop`; `session_state.active_instance`
  `kiro-workshop@b81f852b5f42fc9d`; `derived_key` `global`; `plugin_hub_configured` true;
  `request_context.client_id` / `session_id` both null while `direct_properties.session_id` is set.
- **Documented:** `http://127.0.0.1:8080` is the real in-use endpoint on this install, driven by the
  server's own `--http-url`; the port is **not** a universal constant; and
  `<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid` is a reliable way for a user to
  discover their actual port. Added to POWER.md's MCP Connection section and health check,
  `steering/unity-general.md`'s failure-diagnosis table, and the "read the real port" section of all
  five READMEs in their own language. The auto-configurator-first guidance is unchanged.

### C-5 — ADDED: Kiro MCP namespace, and a permission rule that silently kills a tool

- **VERIFIED:** Kiro exposes a Power's MCP server as **`power-<powerName>-<serverName>`** → here
  `power-kiro-unity-accelerator-unity-mcp` (seen twice: the group-deactivation error and the
  permission denial). Documented in POWER.md Onboarding path A and the new permission section,
  `steering/unity-general.md`, and the READMEs.
- **VERIFIED:** a direct `manage_build(action:"settings")` was refused by Kiro, not Unity:
  `Tool call denied by user's permissions. Rule: deny mcp matching
  "power-kiro-unity-accelerator-unity-mcp/manage_build" Source:
  <user-home>\.kiro\settings\permissions.yaml` (a `capability: mcp` / `effect: deny` rule at
  ~line 2281). **Workflow 3 (Build Automation) cannot run on that machine** for reasons unrelated to
  Unity or the bridge.
- **Added as a new ranked root cause (RC-7b)** and to the troubleshooting surfaces: POWER.md gets a
  "Tool denied by the IDE's own permission rules" section, an Error Handling row, a Workflow 3
  warning and a health-check bullet; `steering/unity-general.md` and `steering/build-automation.md`
  get the same guidance; all five READMEs get a troubleshooting row; both workshops get a note.
  Users are told to check `~/.kiro/settings/permissions.yaml` for `capability: mcp` deny rules
  matching `power-<powerName>-<serverName>/<tool>`, and that the symptom is a Kiro-side denial
  message rather than a Unity error.
- **Flagged with care:** the direct `manage_build` call was blocked, but a Round-1 `batch_execute`
  containing `manage_build(action:"settings")` was not, which suggests per-tool MCP deny rules are
  enforced on the outer tool call only. Recorded in §8 RC-7b as an observation worth reporting
  upstream, plus one short security note in POWER.md telling an agent to stop and report rather than
  route around a denial. **Not** written as an exploit recipe, and no workflow relies on it.

### C-6 — DOWNGRADED: `manage_build(action:"settings")` `property` requirement

- Round-1 finding #5 came through `batch_execute` (not equivalent to a direct call per C-2), and
  `manage_build` cannot be called directly on this machine (C-5). The `'property' parameter is
  required.` observation is therefore relabelled **UNVERIFIED** in §4.4 and §5.2 (C5).
- Doc wording is now conditional rather than asserted in POWER.md (`manage_build` parameters +
  Workflow 3), `steering/build-automation.md`, and `templates/workflows/build-and-deploy.json`'s
  `toolGroupNotes`. Callers are still told to pass `property` — as the documented shape, not as a
  proven requirement — until someone with `manage_build` permitted retests it directly.

### Preserved unchanged by this pass

All Round-1 **direct-call** findings: `manage_asset` has no `list` action and `path` is required;
`find_gameobjects.search_method` ∈ `by_name/by_tag/by_layer/by_component/by_path/by_id` with `by_id`
previously undocumented and `search_method` optional; `unity_reflect` uses `class_name` not
`type_name`; the seven previously-missing tools; `batch_execute`'s per-command `params` key,
honoured `fail_fast` (default `true`) and command cap (default 25, hard max 100); `execute_code`
running `codedom` / C# 6 with Roslyn absent; and the environment facts (Unity `6000.4.6f1`, bridge
9.6.8, URP 17.4.0 + `PC_RPAsset`, Test Framework 1.6.0, Input System 1.19.0, uGUI 2.0.0, 46
packages, `SampleScene` with 3 roots). Also preserved: the Unity 6.4 baseline with no 6.7 reference
anywhere, the absence of any 6.0 LTS recommendation, the five FEAT-003 data-bug fixes (including
`"action": "modify"` in the five presets and the removal of `"primaryTool": "manage_editor"` from
the build configs), and the bilingual `File Purpose / 本檔案用途` comments in the steering files. No
localized README was converted to English; each correction was written in that file's own language,
with README_CN kept Simplified and README_ZH kept Traditional.

## 14. Round 3 applied (2026-10-21, third pass)

Round 3 was a read-only sweep of tools the first two rounds never exercised. All observations are
**direct** tool calls (never wrapped in `batch_execute`, per C-2) against the same live Editor:
Unity `6000.4.6f1`, bridge `com.coplaydev.unity-mcp` 9.6.8, URP, project `kiro-workshop`. Nothing
in that project was modified. Full capture:
`.agents/tasks/unity-6.4-compat-update/live-verification.md` → "ROUND 3".

### D-1 — ADDED: `unity_docs` needs an UNQUALIFIED class name; the miss is silent — VERIFIED

- **VERIFIED:** `unity_docs(action:"get_doc", class_name:"UnityEngine.Rigidbody2D")` returned
  `{"success":true,"data":{"found":false,...}}`, while `class_name:"Rigidbody2D"` returned
  `found:true`. `unity_reflect` accepts either form (`Rigidbody2D`, `UnityEngine.GameObject`).
  The failure shape is `success: true` + `found: false` — a **silent miss**, not an error.
- **Why it mattered:** it undermined POWER.md's own "confirm with `unity_reflect`, then document with
  `unity_docs`" guidance. An agent passing a qualified name to `unity_docs` gets `found:false` and
  can wrongly conclude the API is absent.
- **Changed:** POWER.md's `unity_docs` / `unity_reflect` row in Available MCP Tools and its
  Workflow 8 "API change detection" step; `steering/knowledge-management.md`'s docs-tool note plus
  step 4 of API Change Detection. All now state the parameter-form difference and that a
  `found:false` means "wrong name form or spelling", never "API absent". The same places note that
  `unity_reflect(get_type)` returns `obsolete_members`, which is the live deprecation check.

### D-2 — CORRECTED: `find_in_file` searches C# scripts only — VERIFIED; success path UNVERIFIED

- **VERIFIED:** `find_in_file(uri:"Assets/Scenes/SampleScene.unity", pattern:"m_Name")` failed with
  `Script not found at 'Assets/Scenes/SampleScene.cs'.` — the tool rewrites the extension to `.cs`.
  Its own parameter description implies a general asset search, which is misleading. `find_in_file`
  was added to the docs by the previous pass with that misleading framing.
- **UNVERIFIED:** the success path. The project contains **zero `.cs` assets**
  (`manage_asset(action:"search", path:"Assets/", search_pattern:"*.cs")` → 0), which equally blocks
  success-path verification of `get_sha`, `validate_script`, `apply_text_edits` and
  `script_apply_edits`.
- **Changed:** POWER.md's `find_in_file` row (now "searches C# scripts only", with the observed
  error), the Workflow-7 mention, a new script-tool bullet carrying the UNVERIFIED success-path
  note, and a new "Targeted Search Inside a Script" block in `steering/code-quality.md`.

### D-3 — ADDED: Unity 6.4 obsolete physics members → current replacements — VERIFIED

- **VERIFIED via `unity_reflect(get_type)`'s `obsolete_members`:** `Rigidbody2D`
  (`UnityEngine.Physics2DModule`) — `angularDrag`, `drag`, `fixedAngle`, `isKinematic`,
  `OverlapCollider`, `velocity`, `velocityX`, `velocityY`; `Rigidbody`
  (`UnityEngine.PhysicsModule`) — `angularDrag`, `drag`, `SetDensity`, `velocity`.
- **VERIFIED replacements** (each confirmed present in the same type's `properties` list):
  `velocity`→`linearVelocity` (2D+3D), `velocityX`/`velocityY`→`linearVelocityX`/`linearVelocityY`
  (2D only), `drag`→`linearDamping` (2D+3D), `angularDrag`→`angularDamping` (2D+3D),
  `isKinematic`→`bodyType` (`RigidbodyType2D`) — **2D only**. The asymmetry is explicit everywhere
  it is written: 3D `Rigidbody.isKinematic` is still valid and non-obsolete and must **not** be
  rewritten to `bodyType`.
- **UNVERIFIED:** replacements for `fixedAngle`, `OverlapCollider` (2D) and `SetDensity` (3D) — they
  are reported obsolete, but no substitute was established, so the docs say to confirm with
  `unity_reflect` / `unity_docs` before recommending one.
- **Nothing was wrong to begin with.** A grep confirmed both workshops contain zero occurrences of
  `velocity`, `drag`, `angularDrag`, `isKinematic`, `velocityX`, `velocityY`, `FindObjectOfType`,
  `Input.GetAxis` or `GetComponent<`. The defect was a **gap**: the prompts describe physics in
  Chinese prose without naming any API, so an agent generating the code from memory very likely
  emits the classic obsolete `rb.velocity` pattern on a 6.4 project.
- **Changed:** `workshop/2d-platformer-game.md` and `workshop/2d-shooter-game.md` each gained one
  compact, clearly-marked "Unity 6.4 的物理 API 名稱" block in the prerequisites, and the prompt steps
  that previously said "velocity" only in prose now name the property — platformer: horizontal move
  and jump (step 2), respawn zeroing (step 4), stomp detection and bounce (step 6); shooter: player
  movement (step 2), bullet flight (step 3), enemy descent (step 4). Written in Traditional Chinese
  to match those files, with API identifiers left in English. `SceneManager.LoadScene` — the only
  concrete API the workshops already named (platformer L328 / shooter L230 before this pass, L344 /
  L248 after the inserted blocks) — is current and was left alone.
- **Canonical mapping table:** `steering/code-quality.md` → "Current Physics APIs on Unity 6.4
  (obsolete → current)", chosen because that file already owns API-correctness guidance (the "Unity
  6.4 Code Quality Changes" section). `steering/unity-general.md` cross-references it **by section
  name** under "Unity Version Compatibility Notes" and does not restate it, per the no-duplication
  convention of the earlier passes. The table cites `unity_reflect` against the live
  `6000.4.6f1` Editor on 2026-10-21 and names `obsolete_members` as the way to re-check on another
  Editor version.

### D-4 — RECORDED: newly verified read-only calls — VERIFIED (no doc change needed)

`manage_script_capabilities()` (`max_edit_payload_bytes` **262144**, eight `ops`, four `text_ops`,
`using_guard`, `extras.get_sha`), `manage_scene(get_loaded_scenes)`, `manage_graphics(feature_list)`
(`PC_Renderer`, `ScreenSpaceAmbientOcclusion`), `manage_graphics(skybox_get)`,
`manage_asset(get_info)`, `manage_profiler(get_counters, category:"Memory")` (44 counters, each
returned as `<name>` / `<name>_valid` / `<name>_unit` triples) and `manage_camera(get_brain_status)`
(fails with an explicit "needs `com.unity.cinemachine`" message rather than silently). These
**confirm** what the repo already says — the `manage_script_capabilities`-before-large-edit
guidance, and the "`create_camera` works with or without Cinemachine, `*_brain_*` actions do not"
wording — so this pass changed no documentation for them. They are logged in live-verification.md
as regression probes.

### D-5 — Local absolute paths scrubbed from the committed research records

`findings.md` (4 hits) and `live-verification.md` (2 hits) contained the verifying user's
home-directory prefix. This is a public repo, so the prefix is now the neutral placeholder
`<user-home>` (`<user-home>\kiro-workshop`, `<user-home>\.kiro\settings\permissions.yaml`). Every
path stays meaningful and no technical claim changed: the Unity project folder **name**
(`kiro-workshop`), the `Library\MCPForUnity\RunState\mcp_http_<port>.pid` port-discovery path and
the `~/.kiro/settings/permissions.yaml` reference are all intact, because the port-discovery
guidance (C-4) and the permission-deny root cause (C-5/RC-7b) depend on them. No secret was
exposed: the instance token is a `<token>` placeholder in all four places it appears, and the only
hex id in the records is the 16-char instance hash in `kiro-workshop@b81f852b5f42fc9d` (an instance
identifier, not a credential).

### Preserved unchanged by Round 3

The Unity 6.4 (`6000.4`) baseline with pinned patch `6000.4.12f1` and minimum Editor 6.0; zero
references to 6.7 / `6000.7`; the MCP for Unity v10.3.0 target; the restored `manage_editor`
`telemetry_status` / `telemetry_ping` rows (real, direct-call-only actions per C-1); the
`batch_execute` server-layer divergence caveat (C-2); tool-group activation phrased as conditional
troubleshooting only (C-3); the `permissions.yaml` MCP deny-rule root cause and the pidfile
port-discovery guidance (C-4/C-5); `class_name` (never `type_name`); the `by_name`-style prefixed
`search_method` values; and the five localized READMEs each in their own language. No `src/*.ts`,
template, hook or `mcp.json` file was touched by this pass.

---

## 15. Round 4 applied (2026-10-21, fourth pass — live 9.6.8 -> 10.3.0 bridge upgrade)

Round 4 is the first pass with any **observed** v10 data. The bridge on the verification machine was
actually upgraded from 9.6.8 to 10.3.0 and the whole upgrade was watched: process command lines,
the Unity editor log, `Packages/manifest.json`, the uv cache archives, the pidfile, and the
GitHub/PyPI release metadata. The user's Unity stayed on `6000.4.6f1`. Full capture:
`.agents/tasks/unity-6.4-compat-update/live-verification.md` -> "ROUND 4".

**The one-line summary of the verification status change:** the release/tag/PyPI facts, the v10.3.0
server CLI surface, the two-pin architecture, the upgrade procedure and its failure modes are now
**VERIFIED (observed)**. The v10.3.0 **tool inventory and every per-tool contract** are still
**UNVERIFIED (documentation-derived)**, because the restart invalidated the client's MCP session
before a single v10 tool could be called.

### E-1 — v10.3.0 is the current release and the matching server exists — VERIFIED (release metadata)

- GitHub `releases/latest`: `tag_name` / `name` `v10.3.0`, `published_at` 2026-10-04T02:52:24Z,
  `prerelease: false`, `target_commitish: "beta"`, asset `unity-mcp-10.3.0.mcpb`.
- PyPI: `mcpforunityserver-10.3.0.tar.gz`, uploaded 2026-10-04T02:52:47Z (same minute as the GitHub
  release), `requires_python: ">=3.10"`.
- Release-notes items that affect this Power, recorded with their sources: a Unity 6000.6
  `InstanceIDToObjectCompat` fix; `fix(stdio): refresh port discovery before reconnect backoff`;
  `fix(read_console): stop the Console window's filters from hiding entries`; upstream docs on
  where to look when a tool is missing from the tool list; the new Blender Bridge; and
  auto-discovery of fal / OpenRouter asset-generation models.
- **Documented in:** POWER.md -> "What v10.3.0 is, with sources" under the new "Upgrading the
  bridge" section; README.md and all four localized READMEs -> the "What v10.3.0 is" paragraph of
  each file's new upgrade section, each written in that file's own language.
- **Label:** VERIFIED from release metadata. Not a claim about runtime behaviour.

### E-2 — ROOT CAUSE, and a documentation bug in this repo: installing with `#main` — VERIFIED

- **Observed:** the machine's `Packages/manifest.json` held
  `"com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main"`
  while the resolved package was **9.6.8** and upstream was already **10.3.0**.
- **VERIFIED mechanism:** Unity resolves a git UPM dependency **once** and caches the resolved
  commit. A moving ref such as `#main` does **not** track the branch, so the user sits on whatever
  commit was current at first resolve, indefinitely, with no upgrade prompt. Changing the ref to an
  explicit tag changes the dependency string, which forces a re-resolve and actually upgrades.
- **Why it is the highest-impact item:** `POWER.md` and all five READMEs instructed `#main`. Anyone
  following those instructions was set up to be stranded on whatever version they first installed,
  and a months-old bridge does not match the tool surface this Power documents — a direct
  contributor to the reported "cannot drive Unity".
- **Changed:** the documented install ref is now the pinned tag **`#v10.3.0`** in `POWER.md`
  (Installation Steps) and in `README.md`, `README_CN.md`, `README_JP.md`, `README_KR.md`,
  `README_ZH.md`. Each file states, in its own language, (a) why a pinned tag rather than `#main`,
  (b) that `#main` strands the user on a cached old commit with no update prompt, and (c) how to
  upgrade later — edit the tag in `Packages/manifest.json`, or remove and re-add the git URL with
  the new tag. `openupm add com.coplaydev.unity-mcp` is named as the registry alternative, since a
  registry install does surface updates in Package Manager. The change is framed honestly as a
  **corrected instruction**, and each file records that the failure was reproduced on a real
  install. The "pin a release instead of tracking `main`" bullet is gone: `#main` is no longer
  offered as an option anywhere.
- **Label:** VERIFIED (reproduced on a real install).

### E-3 — THE TWO INDEPENDENT VERSION PINS — VERIFIED

- **VERIFIED architecture:** MCP for Unity is two components with separately pinned versions — the
  Unity UPM package (C# editor side), pinned in `Packages/manifest.json`; and the Python MCP server,
  pinned in its launch command line. The pre-upgrade launch line, observed verbatim:
  `uvx --from "mcpforunityserver==9.6.8" mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile <project>\Library\MCPForUnity\RunState\mcp_http_8080.pid --unity-instance-token <token>`.
  Observed process tree: `uvx.exe` -> `uv.exe tool uvx --from mcpforunityserver==9.6.8` ->
  `mcp-for-unity.exe` (uv cache archive `hIhdP2TZcOvbkf3X`) -> `python.exe` holding port 8080.
- **VERIFIED consequence:** upgrading the UPM package alone does **not** upgrade the Python server.
  After the manifest moved to `#v10.3.0` and Unity imported and compiled the v10.3.0 C# cleanly (the
  editor log showed the new `Editor/Services/Blender`, `Editor/Tools/AssetGen` and
  `Editor/Security/SecureKeyStore` trees importing with zero `error CS`), the running server still
  reported `server.version: "9.6.8"` from the old cache archive.
- **VERIFIED failure mode, and it is selective:** with C# at 10.3.0 and Python at 9.6.8, every
  Unity-dependent tool call returned
  `{"success":false,"error":"Unity session not available; please retry","data":{"reason":"no_unity_session","retry_after_ms":250}}`
  while server-layer-only tools such as `debug_request_context` kept answering normally. The server
  looks alive; nothing touching Unity works.
- **VERIFIED recovery:** stop the stale server process chain, then start the server from Unity
  (`Window > MCP for Unity > Start Server`). Unity, now running v10.3.0 C#, relaunched it with a
  matching pin:
  `uvx --offline --from "mcpforunityserver==10.3.0" mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile ... --unity-instance-token ...`
  from a **new** uv cache archive `i8nZG0Ewwibnn1em`, port 8080 listening, both components at
  10.3.0. Three specifics that are easy to lose and were all observed: the server did **not**
  auto-restart after the package upgrade **nor** after the process chain was killed — the explicit
  Start Server action in Unity was required; a stale `mcp_http_<port>.pid` file was left behind in
  `<project>\Library\MCPForUnity\RunState\` and had to be removed manually; and pre-seeding the uv
  cache with `uvx --from "mcpforunityserver==10.3.0" mcp-for-unity --help` made the restart fast and
  let Unity launch with `--offline` (a useful tip on a slow network).
- **Documented in:** POWER.md -> new `### Upgrading the bridge — two independent version pins`
  section (the two-component table, the observed launch lines and process chain, the mismatch
  failure mode, an ordered 8-step upgrade procedure, and the `no_unity_session` vs `Session not
  found` comparison); a new Error Handling row keyed on the `no_unity_session` / "Unity session not
  available" symptom whose **first suspect is a C#-vs-Python version mismatch**; a new step 4 in the
  Connection Health Check that tells the agent to read the failure text before diagnosing; the
  Unity 6.4 Baseline table (new "Live-verified bridge upgrade" row); the MCP Connection section's
  parenthetical about `server.version` matching the package (now says a skew is exactly what an
  upgrade produces); and the Unity 6.4 Baseline "update the package" advice, which now points at the
  upgrade section because updating the package alone leaves the server behind.
  `steering/unity-general.md` -> two new Failure Diagnosis rows (`no_unity_session`,
  `Session not found`) and an expanded "Invalid Response Format" row. README.md plus all four
  localized READMEs -> a new upgrade section with the two-pin table, the observed launch line, the
  ordered procedure and a troubleshooting row each, in each file's own language.
- **Label:** VERIFIED (observed end to end on one machine, Windows, HTTP transport).

### E-4 — the client's MCP transport session does not survive a server restart — VERIFIED

- **VERIFIED:** after the server restarted at 10.3.0, the already-connected Kiro client's calls
  failed with `{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Session not found"}}`.
  The client must reconnect (Kiro's MCP Server panel -> reconnect, or restart the client) to get a
  new session and re-read the tool list.
- **This is a different error from E-3's `no_unity_session`** — transport session vs. Unity bridge —
  and the two are made explicitly distinct everywhere they are written, with a comparison table
  stating that a reconnect does not fix `no_unity_session` and matching the version pins does not
  fix `Session not found`.
- **Documented in:** POWER.md -> `#### The client session does not survive a server restart` with
  the two-error comparison table, step 7 of the ordered upgrade procedure ("Reconnect the MCP
  client", marked not optional), the new `Session not found` Error Handling row, and the Connection
  Health Check's read-the-error step. README.md and the four localized READMEs -> the "two errors
  that look alike and are not" table, the reconnect step in the procedure, and a troubleshooting
  row. `steering/unity-general.md` -> the `Session not found` Failure Diagnosis row.
- **Label:** VERIFIED. It also explains why no v10 tool could be exercised (see "Still UNVERIFIED"
  below).

### E-5 — v10.3.0 server CLI surface — VERIFIED (from `mcp-for-unity --help` on 10.3.0)

```
mcp-for-unity [-h] [--default-instance INSTANCE] [--transport {stdio,http}] [--http-url URL]
              [--http-host HOST] [--http-port PORT] [--http-remote-hosted]
              [--api-key-validation-url URL] [--api-key-login-url URL]
              [--api-key-cache-ttl SECONDS] [--api-key-service-token-header HEADER]
              [--api-key-service-token TOKEN] [--unity-instance-token TOKEN] [--pidfile PATH]
              [--project-scoped-tools]
```

- **New in v10** relative to the 9.6.8 launch line: `--http-host` / `--http-port` as separate
  options alongside `--http-url`; `--http-remote-hosted`; the `--api-key-*` group (remote-hosted
  auth); and `--default-instance`. `--project-scoped-tools` and `--unity-instance-token` carry over.
- **Consequence for the docs:** this **confirms** the stdio fallback form already documented
  (`uvx --from mcpforunityserver mcp-for-unity --transport stdio`) is correct — it was **not**
  changed. The only addition is that pinning a version in `--from` is the real-world convention,
  matching what Unity's own launcher does.
- **Documented in:** POWER.md -> `#### v10.3.0 server CLI surface` plus a pointer added to the
  existing stdio note; README.md and the four localized READMEs -> the CLI paragraph at the end of
  each upgrade section, in each file's own language.
- **Label:** VERIFIED (CLI help output on 10.3.0).

### Verification status labels corrected (Task 5)

Blanket "all v10 claims are documentation-derived" statements were replaced with a statement that
splits observed from not-observed:

- **POWER.md** -> the Available-MCP-Tools verification-scope note now has three parts: what was
  checked on 9.6.8; what the 10.3.0 upgrade **did** verify (release metadata, CLI surface, two-pin
  architecture, failure modes, recovery) and what it **did not** (tool inventory, group catalog,
  per-tool contracts, `asset_gen` and its default state); and the explicit warning that the three
  behavioural findings below it were observed on 9.6.8 and must be re-checked on 10.3.0 (C-2
  `batch_execute`, D-1 `unity_docs` name form, D-2 `find_in_file` `.cs` coercion). The Unity 6.4
  Baseline table gained a "Live-verified bridge upgrade" row with the same split. The Tool Groups
  table is now explicitly labelled documentation-derived (the live `list_groups` seen was 9 groups /
  43 tools on 9.6.8, not 10 groups / 49 tools). The `asset_gen` subsection is labelled
  documentation-derived in full, **including whether the group is off by default**, which matters
  because those tools spend the developer's third-party credits.
- **README.md and the four localized READMEs** -> the Unity 6.4 baseline blockquote now says the
  bridge was upgraded to 10.3.0 and the upgrade observed, but no v10.3.0 tool was ever called, so
  v10.3.0's tool inventory and per-tool behaviour remain documentation-derived. Each in its own
  language.
- **`steering/unity-general.md`** -> the "Bridge target" bullet under Unity Version Baseline now
  enumerates observed vs. documentation-derived for v10.3.0 and names the three 9.6.8-only
  behavioural findings that need re-checking.
- The per-file "Verification scope" notes in `steering/asset-automation.md` and
  `steering/workflow-automation.md` already said their v10.3.0 content is reconciled against the
  generated tool reference and **not** live-verified. That is still exactly right, so they were left
  alone.

### Still UNVERIFIED after Round 4 — stated plainly

- **The v10.3.0 tool inventory and every per-tool contract.** No v10 tool was ever called: E-4's
  session invalidation hit before any could be. So v10's tool count, the group catalog, the
  `asset_gen` group — **including whether it is off by default**, which matters because it spends
  third-party credits — and all per-action parameters remain documentation-derived.
- **All mutating actions** — nothing in the user's project was modified in any round.
- **`run_tests` / `get_test_job`** end to end.
- **`manage_build`** — still blocked by the user's own `permissions.yaml` MCP deny rule (C-5).
- **Script-tool success paths** — the verification project contains zero `.cs` assets (D-2).
- **Whether the Round-2 / Round-3 findings still hold on 10.3.0.** C-2 (`batch_execute` bypassing
  server-layer action handlers), D-1 (`unity_docs` requiring an unqualified `class_name`) and D-2
  (`find_in_file` coercing the `uri` extension to `.cs`) were all observed on **9.6.8** and must be
  re-checked on 10.3.0.
- `manage_probuilder`, memory snapshots and Cinemachine `manage_camera` paths — packages absent.

### Preserved unchanged by Round 4

The Unity 6.4 (`6000.4`) baseline with pinned patch `6000.4.12f1` and minimum Editor 6.0; zero
references to 6.7 / `6000.7`; the restored `manage_editor` `telemetry_status` / `telemetry_ping`
rows (real, direct-call-only actions per C-1); the `batch_execute` server-layer divergence caveat
(C-2); tool-group activation phrased as conditional troubleshooting only, never as a mandatory step
and never asserted as the root cause (C-3); the `permissions.yaml` MCP deny-rule root cause and the
`power-<powerName>-<serverName>` namespace (C-5); the pidfile port-discovery guidance (C-4);
`class_name` never `type_name`; the prefixed `by_name`-style `search_method` values; the Unity 6.4
obsolete-physics mapping with the 2D-only `isKinematic` -> `bodyType` asymmetry (3D `isKinematic` is
still valid and nothing anywhere tells a reader to change it); the `unity_docs` unqualified-name
trap; and `find_in_file` being C#-script-only. The stdio fallback command form was **confirmed, not
changed**. No `src/*.ts`, template, hook or `mcp.json` file was touched by this pass, and each
localized README stays in its own language.
