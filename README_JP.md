# Kiro Unity Accelerator

[English](README.md) | [繁體中文](README_ZH.md) | [简体中文](README_CN.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

> **Note on language availability**: README files are available in 5 languages. The Power automatically responds in the preferred language — simply interact in any supported language and it works seamlessly. Steering files include English summaries for accessibility. We welcome community contributions for additional translations. If you encounter any language barriers, please open an issue — our community is here to help.

IDE を Unity 開発の AI アシスタントに変換します。MCP（Model Context Protocol）を通じて自然言語で Unity Editor を操作し、アセット管理、シーン構築、ビルド自動化、パフォーマンス分析、コード品質チェックなどをカバーします — 40 以上の TypeScript ツールモジュールと 14 のドメインナレッジファイルを内蔵。

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
- **ビルド自動化** — ローカルビルド、ビルドログ解析、オプションのクラウドアシスト加速
- **クロスプラットフォームテスト** — ローカルシミュレーションテスト、結果フォーマット、テストスイート変換
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
├── steering/       → 14 domain knowledge files
├── templates/      → Built-in templates (Presets, Scaffolds, Build Configs, etc.)
└── src/            → 40+ TypeScript tool modules
```

## 前提条件

- [Unity Editor](https://unity.com/) がインストール済みでプロジェクトが開いていること
- [Kiro IDE](https://kiro.dev/docs/getting-started/installation) がインストール済みであること（他の MCP 互換 IDE でも動作可能）
- Node.js 18+（開発/テスト用のみ）

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

3. インストール完了後、Window → Toggle MCP Window に移動

   ![ステップ 3：MCP ウィンドウを開く](image/Enable-Unity-MCP-Server-3.png)

4. MCP Server のステータスが緑色（実行中）であることを確認し、サーバーが MCP エンドポイント（Unity MCP ウィンドウに表示）でリッスンしていることを確認

   ![ステップ 4：Server が実行中であることを確認](image/Enable-Unity-MCP-Server-4.png)

### MCP 接続設定

#### 自動設定（推奨）

MCP for Unity ウィンドウで対象 IDE を選択し、「Configuration」をクリックして接続を自動設定します。

#### 手動設定

自動設定が利用できない場合は `mcp.json` を編集してください。

HTTP モード（デフォルト、ローカル専用 — Unity Editor との通信に使用）：

> **セキュリティノート**：ここでは意図的に HTTP を使用しています。このエンドポイントは `localhost`（ループバックインターフェース）上で動作する Unity Editor とのみ通信します。トラフィックはマシンの外に出ないため、HTTPS は不要です。

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

Stdio モード（フォールバック）：

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

### 自動ガイダンス Hook のインストール（推奨）

この Power は `promptSubmit` hook を提供し、各リクエスト処理前に AI に Power の有効化と適切な Steering File の読み込みを自動的にリマインドします。

```bash
mkdir -p .kiro/hooks
cp hooks/pre-unity-tool.kiro.hook .kiro/hooks/
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

```bash
npm install

npm test                 # すべてのテストを実行
npm run test:unit        # ユニットテストのみ
npm run test:property    # プロパティテスト（fast-check）
npm run test:integration # 統合テストのみ
npx tsc --noEmit         # TypeScript 型チェック
```

## プロジェクト構造

```
kiro-unity-accelerator/
├── POWER.md                    # メインドキュメント
├── mcp.json                    # MCP Server 接続設定
├── steering/                   # ドメインナレッジ Steering Files（14）
├── templates/                  # 内蔵テンプレート
│   ├── presets/                # アセットプリセット（5）
│   ├── scaffolds/              # シーンスキャフォールド（5）
│   ├── build-configs/          # ビルド設定（4）
│   ├── platform-profiles/      # プラットフォームプロファイル（5、XR/VR 含む）
│   ├── architecture-rules/     # アーキテクチャルール（3）
│   └── workflows/              # ワークフローテンプレート（3）
├── src/                        # TypeScript ツールモジュール（40+）
├── tests/                      # テストスイート
│   ├── unit/                   # ユニットテスト
│   ├── property/               # プロパティテスト（fast-check）
│   └── integration/            # 統合テスト
├── hooks/                      # IDE hooks
├── image/                      # ドキュメント画像
├── package.json
├── tsconfig.json
└── jest.config.ts
```

## トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| IDE が Unity に接続できない | Unity Editor が開いていることを確認 → Window → MCP for Unity → Start Server |
| ポート 8080 が使用中 (Port 8080 is already in use by another program) | 競合するプロセスを終了するか、`mcp.json` で stdio モード（代替接続方式）に切り替え |
| アセット操作が無応答 | Unity がコンパイル中の可能性あり、コンパイル完了を待つ |
| クラウドアシスト失敗 | 自動的にローカルモードにフォールバック、コア機能に影響なし |
| テスト失敗 | `npm test` を実行して詳細なエラーメッセージを確認 |
| TypeScript 型エラー | `npx tsc --noEmit` を実行、`npm install` が実行済みか確認 |

## セキュリティ

詳細は [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) を参照してください。

## ライセンス

このライブラリは MIT-0 ライセンスの下でライセンスされています。[LICENSE](LICENSE) ファイルを参照してください。
