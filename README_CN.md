# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

Unity 开发 AI 加速器。通过 MCP（Model Context Protocol）以自然语言指挥 Unity Editor，涵盖资产管理、场景构建、构建自动化、性能分析、代码质量检查等功能 — 内置 40+ TypeScript 工具模块与 14 个领域知识文件，为个人开发者和团队提供 Unity 开发 AI 支持。

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
- **构建自动化** — 本地构建、构建日志解析、可选云端加速
- **跨平台测试** — 本地模拟测试、结果格式化、测试套件转换
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
├── steering/       → 14 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 前置要求

- 已安装 [Unity Editor](https://unity.com/) 并打开项目
- 已安装 [Kiro IDE](https://kiro.dev/docs/getting-started/installation)
- Node.js 18+（仅开发/测试需要）

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

3. 安装完成后，前往 Window → Toggle MCP Window

   ![步骤 3：打开 MCP 窗口](image/Enable-Unity-MCP-Server-3.png)

4. 确认 MCP Server 状态显示绿色（运行中），并确认服务器正在监听 MCP 端点（显示于 Unity MCP 窗口中）

   ![步骤 4：确认 Server 运行中](image/Enable-Unity-MCP-Server-4.png)

### MCP 连接配置

#### 自动配置（推荐）

在 MCP for Unity 窗口中，选择「Kiro」并点击「Configuration」即可自动配置连接。

#### 手动配置

若自动配置不可用，请编辑 `mcp.json`。

HTTP 模式（默认，仅限本机 — 与 Unity Editor 通信）：

> **安全说明**：此处有意使用 HTTP。此端点仅与本机（localhost）上运行的 Unity Editor 通信，流量不会离开您的计算机，因此不需要 HTTPS。

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

Stdio 模式（备用）：

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

### 安装自动引导 Hook（推荐）

此 Power 提供 `promptSubmit` hook，会在每次请求前自动提醒 AI 启动 Power 并加载对应的 Steering File。

```bash
mkdir -p .kiro/hooks
cp hooks/pre-unity-tool.kiro.hook .kiro/hooks/
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

```bash
npm install

npm test                 # 运行所有测试
npm run test:unit        # 仅单元测试
npm run test:property    # 属性测试（fast-check）
npm run test:integration # 仅集成测试
npx tsc --noEmit         # TypeScript 类型检查
```

## 项目结构

```
kiro-unity-accelerator/
├── POWER.md                    # Kiro 主文档
├── mcp.json                    # MCP Server 连接配置
├── steering/                   # 领域知识 Steering Files（14 个）
├── templates/                  # 内置模板
│   ├── presets/                # 资产预设（5 个）
│   ├── scaffolds/              # 场景脚手架（5 个）
│   ├── build-configs/          # 构建配置（4 个）
│   ├── platform-profiles/      # 平台配置文件（5 个，含 XR/VR）
│   ├── architecture-rules/     # 架构规则（3 个）
│   └── workflows/              # 工作流模板（3 个）
├── src/                        # TypeScript 工具模块（40+）
├── tests/                      # 测试套件
│   ├── unit/                   # 单元测试
│   ├── property/               # 属性测试（fast-check）
│   └── integration/            # 集成测试
├── hooks/                      # Kiro hooks
├── image/                      # 文档图片
├── package.json
├── tsconfig.json
└── jest.config.ts
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| Kiro 无法连接到 Unity | 确认 Unity Editor 已打开 → Window → MCP for Unity → Start Server |
| Port 8080 被占用（端口被其他程序使用） | 关闭冲突的进程，或在 `mcp.json` 中切换为 stdio 模式（替代连接方式） |
| 资产操作无响应 | Unity 可能正在编译，等待编译完成 |
| 云端辅助失败 | 自动降级为本地模式，核心功能不受影响 |
| 测试失败 | 运行 `npm test` 查看详细错误信息 |
| TypeScript 类型错误 | 运行 `npx tsc --noEmit`，确认已运行 `npm install` |

## 安全

详见 [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications)。

## 许可证

本项目采用 MIT-0 许可证。详见 [LICENSE](LICENSE) 文件。
