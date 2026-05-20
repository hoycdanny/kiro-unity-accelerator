# Project Organization & Version Control Steering
<!-- File Purpose / 本檔案用途: Unity project organization and version control steering guide / Unity 專案組織與版本控制的 steering 指引，涵蓋標準資料夾結構、命名規範、.meta 檔案管理、Prefab 最佳實踐、版本控制建議及關卡設計工作流程。 -->

## Role and Purpose

Unity projects accumulate hundreds of assets quickly. Without an agreed folder layout, naming convention, and version-control practices, finding things slows everyone on the team — and the effort required to reorganize a project typically increases significantly as the project grows and more assets accumulate. This guide captures the layout patterns that Unity's official Style Guide recommends, plus practical adjustments commonly made by studios for production projects (especially around Resources/, Assembly Definitions, and 2D-specific concerns). Use it whenever a developer asks about project structure, naming conventions, or version-control setup.

## Standard Folder Structure (Based on Unity Official Best Practices)

The structure below is the baseline most teams converge on. Smaller prototypes can collapse `Scripts/Core` and `Scripts/Gameplay` into one folder; larger projects often add team-specific folders such as `Cinematics/`, `Localization/`, or `Tests/`. Keep the asset-type folders (Animations, Audio, Materials, Models, Prefabs, Scenes, Shaders, Textures) — search and onboarding both rely on those names being predictable.

```
Assets/
├── Animations/          # AnimationClips, Animator Controllers
├── Audio/
│   ├── Music/           # Background music (.wav, .ogg)
│   └── SFX/             # Sound effects (.wav, .mp3)
├── Editor/              # Editor-only scripts (not included in builds)
├── Materials/           # Materials (.mat)
├── Models/
│   ├── Characters/      # Character models (.fbx, .obj)
│   └── Environment/     # Environment models
├── Plugins/             # Third-party plugins
├── Prefabs/             # Prefab objects (.prefab)
├── Resources/           # Assets loaded via Resources.Load (use sparingly)
├── Scenes/              # Scene files (.unity)
├── Scripts/
│   ├── Core/            # Core systems (GameManager, EventSystem)
│   ├── Gameplay/        # Gameplay logic
│   ├── UI/              # UI-related scripts
│   └── Utils/           # Utility classes
├── Shaders/             # Custom Shaders
├── StreamingAssets/     # Files copied as-is to the build
├── Textures/            # Textures (.png, .jpg, .tga)
└── ThirdParty/          # Third-party assets (separated from owned assets)
```

## Folder Rules

The rules below split into "must follow" (breaking these usually creates a build- or runtime-level problem) and "recommended" (style and ergonomics). When scanning a project, treat the must-follow list as warnings worth surfacing immediately and the recommended list as suggestions only.

### Must Follow
- **Do not** place large amounts of assets in `Resources/` — all assets under Resources are included in the build, even if unreferenced
- **Use** Addressables or AssetBundles instead of Resources.Load for dynamic loading
- Scripts in the `Editor/` folder are only available in the Unity Editor and are not included in builds
- Files in `StreamingAssets/` are copied as-is to the build output
- Use separate Assembly Definitions (.asmdef) for each feature module to speed up compilation

### Recommended
- Document file naming conventions and folder structure in a Style Guide
- Do not use spaces in file and folder names (causes issues with command-line tools)
- Separate test/sandbox areas; create dedicated folders for informal scenes
- Avoid creating additional folders at the project root level

## Asset Naming Conventions

A common cause of merge conflicts on Unity projects is files that look the same in the Project window but differ by case or trailing space. The conventions below come from real production projects: PascalCase for classes and assets, prefixes for asset categories (M_, T_, S_), and Unity's official C# Style Guide for fields. If a team already has a different convention, keep theirs — consistency matters more than the specific scheme.

### C# Script Naming

> Note: Prefix conventions come from the Unity official C# Style Guide. Each prefix uses a single letter as a memory aid:
>
> - `m_` = **m**ember (member field)
> - `k_` = **k**onstant (prefix for constants, adopted from C++ style guides)
> - `s_` = **s**tatic
>
> Teams can adjust as needed.

| Type | Convention | Example |
|------|-----------|---------|
| Class | PascalCase | `PlayerController`, `GameManager` |
| Interface | I + PascalCase | `IDamageable`, `IInteractable` |
| Method | PascalCase | `TakeDamage()`, `Initialize()` |
| Private field | m_ + camelCase (m_ = member) | `m_currentHealth`, `m_moveSpeed` |
| Constant | k_ + PascalCase (k_ prefix for constants; from the German word "Konstante," adopted by C++ style guides) | `k_MaxHealth`, `k_DefaultSpeed` |
| Static field | s_ + camelCase (s_ = static) | `s_instance`, `s_sharedData` |
| Public property | PascalCase | `MaxHealth`, `MoveSpeed` |
| Enum | PascalCase | `GameState.Playing`, `DamageType.Fire` |
| Event | Verb phrase | `DoorOpened`, `PointsScored` |

### Asset Naming
| Type | Convention | Example |
|------|-----------|---------|
| Scene | PascalCase | `MainMenu.unity`, `Level01.unity` |
| Prefab | PascalCase | `EnemySpider.prefab`, `HealthBar.prefab` |
| Material | M_ + description | `M_Character_Skin.mat` |
| Texture | T_ + description + type | `T_Character_Diffuse.png`, `T_Wall_Normal.png` |
| Animation | Anim_ + description | `Anim_Idle.anim`, `Anim_Run.anim` |
| Shader | S_ + description | `S_Toon_Outline.shader` |

## .meta File Management

