# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

> **Note on language availability**: README files are available in 5 languages to support our global community. Examples and demo steps are intentionally parallel across all language versions for consistency — each version is human-reviewed for natural phrasing in that language. Steering files (domain knowledge) are in Traditional Chinese with English summary sections at the top of each file. The Power responds in the developer's preferred language, even though steering files are in Traditional Chinese with English summaries. If you encounter any language barriers, please open an issue for community support.

Transform your IDE into a Unity development AI assistant. Use natural language to command Unity Editor via MCP (Model Context Protocol — a standardized way for AI assistants to interact with development tools, allowing developers to describe what they want in plain language instead of manually navigating menus or writing boilerplate scripts). This Power covers asset management, scene building, build automation, performance analysis, code quality checks, and more — with 40+ TypeScript tool modules and 14 domain knowledge files.

> **Unity 6.x aware, verified live**: Steering guidance covers current Unity 6 Update-release behavior — URP Render Graph as the default rendering path, the GPU Resident Drawer (Forward+/Deferred+ GPU instancing), the newer "scene reload only" Enter Play Mode default, the experimental CoreCLR scripting backend, and Unity's reported move away from the OculusXR package toward OpenXR. Rather than trusting a remembered version number, the Power checks the actual connected project via MCP — reading the real Unity version, active render pipeline, rendering path, scripting backend, and installed packages — before applying any version-specific advice.

> **Key Concepts**: Technical terms used throughout this document (if you are new to Unity development, these concepts will become clearer as you work through the examples — you do not need to understand them all upfront):
> - **MCP** (Model Context Protocol): A standardized protocol for AI assistants to communicate with development tools, enabling developers to use natural language to operate Unity Editor
> - **DAG** (Directed Acyclic Graph): A directed graph with no cycles, used to determine task dependency order (e.g., "import textures before creating materials")
> - **MVC** (Model-View-Controller): An architecture pattern that separates code into data (Model), display (View), and logic (Controller)
> - **ECS** (Entity-Component-System): Unity DOTS data-oriented architecture pattern for efficiently processing large numbers of objects (e.g., managing thousands of entities simultaneously)
> - **ScriptableObject**: Unity's serializable data container for storing configuration and shared data (without needing to attach to scene objects)
> - **AssetBundle**: Unity's asset packaging format for distribution and dynamic loading (reduces initial install size)

![Kiro Unity Accelerator Screenshot](image/README.png)

## Features

- **Asset Automation** — Batch apply asset presets, auto-detect asset types, generate change summaries
- **Scene Scaffolding** — One-command scene structure generation with conflict detection
- **Build Automation** — Local builds, build log parsing, optional cloud-assisted acceleration
- **Cross-Platform Testing** — Local simulation testing, result formatting, test suite conversion
- **Workflow Automation** — Multi-step workflows with DAG dependency validation and topological execution
- **Performance Analysis** — Profiler screenshot analysis, code anti-pattern scanning, optimization recommendations
- **Code Quality** — MVC/ECS/ScriptableObject architecture checks, circular dependency detection
- **Knowledge Management** — Team documentation management, API change tracking, staleness detection
- **Platform Compatibility** — Shader compatibility, memory budget checks, severity classification (including XR/VR)
- **Asset Dependency Management** — Dependency trees, orphan asset detection, AssetBundle duplication checks
- **Level Design Tooling** — Editor extension script generation, ScriptableObject templates, batch scene object configuration
- **UI Dependency Analysis** — Cross-file UI reference tracking, event chain analysis, coupling assessment

## Architecture

