# Scene Scaffolding Acceleration Steering

<!-- File Purpose / 本檔案用途: Unity scene scaffolding steering guide / Unity 場景架構快速搭建的 steering 指引，涵蓋 ui 工具群組啟用、場景模板載入、GameObject 階層生成、衝突處理及生成摘要。 -->

> **Product context**: This steering file provides Unity scene structure generation guidance. Configuration paths starting with `Assets/UnityAccelerator/` refer to the project-level extension folder inside your Unity project, where developers store custom presets, scaffolds, and templates that override the built-in ones. If you are adapting this guide for an unrelated Unity project, replace `UnityAccelerator` with your own project namespace (for example, `Assets/<YourProject>/Config/Scaffolds/`).

## Role and Purpose

This document provides Unity scene architecture expertise. When the developer requests scene structure generation, GameObject hierarchy creation, or scene template usage, apply the domain knowledge in this document to translate high-level intent into precise MCP tool call sequences.

## Workflow

### Standard Scene Generation Process

```
Check Play Mode → Confirm type → Load Scaffold → Create scene → Build hierarchy → Check conflicts → Save → Generate summary
```

> **Tool group note**: `manage_scene`, `manage_gameobject`, `manage_components`, `manage_camera`, `find_gameobjects` and `batch_execute` are all in the default-on `core` group. `manage_ui` is declared in the `ui` group, reported off by default — but it was callable with no activation on the live-verified install. So activate nothing up front: if a scaffold asks for UI Toolkit elements, call `manage_ui`, and run `manage_tools(action: "activate", group: "ui")` **only if it is reported as not existing** (then the MCP client may need a refresh or reconnect). Each scaffold in `templates/scaffolds/` records which groups its tools belong to in `requiresToolGroups` / `optionalToolGroups` — that metadata is an ownership map for diagnosis, not a list of steps to run first. Canonical procedure: "Tool Group Activation (`manage_tools`)" in `unity-general.md`.

0. **PRECONDITION — confirm the Editor is NOT in Play Mode**: check `UnityEditor.EditorApplication.isPlaying` before step 3. While Play Mode is on, every call in steps 3–6 **returns success** and Unity then **silently discards the entire scaffold** when Play Mode exits — the scene is left unchanged and not even marked dirty, so no later step can detect it. If `isPlaying` is `True`, stop Play Mode (`manage_editor(action: "stop")`) and say so in the summary, or ask the developer; if `execute_code` is unavailable, ask them to confirm rather than assuming. See "Play Mode Discards Scaffolding Silently" below
1. **Confirm Scene Type**: Confirm the required scene type with the developer (2D platformer, 3D first-person, UI menu, open world, multiplayer lobby, architectural visualization, training simulation, data visualization, educational tool)
2. **Load Scaffold**: Load the corresponding Scene_Scaffold JSON from `templates/scaffolds/` (custom location takes priority; falls back to built-in templates). Read its `requiresToolGroups` array and activate each named group before building the hierarchy
3. **Create Scene**: Use `manage_scene(action: "create")` to create a new scene or open the target scene
4. **Build Hierarchy**: Following the Scaffold hierarchy definition, recursively create objects and components using `manage_gameobject`, `manage_components`, `manage_camera`, `manage_ui`. **Address each object by its scaffold name in every follow-up call — do not reuse the `instanceID` a `create` returned** (it is transient and negative, and a recompile renumbers everything; see the instance-ID note under "Conflict Detection Flow" below). If a step needs an id, re-resolve it with `find_gameobjects` right before that call
5. **Check Conflicts**: Use `find_gameobjects` to check if objects with the same name already exist in the target scene
6. **Save the Scene**: Call `manage_scene(action: "save")` **after every mutation has returned — as its own sequenced call, never alongside one**. Nothing built in step 4 is on disk until this call, and a save that races ahead of a mutation persists the scene without it — see "Scene Mutations Are Not Persisted Until You Save" and "The Save Must Be Sequenced After the Mutation" below. If the developer asked for a throwaway preview, skip the save *deliberately* and say so in the summary
7. **Generate Summary**: Calculate the number of created objects and component list, state whether the scene was saved, display a structured summary in Console

## Built-in Scene Scaffold Types

