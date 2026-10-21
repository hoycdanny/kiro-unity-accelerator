# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

> **Note on language availability**: README files are available in 5 languages. The Power automatically responds in the preferred language — simply interact in any supported language and it works seamlessly. Steering files include English summaries for accessibility. We welcome community contributions for additional translations. If you encounter any language barriers, please open an issue — our community is here to help.

IDE を Unity 開発の AI アシスタントに変換します。MCP（Model Context Protocol）を通じて自然言語で Unity Editor を操作し、アセット管理、シーン構築、ビルド自動化、パフォーマンス分析、コード品質チェックなどをカバーします — 40 以上の TypeScript ツールモジュールと 15 のドメインナレッジファイルを内蔵。

> **Unity 6.4 を基準バージョンとして対応**: 本 Power は **Unity 6.4**（リリースストリーム `6000.4`、最新パッチ `6000.4.12f1`、2026-06-17 リリース）と **MCP for Unity v10.3.0 以降（最低 v10.0.0）** のツール群を対象としています。本 Power がサポートする最小 Editor バージョンは **Unity 6.0（`6000.0`）** です。ブリッジ自体の下限はさらに低く Unity 2021.3 LTS です。本ドキュメントのガイダンスは **Unity `6000.4.6f1` + URP 17.4.0 + MCP for Unity 9.6.8、Windows Editor、2026-10-21** の組み合わせで実機確認しました — Unity 6.5、6.6 以降の 6.x でも動作する見込みですが、ここでは検証**していません**。Unity 6.4 は Update リリースであり、そのパッチストリームは 2026-06-17 に終了しているため、バージョンを固定して本番運用に入るプロジェクトは **Unity 6.3 LTS**（2027 年 12 月までサポート）または現行の Update リリースへ移行してください。**Unity 6.0 LTS は 2026-10-16 にサポートが終了しました — 「安全な旧バージョン」としても推奨しません。** 出典: [unity.com/releases](https://unity.com/releases/) および [endoflife.date/unity](https://endoflife.date/unity)（いずれも 2026-10-21 取得）。
>
> **6.4 固有のガイダンスが扱う内容**: URP は **Render Graph の一本道** になりました — URP Compatibility Mode と `URP_COMPATIBILITY_MODE` スクリプティング定義は 6.4 で完全に削除され、旧来のカスタム render pass の逃げ道ではなくなりました。GPU Resident Drawer（Forward+/Deferred+ 向け GPU インスタンシング、2D Renderer では利用不可）と、刷新された Rendering Statistics ウィンドウ（どのバッチング経路がドローコールを吸収したかを内訳表示し、単一の数値では報告しません）。`InstanceID` は `EntityId` に置き換えられたため、ブリッジが返す instance id は不透明なトークンとして扱ってください — そのままブリッジに返すだけにし、演算・ソート・パースは行わないこと。iOS では PVRTC が削除されました（ASTC または ETC のみ）。Web ビルドでは `[BurstCompile]` ジョブがバックグラウンドワーカーで実行されますが、マルチスレッド*レンダリング*は依然として利用できません。6.4 からは URP 2D のフレームループにカスタム render pass を注入できます。OculusXR パッケージは非推奨となり OpenXR プラグインへの移行が推奨され、HoloLens 2 のサポートとそのプラグインは 6.4 で非推奨になりました（OculusXR が実際に削除されるバージョンは未検証です）。Scripting Backend: `manage_build` が受け付けるのは **`mono` または `il2cpp` のみ** で、CoreCLR を本 Power から選択することはできません。出典: [New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64) および [Upgrade to Unity 6.4](https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64)（いずれも 2026-10-21 取得）。
>
> 本 Power は記憶上のバージョン番号だけで挙動を断定せず、MCP 経由で接続中のプロジェクトを確認します — 有効なレンダーパイプラインは `manage_graphics(action: "pipeline_get_info")`、Unity バージョンとプラットフォームは `mcpforunity://project/info` リソース、インストール済みパッケージは `manage_packages(action: "list_packages")` で取得し、その上でバージョン固有のアドバイスを適用します。

> **用語説明**：本ドキュメントで使用される主な技術用語（初出時に簡単な説明を付記します）：
> - **MCP** (Model Context Protocol)：AI アシスタントと開発ツールが通信するための標準プロトコル。開発者が自然言語で Unity Editor を操作できるようにします
> - **DAG** (Directed Acyclic Graph)：有向非巡回グラフ。タスクの依存順序を決定するために使用されます（例：「テクスチャをインポートしてからマテリアルを作成する」）
> - **MVC** (Model-View-Controller)：コードをデータ(Model)、表示(View)、ロジック(Controller)に分離するアーキテクチャパターン
> - **ECS** (Entity-Component-System)：Unity DOTS のデータ指向アーキテクチャパターン（従来のオブジェクト指向方式と異なり、データとロジックを分離してメモリ連続配置で大量のオブジェクトを処理）。数千のエンティティを効率的に管理できます
> - **ScriptableObject**：Unity のシリアライズ可能なデータコンテナ。設定や共有データの保存に使用されます（シーンオブジェクトにアタッチする必要なし）
> - **AssetBundle**：Unity のアセットパッケージング形式。配布と動的ロードに使用されます（初期インストールサイズを削減）

> **注**: 基盤となる Unity MCP ツール（[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)）はオープンソースであり、MCP 互換の任意のクライアントで独立して使用できます。

![Kiro Unity Accelerator スクリーンショット](image/README.png)

## 機能

- **アセット自動化** — アセットプリセットの一括適用、アセットタイプの自動検出、変更サマリーの生成
- **シーンスキャフォールディング** — ワンコマンドでシーン構造を生成、コンフリクト検出付き
- **ビルド自動化** — `manage_build` によるローカルビルド、ビルドログ解析、再利用可能なビルド設定テンプレート
- **クロスプラットフォームテスト** — `run_tests` / `get_test_job` によるテスト実行、結果フォーマット、テストスイート変換
- **ワークフロー自動化** — DAG 依存関係検証とトポロジカル実行によるマルチステップワークフロー
- **パフォーマンス分析** — Profiler スクリーンショット分析、コードアンチパターンスキャン、最適化推奨
- **コード品質** — MVC/ECS/ScriptableObject アーキテクチャチェック、循環依存検出
- **ナレッジ管理** — チームドキュメント管理、API 変更追跡、陳腐化検出
- **プラットフォーム互換性** — Shader 互換性、メモリバジェットチェック、重大度分類（XR/VR 含む）
- **アセット依存関係管理** — 依存ツリー、孤立アセット検出、AssetBundle 重複チェック
- **レベルデザインツール** — Editor 拡張スクリプト生成、ScriptableObject テンプレート、シーンオブジェクト一括設定
- **UI 依存関係分析** — クロスファイル UI 参照追跡、イベントチェーン分析、結合度評価

## アーキテクチャ

```
Developer (Natural Language)
    → AI Layer (AI Brain)
        → MCP Protocol
            → Unity Editor (Execution Layer)

Unity Accelerator (Intelligence Layer)
├── POWER.md        → Main doc defining tools & workflows
├── steering/       → 15 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## どの「Unity MCP」なのか — 3 つの別プロジェクト

「Unity MCP」に似た名前を持つ、互いに無関係な 3 つのプロジェクトがあります。本 Power が対象とするのは **1 つ目だけ** です。混在させると、本ドキュメントのどこにも一致しないツール名やポートになります。以下の 3 行はいずれも **2026-10-21** 取得。

| プロジェクト | 正体 | 接続方法 | ステータス |
|---|---|---|---|
| **(a) CoplayDev MCP for Unity** — *本 Power が使うのはこれ* | UPM `com.coplaydev.unity-mcp`、リポジトリ [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)、Python サーバーは PyPI の `mcpforunityserver`、MIT ライセンス | デフォルトは streamable HTTP でエンドポイント `http://127.0.0.1:8080/mcp`、または `uvx` 経由の stdio。Unity 側のブリッジは TCP `6400` も待ち受け | アクティブ。確認済みの最新リリースは **v10.3.0**（2026-10-04）。本 Power が記載するのは **v10.3.0 以降、最低 v10.0.0**。10 グループで計 49 のツールエントリポイント |
| **(b) IvanMurzak/Unity-MCP** — *別プロジェクト。ここでは使いません* | UPM `com.ivanmurzak.unity.mcp`、リポジトリ [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 専用のサーバーバイナリが `Library/mcp-server/` に自動ダウンロードされ、ポートはプロジェクトパスのハッシュから導出（20000–29999 の範囲）されるため設定するポートはありません | アクティブ、最新 1.3.0（2026-10-20 頃）。ツール名とポート方式は本 Power と **一致しません** |
| **(c) Unity 純正の Editor 内蔵 MCP サーバー** | `com.unity.ai.assistant` に同梱。UI は `Edit > Project Settings > AI > Unity MCP` | MCP クライアントが Editor 内蔵サーバーへ直接接続 | **非推奨（deprecated）** — 下記参照 |

**(c) の非推奨化について、そしてそれが本 Power に影響しない理由。** Unity の公式ドキュメントは、Editor 内蔵 AI assistant パッケージに含まれる MCP サーバーが非推奨であり、Unity CLI（`unity mcp`）がその役割を引き継ぎ、同じプロトコルを話す MCP サーバーを自ら同梱すると述べています（[Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)、2026-10-21 取得。同じ告知はパッケージドキュメント [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html)、2026-10-21 取得にも記載）。**同じ Unity のページには、エージェントに Unity へのアクセスを与えるために GitHub からインストールするサードパーティ MCP パッケージはこの非推奨化の影響を受けないと明記されています。** したがって (a) — 本 Power が使うブリッジ — は非推奨化の対象外であり、本 Power がこれによって廃れたわけではありません。

## 前提条件

- [Unity Editor](https://unity.com/) がインストール済みでプロジェクトが開いていること — 対象は Unity 6.4、本 Power の最小サポートは Unity 6.0
- [Kiro IDE](https://kiro.dev/docs/getting-started/installation) がインストール済みであること（他の MCP 互換 IDE でも動作可能）
- **MCP for Unity v10.3.0 以降（最低 v10.0.0）** — プロジェクトの `com.coplaydev.unity-mcp` が 9.6.8 以前の場合はアップグレードしてください。9.6.8 → 10.3.0 の差分はツールの追加のみで、移行コストはありません
- **Python 3.10 以降と [`uv`](https://docs.astral.sh/uv/)** — ブリッジのサーバーは `uv`/`uvx` から起動される Python パッケージ（PyPI の `mcpforunityserver`）です。MCP for Unity のセットアップウィザードが `uv` をインストールできます。Windows で PATH 上に複数の `uv.exe` がある場合は「Choose UV Install Location」を WinGet のシム（`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`）に向けてください
- Node.js 18+（開発/型チェック用のみ）

## インストール

### ステップ 1 — IDE にこの Power をインストール

IDE → 左パネルの Powers アイコンをクリック →「+」ボタンをクリック →「Add Custom Power」を選択 → このプロジェクトのルートディレクトリを選択

![カスタム Power のインストール](image/Add-Kiro-Customer-Power.png)

### ステップ 2 — unity-mcp をインストールし Unity で MCP Server を起動

1. Unity Editor を開く → Window → Package Manager

   ![ステップ 1：Package Manager を開く](image/Enable-Unity-MCP-Server-1.png)

2. 「+」をクリック →「Add package from git URL...」→ 以下の URL を貼り付けて Add をクリック：

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   ```

   ![ステップ 2：git URL からパッケージを追加](image/Enable-Unity-MCP-Server-2.png)

   `main` を追い続けたくない場合、git URL 以外にも次の方法があります：

   - **リリースを固定**：`#main` をタグに置き換える（例：`#v10.3.0`）
   - **OpenUPM**：`openupm add com.coplaydev.unity-mcp`
   - **Asset Store**：「MCP for Unity」のリスティングから Package Manager → My Assets

3. 初回インポート時にパッケージが**セットアップウィザード**を開きます。その後の常設 UI は **Window → MCP for Unity** で、サーバーの起動/停止、transport の切り替え、クライアントの再設定を行えます。

   ![ステップ 3：MCP ウィンドウを開く](image/Enable-Unity-MCP-Server-3.png)

   > 上のスクリーンショットはメニュー項目が「Toggle MCP Window」だった旧ビルドのものです。現行ビルドのパスは `Window → MCP for Unity` です。

4. ステータスパネルが **Connected** と表示されることを確認し、表示されるサーバーのエンドポイント/ポートを記録してください（後で使います）。復旧操作は `Restart Server` です。

   ![ステップ 4：Server が実行中であることを確認](image/Enable-Unity-MCP-Server-4.png)

### 登録経路は必ずどちらか一方だけ

Unity MCP サーバーを Kiro に登録する仕組みは 2 つあり、どちらも**同じ**設定ファイルに別の名前で書き込みます。両方を実行すると同じ Unity Editor を指すサーバーが 2 つでき、ツール一覧が重複し、リソース読み取り時のサーバー名が曖昧になります。

- **経路 A — 本 Power に登録させる。** Power をインストールし、その `mcp.json` には触らないこと。Legacy（`POWER.md`）形式の power の MCP サーバーは `~/.kiro/settings/mcp.json` の Powers セクションに、Kiro が名前空間を付けた名称で登録されます。
- **経路 B — Unity から Kiro を設定する。** Unity で `Window → MCP for Unity → Configure All Detected Clients`（または Kiro を選んで `Configure Selected`）。パッケージが同じファイルに `unityMCP` という名前のサーバーエントリを書き込みます。

> **Kiro の MCP パネルに Unity MCP サーバーが 2 つ表示されたら、どちらかを無効化して Kiro を再起動してください。** 関係する設定ファイルは 3 か所：本 Power 自身の `mcp.json`、ユーザーレベルの `~/.kiro/settings/mcp.json`、ワークスペースレベルの `.kiro/settings/mcp.json`。

### MCP 接続設定

#### 自動設定（推奨）

Unity で `Window → MCP for Unity` を開き → transport が HTTP であることを確認 → **Configure All Detected Clients**（または Kiro を選んで **Configure Selected**）をクリック。Kiro は正式サポート対象のクライアントなので、この操作でポートまで正確なエントリが `~/.kiro/settings/mcp.json` のサーバーキー `unityMCP` として書き込まれます。

#### 実際のポートを読み取る

**8080 を定数と考えないでください。** このポートはユーザーが変更でき、8080 は他サービスと衝突します（上流は Tailscale を例に挙げ、8090 への変更を提案しています）。MCP for Unity ウィンドウに現在のエンドポイントが表示されます — 8080 でない場合、URL は `http://127.0.0.1:<そのポート>/mcp` です。

#### 手動設定（最後の手段）

上の 2 ステップで有効なエントリが得られなかった場合にのみ `mcp.json` を編集してください。

HTTP モード（デフォルトの transport、ローカル専用 — Unity Editor との通信に使用）：

> **セキュリティノート**：ここでは意図的に HTTP を使用しています。サーバーはループバック（`127.0.0.1` / `::1`）のみにバインドします。LAN アドレスへのバインドには `Advanced Settings → Allow LAN Bind (HTTP Local)` が必要で、リモートエンドポイントは `https://` でなければなりません。デフォルト構成ではトラフィックがマシンの外に出ないため、HTTPS は不要です。

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

> `8080` は Unity ウィンドウに表示されたポートに置き換えてください。モードのキー名は `transport` ではなく `type` です。`127.0.0.1` は意図的です：上流ドキュメントは `localhost` と表記しますが、Unity 側のデフォルト値はリテラルの `127.0.0.1` であり、Windows では `localhost` が先に `::1` へ解決されることがあります。

Stdio モード（フォールバック — MCP サーバーを Kiro が管理する子プロセスとして起動）。PyPI の配布名は **`mcpforunityserver`**、コンソールエントリポイントは **`mcp-for-unity`** で、`--transport stdio` が必須です。PyPI に `unity-mcp` というパッケージは**存在しません** — 旧版の本 README が記載していた `uvx unity-mcp` が一度も起動しなかったのはこれが理由です。

Windows（`uvx.exe` は絶対パスで。WinGet のシムが推奨）：

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

macOS/Linux（PATH 上の `uvx` で通常は問題ありません）：

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

### 自動ガイダンス Hook のインストール（推奨）

この Power は `UserPromptSubmit` hook（Kiro 1.0 `v1` スキーマ）を提供し、各リクエスト処理前に AI に Power の有効化と適切な Steering File の読み込みを自動的にリマインドします。

```bash
mkdir -p .kiro/hooks
cp hooks/unity-power-auto-activate.json .kiro/hooks/unity-power-auto-activate.json
```

### 接続の確認

IDE で Unity 関連のコマンドを入力します（例：「現在のシーンのすべてのオブジェクトをリストして」）。正しく応答すれば、接続は成功です。

## 使い方

やりたいことを自然言語で IDE に伝えてください。AI が自動的に適切な MCP ツールを選択して実行します。

### コマンド例

```
「Characters フォルダ内のすべてのモデルを Humanoid rig に設定して」
「3D 一人称シーンを作成して」
「Windows 向けにビルドして」
「プロジェクトのコードアーキテクチャをチェックして」
「Android プラットフォームの互換性をチェックして」
「hero.fbx の依存関係を分析して」
```

### 実演：ゲームを作成してフル品質チェックを実行

> **注**: 以下の実演では、一般的な Unity ワークフローパターンを一人称インタラクティブシーンを使って示しています。同じワークフローパターンはすべてのプロジェクトタイプに適用できます — パズルゲーム、教育シミュレーション、建築ビジュアライゼーション、その他あらゆる Unity アプリケーション。

#### フェーズ 1：ゲームの作成

**ステップ 1 — プレイ可能な 3D シーンを構築**

```
以下を含む 3D 一人称シーンを作成：
- 地形（起伏のある草原）
- ディレクショナルライトとアンビエントライト
- 一人称コントローラー（WASD 移動 + マウスルック）
- インタラクティブオブジェクト（ボックスとシリンダー）
- HUD Canvas（クロスヘアとステータス表示）
シーンを Level01 と名付けて保存
```

**ステップ 2 — インタラクティブなゲームプレイメカニクスを追加**

```
コアインタラクションゲームプレイを追加：
1. インタラクションシステム：左クリックでインタラクト、Raycast ヒット検出、オブジェクトが視覚フィードバックで反応
2. 3 つのターゲットオブジェクト（カラーカプセル）がシーン内をゆっくり移動
3. オブジェクトは 3 回のインタラクション後に無効化されパーティクルエフェクトを再生
4. スコアシステム：左上にスコア表示、インタラクション成功ごとに +100
5. すべてのターゲットがクリアされたら「YOU WIN」を表示
```

**ステップ 3 — レベル設定システムを作成**

```
LevelConfig という ScriptableObject を作成：レベル名（string）、難易度（int, 1-10）、
制限時間（float）、敵ウェーブリスト（ネスト：敵タイプ string + 数 int + スポーン遅延 float）、
カスタム Inspector を生成
```

#### フェーズ 2：品質チェックと最適化

**ステップ 4 — コード品質チェック**

```
すべての C# コードを MVC アーキテクチャルールに対してチェック、命名規則、
レイヤー依存関係と循環参照をスキャン、すべての違反を修正提案付きでリスト
```

**ステップ 5 — パフォーマンススキャン**

```
すべての C# スクリプトのパフォーマンスアンチパターンをスキャン、現在のシーンの Draw Calls
とメモリ使用量を分析、重大度順にソートされた完全なパフォーマンスレポートを生成
```

**ステップ 6 — クロスプラットフォームチェック**

```
すべての Shader の Android と iOS でのプラットフォーム互換性をチェック、メモリバジェットを検証、
問題を Error/Warning/Suggestion に分類、互換性のない Shader に代替案を提供
```

**ステップ 7 — ビルドして結果を確認**

```
Android リリース設定でプロジェクトをビルド、ビルドログのエラーを解析、
各エラーのタイプ、ファイル位置、修正提案をリスト
```

## 開発

`src/` の TypeScript モジュールはそれぞれ独立しており、バンドラーもビルドステップもありません。テストスイートと TypeScript コンパイラ設定ファイルは開発者ローカル（git 管理外）なので、クローンしたままでは設定済みのテストランナーがありません。型チェックはコンパイラフラグを明示して実行してください：

```bash
npm install   # devDependencies のみ — 本 Power 自体にランタイム依存はありません

# 型チェック（bash）
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/*.ts
```

```powershell
# 型チェック（PowerShell）
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck (Get-ChildItem src -Filter *.ts | ForEach-Object FullName)
```

## プロジェクト構造

```
kiro-unity-accelerator/
├── POWER.md                    # メインドキュメント
├── mcp.json                    # MCP Server 接続設定
├── steering/                   # ドメインナレッジ Steering Files（15）
├── templates/                  # 内蔵テンプレート
│   ├── presets/                # アセットプリセット（5）
│   ├── scaffolds/              # シーンスキャフォールド（5）
│   ├── build-configs/          # ビルド設定（4）
│   ├── platform-profiles/      # プラットフォームプロファイル（5、XR/VR 含む）
│   ├── architecture-rules/     # アーキテクチャルール（3）
│   └── workflows/              # ワークフローテンプレート（3）
├── src/                        # TypeScript ツールモジュール（40+）
├── hooks/                      # Hook テンプレート（.kiro/hooks/ にコピー）
├── workshop/                   # ステップ式のプロンプトチュートリアル
├── image/                      # ドキュメント画像
└── package.json
```

## トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| Kiro が Unity に接続できない | Unity Editor がプロジェクトを開いた状態であることを確認 → `Window → MCP for Unity` → ステータスパネルが **Connected** であることを確認（そうでなければ `Restart Server`） |
| ポート 8080 が使用中 (Port 8080 is already in use by another program) | MCP for Unity の設定でポートを変更（上流は 8090 を提案）し、**Configure All Detected Clients** を再実行、Kiro を再起動、`mcp.json` の `url` を Unity ウィンドウ表示のポートに合わせる |
| ドキュメント記載のツールがツール一覧に出てこない | そのツールのグループが有効でない可能性が高い — デフォルトで有効なのは `core` だけです。`manage_tools(action: "list_groups")` → `manage_tools(action: "sync")` → `manage_tools(action: "activate", group: "<名前>")` の順に実行。Kiro はツール一覧をキャッシュすることがあるため、その後 MCP サーバーの更新または再接続を行ってください |
| Unity MCP サーバーが 2 つ登録されている | `~/.kiro/settings/mcp.json` と Kiro の MCP パネルを確認。本 Power のエントリと `unityMCP` の両方があれば一方を無効化して Kiro を再起動（「登録経路は必ずどちらか一方だけ」参照） |
| Unity 6.3+ で Unity AI Assistant パッケージを導入している | AI Assistant が同梱する `System.Collections.Immutable` が、`validate_script` / `execute_code` で使う Roslyn 依存が要求するものより新しいバージョンです。上流の対処は `System.Collections.Immutable` v9.0.0 を `Assets/Plugins/` に配置すること |
| アセット操作が無応答 | Unity がコンパイル中の可能性あり。コンパイル完了を待つか、`mcpforunity://editor/state` リソースで状態を確認 |
| TypeScript 型エラー | 上記「開発」セクションのフラグ付き型チェックを実行し、`npm install` が実行済みか確認 |

## セキュリティ

詳細は [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) を参照してください。

## ライセンス

このライブラリは MIT-0 ライセンスの下でライセンスされています。[LICENSE](LICENSE) ファイルを参照してください。