```
Developer (Natural Language)
    → AI Layer (Intent Understanding & Planning)
        → MCP Protocol
            → Unity Editor (Execution Layer)

Unity Accelerator (Intelligence Layer)
├── POWER.md        → Main document defining tools & workflows
├── steering/       → 14 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## Prerequisites

- [Unity Editor](https://unity.com/) installed with a project open (see Setup alternatives below if you have restricted installation access)
- [Kiro IDE](https://kiro.dev/docs/getting-started/installation) installed
- Node.js 18+ (for development/testing only — not required for basic usage with the Power)

> **Setup alternatives**: Choose the installation method that works for your environment:
> - **Standard setup**: Follow the steps below (requires unrestricted software installation access)
> - **Restricted environment**: See the Troubleshooting section for alternative configuration options (e.g., stdio transport mode — a method that runs the MCP server as a child process instead of using HTTP)
> - **Enterprise/managed environment**: If your organization manages software installations, consult your IT department about licensing and installation procedures
>
> Unity Editor offers a free Personal license for individuals, students, hobbyists, and small teams.

## Installation

### Step 1 — Install this Power in your IDE

Open Kiro → Left panel click Powers icon → Click "+" button → Select "Add Custom Power" → Select this project's root directory

> **Note**: The underlying Unity MCP tools ([CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)) are open-source and can also be used independently with any MCP-compatible client.

![Install Custom Power](image/Add-Kiro-Customer-Power.png)

### Step 2 — Install unity-mcp and Start MCP Server in Unity

1. Open Unity Editor → Window → Package Manager

   ![Step 1: Open Package Manager](image/Enable-Unity-MCP-Server-1.png)

2. Click "+" → "Add package from git URL..." → Paste the following URL and click Add:

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   ```

   ![Step 2: Add package from git URL](image/Enable-Unity-MCP-Server-2.png)

3. After installation, go to Window → Toggle MCP Window

   ![Step 3: Open MCP Window](image/Enable-Unity-MCP-Server-3.png)

4. Confirm MCP Server status shows green (running) and verify the server is listening on the MCP endpoint shown in the Unity MCP window

   ![Step 4: Confirm Server is running](image/Enable-Unity-MCP-Server-4.png)

### MCP Connection Configuration

#### Automatic Configuration (Recommended)

In the MCP for Unity window, select the target IDE and click "Configuration" to auto-configure the connection.

#### Manual Configuration

Edit `mcp.json` if automatic configuration is unavailable.

HTTP mode (default — local-only, communicates with Unity Editor on your machine):

> **Security Note**: HTTP is used intentionally here. This endpoint only communicates with the Unity Editor running on `localhost` (loopback interface). Traffic never leaves your machine, so HTTPS is not required.

```json
{
  "mcpServers": {
    "unity-mcp": {
      "url": "<your-mcp-server-url>",
      "transport": "http"
    }
  }
}
```

> **Connection methods**: The system supports two connection methods: HTTP (simpler, recommended) and stdio (backup option). Choose HTTP unless you encounter specific issues.

Stdio mode (fallback — runs the MCP server as a subprocess (a separate process managed by the main application), useful when the HTTP port is unavailable):

```json
{
  "mcpServers": {
    "unity-mcp": {
      "command": "uvx",
      "args": ["unity-mcp"],
      "transport": "stdio"
    }
  }
}
```

### Install Auto-Guidance Hook (Recommended)

This Power provides a `promptSubmit` hook that automatically reminds the AI to activate the Power and load the appropriate Steering File before processing each request.

```bash
mkdir -p .kiro/hooks
cp hooks/pre-unity-tool.kiro.hook .kiro/hooks/
```

### Verify Connection

Type any Unity-related command in the IDE (e.g., "List all objects in the current scene"). If the AI responds correctly, the connection is successful.

## Usage

Tell the AI what you'd like to do in natural language. It will automatically select and execute the appropriate MCP tools.

### Example Commands

```
"Set all models in the Characters folder to Humanoid rig"
"Create a 3D first-person scene"
"Build for Windows"
"Check the project's code architecture"
"Check Android platform compatibility"
"Analyze dependencies for hero.fbx"
```

### Demo: Build an Interactive Scene and Run a Full Quality Check

> The following demonstration uses an interactive 3D scene with collectible items as an example. We chose this scenario because it demonstrates multiple Unity systems (physics, rendering, UI, scripting) in a compact example. The same workflow steps (scene setup, code quality checks, performance analysis, platform compatibility) apply to any Unity project — whether building games, simulations, training applications, architectural visualizations, or other interactive experiences.