| Scaffold Name | Category | File | Use Case |
|---------------|----------|------|----------|
| 2D Platformer | 2D | `2d-platformer.json` | 2D side-scrolling platform game |
| 3D First Person | 3D | `3d-first-person.json` | 3D first-person shooter/exploration |
| UI Menu | UI | `ui-menu.json` | Main menu, settings screen |
| Open World Base | 3D | `open-world-base.json` | Open world base scene |
| Multiplayer Lobby | Multiplayer | `multiplayer-lobby.json` | Multiplayer game lobby |

> **Non-gaming use cases**: The built-in scaffolds cover common Unity project types including games, architectural visualization (3D building walkthroughs), training simulations (interactive learning environments), data dashboards (visual data displays), educational tools (interactive teaching applications), and more. Choose the scaffold that best matches your project structure. For example, an architectural walkthrough might start from `3d-first-person.json` but replace the FPSController with a WalkController and add measurement UI. You can save adapted structures as custom scaffolds for reuse (see Custom Scaffold Recommendations below).

## MCP Tool Call Sequence Examples

> **Verified syntax**: These sequences were confirmed against a live unity-mcp connection. Key corrections versus older drafts:
> - `manage_gameobject(action: "create", ...)` takes `components_to_add: [...]` (a list of component type names), **not** `components:`
> - `manage_camera(action: "create_camera", ...)` takes the camera name inside `properties: {"name": ...}`, **not** a top-level `name` param; it creates a basic `UnityEngine.Camera` unless Cinemachine is installed, in which case presets (`third_person`, `follow`, `static`, etc.) unlock richer behavior — pass the preset via `properties: {"preset": "static", ...}`
> - `manage_ui` manages **UI Toolkit** (UXML/USS/UIDocument) — there is no `create_canvas`/`create_panel`/`create_button`/`create_text` action. For legacy uGUI (`Canvas`, `Button`, `Text`, `Image`), build them with `manage_gameobject(action: "create", components_to_add: ["UnityEngine.UI.Canvas", "UnityEngine.UI.GraphicRaycaster"])` etc., then `manage_components(action: "set_property", ...)` to configure them
> - `batch_execute` commands use a `params` key, not `args` — and `batch_execute` is not equivalent to direct calls: it bypasses the Python server layer, so an `Unknown action` error raised inside a batch must be retested as a direct call before it is believed (see `unity-general.md`)
> - `manage_gameobject`'s `target` **must be a string** and is resolved as a **name** by default (an int is rejected with `Input should be a valid string`); `manage_prefabs` requires a **name**; `manage_components` additionally accepts an **int** instance ID. Passing the name satisfies all three — **VERIFIED on bridge 10.3.0, 2026-10-21**
> - `manage_components(action: "add")` takes a **built-in** type's short name (`Rigidbody2D`, `SpriteRenderer`, `BoxCollider2D` — all verified working) but needs an **assembly-qualified** name for a script from the project: `component_type: "PlayerController"` failed with `Component type 'PlayerController' not found. Use a fully-qualified name if needed.` while `"PlayerController, Assembly-CSharp"` succeeded — **VERIFIED on 10.3.0, 2026-10-21**. See "Attaching a User Script Needs an Assembly-Qualified Type Name" below
> - `manage_scene` `create`, `save` and `load` are **VERIFIED on 10.3.0, 2026-10-21**, and `create` with `name` + `path` **auto-creates its target folder**. `manage_gameobject`'s `components_to_add` is verified too: `SpriteRenderer` + `Rigidbody2D` + `BoxCollider2D` attached in one `create` call, with `tag` applied in the same call. `manage_components(action: "set_property")` also resolves `target` by **name**
> - `manage_ui(action: "create")` **requires `contents`** — **VERIFIED on 10.3.0, 2026-10-21**: omitting it fails with `'contents' parameter is required for create.` So author the UXML/USS text before the call; there is no "create the document empty, fill it later" path. The UI-menu sequence below already passes `contents` for exactly this reason
> - `manage_gameobject(action: "duplicate")` **ignores `name`** — **VERIFIED on 10.3.0**: duplicating `MCPVerify_Cube` with `name: "MCPVerify_Cube_Dup"` produced Unity's auto-name `MCPVerify_Cube_Copy`. To name a duplicate, follow it with `manage_gameobject(action: "modify", target: "<auto-name>", name: "<wanted>")`. The duplicate does correctly inherit the original's added components

