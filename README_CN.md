# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

Unity 开发 AI 加速器。通过 MCP（Model Context Protocol）以自然语言指挥 Unity Editor，涵盖资产管理、场景构建、构建自动化、性能分析、代码质量检查等功能 — 内置 40+ TypeScript 工具模块与 15 个领域知识文件，为个人开发者和团队提供 Unity 开发 AI 支持。

> **Unity 6.4 基准版本**：本 Power 以 **Unity 6.4**（发布流 `6000.4`，最新补丁版 `6000.4.12f1`，2026-06-17 发布）与 **MCP for Unity v10.3.0 或更新版本（最低 v10.0.0）** 的工具接口为目标。本 Power 支持的最低 Editor 版本是 **Unity 6.0（`6000.0`）**；桥接包自身的下限更低（Unity 2021.3 LTS）。所有指南都是在 **Unity `6000.4.6f1` + URP 17.4.0、Windows Editor、2026-10-21** 这组环境上实机核对的：先在 MCP for Unity **9.6.8** 上核对，之后在同一台机器把桥接升级到 **10.3.0**，再用直接调用重新核对一遍（见[升级桥接：两个必须保持一致的版本锁定](#升级桥接两个必须保持一致的版本锁定)） — Unity 6.5、6.6 及之后的 6.x 预期可用，但**并未**在此验证。**已在 10.3.0 上通过直接调用实测确认的项目**：桥接实际运行的版本；完整 **49 个工具**的列表，以及 9.6.8 → 10.3.0 的差异纯属新增（新增 6 个工具，**没有任何工具被移除或改名**，所以这次升级对本 Power 不产生任何迁移成本）；新的 `asset_gen` 工具组**默认关闭**，而且该组的工具会消耗开发者自备的第三方服务额度；十个工具组的成员与默认值；以及本文档记载的 `manage_asset`／`find_gameobjects`／`manage_scene` 契约。第六轮则真正动手验证了**写入路径**：GameObject、component、prefab、script 与资产文件夹的写入动作、`refresh_unity`，以及 `run_tests` → `get_test_job` 的完整异步 job 生命周期。所有写入都限制在隔离的 `Assets/_MCPVerify/` 文件夹内，事后全部删除，并确认项目已回到原始基准状态（详见"写入路径实测到了什么"一节）。**仍未验证**的项目：`asset_gen` 的那六个工具（**刻意完全没有调用 — 它们会花真钱**）、`manage_build`（被验证机器自己的权限规则挡住），以及**针对真实测试运行** `run_tests` —— 验证项目没有任何 test assembly，所以 job 生命周期已确认，但**通过／失败的结果上报并未验证**。Unity 6.4 属于 Update 版本，其补丁流已于 2026-06-17 结束，因此要锁定版本进入正式生产的项目，应改用 **Unity 6.3 LTS**（支持至 2027 年 12 月）或前进到当前的 Update 版本。**Unity 6.0 LTS 已于 2026-10-16 结束支持 — 任何情况下都不建议使用，包括当作"比较保险的旧版"。** 来源：[unity.com/releases](https://unity.com/releases/) 与 [endoflife.date/unity](https://endoflife.date/unity)，均于 2026-10-21 获取。
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
| **(a) CoplayDev MCP for Unity** — *本 Power 使用的就是这个* | UPM `com.coplaydev.unity-mcp`，仓库 [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)，Python 服务器以 `mcpforunityserver` 发布于 PyPI，MIT 许可 | 默认走 streamable HTTP，端点 `http://127.0.0.1:8080/mcp`；或通过 `uvx` 走 stdio。Unity 端的桥接另外监听 TCP `6400` | 活跃。已核对的最新版本为 **v10.3.0**（2026-10-04）；本 Power 记载的是 **v10.3.0 或更新版本，最低 v10.0.0**。10 个工具组共 **49** 个工具入口 — 这是在 10.3.0 上实际调用 `manage_tools(action: "list_groups")` 数出来的数字，以它为准（上游 README 写的是 48）|
| **(b) IvanMurzak/Unity-MCP** — *另一个项目，本 Power 不使用* | UPM `com.ivanmurzak.unity.mcp`，仓库 [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 会自动下载独立的服务器可执行文件到 `Library/mcp-server/`；端口由项目路径的哈希推导（范围 20000–29999），所以没有端口可配置 | 活跃，最新 1.3.0（约 2026-10-20）。其工具名称与端口机制与本 Power **不兼容** |
| **(c) Unity 官方内置的 Editor 内 MCP 服务器** | 随 `com.unity.ai.assistant` 一起发布；UI 在 `Edit > Project Settings > AI > Unity MCP` | MCP client 直接连到 Editor 内的服务器 | **已不建议使用（deprecated）** — 见下方说明 |

**关于 (c) 的 deprecated 状态，以及为什么它不影响本 Power。** Unity 官方文档指出，内置于 Editor 内 AI assistant 包的那个 MCP 服务器已不建议使用，改由 Unity CLI（`unity mcp`）取代，CLI 自带一个讲同样协议的 MCP 服务器（[Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)，2026-10-21 获取；同样的公告也出现在包文档 [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html)，2026-10-21 获取）。**同一份 Unity 页面也明确说明，从 GitHub 安装、用来让 agent 访问 Unity 的第三方 MCP 包不受这项 deprecation 影响。** 也就是说 (a) — 本 Power 使用的桥接 — 明确不在这项 deprecation 的范围内，本 Power 并未因此过时。

## 前置要求

- 已安装 [Unity Editor](https://unity.com/) 并打开项目 — 目标版本是 Unity 6.4，本 Power 支持的最低版本是 Unity 6.0
- 已安装 [Kiro IDE](https://kiro.dev/docs/getting-started/installation)
- **MCP for Unity v10.3.0 或更新版本（最低 v10.0.0）** — 若项目当前安装的 `com.coplaydev.unity-mcp` 是 9.6.8 或更旧，请升级；9.6.8 → 10.3.0 的差异纯粹是新增工具，没有迁移成本。动手前请先读[升级桥接：两个必须保持一致的版本锁定](#升级桥接两个必须保持一致的版本锁定)：C# 包与 Python 服务器是分开锁定版本的，只升级其中一边会让桥接坏掉
- **Python 3.10 以上并搭配 [`uv`](https://docs.astral.sh/uv/)** — 桥接的服务器是一个 Python 包（PyPI 上的 `mcpforunityserver`），由 `uv`/`uvx` 启动。MCP for Unity 的安装向导可以帮你装 `uv`；在 Windows 上，如果 PATH 里有多份 `uv.exe`，请把「Choose UV Install Location」指到 WinGet 的 shim（`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`）
- Node.js 18+（仅开发/类型检查需要）

## 安装

### 步骤一 — 在 Kiro 中安装此 Power

Kiro → 左侧面板点击 Powers 图标 → 点击「+」按钮 → 选择「Add Custom Power」→ 选择本项目根目录

![安装自定义 Power](image/Add-Kiro-Customer-Power.png)

### 步骤二 — 安装 unity-mcp 并在 Unity 中启动 MCP Server

1. 打开 Unity Editor → Window → Package Manager

   ![步骤 1：打开 Package Manager](image/Enable-Unity-MCP-Server-1.png)

2. 点击「+」→「Add package from git URL...」→ 粘贴以下网址并点击 Add。**请注意结尾锁定的 `#v10.3.0` tag，不要改成 `#main`：**

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0
   ```

   ![步骤 2：从 git URL 添加包](image/Enable-Unity-MCP-Server-2.png)

   > **这是一条更正后的说明。** 本 README 之前的版本让你填 `...?path=/MCPForUnity#main`，那是错的，而且**这个故障已在真实安装环境上重现并确认（2026-10-21 实测）**。Unity 对 git UPM 依赖只解析**一次**，之后就把解析到的 commit 缓存起来；像 `#main` 这种会移动的 ref **不会**跟着分支更新。验证机器的 `Packages/manifest.json` 写的是 `#main`，但实际安装的包还停在 **9.6.8**，上游却早已是 **10.3.0** — 就这样被困在旧版好几个月，Package Manager 也完全不会提示有更新。几个月前的桥接版本已经对不上本 Power 文档记载的工具接口，这正是「AI 无法驱动 Unity」的直接原因之一。

   除了锁定 tag 的 git URL，也可以用：

   - **OpenUPM**：`openupm add com.coplaydev.unity-mcp` — 这是 registry 安装，有新版时 Package Manager 会主动提示更新
   - **Asset Store**：「MCP for Unity」商品页，再到 Package Manager → My Assets

   **之后要升级时，请改掉 tag** — 改动依赖字符串才会让 Unity 重新解析。可以直接编辑 `Packages/manifest.json`：

   ```json
   "com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0"
   ```

   …或者移除包之后，用新的 tag 重新添加 git URL。接着请按[升级桥接：两个必须保持一致的版本锁定](#升级桥接两个必须保持一致的版本锁定)操作 — UPM 包只是升级的一半。

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

**不要把 8080 当成固定值。** 端口就是服务器启动时 `--http-url` 带的那个值，可由用户修改，而 8080 常与其他服务冲突（上游以 Tailscale 为例，并建议改用 8090）。MCP for Unity 窗口会显示当前的端点 — 如果不是 8080，网址就是 `http://127.0.0.1:<该端口>/mcp`。

也可以直接从磁盘上读出端口：运行中的服务器会在 Unity 项目下写一个以端口命名的 pidfile。

```
<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid
```

看到 `mcp_http_8080.pid` 就说明服务器正在服务 `http://127.0.0.1:8080`。本 Power 实机验证的那台机器上就是这种情况 — 服务器自己的命令行是 `mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile ...mcp_http_8080.pid`。

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

### 升级桥接：两个必须保持一致的版本锁定

MCP for Unity 其实是**两个组件，而且各自独立锁定版本**。这是升级它最容易搞混的地方；以下内容全部是 **2026-10-21** 在真实环境上完成并观察到的 9.6.8 → 10.3.0 升级过程。

| 组件 | 是什么 | 版本锁在哪里 |
|---|---|---|
| UPM 包（C# Editor 端） | 导入 Unity 项目的 `com.coplaydev.unity-mcp` | `Packages/manifest.json` — git tag 或 registry 版本号 |
| Python MCP 服务器 | PyPI 上的 `mcpforunityserver`，可执行入口是 `mcp-for-unity` | Unity 启动服务器时命令行上的 `--from "mcpforunityserver==<版本>"` 参数 |

升级前观察到的服务器启动命令行（原文照录）：

```
uvx --from "mcpforunityserver==9.6.8" mcp-for-unity --transport http --http-url http://127.0.0.1:8080
  --project-scoped-tools --pidfile <UnityProject>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>
```

**只升级 UPM 包不会升级 Python 服务器。** manifest 改成 `#v10.3.0`、Unity 也把 v10.3.0 的 C# 干净导入并编译完成之后，仍在运行的服务器依旧报告版本 `9.6.8` — 它跑的是旧的缓存副本。

**版本不一致会让桥接坏掉，而且是「选择性」地坏，因此极难判断。** C# 在 10.3.0、Python 还在 9.6.8 的状态下，所有需要 Unity 的工具调用都返回 `{"success":false,"error":"Unity session not available; please retry","data":{"reason":"no_unity_session",...}}`，但纯服务器层的工具（例如 `debug_request_context`）却照样正常响应。看起来服务器活得好好的，实际上任何碰到 Unity 的事都做不了。

#### 升级步骤

1. **改掉 UPM 的版本锁定** — 编辑 `Packages/manifest.json` 里的 tag，或移除包之后用新 tag 重新添加 git URL。像 `#main` 这种会移动的 ref 不会重新解析。
2. *可选，网络慢时建议做：* 先用 `uvx --from "mcpforunityserver==10.3.0" mcp-for-unity --help` **把 uv 缓存预热**。实机升级时正是因为做了这步，Unity 之后才能用 `--offline` 启动服务器。
3. **让 Unity 导入并编译**新包，确认 editor log 没有 `error CS`。
4. **结束旧的服务器进程链**（`uvx` → `uv` → `mcp-for-unity` → `python`）。它不会自己换到新版本。
5. **删除残留的 pidfile**（如果有）：`<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid`。实机升级时杀掉进程后这个文件留在原地，必须手动删除。
6. **从 Unity 启动服务器**：`Window → MCP for Unity → Start Server`。**这个动作是必需的** — 包升级后服务器没有自行重启，进程链被杀掉之后也没有。手动启动后，已经在跑 v10.3.0 C# 的 Unity 会用匹配的版本锁定重新启动它（`uvx --offline --from "mcpforunityserver==10.3.0" ...`），用的是全新的 uv 缓存 archive，端口恢复监听，两个组件都在 10.3.0。
7. **重新连接 Kiro 的 MCP 服务器**（MCP Server 面板 → reconnect，或重启 Kiro）。升级一定会让 client 的 MCP session 失效 — 见下一段。
8. **确认两边版本一致**：`debug_request_context` 会报告服务器版本，`manage_packages(action: "list_packages")` 会报告包版本。

#### 两个长得很像、但完全不同的错误

服务器以 10.3.0 重启后，原本已连上的 client 调用会失败并返回 `{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Session not found"}}`。那是 **MCP 传输层的 session**，不是 Unity 桥接：

| 错误 | 属于哪一层 | 怎么修 |
|---|---|---|
| `Session not found`（`-32600`） | Kiro 与 Python 服务器之间的 MCP 传输 session | 重新连接 Kiro 的 MCP 服务器，或重启 Kiro。与版本锁定无关 |
| `no_unity_session` /「Unity session not available」 | Python 服务器与 Editor 之间的 Unity 桥接 | 先让两个版本锁定一致；如果本来就一致，再检查 Editor 是否打开、是否正在编译。重新连接对这个错误完全没用 |

#### v10.3.0 是什么

v10.3.0 是当前的正式（非 prerelease）版本（GitHub tag `v10.3.0`，2026-10-04 发布，附件 `unity-mcp-10.3.0.mcpb`），对应的 `mcpforunityserver-10.3.0` 也在 PyPI 上（同一分钟上传，需要 Python 3.10 以上）。与本 Power 相关的 release note 条目：Unity 6000.6 的 `InstanceIDToObjectCompat` 修复、stdio 在重连退避前重新探测端口、修复 `read_console` 会被 Console 窗口的筛选条件隐藏条目的问题、上游新增「工具没出现在工具列表时该去哪里看」的文档、新的 Blender Bridge，以及自动探测 fal / OpenRouter 的素材生成模型。

v10.3.0 的服务器 CLI（在 10.3.0 上执行 `mcp-for-unity --help`）接受 `--default-instance`、`--transport {stdio,http}`、`--http-url`、`--http-host`、`--http-port`、`--http-remote-hosted`、`--api-key-*` 这组参数（远程托管的鉴权用）、`--unity-instance-token`、`--pidfile` 与 `--project-scoped-tools`。这也确认了上面的 stdio 备用写法是正确的；唯一要补充的是：在 `--from` 里锁定版本才是实际惯例，Unity 自己的启动器就是这么做的。

#### 工具接口实际变了什么（实测）

升级完成、client 重新连接之后，v10 的工具就被直接调用过了。在同一台机器上，实际的工具列表从 9.6.8 的 **43 个**变成 10.3.0 的 **49 个**。新增的六个是 `blender_bridge`、`generate_audio`、`generate_image`、`generate_model`、`import_model`、`import_model_file`；**没有任何工具被移除或改名**，所以这次升级对本 Power 不产生迁移成本。请以 49 为准 — 上游 README 写的是「48 focused MCP tool entrypoints」，实测数字优先。

这六个新工具全部属于新的第十个工具组 **`asset_gen`**，而 `manage_tools(action: "list_groups")` 报告它是 `enabled: false`、`default_enabled: false`。**默认关闭这一点已经实测确认，而且这是正确的安全默认**：这些工具是通过付费的第三方服务、用你自己的 API 密钥去生成 3D 模型、图片与音频。启用这个组就等于把会花钱的工具摊在 agent 面前，所以本 Power 不让任何工作流路由到它，验证过程中那六个工具也**一次都没有调用过**。其余九个组与 9.6.8 完全一致。

另外有一项值得知道的安全改进：10.3.0 的 `debug_request_context` 会把 `--unity-instance-token` 的值遮成 `***`，而 9.6.8 是直接明文打印出来。分享调试输出前先看一眼仍然是好习惯，只是在 v10 上没那么要紧了。它的 `session_state` 区块也不再返回 9.6.8 会给的 `derived_key` / `all_keys_in_store` 字段。

#### 写入路径实测到了什么，以及那个会改变调用串接方式的发现

最后一轮验证不再只是读取，而是真的写进项目。所有写入都放在隔离的 `Assets/_MCPVerify/` 文件夹、对象统一命名为 `MCPVerify_*`，事后全部删除；之后确认项目回到原始基准状态 —— `SampleScene` 保有原本的 3 个根对象与原本的 component 组合，且 `.cs` 资产数为 0。

**已在 10.3.0 上验证**：`manage_asset` 的文件夹创建与删除；`create_script`、`get_sha`、`validate_script`、`find_in_file` 的成功路径、`script_apply_edits` 与 `delete_script`；`manage_gameobject` 的 create／modify／duplicate／delete；`manage_components` 的 add 与 set_property；`manage_prefabs(create_from_gameobject)`；`refresh_unity`；以及 `run_tests` → `get_test_job` 的完整异步 job 生命周期（`running` → `succeeded`，约 7.5 秒）。由于该项目没有 test assembly，**生命周期已确认，但通过／失败的结果上报没有**。

**instance ID 是会变动的，这是对多步骤流程影响最大的一项发现。** 刚创建的 GameObject 返回的是**负数** ID（`-5560`）；等 Unity 正式注册该对象之后，这个 ID 就再也查不到（`not found using method 'by_id'`），对象改用正数 ID（`50436`，之后又变成 `50470`）。更麻烦的是：一次 `refresh_unity` 重新编译之后，**连没有被碰过的对象也被重新编号** —— Main Camera 49224 → 50412、Directional Light 49234 → 50422、Global Volume 49242 → 50430。所以：步骤之间要传递的是对象的**名称或路径**；需要 instance ID 时，在用到它的那一次调用前才去重新查询；而且绝对不要让一个 ID 跨过重新编译或 domain reload。

同一轮还修正了三件小事：三个对象工具对 `target` 的解读各不相同（`manage_components` 接受整数 ID，`manage_gameobject` 需要**字符串**且默认当成**名称**解析，`manage_prefabs` 则必须给**名称**）—— 传名称可以同时满足这三者；`script_apply_edits` 吃的是 **`name` + `path`**，不是 `uri`；`refresh_unity` 的 `mode` 与 `compile` 都是字符串 enum（`if_dirty`／`force` 与 `none`／`request`），所以 `compile: true` 会被拒绝。另外也确认了：`manage_gameobject(duplicate)` 会忽略 `name`，生成的是 Unity 自己的 `<原名>_Copy`；而 Unity 6.4 现行的 `linearDamping`（取代已 obsolete 的 `drag`）可以通过 `manage_components` 成功设定。

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
| 所有 Unity 相关调用都返回 `Unity session not available; please retry` /「`"reason":"no_unity_session"`」，但 `debug_request_context` 仍正常响应 | **第一个该怀疑的是：C# 包与 Python 服务器的版本不一致。** 2026-10-21 实测确认 — C# 在 10.3.0、Python 还在 9.6.8 时，症状就是这个，而且是选择性失败，所以服务器看起来很健康。用 `debug_request_context` 看服务器版本，再用 `manage_packages(action: "list_packages")` 看包版本；两者不同就按[升级步骤](#升级步骤)处理。若本来就一致，再检查 Editor 是否打开、是否正在编译。这与 `Session not found` **不是**同一件事，重新连接 Kiro 不会解决 |
| `Session not found`（JSON-RPC `-32600`） | 是 **MCP 传输层的 session** 丢了，几乎都是因为服务器重启过。请在 Kiro 的 MCP Server 面板重新连接，或重启 Kiro，以获取新的 session 并重新读取工具列表。每次升级桥接都一定会遇到。与 `no_unity_session` 不同 — 后者是 Unity 桥接层，不是传输层 |
| 一直停在旧版桥接，而且没有任何更新提示 | 检查 `Packages/manifest.json`：如果那一行结尾是 `#main`，Unity 只解析过一次就把结果缓存起来，永远不会跟着分支更新。请改成明确的 tag（`#v10.3.0`）强制重新解析，再按[升级步骤](#升级步骤)操作 |
| Port 8080 被占用（端口被其他程序使用） | 在 MCP for Unity 设置中改掉端口（上游建议 8090），重新执行 **Configure All Detected Clients**，重启 Kiro，并把 `mcp.json` 的 `url` 改成 Unity 窗口显示的端口 |
| 文档写的某个工具被报告为不存在 | 有可能是该工具的组没有启用 — bridge 声明的默认值只有 `core`，但在实机验证的那台机器上，所有工具不做任何启用就能调用。依次执行 `manage_tools(action: "list_groups")`、`manage_tools(action: "sync")`、`manage_tools(action: "activate", group: "<名称>")`，之后请刷新或重新连接 MCP 服务器（Kiro 可能会缓存工具列表）。注意 `list_groups` 可能对能正常工作的组报告 `enabled: false`，所以要以重试是否成功来判断，不要只看那个字段 |
| `Tool call denied by user's permissions` | 是 Kiro 的权限规则在 Unity 看到这次调用之前就拦下来了，不是 bridge 的问题。Kiro 会把本 Power 的服务器命名为 `power-kiro-unity-accelerator-unity-mcp`；请检查 `~/.kiro/settings/permissions.yaml`（以及工作区级别的同名文件）里有没有 `capability: mcp` 且 `effect: deny`、match 到 `power-<powerName>-<serverName>/<tool>` 的规则，若希望开放该工具就放宽规则。本 Power 验证的那台机器上，就是这种规则拦掉了 `manage_build`，让整个构建流程无法执行 |
| 在 `batch_execute` 里出现 `Unknown action` | `batch_execute` 会直接把命令送到 Unity，绕过 bridge 的 Python 服务器层，所以服务器层的 action 即使可用，在批处理里也会失败。请把那一条改成**直接调用**再试一次，然后才判断该 action 是否存在 |
| 注册了两个 Unity MCP 服务器 | 打开 `~/.kiro/settings/mcp.json` 与 Kiro 的 MCP 面板；如果本 Power 的项和 `unityMCP` 同时存在，请禁用其中一个并重启 Kiro（见「注册路径只能选一条」） |
| Unity 6.3+ 且安装了 Unity AI Assistant 包 | AI Assistant 内附的 `System.Collections.Immutable` 版本比 `validate_script` / `execute_code` 使用的 Roslyn 依赖所需的更新。上游的解法是把 `System.Collections.Immutable` v9.0.0 放进 `Assets/Plugins/` |
| 资产操作无响应 | Unity 可能正在编译，等待编译完成，或读取 `mcpforunity://editor/state` 资源确认状态 |
| TypeScript 类型错误 | 运行上面「开发」一节的标志式类型检查，并确认已运行 `npm install` |

## 安全

详见 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 许可证

本项目采用 MIT-0 许可证。详见 [LICENSE](LICENSE) 文件。