> **Non-game alternative**: For an architectural visualization project, replace the 3D scene with a building walkthrough, replace collectible objects with interactive waypoints, replace scoring with progress tracking, and replace the HUD with an information panel. The workflow steps remain identical.

#### Phase 1: Create the Scene (Game Example)

> **Alternative for non-game projects**: Replace collectible objects with interactive waypoints, scoring with progress tracking, and the HUD with an information panel. The workflow steps remain identical.

First, build a playable 3D scene:

```
Create a 3D scene with:
- Terrain (rolling grassland)
- Directional and ambient lighting
- Character controller (WASD movement + mouse look)
- Collectible objects (gems and coins scattered around)
- HUD Canvas with score and timer display
Name the scene Level01 and save it
```

Next, add interactive gameplay mechanics:

```
Add core interaction gameplay:
1. Collection system: walk near objects to collect, objects glow when in range
2. 5 collectible items (colored gems) placed around the terrain
3. Items disappear with particle effects when collected
4. Scoring system: top-left score display, +100 per item collected
5. Show "COMPLETE" when all items are collected
```

Now create a level configuration system:

```
Create a ScriptableObject called LevelConfig with: level name (string), difficulty (int, 1-10),
time limit (float), enemy wave list (nested: enemy type string + count int + spawn delay float),
and generate a custom Inspector
```

> **Why these checks matter**: In production Unity projects, catching architecture violations and performance issues early prevents costly refactoring later. The checks below typically surface 80% of common issues in under a minute.

#### Phase 2: Quality Checks and Optimization

With the scene in place, run a code quality check:

```
Check all C# code against MVC architecture rules, scan naming conventions,
layer dependencies and circular references, list all violations with fix suggestions
```

Then scan for performance issues:

```
Scan all C# scripts for performance anti-patterns, analyze current scene Draw Calls
and memory usage, generate a complete performance report sorted by severity
```

Verify cross-platform compatibility:

```
Check all Shader platform compatibility for Android and iOS, verify memory budgets,
categorize issues as Error/Warning/Suggestion, provide alternatives for incompatible Shaders
```

Finally, build and check results:

```
Build the project with Android release configuration, parse build logs for errors,
list each error's type, file location, and fix suggestions
```

## Development

```bash
npm install

npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:property    # Property tests (fast-check)
npm run test:integration # Integration tests only
npx tsc --noEmit         # TypeScript type checking
```

## Project Structure

```
kiro-unity-accelerator/
├── POWER.md                    # Main document for the AI assistant
├── mcp.json                    # MCP Server connection config
├── steering/                   # Domain knowledge Steering Files (14)
├── templates/                  # Built-in templates
│   ├── presets/                # Asset Presets (5)
│   ├── scaffolds/              # Scene Scaffolds (5)
│   ├── build-configs/          # Build Configurations (4)
│   ├── platform-profiles/      # Platform Profiles (5, including XR/VR)
│   ├── architecture-rules/     # Architecture Rules (3)
│   └── workflows/              # Workflow Templates (3)
├── src/                        # TypeScript tool modules (40+)
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests
│   ├── property/               # Property tests (fast-check)
│   └── integration/            # Integration tests
├── hooks/                      # IDE hooks
├── image/                      # Documentation images
├── package.json
├── tsconfig.json
└── jest.config.ts
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| IDE cannot connect to Unity | Ensure Unity Editor is open → Window → MCP for Unity → Start Server |
| Port 8080 is occupied | Close the conflicting process, or switch to stdio mode in `mcp.json` |
| Asset operations unresponsive | Unity may be compiling; wait for compilation to complete |
| Cloud Assist failure | Automatically falls back to local mode; core features unaffected |
| Tests failing | Run `npm test` for detailed error messages |
| TypeScript type errors | Run `npx tsc --noEmit`; ensure `npm install` has been run |

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file.