### 3D First-Person Scene Generation (legacy uGUI HUD)

```
1. manage_scene(action: "create", name: "FPSLevel")
2. manage_gameobject(action: "create", name: "---Environment---")
3. manage_gameobject(action: "create", name: "Directional Light", components_to_add: ["UnityEngine.Light"])
4. manage_gameobject(action: "create", name: "Terrain", components_to_add: ["UnityEngine.Terrain", "UnityEngine.TerrainCollider"])
5. manage_gameobject(action: "create", name: "---Player---")
6. manage_gameobject(action: "create", name: "FPSController", components_to_add: ["UnityEngine.CharacterController"])
7. manage_camera(action: "create_camera", properties: { "name": "MainCamera" })
8. manage_gameobject(action: "modify", target: "MainCamera", parent: "FPSController")
9. manage_gameobject(action: "create", name: "HUDCanvas", components_to_add: ["UnityEngine.Canvas", "UnityEngine.UI.CanvasScaler", "UnityEngine.UI.GraphicRaycaster"])
10. manage_scene(action: "save")
```

> Step 8 is needed because `create_camera` does not take a `parent` param — reparent afterward via `manage_gameobject(action: "modify", target, parent)`.

### 2D Platformer Scene Generation

```
1. manage_scene(action: "create", name: "PlatformerLevel")
2. manage_gameobject(action: "create", name: "---Environment---")
3. manage_gameobject(action: "create", name: "Tilemap Grid", components_to_add: ["UnityEngine.Grid"])
4. manage_gameobject(action: "create", name: "Ground Tilemap", parent: "Tilemap Grid", components_to_add: ["UnityEngine.Tilemaps.Tilemap", "UnityEngine.Tilemaps.TilemapRenderer", "UnityEngine.Tilemaps.TilemapCollider2D"])
5. manage_gameobject(action: "create", name: "---Player---")
6. manage_gameobject(action: "create", name: "Player", components_to_add: ["UnityEngine.SpriteRenderer", "UnityEngine.Rigidbody2D", "UnityEngine.BoxCollider2D"])
7. manage_camera(action: "create_camera", properties: { "name": "Main Camera" })
8. manage_gameobject(action: "create", name: "GameUI", components_to_add: ["UnityEngine.Canvas", "UnityEngine.UI.GraphicRaycaster"])
9. manage_scene(action: "save")
```

### UI Menu Scene Generation (UI Toolkit approach)

```
1. manage_scene(action: "create", name: "MainMenu")
2. manage_ui(action: "create", path: "Assets/UI/MainMenu.uxml", contents: "<ui:UXML xmlns:ui=\"UnityEngine.UIElements\">...</ui:UXML>")
3. manage_ui(action: "create", path: "Assets/UI/MainMenu.uss", contents: ".menu-button { ... }")
4. manage_ui(action: "link_stylesheet", target: "Assets/UI/MainMenu.uxml", stylesheet: "Assets/UI/MainMenu.uss")
5. manage_gameobject(action: "create", name: "MenuUIDocument")
6. manage_ui(action: "attach_ui_document", target: "MenuUIDocument", source_asset: "Assets/UI/MainMenu.uxml")
7. manage_scene(action: "save")
```

> This builds the menu as a single UXML document (buttons/text/panels are `<ui:Button>`/`<ui:Label>`/`<ui:VisualElement>` elements inside the UXML content), which matches how `manage_ui` actually works. If the developer specifically wants legacy uGUI Canvas/Button/Text objects instead, build those via `manage_gameobject` + `manage_components` as described above, one GameObject per element.

### Batch Create Object Hierarchy

```
batch_execute(commands: [
  { "tool": "manage_gameobject", "params": { "action": "create", "name": "FPSController", "components_to_add": ["UnityEngine.CharacterController"] } },
  { "tool": "manage_components", "params": { "action": "add", "target": "FPSController", "component_type": "AudioListener" } },
  { "tool": "manage_camera", "params": { "action": "create_camera", "properties": { "name": "MainCamera" } } }
])
```

## Attaching a User Script Needs an Assembly-Qualified Type Name

