# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

> **Note on language availability**: README files are available in 5 languages. The Power automatically responds in the preferred language — simply interact in any supported language and it works seamlessly. Steering files include English summaries for accessibility. We welcome community contributions for additional translations. If you encounter any language barriers, please open an issue — our community is here to help.

IDE を Unity 開発の AI アシスタントに変換します。MCP（Model Context Protocol）を通じて自然言語で Unity Editor を操作し、アセット管理、シーン構築、ビルド自動化、パフォーマンス分析、コード品質チェックなどをカバーします — 40 以上の TypeScript ツールモジュールと 15 のドメインナレッジファイルを内蔵。

> **Unity 6.4 を基準バージョンとして対応**: 本 Power は **Unity 6.4**（リリースストリーム `6000.4`、最新パッチ `6000.4.12f1`、2026-06-17 リリース）と **MCP for Unity v10.3.0 以降（最低 v10.0.0）** のツール群を対象としています。本 Power がサポートする最小 Editor バージョンは **Unity 6.0（`6000.0`）** です。ブリッジ自体の下限はさらに低く Unity 2021.3 LTS です。本ドキュメントのガイダンスは **Unity `6000.4.6f1` + URP 17.4.0、Windows Editor、2026-10-21** の環境で実機確認しました。まず MCP for Unity **9.6.8** で確認し、その後同じマシンでブリッジを **10.3.0** にアップグレードしてから、直接呼び出しで再確認しています（[ブリッジのアップグレード：同期が必要な 2 つのバージョン固定](#ブリッジのアップグレード同期が必要な-2-つのバージョン固定)を参照） — Unity 6.5、6.6 以降の 6.x でも動作する見込みですが、ここでは検証**していません**。**10.3.0 上で直接呼び出して実機確認できた項目**: 実行中のブリッジのバージョン、**49 個**のツール一覧全体と 9.6.8 → 10.3.0 の差分が純粋な追加のみであること（6 個追加、**削除も改名もゼロ**。したがって本 Power にとって移行コストは発生しません）、新しい `asset_gen` ツールグループが**デフォルトで無効**であり、そのグループのツールは開発者自身が用意した外部サービスのクレジットを消費すること、10 個のツールグループのメンバーとデフォルト値、そして本ドキュメントが記載する `manage_asset` / `find_gameobjects` / `manage_scene` の契約。6 回目のラウンドでは **書き込み系の経路** を実際に実行して確認しました: GameObject・component・prefab・script・アセットフォルダーの書き込み、`refresh_unity`、そして `run_tests` → `get_test_job` の非同期ジョブのライフサイクル全体です。書き込みはすべて隔離した `Assets/_MCPVerify/` フォルダー内に限定し、終了後に削除して、プロジェクトが元の基準状態に戻っていることを確認しています（「書き込み経路で何が確認できたか」の節を参照）。**まだ未検証**の項目: `asset_gen` の 6 つのツール（**実際に費用が発生するため意図的に一度も呼んでいません**）、`manage_build`（検証マシン自身の権限ルールでブロック）、そして **実際のテストに対する** `run_tests` — 検証プロジェクトには test assembly が 1 つも無いため、ジョブのライフサイクルは確認済みですが、**合否の結果レポートは未検証**です。Unity 6.4 は Update リリースであり、そのパッチストリームは 2026-06-17 に終了しているため、バージョンを固定して本番運用に入るプロジェクトは **Unity 6.3 LTS**（2027 年 12 月までサポート）または現行の Update リリースへ移行してください。**Unity 6.0 LTS は 2026-10-16 にサポートが終了しました — 「安全な旧バージョン」としても推奨しません。** 出典: [unity.com/releases](https://unity.com/releases/) および [endoflife.date/unity](https://endoflife.date/unity)（いずれも 2026-10-21 取得）。
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
| **(a) CoplayDev MCP for Unity** — *本 Power が使うのはこれ* | UPM `com.coplaydev.unity-mcp`、リポジトリ [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)、Python サーバーは PyPI の `mcpforunityserver`、MIT ライセンス | デフォルトは streamable HTTP でエンドポイント `http://127.0.0.1:8080/mcp`、または `uvx` 経由の stdio。Unity 側のブリッジは TCP `6400` も待ち受け | アクティブ。確認済みの最新リリースは **v10.3.0**（2026-10-04）。本 Power が記載するのは **v10.3.0 以降、最低 v10.0.0**。10 グループで計 **49** のツールエントリポイント — 10.3.0 上で実際に `manage_tools(action: "list_groups")` を呼んで数えた値であり、こちらが正です（上流の README は 48 と記載）|
| **(b) IvanMurzak/Unity-MCP** — *別プロジェクト。ここでは使いません* | UPM `com.ivanmurzak.unity.mcp`、リポジトリ [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 専用のサーバーバイナリが `Library/mcp-server/` に自動ダウンロードされ、ポートはプロジェクトパスのハッシュから導出（20000–29999 の範囲）されるため設定するポートはありません | アクティブ、最新 1.3.0（2026-10-20 頃）。ツール名とポート方式は本 Power と **一致しません** |
| **(c) Unity 純正の Editor 内蔵 MCP サーバー** | `com.unity.ai.assistant` に同梱。UI は `Edit > Project Settings > AI > Unity MCP` | MCP クライアントが Editor 内蔵サーバーへ直接接続 | **非推奨（deprecated）** — 下記参照 |

**(c) の非推奨化について、そしてそれが本 Power に影響しない理由。** Unity の公式ドキュメントは、Editor 内蔵 AI assistant パッケージに含まれる MCP サーバーが非推奨であり、Unity CLI（`unity mcp`）がその役割を引き継ぎ、同じプロトコルを話す MCP サーバーを自ら同梱すると述べています（[Unity CLI as the replacement for the in-Editor MCP server](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)、2026-10-21 取得。同じ告知はパッケージドキュメント [com.unity.ai.assistant — Get started with MCP server](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.18/manual/integration/unity-mcp-get-started.html)、2026-10-21 取得にも記載）。**同じ Unity のページには、エージェントに Unity へのアクセスを与えるために GitHub からインストールするサードパーティ MCP パッケージはこの非推奨化の影響を受けないと明記されています。** したがって (a) — 本 Power が使うブリッジ — は非推奨化の対象外であり、本 Power がこれによって廃れたわけではありません。

## 前提条件

- [Unity Editor](https://unity.com/) がインストール済みでプロジェクトが開いていること — 対象は Unity 6.4、本 Power の最小サポートは Unity 6.0
- [Kiro IDE](https://kiro.dev/docs/getting-started/installation) がインストール済みであること（他の MCP 互換 IDE でも動作可能）
- **MCP for Unity v10.3.0 以降（最低 v10.0.0）** — プロジェクトの `com.coplaydev.unity-mcp` が 9.6.8 以前の場合はアップグレードしてください。9.6.8 → 10.3.0 の差分はツールの追加のみで、移行コストはありません。作業前に[ブリッジのアップグレード：同期が必要な 2 つのバージョン固定](#ブリッジのアップグレード同期が必要な-2-つのバージョン固定)を読んでください。C# パッケージと Python サーバーは別々にバージョン固定されており、片方だけ上げるとブリッジが壊れます
- **Python 3.10 以降と [`uv`](https://docs.astral.sh/uv/)** — ブリッジのサーバーは `uv`/`uvx` から起動される Python パッケージ（PyPI の `mcpforunityserver`）です。MCP for Unity のセットアップウィザードが `uv` をインストールできます。Windows で PATH 上に複数の `uv.exe` がある場合は「Choose UV Install Location」を WinGet のシム（`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`）に向けてください
- Node.js 18+（開発/型チェック用のみ）

## インストール

### ステップ 1 — IDE にこの Power をインストール

IDE → 左パネルの Powers アイコンをクリック →「+」ボタンをクリック →「Add Custom Power」を選択 → このプロジェクトのルートディレクトリを選択

![カスタム Power のインストール](image/Add-Kiro-Customer-Power.png)

### ステップ 2 — unity-mcp をインストールし Unity で MCP Server を起動

1. Unity Editor を開く → Window → Package Manager

   ![ステップ 1：Package Manager を開く](image/Enable-Unity-MCP-Server-1.png)

2. 「+」をクリック →「Add package from git URL...」→ 以下の URL を貼り付けて Add をクリック。**末尾の `#v10.3.0` タグは固定です。`#main` に置き換えないでください：**

   ```
   https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0
   ```

   ![ステップ 2：git URL からパッケージを追加](image/Enable-Unity-MCP-Server-2.png)

   > **これは訂正された手順です。** 以前の README では `...?path=/MCPForUnity#main` を指定するよう書かれていましたが、それは誤りで、**実際のインストール環境でこの不具合を再現・確認しました（2026-10-21 実機）**。Unity は git UPM 依存を**一度だけ**解決し、その結果のコミットをキャッシュします。`#main` のような動くリファレンスはブランチを**追跡しません**。検証マシンの `Packages/manifest.json` は `#main` でしたが、実際にインストールされていたパッケージは **9.6.8** のままで、上流はすでに **10.3.0** — 数か月にわたり旧版に取り残され、Package Manager にも更新の通知は一切出ませんでした。数か月前のブリッジは本 Power が記載するツール群と一致しないため、これは「AI が Unity を操作できない」の直接的な原因のひとつです。

   タグ固定の git URL 以外の方法：

   - **OpenUPM**：`openupm add com.coplaydev.unity-mcp` — レジストリ経由のインストールなので、新バージョンが出ると Package Manager が更新を提示します
   - **Asset Store**：「MCP for Unity」のリスティングから Package Manager → My Assets

   **後でアップグレードするときはタグを変更してください** — 依存文字列が変わることで Unity が再解決します。`Packages/manifest.json` を直接編集するか：

   ```json
   "com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.3.0"
   ```

   …あるいはパッケージを削除して、新しいタグで git URL を再追加します。そのうえで[ブリッジのアップグレード：同期が必要な 2 つのバージョン固定](#ブリッジのアップグレード同期が必要な-2-つのバージョン固定)に従ってください — UPM パッケージはアップグレードの半分にすぎません。

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

**8080 を定数と考えないでください。** ポートはサーバー起動時の `--http-url` に渡された値そのものでユーザーが変更でき、8080 は他サービスと衝突します（上流は Tailscale を例に挙げ、8090 への変更を提案しています）。MCP for Unity ウィンドウに現在のエンドポイントが表示されます — 8080 でない場合、URL は `http://127.0.0.1:<そのポート>/mcp` です。

ポートはディスクから直接読み取ることもできます。稼働中のサーバーは Unity プロジェクト配下に、ポート名を含む pidfile を書き出します。

```
<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid
```

`mcp_http_8080.pid` があれば、サーバーは `http://127.0.0.1:8080` で動作しています。本 Power を実機検証したマシンはまさにこの状態で、サーバー自身のコマンドラインは `mcp-for-unity --transport http --http-url http://127.0.0.1:8080 --project-scoped-tools --pidfile ...mcp_http_8080.pid` でした。

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

### ブリッジのアップグレード：同期が必要な 2 つのバージョン固定

MCP for Unity は**2 つのコンポーネントで構成され、それぞれが独立にバージョンを固定しています**。アップグレード時に最も混乱するのがこの点です。以下はすべて **2026-10-21** に実機で実施・観察した 9.6.8 → 10.3.0 のアップグレード記録です。

| コンポーネント | 内容 | バージョン固定の場所 |
|---|---|---|
| UPM パッケージ（C# Editor 側） | Unity プロジェクトに取り込む `com.coplaydev.unity-mcp` | `Packages/manifest.json` — git タグ、またはレジストリのバージョン |
| Python MCP サーバー | PyPI の `mcpforunityserver`、実行エントリは `mcp-for-unity` | Unity が書き出す起動コマンドラインの `--from "mcpforunityserver==<バージョン>"` 引数 |

アップグレード前に観測したサーバー起動コマンドライン（原文のまま）：

```
uvx --from "mcpforunityserver==9.6.8" mcp-for-unity --transport http --http-url http://127.0.0.1:8080
  --project-scoped-tools --pidfile <UnityProject>\Library\MCPForUnity\RunState\mcp_http_8080.pid
  --unity-instance-token <token>
```

**UPM パッケージを上げても Python サーバーは上がりません。** manifest を `#v10.3.0` に変更し、Unity が v10.3.0 の C# を正常にインポート・コンパイルし終えた後も、稼働中のサーバーは `9.6.8` を報告し続けました — 古いキャッシュを実行していたためです。

**バージョンの不一致はブリッジを壊します。しかも壊れ方が「部分的」で非常に分かりにくいです。** C# が 10.3.0、Python が 9.6.8 の状態では、Unity を必要とするツール呼び出しはすべて `{"success":false,"error":"Unity session not available; please retry","data":{"reason":"no_unity_session",...}}` を返す一方、サーバー層だけで完結するツール（`debug_request_context` など）は正常に応答し続けます。サーバーは生きているように見えるのに、Unity に触れる操作は何ひとつ動きません。

#### アップグレード手順

1. **UPM のバージョン固定を変更** — `Packages/manifest.json` のタグを編集するか、パッケージを削除して新しいタグで git URL を再追加します。`#main` のような動くリファレンスは再解決されません。
2. *任意。回線が遅い場合は推奨：* `uvx --from "mcpforunityserver==10.3.0" mcp-for-unity --help` で **uv キャッシュを事前に用意**します。実機ではこれを行ったため、Unity が後から `--offline` でサーバーを起動できました。
3. **Unity にインポートとコンパイルをさせ**、editor log に `error CS` がないことを確認します。
4. **古いサーバーのプロセスチェーンを停止**（`uvx` → `uv` → `mcp-for-unity` → `python`）。自分で新バージョンに切り替わることはありません。
5. **残った pidfile を削除**（ある場合）：`<UnityProject>\Library\MCPForUnity\RunState\mcp_http_<port>.pid`。実機ではプロセスを終了させてもこのファイルが残り、手動で削除する必要がありました。
6. **Unity からサーバーを起動**：`Window → MCP for Unity → Start Server`。**この明示的な操作が必須でした** — パッケージのアップグレード後も、プロセスチェーンを終了させた後も、サーバーは自動的に再起動しませんでした。手動起動すると、v10.3.0 の C# を実行している Unity が一致するバージョン固定でサーバーを再起動します（`uvx --offline --from "mcpforunityserver==10.3.0" ...`）。新しい uv キャッシュ archive が使われ、ポートは再び待ち受け状態になり、両コンポーネントが 10.3.0 になりました。
7. **Kiro の MCP サーバーを再接続**（MCP Server パネル → reconnect、または Kiro を再起動）。アップグレードは必ずクライアントの MCP セッションを無効化します — 次の項を参照。
8. **両方のバージョンが一致しているか確認**：`debug_request_context` がサーバーのバージョンを、`manage_packages(action: "list_packages")` がパッケージのバージョンを報告します。

#### よく似ているが別物の 2 つのエラー

サーバーが 10.3.0 で再起動した後、すでに接続済みだったクライアントの呼び出しは `{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Session not found"}}` で失敗しました。これは **MCP トランスポートのセッション**であり、Unity ブリッジではありません：

| エラー | どの層か | 対処 |
|---|---|---|
| `Session not found`（`-32600`） | Kiro と Python サーバーの間の MCP トランスポートセッション | Kiro の MCP サーバーを再接続、または Kiro を再起動。バージョン固定とは無関係 |
| `no_unity_session` /「Unity session not available」 | Python サーバーと Editor の間の Unity ブリッジ | まず 2 つのバージョン固定を一致させる。すでに一致しているなら、Editor が開いているか、コンパイル中でないかを確認。再接続はこのエラーには無効 |

#### v10.3.0 とは

v10.3.0 は現在の正式（prerelease ではない）リリースです（GitHub タグ `v10.3.0`、2026-10-04 公開、アセット `unity-mcp-10.3.0.mcpb`）。対応する `mcpforunityserver-10.3.0` も PyPI にあります（同じ分に公開、Python 3.10 以上が必要）。本 Power に関係するリリースノート項目：Unity 6000.6 の `InstanceIDToObjectCompat` 修正、stdio が再接続のバックオフ前にポート探索を更新するようになった修正、`read_console` が Console ウィンドウのフィルタで項目を隠されないようにする修正、ツールがツール一覧に見つからないときどこを見るかという上流ドキュメントの追加、新しい Blender Bridge、そして fal / OpenRouter のアセット生成モデルの自動検出。

v10.3.0 のサーバー CLI（10.3.0 で `mcp-for-unity --help`）は `--default-instance`、`--transport {stdio,http}`、`--http-url`、`--http-host`、`--http-port`、`--http-remote-hosted`、`--api-key-*` 系（リモートホスティング時の認証用）、`--unity-instance-token`、`--pidfile`、`--project-scoped-tools` を受け付けます。これにより上記の stdio フォールバックの書式が正しいことも確認できました。補足すべき点は 1 つだけで、`--from` でバージョンを固定するのが実運用の慣習であり、Unity 自身のランチャーもそうしているということです。

#### ツール群は実際に何が変わったか（実測）

アップグレード後にクライアントが再接続できたので、v10 のツールを直接呼び出して確認しました。同じマシン上で、実際のツール一覧は 9.6.8 の **43 個**から 10.3.0 の **49 個**になりました。追加された 6 個は `blender_bridge`、`generate_audio`、`generate_image`、`generate_model`、`import_model`、`import_model_file` です。**削除も改名も 1 つもなく**、したがって本 Power にとってこのアップグレードに移行コストはありません。数は 49 を基準にしてください — 上流の README は「48 focused MCP tool entrypoints」と書いていますが、実測値が優先します。

この 6 個はすべて新しい 10 番目のツールグループ **`asset_gen`** に属し、`manage_tools(action: "list_groups")` は `enabled: false`、`default_enabled: false` と返しました。**デフォルトで無効であることは実機で確認済みで、これは正しい安全なデフォルトです**: これらのツールは有料の外部サービスを、あなた自身の API キーで呼び出して 3D モデル・画像・音声を生成します。このグループを有効化することは、課金されるツールをエージェントの前に並べることと同じなので、本 Power はどのワークフローもここへルーティングせず、検証中も 6 個のツールを**一度も呼び出していません**。残る 9 グループは 9.6.8 から変化がありませんでした。

もう 1 つ知っておく価値のあるセキュリティ改善: 10.3.0 の `debug_request_context` は `--unity-instance-token` の値を `***` にマスクします。9.6.8 では平文で出力されていました。デバッグ出力を共有する前に目を通すのは依然として良い習慣ですが、v10 では以前ほど重大ではありません。`session_state` ブロックも、9.6.8 が返していた `derived_key` / `all_keys_in_store` フィールドを返さなくなりました。

#### 書き込み経路で何が確認できたか、そして呼び出しの連結方法を変える 1 つの発見

最後のラウンドでは読み取りだけでなく、実際にプロジェクトへ書き込みました。書き込みはすべて隔離した `Assets/_MCPVerify/` フォルダー内で行い、オブジェクト名は `MCPVerify_*` に統一し、終了後にすべて削除しています。そのうえでプロジェクトが元の基準状態に戻ったことを確認しました — `SampleScene` は元の 3 つのルートオブジェクトと元の component 構成を保持し、`manage_asset(action: "search", search_pattern: "*")` も元の 20 件のアセット（すべて Unity テンプレート付属の内容）を返します。

**10.3.0 で検証済み**: `manage_asset` のフォルダー作成と削除、`create_script`、`get_sha`、`validate_script`、`find_in_file` の成功パス、`script_apply_edits`、`delete_script`、`manage_gameobject` の create / modify / duplicate / delete、`manage_components` の add と set_property、`manage_prefabs(create_from_gameobject)`、`refresh_unity`、そして `run_tests` → `get_test_job` の非同期ジョブのライフサイクル全体（`running` → `succeeded`、約 7.5 秒）。プロジェクトに test assembly が無いため、**ライフサイクルは確認済みですが、合否のレポートは未確認です**。

**instance ID は変動します。これが複数ステップの作業に最も大きく影響する発見です。** 作成直後の GameObject が返す ID は**負の値**（`-5560`）で、Unity がそのオブジェクトを登録した後はその ID では解決できなくなり（`not found using method 'by_id'`）、オブジェクトは別の正の ID（`50436`、その後 `50470`）で応答します。さらに厄介なのは、`refresh_unity` による再コンパイル後に **誰も触っていないオブジェクトまで番号が振り直された** 点です — Main Camera 49224 → 50412、Directional Light 49234 → 50422、Global Volume 49242 → 50430。したがって、ステップ間で持ち回すのはオブジェクトの**名前かパス**にしてください。instance ID が必要な場合は、それを使う呼び出しの直前に取り直し、再コンパイルや domain reload をまたいで ID を保持しないことです。

同じラウンドで 3 つの小さな修正も得られました。3 つのオブジェクト系ツールは `target` の解釈が揃っていません（`manage_components` は整数の ID を受け付け、`manage_gameobject` は**文字列**が必須でデフォルトでは**名前**として解決し、`manage_prefabs` は**名前**が必須）— 名前を渡せば 3 つすべてに通ります。`script_apply_edits` が取るのは **`name` + `path`** で、`uri` ではありません。`refresh_unity` の `mode` と `compile` はどちらも文字列の enum（`if_dirty` / `force` と `none` / `request`）なので、`compile: true` は拒否されます。さらに `manage_gameobject(duplicate)` は `name` を無視して Unity 自身の `<元の名前>_Copy` を作ること、Unity 6.4 の現行プロパティ `linearDamping`（obsolete な `drag` の置き換え）が `manage_components` から設定できることも確認しました。

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
| Unity 関連の呼び出しがすべて `Unity session not available; please retry` /「`"reason":"no_unity_session"`」を返すが、`debug_request_context` は正常に応答する | **まず疑うべきは、C# パッケージと Python サーバーのバージョン不一致です。** 2026-10-21 実機確認 — C# が 10.3.0、Python が 9.6.8 のときの症状がまさにこれで、部分的な失敗なのでサーバーは健全に見えます。`debug_request_context` でサーバーのバージョンを、`manage_packages(action: "list_packages")` でパッケージのバージョンを確認し、異なれば[アップグレード手順](#アップグレード手順)に従ってください。すでに一致している場合は Editor が開いているか、コンパイル中でないかを確認します。`Session not found` とは**別物**で、Kiro を再接続しても解決しません |
| `Session not found`（JSON-RPC `-32600`） | **MCP トランスポートのセッション**が失われています。ほぼ常にサーバーが再起動したためです。Kiro の MCP Server パネルで再接続するか Kiro を再起動して、新しいセッションを取得しツール一覧を読み直してください。ブリッジのアップグレード時には必ず発生します。`no_unity_session`（Unity ブリッジ層）とは別物です |
| 旧バージョンのブリッジから動かず、更新も提示されない | `Packages/manifest.json` を確認してください。その行が `#main` で終わっている場合、Unity は一度解決した結果をキャッシュしているだけで、ブランチを追跡することはありません。明示的なタグ（`#v10.3.0`）に変更して再解決を強制し、[アップグレード手順](#アップグレード手順)に従ってください |
| ポート 8080 が使用中 (Port 8080 is already in use by another program) | MCP for Unity の設定でポートを変更（上流は 8090 を提案）し、**Configure All Detected Clients** を再実行、Kiro を再起動、`mcp.json` の `url` を Unity ウィンドウ表示のポートに合わせる |
| ドキュメント記載のツールが「存在しない」と報告される | そのツールのグループが無効な可能性があります — bridge が宣言するデフォルトは `core` のみですが、実機検証したマシンでは有効化なしで全ツールが呼び出せました。`manage_tools(action: "list_groups")` → `manage_tools(action: "sync")` → `manage_tools(action: "activate", group: "<名前>")` の順に実行し、その後 MCP サーバーの更新または再接続を行ってください（Kiro はツール一覧をキャッシュすることがあります）。`list_groups` は正常に動くグループにも `enabled: false` を返しうるため、そのフィールドではなく再試行が成功したかどうかで判断してください |
| `Tool call denied by user's permissions` | Unity に届く前に Kiro の権限ルールが呼び出しを拒否しています。bridge の問題ではありません。Kiro は本 Power のサーバーを `power-kiro-unity-accelerator-unity-mcp` として公開するため、`~/.kiro/settings/permissions.yaml`（およびワークスペース階層の同名ファイル）に `capability: mcp` かつ `effect: deny` で `power-<powerName>-<serverName>/<tool>` に一致するルールがないか確認し、そのツールを使いたい場合はルールを緩めてください。本 Power を検証したマシンでは、このルールが `manage_build` を拒否し、ビルドワークフロー全体が実行不能でした |
| `batch_execute` の中で `Unknown action` が出る | `batch_execute` はコマンドを Unity へ直接転送し、bridge の Python サーバー層をバイパスします。そのためサーバー層の action は実際には使えてもバッチ内では失敗します。その 1 件を**直接呼び出し**で再実行してから、action の有無を判断してください |
| Unity MCP サーバーが 2 つ登録されている | `~/.kiro/settings/mcp.json` と Kiro の MCP パネルを確認。本 Power のエントリと `unityMCP` の両方があれば一方を無効化して Kiro を再起動（「登録経路は必ずどちらか一方だけ」参照） |
| Unity 6.3+ で Unity AI Assistant パッケージを導入している | AI Assistant が同梱する `System.Collections.Immutable` が、`validate_script` / `execute_code` で使う Roslyn 依存が要求するものより新しいバージョンです。上流の対処は `System.Collections.Immutable` v9.0.0 を `Assets/Plugins/` に配置すること |
| アセット操作が無応答 | Unity がコンパイル中の可能性あり。コンパイル完了を待つか、`mcpforunity://editor/state` リソースで状態を確認 |
| TypeScript 型エラー | 上記「開発」セクションのフラグ付き型チェックを実行し、`npm install` が実行済みか確認 |

## セキュリティ

詳細は [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) を参照してください。

## ライセンス

このライブラリは MIT-0 ライセンスの下でライセンスされています。[LICENSE](LICENSE) ファイルを参照してください。