- `.meta` files contain engine and editor-specific data and **must** be included in version control
- In Project Settings > Editor, confirm Asset Serialization Mode is set to Force Text
- Use Force Text mode so scene files are stored in text format, which helps with version control merging
- The `Library/` folder is a cache and **does not need** to be added to version control

## Prefab Best Practices

### When to Use
- Environment assets: Reusable trees, buildings
- NPCs: Character types that appear multiple times, using Overrides to differentiate behavior/appearance
- Projectiles/Items: GameObjects that need to be instantiated at runtime
- Player character: Placed at the starting point of each level

### Prefab Variant Workflow
1. Create a Base Prefab
2. Create a Variant from the Base Prefab (drag to the Project window)
3. Override properties that need to change on the Variant
4. Changes to the Base Prefab automatically propagate to all Variants

### Nested Prefab Considerations

Nested Prefabs are like building blocks within building blocks. They let you place one Prefab inside another, so a single Prefab can contain other Prefabs as part of its definition. For example, a Vehicle Prefab might contain a Wheel Prefab and a Driver Prefab, and any change you save to the Wheel Prefab automatically appears in every Vehicle that uses it.

In more technical terms: a parent Prefab references and contains child Prefabs as part of its definition, creating a hierarchical structure where edits to a child propagate to every parent that nests it.

- Use Nested Prefabs to build complex object hierarchies
- Team members can work on different Prefabs simultaneously
- Works well with version control systems

## Version Control Recommendations

### Recommended Solutions
| Solution | Use Case | Advantages |
|----------|----------|------------|
| Plastic SCM | Unity officially recommended | Best for handling large binary files, simplified artist mode |
| Git + LFS | Open source projects | Wide community support, free |
| Perforce | AAA studios | Excellent performance for large-scale teams |

### .gitignore Required Items
```
Library/
Temp/
Obj/
Build/
Builds/
Logs/
UserSettings/
*.csproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
```

## Scene Organization

- Use Multi-Scene Editing to allow team members to work independently
- Separate static and dynamic objects into different scene sections
- Use empty GameObjects as separators to organize the Hierarchy
- Place maintenance Prefabs and empty GameObjects at the world origin (0,0,0)
- Set the world floor at y = 0

## 2D Project Special Considerations (from the 2D Art e-book)

### Sprite Resolution Calculation
```
Maximum vertical resolution ÷ (orthographic camera size × 2) = Sprites PPU
```
Example: 4K (2160px) ÷ (camera size 5 × 2) = 216 PPU

### Sorting Layer Planning
- Plan the Sorting Layer structure during the design mockup phase
- 2D Lights depend on Sorting Layers; consider lighting behavior
- Avoid using too many Sorting Layers; use Order in Layer for further sorting
- Use the Sorting Group component to sort multi-sprite characters as a single element

### 2D Optimization Tips
- Use the 2D Light Batching Debugger to visualize batch processing
- Use Render Graph for automatic render pass optimization
- Use SRP Batcher (Scriptable Render Pipeline Batcher — a Unity optimization that reduces rendering overhead by grouping objects that share the same shader variant, resulting in better performance for scenes with many objects using similar visual styles)
- Use Sprite Atlas Analyzer to check atlas performance issues
- Install the Burst package to improve 2D Animation performance
- Enable the Animator's Culling option

## Multiplayer Project Organization (from the Multiplayer e-book)

### Netcode Architecture Choices
| Solution | Use Case | Features |
|----------|----------|----------|
| Netcode for GameObjects | Casual co-op games | Approachable, familiar MonoBehaviour workflow |
| Netcode for Entities | Competitive/large-scale games | DOTS/ECS (Data-Oriented Technology Stack / Entity Component System — Unity's high-performance architecture that organizes data for cache-friendly processing, enabling efficient handling of large numbers of entities), full prediction system (client-side movement prediction that hides network latency by simulating results locally before server confirmation arrives) |

### Multiplayer Performance Considerations
- Use NetworkVariable to synchronize persistent data (health, position)
- Use RPCs (Remote Procedure Calls — methods invoked across the network) for discrete events (shooting, using abilities)
- Minimize network traffic: only synchronize necessary data
- Use Data Culling (excluding non-essential updates from network traffic so that only relevant data reaches each client, reducing unnecessary processing)
- Use Delta Compression (sending only the differences since the last update rather than full state snapshots, significantly reducing bandwidth usage)
- Use Interest Management (prioritizing network updates based on relevance criteria such as distance or visibility — nearby objects update frequently while distant ones update less often)

## Level Design Workflow (from the Level Design e-book)

### White-boxing Process (creating placeholder geometry to test layout and gameplay before adding final art — also called "greyboxing" or "blockout"):
1. Use ProBuilder to create simple geometric shapes
2. Name each blocky asset (e.g., `wall_interior_w2_h4_l6`)
3. Use material colors to mark different functions (red = destructible, green = interactable)
4. Test game mechanics in gym/zoo scenes
5. After confirmation, have artists replace with final assets

### Player Path Planning
- **Critical Path**: The longest path to complete the game
- **Golden Path**: The optimal gameplay experience path
- **Secondary/Tertiary Paths**: Side quests, secrets, shortcuts
- Avoid making players backtrack through explored areas without rewards

### Rule of Three
The Rule of Three is a design principle suggesting that a new mechanic or interaction should typically be performed at least three times to help most users become familiar with it. The actual number of repetitions needed varies based on mechanic complexity, target audience, and context — adjust accordingly:
1. First encounter: Learn the basic operation
2. Second time: Reinforce memory, add slight complexity
3. Third time: A variation requiring more skill