**VERIFIED on bridge 10.3.0, 2026-10-21.** `manage_components(action: "add")` resolves built-in Unity types and project scripts differently, and the live tool description is misleading — it offers `'MyScript'` as an example `component_type`, implying a plain script name works.

| `component_type` | Result |
|---|---|
| `"PlayerController"` (a project script) | **FAILS** — `Component type 'PlayerController' not found. Use a fully-qualified name if needed.` |
| `"PlayerController, Assembly-CSharp"` | **SUCCESS** — `componentType: "PlayerController"` |
| `"Rigidbody"`, `"Rigidbody2D"`, `"SpriteRenderer"`, `"BoxCollider2D"` | **SUCCESS** with the short name |

**The rule: built-in types take the short name; a script from this project needs `"TypeName, Assembly-CSharp"`** (or the name of its assembly definition, if it lives in one). A scaffold that attaches generated behaviour scripts must emit the qualified form, or every such step fails.

**It is not a race with compilation.** In the same Editor, `execute_code` confirmed `System.Type.GetType("PlayerController, Assembly-CSharp")` returned `loaded: PlayerController base=MonoBehaviour` *before* the plain-name call was retried — and it failed again. The type was loaded; the short name simply does not resolve for user assemblies.

**Compilation is a separate problem, and `wait_for_ready` does not solve it.** `refresh_unity(mode: "force", compile: "request", wait_for_ready: true)` returned **immediately** with `resulting_state: "compiling"`, and the next `manage_components(action: "add")` failed because the assembly had not reloaded yet (**VERIFIED on 10.3.0**). `wait_for_ready` is **not** a synchronous barrier. After requesting a compile, poll `mcpforunity://editor/state` until `data.advice.ready_for_tools` is true — the `refresh_unity` response's own `hint` says exactly that — or retry the dependent call instead of assuming the refresh finished. A scaffold that writes a script and attaches it in the next breath must handle both failure modes.

## Play Mode Discards Scaffolding Silently — Check It First

**VERIFIED on bridge 10.3.0, 2026-10-21.** With the Editor in Play Mode, `manage_gameobject(action: "create", name: "MCPVerify_PlayModeObj", position: [5, 5, 5])` returned **full success** — `instanceID: -20212`, a complete transform block, and `scenePath: "Assets/Scenes/SampleScene.unity"`, i.e. exactly what a normal edit-mode create returns, pointing at the real scene asset. After `manage_editor(action: "stop")` the object was gone, the scene was back at its original **3** roots, and `isDirty` was **False**.

**The bridge will not stop you and will not warn you.** A scaffolding run started while Play Mode happens to be on reports every object created, every component attached and the scene saved — and leaves nothing behind at all. Because the scene is not even left dirty, there is **no after-the-fact signal**: no error to catch, no unsaved-changes hint, nothing to retry.

**So treat Play Mode as a precondition of the scaffolding flow, checked before step 3:**

```csharp
// execute_code — C# 6 compatible (default codedom compiler); verified in both edit mode and Play Mode
var s = UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene();
return "isPlaying=" + UnityEditor.EditorApplication.isPlaying +
  " isPaused=" + UnityEditor.EditorApplication.isPaused +
  " isCompiling=" + UnityEditor.EditorApplication.isCompiling +
  " dirty=" + s.isDirty + " roots=" + s.rootCount;
```

- If `isPlaying` is `True`: stop Play Mode with `manage_editor(action: "stop")` and record it in the summary, or ask the developer first — ending someone's Play session is their call.
- Never read a successful `create` as evidence the Editor was in edit mode.
- **Known gap**: `execute_code` is declared in the `scripting_ext` group (reported off by default), and **no non-`execute_code` way to read `isPlaying` was found on the verified client**. Do not substitute an invented resource field — if the snippet cannot run, ask the developer to confirm the Editor is not playing.
- Entering Play Mode is also a domain reload, so any instance ID held across it is stale — see the instance-ID note under "Conflict Detection Flow".

## Scene Mutations Are Not Persisted Until You Save

**VERIFIED on bridge 10.3.0, 2026-10-21.** Every scene mutation — `manage_gameobject` `create`/`modify`/`delete`, component adds, property sets — changes only the **in-memory** scene. Without `manage_scene(action: "save")` the file on disk is untouched, and loading a scene re-reads that stale file.

