# Scene Scaffolding Acceleration Steering

<!-- File Purpose / 本檔案用途: Unity scene scaffolding steering guide / Unity 場景架構快速搭建的 steering 指引，涵蓋場景模板載入、GameObject 階層生成、衝突處理及生成摘要。 -->

> **Product context**: This steering file provides Unity scene structure generation guidance. Configuration paths starting with `Assets/UnityAccelerator/` refer to the project-level extension folder inside your Unity project, where developers store custom presets, scaffolds, and templates that override the built-in ones. If you are adapting this guide for an unrelated Unity project, replace `UnityAccelerator` with your own project namespace (for example, `Assets/<YourProject>/Config/Scaffolds/`).

## Role and Purpose

This document provides Unity scene architecture expertise. When the developer requests scene structure generation, GameObject hierarchy creation, or scene template usage, apply the domain knowledge in this document to translate high-level intent into precise MCP tool call sequences.

## Workflow

### Standard Scene Generation Process

```
Confirm type → Load Scaffold → Create scene → Build hierarchy → Check conflicts → Generate summary
```

1. **Confirm Scene Type**: Confirm the required scene type with the developer (2D platformer, 3D first-person, UI menu, open world, multiplayer lobby, architectural visualization, training simulation, data visualization, educational tool)
2. **Load Scaffold**: Load the corresponding Scene_Scaffold JSON from `templates/scaffolds/` (custom location takes priority; falls back to built-in templates)
3. **Create Scene**: Use `manage_scene(action: "create")` to create a new scene or open the target scene
4. **Build Hierarchy**: Following the Scaffold hierarchy definition, recursively create objects and components using `manage_gameobject`, `manage_components`, `manage_camera`, `manage_ui`
5. **Check Conflicts**: Use `find_gameobjects` to check if objects with the same name already exist in the target scene
6. **Generate Summary**: Calculate the number of created objects and component list, display a structured summary in Console

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
> - `batch_execute` commands use a `params` key, not `args`

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

## Conflict Handling Guide

### Conflict Detection Flow

Before creating objects, use `find_gameobjects` to check if objects with the same name already exist in the target scene:

```
find_gameobjects(search_term: "FPSController", search_method: "by_name")
```

Both `search_term` and `search_method` are required — there is no generic `name:` or `filter:` shorthand.

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

### Unity 6 Rendering & Lighting Notes for New Scenes

- New scenes created in a URP project default to **Render Graph** (URP 17+) rather than the legacy Compatibility Mode — no scaffold action is needed, this is a project-level Graphics setting, not a per-scene one
- When scaffolding scenes with many repeated static meshes (e.g., `open-world-base`), mention to the developer that enabling the **GPU Resident Drawer** (Forward+ rendering path required) can reduce draw calls significantly — this is a Project Settings change, not something `manage_gameobject` configures per-object, so surface it as a follow-up suggestion rather than doing it automatically
- For baked lighting, **Adaptive Probe Volumes (APV)** are URP's modern replacement/complement to manually placed Light Probe Groups — Unity places probes automatically based on scene geometry density. When a scaffold calls for baked GI (e.g., architectural walkthroughs, static environments), suggest APV via Lighting window → Light Probe Lighting → Adaptive Probe Volumes instead of manually authored Light Probe Groups
- `ReflectionProbe` with `"mode": "Baked"` (as used in `open-world-base.json`) remains valid in Unity 6 — Forward+ and Deferred+ both support reflection probes with indirect draws

### Custom Scaffold Recommendations

- Developers can save existing scene structures as custom Scaffolds
- Custom Scaffolds are stored in `Assets/UnityAccelerator/Config/Scaffolds/` (replace `UnityAccelerator` with your own namespace if adapting this template for a different project)
- Add descriptive names and category classification to custom Scaffolds
