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

### 3D First-Person Scene Generation

```
1. manage_scene(action: "create", name: "FPSLevel")
2. manage_gameobject(action: "create", name: "---Environment---")
3. manage_gameobject(action: "create", name: "Directional Light", components: ["Light"])
4. manage_gameobject(action: "create", name: "Terrain", components: ["Terrain", "TerrainCollider"])
5. manage_gameobject(action: "create", name: "---Player---")
6. manage_gameobject(action: "create", name: "FPSController", components: ["CharacterController"])
7. manage_camera(action: "create", name: "MainCamera", parent: "FPSController")
8. manage_ui(action: "create_canvas", name: "HUDCanvas")
9. manage_scene(action: "save")
```

### 2D Platformer Scene Generation

```
1. manage_scene(action: "create", name: "PlatformerLevel")
2. manage_gameobject(action: "create", name: "---Environment---")
3. manage_gameobject(action: "create", name: "Tilemap Grid", components: ["Grid"])
4. manage_gameobject(action: "create", name: "Ground Tilemap", parent: "Tilemap Grid", components: ["Tilemap", "TilemapRenderer", "TilemapCollider2D"])
5. manage_gameobject(action: "create", name: "---Player---")
6. manage_gameobject(action: "create", name: "Player", components: ["SpriteRenderer", "Rigidbody2D", "BoxCollider2D"])
7. manage_camera(action: "create", name: "Main Camera", tag: "MainCamera")
8. manage_ui(action: "create_canvas", name: "GameUI")
9. manage_scene(action: "save")
```

### UI Menu Scene Generation

```
1. manage_scene(action: "create", name: "MainMenu")
2. manage_ui(action: "create_canvas", name: "MenuCanvas")
3. manage_ui(action: "create_panel", name: "BackgroundPanel", parent: "MenuCanvas")
4. manage_ui(action: "create_text", name: "TitleText", parent: "MenuCanvas", text: "Game Title")
5. manage_ui(action: "create_button", name: "StartButton", parent: "MenuCanvas", text: "Start Game")
6. manage_ui(action: "create_button", name: "SettingsButton", parent: "MenuCanvas", text: "Settings")
7. manage_ui(action: "create_button", name: "QuitButton", parent: "MenuCanvas", text: "Quit")
8. manage_camera(action: "create", name: "UICamera")
9. manage_scene(action: "save")
```

### Batch Create Object Hierarchy

```
batch_execute(commands: [
  { "tool": "manage_gameobject", "args": { "action": "create", "name": "FPSController", "components": ["CharacterController"] } },
  { "tool": "manage_components", "args": { "action": "add", "target": "FPSController", "component": "AudioListener" } },
  { "tool": "manage_camera", "args": { "action": "create", "name": "MainCamera", "parent": "FPSController" } }
])
```

## Conflict Handling Guide

### Conflict Detection Flow

Before creating objects, use `find_gameobjects` to check if objects with the same name already exist in the target scene:

```
find_gameobjects(name: "FPSController")
```

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

### Custom Scaffold Recommendations

- Developers can save existing scene structures as custom Scaffolds
- Custom Scaffolds are stored in `Assets/UnityAccelerator/Config/Scaffolds/` (replace `UnityAccelerator` with your own namespace if adapting this template for a different project)
- Add descriptive names and category classification to custom Scaffolds