Observed: an object deleted from `SampleScene` without saving came **back**. After another scene was created and loaded and `SampleScene` was re-loaded from disk, `get_hierarchy` reported **4** roots instead of the baseline 3; the object had to be deleted again *and* explicitly saved before the file was clean.

- **A scaffolding run must save**, and the summary must say whether it did. Silence leaves the developer unable to tell whether the hierarchy survived.
- **Switching or reloading a scene discards unsaved changes.** Never treat a scene load as a way to refresh what you just built.
- **Cleanup has the same hazard**: deleting temporary objects without saving leaves them in the project on the next load.

### The Save Must Be Sequenced After the Mutation — Never Concurrent

**VERIFIED on bridge 10.3.0, 2026-10-21, and this mistake has now been made twice during this Power's own verification work.** `manage_scene(action: "save")` and a `manage_gameobject(action: "delete")` were issued as **parallel** calls. The save landed **first**, so the scene was written to disk *with* the object still in it and the delete survived only in memory. Re-running delete → save in that order fixed it.

**The ordering rule for every scaffolding run:**

- **Never issue a scene mutation and `manage_scene(action: "save")` concurrently.** Two calls sent together can land in either order, and the save captures whatever the in-memory scene holds at that moment.
- **Mutate first, then save — as a deliberately separate, later call.** The save is the last step of the group (step 6 of the flow above), not one of several calls fired at once.
- **The same rule governs `batch_execute` command order**: the `commands` array *is* the execution order, so every `manage_gameobject` / `manage_components` / `manage_ui` command must come before the `manage_scene(action: "save")` command — and do not set `parallel: true` on a batch that contains a save.
- **A scene that looks un-scaffolded after a successful save is usually this**, not a failed `create`. Re-read the hierarchy with `manage_scene(action: "get_hierarchy")`, re-apply what is missing, then save again.

## Conflict Handling Guide

### Conflict Detection Flow

Before creating objects, use `find_gameobjects` to check if objects with the same name already exist in the target scene:

```
find_gameobjects(search_term: "FPSController", search_method: "by_name")
```

Only `search_term` is required; `search_method` is optional, and its values are always prefixed — `by_name`, `by_tag`, `by_layer`, `by_component`, `by_path`, `by_id`. There is no generic `name:` or `filter:` shorthand.

> **Instance IDs are volatile — scaffold by NAME, never by a cached id (VERIFIED on bridge 10.3.0, 2026-10-21)**: `find_gameobjects` returns instance IDs only, and this is exactly the flow where that bites. A `manage_gameobject(action: "create")` returns a **transient, negative** id (observed: `-5560`); once Unity registers the object that id stops resolving (`target: "-5560"`, `search_method: "by_id"` → `Target GameObject ('-5560') not found using method 'by_id'`) and the object answers to a different positive id instead (observed: `50436`, then `50470` after a prefab was made from it). A recompile makes it worse: after a `refresh_unity`, **objects nobody touched were renumbered too** — Main Camera 49224 → 50412, Directional Light 49234 → 50422, Global Volume 49242 → 50430.
>
> So for scaffolding: **use the name the scaffold gave each object as the handle in every later step** — reparenting, adding components, setting properties, creating a prefab. A name is also the only `target` form all three object tools accept (`manage_gameobject` resolves `target` as a name by default, `manage_prefabs` requires a name, `manage_components` additionally accepts an int id). If a step really needs an id, call `find_gameobjects(search_term: "<name>", search_method: "by_name")` **immediately before** the call that consumes it, and never reuse it afterwards. Never hold an id across a `refresh_unity`, a recompile or entering Play Mode. Full detail: "Instance IDs Are Volatile — Never Cache One" and "The Three `target` Conventions" in `unity-general.md`.
>
> **Instance IDs are also opaque (Unity 6.4 `EntityId`)**: Unity 6.4 deprecates `InstanceID` in favour of a new `EntityId` type, so **treat a returned id as an opaque token — pass it straight back to the bridge; never do arithmetic on it, sort by it, or parse it.** Do not cast it to `int`, do not use its sign to decide whether it refers to an asset, do not round-trip it through `ToString` + `int.Parse`, and do not sort a batch's returned ids to recover the order the objects were created in — track creation order from your own command list instead. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21.

### Conflict Handling Options

If same-name objects are detected, ask the developer to choose:

| Option | Behavior |
|--------|----------|
| **Overwrite** | Delete same-name objects in the scene, recreate Scaffold-defined objects |
| **Rename** | Add a suffix to Scaffold objects (e.g., `FPSController_1`) to avoid conflicts |
| **Cancel** | Skip that object, continue processing remaining objects |

### Conflict Detection Example

```
1. Extract all object names from Scaffold hierarchy (including recursive children)
2. Call find_gameobjects for each name to check existence
3. Collect all conflicting names
4. If conflicts exist, list all conflicting objects at once for the developer to choose handling method
```

## Generation Summary Format

After scene generation completes, display a structured summary in Console:

```
=== Scene Generation Summary ===
Scene Name: FPSLevel
Scaffold: 3D First Person

Objects Created: 8
  - Directional Light
  - Terrain
  - FPSController
  - MainCamera
  - HUDCanvas
  - ...

Components:
  - Light, Terrain, TerrainCollider, CharacterController, Camera, Canvas, ...

Conflict Handling: No conflicts
Status: Complete
```

## Best Practices

### Scene Structure Conventions

- Use empty objects with `---GroupName---` format as group markers (e.g., `---Environment---`, `---Player---`)
- Camera objects should have the `MainCamera` tag set
- UI Canvas should use Screen Space - Overlay mode (default)
- Use Directional Light as the main light source

### Component Configuration Recommendations

| Scene Type | Recommended Components | Reason |
|------------|----------------------|--------|
| 3D First Person | CharacterController + AudioListener | Standard first-person controller setup (character movement and camera control) |
| 2D Platform | Rigidbody2D + BoxCollider2D | 2D physics interaction foundation (enables collision detection and physics-based movement) |
| UI Menu | Canvas + GraphicRaycaster + EventSystem | Required components for UI interaction |
| Open World | Terrain + WindZone + ReflectionProbe | Large scene environment foundation |

### Unity 6.4 Rendering & Lighting Notes for New Scenes

> **Version baseline**: Unity 6.4 (stream `6000.4`, pinned patch `6000.4.12f1`) with URP 17.4, the pairing this Power was verified on. Anything past 6.4 is forward-looking and unverified — see `unity-general.md` under "Unity Version Baseline (Unity 6.4)".

- Scenes in a URP project render through **Render Graph**. On Unity 6.4 that is the *only* path: **URP Compatibility Mode was removed in 6.4**, along with the `URP_COMPATIBILITY_MODE` scripting define, so there is no legacy mode for a scaffold to avoid or a developer to toggle. If a project being scaffolded still carries custom `ScriptableRenderPass` code using the legacy `Execute`/`Configure` pattern, that code must be ported to `RecordRenderGraph` before anything will render — surface it before scaffolding rather than after. Source: [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64), retrieved 2026-10-21
- For 2D scaffolds, Unity 6.4 adds the ability to inject a custom render pass into the URP 2D frame loop, so custom rendering and post-processing for 2D can live inside URP. Mention it as a follow-up option rather than scaffolding it. Source: [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64), retrieved 2026-10-21
- When scaffolding scenes with many repeated static meshes (e.g., `open-world-base`), mention to the developer that enabling the **GPU Resident Drawer** (Forward+ rendering path required) can reduce draw calls significantly — this is a Project Settings change, not something `manage_gameobject` configures per-object, so surface it as a follow-up suggestion rather than doing it automatically
- For baked lighting, **Adaptive Probe Volumes (APV)** are URP's modern replacement/complement to manually placed Light Probe Groups — Unity places probes automatically based on scene geometry density. When a scaffold calls for baked GI (e.g., architectural walkthroughs, static environments), suggest APV via Lighting window → Light Probe Lighting → Adaptive Probe Volumes instead of manually authored Light Probe Groups
- `ReflectionProbe` with `"mode": "Baked"` (as used in `open-world-base.json`) remains valid in Unity 6 — Forward+ and Deferred+ both support reflection probes with indirect draws

### Custom Scaffold Recommendations

- Developers can save existing scene structures as custom Scaffolds
- Custom Scaffolds are stored in `Assets/UnityAccelerator/Config/Scaffolds/` (replace `UnityAccelerator` with your own namespace if adapting this template for a different project)
- Add descriptive names and category classification to custom Scaffolds
