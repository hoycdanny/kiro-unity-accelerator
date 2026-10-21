# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

Unity 开发 AI 加速器。通过 MCP（Model Context Protocol）以自然语言指挥 Unity Editor，涵盖资产管理、场景构建、构建自动化、性能分析、代码质量检查等功能 — 内置 40+ TypeScript 工具模块与 15 个领域知识文件，为个人开发者和团队提供 Unity 开发 AI 支持。

> **Unity 6.4 基准版本**：本 Power 以 **Unity 6.4**（发布流 `6000.4`，最新补丁版 `6000.4.12f1`，2026-06-17 发布）与 **MCP for Unity v10.3.0 或更新版本（最低 v10.0.0）** 的工具接口为目标。本 Power 支持的最低 Editor 版本是 **Unity 6.0（`6000.0`）**；桥接包自身的下限更低（Unity 2021.3 LTS）。所有指南都是在 **Unity `6000.4.6f1` + URP 17.4.0 + MCP for Unity 9.6.8、Windows Editor、2026-10-21** 这组环境上实机核对的 — Unity 6.5、6.6 及之后的 6.x 预期可用，但**并未**在此验证。Unity 6.4 属于 Update 版本，其补丁流已于 2026-06-17 结束，因此要锁定版本进入正式生产的项目，应改用 **Unity 6.3 LTS**（支持至 2027 年 12 月）或前进到当前的 Update 版本。**Unity 6.0 LTS 已于 2026-10-16 结束支持 — 任何情况下都不建议使用，包括当作"比较保险的旧版"。** 来源：[unity.com/releases](https://unity.com/releases/) 与 [endoflife.date/unity](https://endoflife.date/unity)，均于 2026-10-21 获取。
>
> **6.4 专属指南涵盖的内容**：URP **只剩 Render Graph 一条路** — URP Compatibility Mode 与 `URP_COMPATIBILITY_MODE` 脚本定义在 6.4 已完全移除，不再是旧版自定义 render pass 的退路；GPU Resident Drawer（Forward+/Deferred+ 的 GPU Instancing，2D Renderer 不支持）配合改版后的 Rendering Statistics 窗口，该窗口会分别列出各批处理路径各自吸收了多少 draw call，而不是只给一个数字；`InstanceID` 已被 `EntityId` 取代，因此桥接返回的 instance id 要视为不透明的 token — 原样传回给桥接即可，切勿对它做运算、排序或解析；iOS 的 PVRTC 已移除（只能用 ASTC 或 ETC）；Web 构建现在会把 `[BurstCompile]` job 放到后台工作线程执行，但多线程*渲染*仍然不支持；6.4 起可以把自定义 render pass 注入 URP 2D 的 frame loop；OculusXR 包已不建议使用，请改用 OpenXR plug-in，而 HoloLens 2 支持与其 plug-in 在 6.4 已标记为 deprecated（OculusXR 的实际移除版本未经验证）。Scripting Backend：`manage_build` 只接受 **`mono` 或 `il2cpp`** — 无法通过本 Power 选用 CoreCLR。来源：[New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) 与 [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64)，均于 2026-10-21 获取。
>
> 本 Power 不会仅凭记忆中的版本号断言行为，而是通过 MCP 实际查询所连接的项目 — 用 `manage_graphics(action: "pipeline_get_info")` 获取当前启用的渲染管线、用 `mcpforunity://project/info` 资源获取 Unity 版本与平台、用 `manage_packages(action: "list_packages")` 获取已安装包 — 之后才套用版本相关建议。

> **术语说明**：本文件使用的主要技术术语（首次出现时也会附带简短说明）：
> - **MCP** (Model Context Protocol)：AI 助手与开发工具通信的标准协议，让开发者能用自然语言操作 Unity Editor
> - **DAG** (Directed Acyclic Graph)：有向无环图，用于决定任务依赖顺序（例如「先导入贴图，才能创建材质」）
> - **MVC** (Model-View-Controller)：将代码分为数据(Model)、显示(View)、逻辑(Controller)的架构模式
> - **ECS** (Entity-Component-System)：Unity DOTS 的数据导向架构模式（相对于传统面向对象方式，数据导向将数据与逻辑分离，以内存连续排列的方式处理大量对象），能高效处理大量对象（如同时管理数千个实体）
> - **ScriptableObject**：Unity 的可序列化数据容器，用于存储配置与共享数据（不需附加到场景对象上）
> - **AssetBundle**：Unity 资产打包格式，用于分发与动态加载（减少初始安装大小）

> **注**: 底层 Unity MCP 工具（[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)）是开源的，可以独立于 Kiro 与任何 MCP 兼容客户端配合使用。

![Kiro Unity Accelerator 截图](image/README.png)

## 功能特性

- **资产自动化** — 批量应用资产预设、自动检测资产类型、生成变更摘要
- **场景脚手架** — 一键生成场景结构，内置冲突检测
- **构建自动化** — 通过 `manage_build` 进行本地构建、构建日志解析、可复用的构建配置模板
- **跨平台测试** — 通过 `run_tests` / `get_test_job` 执行测试、结果格式化、测试套件转换
- **工作流自动化** — 多步骤工作流，支持 DAG 依赖验证与拓扑排序执行
- **性能分析** — Profiler 截图分析、代码反模式扫描、优化建议
- **代码质量** — MVC/ECS/ScriptableObject 架构检查、循环依赖检测
- **知识管理** — 团队文档管理、API 变更追踪、过期检测
- **平台兼容性** — Shader 兼容性、内存预算检查、严重度分类（含 XR/VR）
- **资产依赖管理** — 依赖树、孤立资产检测、AssetBundle 重复检查
- **关卡设计工具** — Editor 扩展脚本生成、ScriptableObject 模板、批量场景对象配置
- **UI 依赖分析** — 跨文件 UI 引用追踪、事件链分析、耦合度评估

## 架构

```
Developer (Natural Language)
    → Kiro (AI Brain)
        → MCP Protocol
            → Unity Editor (Execution Layer)

Kiro Unity Accelerator (Intelligence Layer)
├── POWER.md        → Main doc defining tools & workflows
├── steering/       → 15 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 到底是哪一个「Unity MCP」？— 三个不同的项目

有三个互不相关的项目都叫做某种形式的「Unity MCP」。本 Power **只针对第一个**。混用会得到与本文件完全对不上的工具名称与端口。以下三行信息均于 **2026-10-21** 获取。

| 项目 | 身份 | 连接方式 | 状态 |
|---|---|---|---|
| **(a) CoplayDev MCP for Unity** — *本 Power 使用的就是这个* | UPM `com.coplaydev.unity-mcp`，仓库 [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)，Python 服务器以 `mcpforunityserver` 发布于 PyPI，MIT 许可 | 默认走 streamable HTTP，端点 `http://127.0.0.1:8080/mcp`；或通过 `uvx` 走 stdio。Unity 端的桥接另外监听 TCP `6400` | 活跃。已核对的最新版本为 **v10.3.0**（2026-10-04）；本 Power 记载的是 **v10.3.0 或更新版本，最低 v10.0.0**。10 个工具组共 49 个工具入口 |
| **(b) IvanMurzak/Unity-MCP** — *另一个项目，本 Power 不使用* | UPM `com.ivanmurzak.unity.mcp`，仓库 [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 会自动下载独立的服务器可执行文件到 `Library/mcp-server/`；端口由项目路径的哈希推导（范围 20000–29999），所以没有端口可配置 | 活跃，最新 1.3.0（约 2026-10-20）。其工具名称与端口机制与本 Power **不兼容** |
| **(c) Unity 官方内置的 Editor 内 MCP 服务器** | 随 `com.unity.ai.assistant` 一起发布；UI 在 `Edit > Project Settings > AI > Unity MCP` | MCP client 直接连到 Editor 内的服务器 | **已不建议使用（deprecated）** — 见下方说明 |

**关于 (c) 的 deprecated 状态，以及为什么它不影响本 Power。** Unity 官方文档指出，内置于 Editor 内 AI assistant 包的那个 MCP 服务器已不建议使用，改由 Unity CLI（`unity mcp`）取代，CLI 自带一个讲同样协议的 MCP 服务器（[Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)，2026-10-21 获取；同样的公告也出现在包文档 [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html)，2026-10-21 获取）。**同一份 Unity 页面也明确说明，从 GitHub 安装、用来让 agent 访问 Unity 的第三方 MCP 包不受这项 deprecation 影响。** 也就是说 (a) — 本 Power 使用的桥接 — 明确不在这项 deprecation 的范围内，本 Power 并未因此过时。

## 前置要求

- 已安装 [Unity Editor](https://unity.com/) 并打开项目 — 目标版本是 Unity 6.4，本 Power 支持的最低版本是 Unity 6.0
- 已安装 [Kiro IDE](https://kiro.dev/docs/getting-started/installation)
- **MCP for Unity v10.3.0 或更新版本（最低 v10.0.0）** — 若项目当前安装的 `com.coplaydev.unity-mcp` 是 9.6.8 或更旧，请升级；9.6.8 → 10.3.0 的差异纯粹是新增工具，没有迁移成本
- **Python 3.10 以上并搭配 [`uv`](https://docs.astral.sh/uv/)** — 桥接的服务器是一个 Python 包（PyPI 上的 `mcpforunityserver`），由 `uv`/`uvx` 启动。MCP for Unity 的安装向导可以帮你装 `uv`；在 Windows 上，如果 PATH 里有多份 `uv.exe`，请把「Choose UV Install Location」指到 WinGet 的 shim（`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`）
- Node.js 18+（仅开发/类型检查需要）

## 安装

### 步骤一 — 在 Kiro 中安装此 Power

Kiro → 左侧面板点击 Powers 图标 → 点击「+」按钮 → 选择「Add Custom Power」→ 选择本项目根目录

![安装自定义 Power](image/Add-Kiro-Customer-Power.png)

### 步骤二 — 安装 unity-mcp 并在 Unity 中启动 MCP Server

1. 打开 Unity Editor → Window → Package Manager

   ![步骤 1：打开 Package Manager](image/Enable-Unity-MCP-Server-1.png)

2. 点击「+」→「Add package from git URL...」→ 粘贴以下网址并点击 Add：

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   ```

   ![步骤 2：从 git URL 添加包](image/Enable-Unity-MCP-Server-2.png)

   如果不想跟着 `main` 走，git URL 还有这些替代方式：

   - **锁定某个 release**：把 `#main` 换成 tag，例如 `#v10.3.0`
   - **OpenUPM**：`openupm add com.coplaydev.unity-mcp`
   - **Asset Store**：「MCP for Unity」商品页，再到 Package Manager → My Assets

3. 包第一次导入时会打开**安装向导（setup wizard）**。之后常驻的 UI 是 **Window → MCP for Unity**，可在此启动/停止服务器、切换 transport、重新配置 client。

   ![步骤 3：打开 MCP 窗口](image/Enable-Unity-MCP-Server-3.png)

   > 上图截自较旧的版本，当时菜单项叫「Toggle MCP Window」。当前版本的路径是 `Window → MCP for Unity`。

4. 确认状态面板显示 **Connected**，并记下它显示的服务器端点／端口（下面会用到）。要恢复连接时使用 `Restart Server`。

   ![步骤 4：确认 Server 运行中](image/Enable-Unity-MCP-Server-4.png)

### 注册路径只能选一条

有两种机制可以把 Unity MCP 服务器注册给 Kiro，而它们会写进**同一个**配置文件、只是用不同的名称。两边都做的话，就会有两个服务器指向同一个 Unity Editor，造成工具列表重复、资源读取时服务器名称不明确。

- **路径 A — 让本 Power 注册服务器。** 安装本 Power 并且不要去动它的 `mcp.json`。Legacy（`POWER.md`）格式的 power，其 MCP 服务器会被注册到 `~/.kiro/settings/mcp.json` 的 Powers 区段，名称由 Kiro 加上命名空间。
- **路径 B — 让 Unity 配置 Kiro。** 在 Unity 中执行 `Window → MCP for Unity → Configure All Detected Clients`（或选择 Kiro 后按 `Configure Selected`）。包会把一个名为 `unityMCP` 的服务器项写进同一个文件。

> **如果 Kiro 的 MCP 面板出现两个 Unity MCP 服务器，请禁用其中一个并重启 Kiro。** 三个相关的配置文件位置：本 Power 自己的 `mcp.json`、用户级的 `~/.kiro/settings/mcp.json`、工作区级的 `.kiro/settings/mcp.json`。

### MCP 连接配置

#### 自动配置（推荐）

在 Unity 中打开 `Window → MCP for Unity` → 确认 transport 是 HTTP → 按 **Configure All Detected Clients**（或选择 Kiro 后按 **Configure Selected**）。Kiro 是官方一等支持的 client，所以这一步会把端口正确的项写进 `~/.kiro/settings/mcp.json`，服务器键名为 `unityMCP`。

#### 读出真正的端口

**不要把 8080 当成固定值。** 这个端口可由用户修改，而 8080 常与其他服务冲突（上游以 Tailscale 为例，并建议改用 8090）。MCP for Unity 窗口会显示当前的端点 — 如果不是 8080，网址就是 `http://127.0.0.1:<该端口>/mcp`。

#### 手动配置（最后手段）

只有在上面两步都没能产生可用的项时，才需要编辑 `mcp.json`。

HTTP 模式（默认 transport，仅限本机 — 与 Unity Editor 通信）：

> **安全说明**：此处有意使用 HTTP。服务器只绑定 loopback（`127.0.0.1` / `::1`）；要绑定 LAN 地址需要开启 `Advanced Settings → Allow LAN Bind (HTTP Local)`，而远程端点必须是 `https://`。在默认配置下流量不会离开您的计算机，因此不需要 HTTPS。

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

> 请把 `8080` 换成 Unity 窗口显示的端口。模式字段的键名是 `type`，不是 `transport`。这里有意写 `127.0.0.1`：上游文档打印的是 `localhost`，但 Unity 端自己的默认值就是字面的 `127.0.0.1`，而且在 Windows 上 `localhost` 可能先解析到 `::1`。

Stdio 模式（备用 — 把 MCP 服务器当成子进程由 Kiro 管理）。PyPI 包名是 **`mcpforunityserver`**，可执行入口是 **`mcp-for-unity`**，且必须带上 `--transport stdio`。PyPI 上**没有** `unity-mcp` 这个包 — 本 README 旧版记载的 `uvx unity-mcp` 就是因此从来无法启动。

Windows（请给 `uvx.exe` 绝对路径，建议使用 WinGet 的 shim）：

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

macOS/Linux（PATH 上的 `uvx` 通常就可以）：

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

### 安装自动引导 Hook（推荐）

此 Power 提供 `UserPromptSubmit` hook（Kiro 1.0 `v1` schema），会在每次请求前自动提醒 AI 启动 Power 并加载对应的 Steering File。

```bash
mkdir -p .kiro/hooks
cp hooks/unity-power-auto-activate.json .kiro/hooks/unity-power-auto-activate.json
```

### 验证连接

在 Kiro 中输入任何 Unity 相关指令（例如「列出当前场景中的所有对象」）。若 Kiro 正确响应，表示连接成功。

## 使用方式

告诉 Kiro 你想做什么，用自然语言描述即可。Kiro 会自动选择并执行适当的 MCP 工具。

### 示例指令

```
「将 Characters 文件夹中所有模型设为 Humanoid rig」
「创建一个 3D 第一人称场景」
「构建 Windows 版本」
「检查项目的代码架构」
「检查 Android 平台兼容性」
「分析 hero.fbx 的依赖关系」
```

> **注**：以下演示展示常见的 Unity 工作流程模式，使用第一人称互动场景。我们选择此范例是因为它同时展示了多个 Unity 系统的协作（物理、渲染、UI、脚本）。相同的工作流程模式适用于所有项目类型 — 益智游戏、教育模拟、建筑可视化或任何其他 Unity 应用。例如，建筑可视化项目可将 FPSController 替换为 WalkController 并加入测量 UI，教育模拟可替换为 StudentController 和评估系统，即可套用相同的工作流程。

### 演示：创建游戏并执行完整质量检查

#### 阶段一：创建游戏

**步骤 1 — 构建可游玩的 3D 场景**

```
创建一个 3D 第一人称场景，包含：
- 地形（起伏的草地）
- 方向光与环境光
- 第一人称控制器（WASD 移动 + 鼠标视角）
- 互动对象（箱子和圆柱）
- HUD Canvas 含准心和状态显示
将场景命名为 Level01 并保存
```

**步骤 2 — 添加互动游戏机制**

```
添加核心互动玩法：
1. 互动系统：左键互动、Raycast 命中检测、对象被触发时闪烁视觉反馈
2. 3 个目标对象（彩色胶囊）在场景中缓慢移动
3. 对象被互动 3 次后停用并播放粒子特效
4. 计分系统：左上角显示分数，每次成功互动 +100
5. 所有目标被清除时显示「YOU WIN」
```

**步骤 3 — 创建关卡配置系统**

```
创建名为 LevelConfig 的 ScriptableObject，包含：关卡名称（string）、难度（int, 1-10）、
时间限制（float）、敌人波次列表（嵌套：敌人类型 string + 数量 int + 生成延迟 float），
并生成自定义 Inspector
```

#### 阶段二：质量检查与优化

**步骤 4 — 代码质量检查**

```
检查所有 C# 代码是否符合 MVC 架构规则，扫描命名规范、
层级依赖与循环引用，列出所有违规并提供修复建议
```

**步骤 5 — 性能扫描**

```
扫描所有 C# 脚本的性能反模式，分析当前场景的 Draw Calls
与内存使用量，生成按严重度排序的完整性能报告
```

**步骤 6 — 跨平台检查**

```
检查所有 Shader 在 Android 和 iOS 的平台兼容性，验证内存预算，
将问题分类为 Error/Warning/Suggestion，为不兼容的 Shader 提供替代方案
```

**步骤 7 — 构建并检查结果**

```
以 Android release 配置构建项目，解析构建日志中的错误，
列出每个错误的类型、文件位置与修复建议
```

## 开发

`src/` 下的 TypeScript 模块是各自独立的 — 没有打包器，也没有构建步骤。测试套件与 TypeScript 编译配置文件属于开发者本机文件（已被 git 忽略），所以全新 clone 下来并没有配置好的测试执行器；请改用明确的编译标志做类型检查：

```bash
npm install   # 只有 devDependencies — 本 Power 自身没有运行时依赖

# 类型检查（bash）
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/*.ts
```

```powershell
# 类型检查（PowerShell）
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck (Get-ChildItem src -Filter *.ts | ForEach-Object FullName)
```

## 项目结构

```
kiro-unity-accelerator/
├── POWER.md                    # Kiro 主文档
├── mcp.json                    # MCP Server 连接配置
├── steering/                   # 领域知识 Steering Files（15 个）
├── templates/                  # 内置模板
│   ├── presets/                # 资产预设（5 个）
│   ├── scaffolds/              # 场景脚手架（5 个）
│   ├── build-configs/          # 构建配置（4 个）
│   ├── platform-profiles/      # 平台配置文件（5 个，含 XR/VR）
│   ├── architecture-rules/     # 架构规则（3 个）
│   └── workflows/              # 工作流模板（3 个）
├── src/                        # TypeScript 工具模块（40+）
├── hooks/                      # Hook 模板（请复制到 .kiro/hooks/）
├── workshop/                   # 一步一步的 Prompt 教程
├── image/                      # 文档图片
└── package.json
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| Kiro 无法连接到 Unity | 确认 Unity Editor 已打开并加载项目 → `Window → MCP for Unity` → 确认状态面板显示 **Connected**（若否，按 `Restart Server`） |
| Port 8080 被占用（端口被其他程序使用） | 在 MCP for Unity 设置中改掉端口（上游建议 8090），重新执行 **Configure All Detected Clients**，重启 Kiro，并把 `mcp.json` 的 `url` 改成 Unity 窗口显示的端口 |
| 文档写的某个工具在工具列表里找不到 | 很可能是该工具的组没有启用 — 默认只有 `core` 是开启的。依次执行 `manage_tools(action: "list_groups")`、`manage_tools(action: "sync")`、`manage_tools(action: "activate", group: "<名称>")`。Kiro 可能会缓存工具列表，之后请刷新或重新连接 MCP 服务器 |
| 注册了两个 Unity MCP 服务器 | 打开 `~/.kiro/settings/mcp.json` 与 Kiro 的 MCP 面板；如果本 Power 的项和 `unityMCP` 同时存在，请禁用其中一个并重启 Kiro（见「注册路径只能选一条」） |
| Unity 6.3+ 且安装了 Unity AI Assistant 包 | AI Assistant 内附的 `System.Collections.Immutable` 版本比 `validate_script` / `execute_code` 使用的 Roslyn 依赖所需的更新。上游的解法是把 `System.Collections.Immutable` v9.0.0 放进 `Assets/Plugins/` |
| 资产操作无响应 | Unity 可能正在编译，等待编译完成，或读取 `mcpforunity://editor/state` 资源确认状态 |
| TypeScript 类型错误 | 运行上面「开发」一节的标志式类型检查，并确认已运行 `npm install` |

## 安全

详见 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 许可证

本项目采用 MIT-0 许可证。详见 [LICENSE](LICENSE) 文件。
