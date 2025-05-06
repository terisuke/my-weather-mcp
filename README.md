# MCP 天気サービス

このリポジトリは、Model Context Protocol (MCP) を使用して天気情報を提供するシンプルなサービスです。複数の都市（福岡、東京、大阪、モスクワ、ニューヨークなど）の天気情報を取得できます。

## 目次

1. [前提条件](#前提条件)
2. [プロジェクトのセットアップ](#プロジェクトのセットアップ)
3. [使い方](#使い方)
4. [開発ガイド](#開発ガイド)
5. [GitHubへのアップロード](#githubへのアップロード)
6. [トラブルシューティング](#トラブルシューティング)

## 前提条件

このプロジェクトを実行するには、以下のソフトウェアが必要です：

- Node.js (バージョン 18 以上)
- npm (通常は Node.js とともにインストールされます)
- Git

### インストール方法

#### Node.js と npm のインストール

1. [Node.js 公式サイト](https://nodejs.org/) からインストーラーをダウンロードしてインストールします。
2. インストールが完了したら、ターミナルで以下のコマンドを実行して確認します：

```bash
node -v
npm -v
```

#### Git のインストール

1. [Git 公式サイト](https://git-scm.com/) からインストーラーをダウンロードしてインストールします。
2. インストールが完了したら、ターミナルで以下のコマンドを実行して確認します：

```bash
git --version
```

## プロジェクトのセットアップ

### 新規プロジェクトの作成

1. 新しいディレクトリを作成し、そのディレクトリに移動します：

```bash
mkdir my-weather-mcp
cd my-weather-mcp
```

2. npm プロジェクトを初期化します：

```bash
npm init -y
```

3. 必要なパッケージをインストールします：

```bash
npm install @modelcontextprotocol/sdk axios zod typescript @types/node https-proxy-agent
npm install --save-dev ts-node
```

4. TypeScript の設定ファイルを作成します：

```bash
npx tsc --init
```

5. `tsconfig.json` ファイルを以下のように編集します：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "outDir": "./build",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

6. `package.json` ファイルのスクリプトセクションを以下のように編集します：

```json
"scripts": {
  "build": "tsc && node -e \"import('fs').then(fs => fs.default.chmodSync('build/index.js', '755'))\"",
  "start": "node build/index.js",
  "inspect": "npx @modelcontextprotocol/inspector build/index.js",
  "dev": "ts-node src/index.ts"
}
```

7. プロジェクトのディレクトリ構造を作成します：

```bash
mkdir -p src test
```

### 既存プロジェクトのクローン

既存のプロジェクトを使用する場合は、以下の手順でクローンします：

```bash
git clone https://github.com/terisuke/my-weather-mcp.git
cd my-weather-mcp
npm install
```

## 使い方

### ビルドと実行

プロジェクトをビルドして実行するには、以下のコマンドを使用します：

```bash
npm run build && npm run start
```

### インスペクターの使用

MCP インスペクターを使用して天気サービスをテストするには、以下のコマンドを実行します：

```bash
npm run build && npm run inspect
```

インスペクターが起動すると、ブラウザで `http://127.0.0.1:6274` にアクセスして、天気サービスとやり取りできます。

### 天気情報の取得

インスペクターを使用して、以下の都市の天気情報を取得できます：

- 福岡
- 東京
- 大阪
- モスクワ
- ニューヨーク

その他の都市も指定できますが、Open-Meteo API で認識される都市名である必要があります。

## 開発ガイド

### ファイル構造

```
my-weather-mcp/
├── build/              # コンパイルされたJavaScriptファイル
├── src/                # TypeScriptソースコード
│   └── index.ts        # メインのアプリケーションコード
├── test/               # テストファイル
├── package.json        # プロジェクト設定
├── tsconfig.json       # TypeScript設定
└── README.md           # このファイル
```

### コードの修正

1. `src/index.ts` ファイルを編集して、機能を追加または修正します。
2. 変更をテストするには、以下のコマンドを実行します：

```bash
npm run build && npm run inspect
```

3. 変更が正常に動作することを確認したら、変更をコミットします。

## GitHubへのアップロード

### 初めてのGitHubリポジトリ作成

1. [GitHub](https://github.com/) にアクセスし、アカウントを作成またはログインします。
2. 右上の「+」ボタンをクリックし、「New repository」を選択します。
3. リポジトリ名（例：`my-weather-mcp`）を入力し、必要に応じて説明を追加します。
4. リポジトリを公開または非公開に設定し、「Create repository」をクリックします。

### ローカルリポジトリの初期化とプッシュ

1. ローカルプロジェクトディレクトリで、Gitリポジトリを初期化します：

```bash
git init
```

2. 変更をステージングエリアに追加します：

```bash
git add .
```

3. 変更をコミットします：

```bash
git commit -m "初回コミット：MCP天気サービスの実装"
```

4. リモートリポジトリを追加します（GitHubのリポジトリURLを使用）：

```bash
git remote add origin https://github.com/ユーザー名/my-weather-mcp.git
```

5. 変更をリモートリポジトリにプッシュします：

```bash
git push -u origin main
```

### 既存リポジトリへの変更のプッシュ

1. 変更をステージングエリアに追加します：

```bash
git add .
```

2. 変更をコミットします：

```bash
git commit -m "変更内容の説明"
```

3. 変更をリモートリポジトリにプッシュします：

```bash
git push
```

### プルリクエストの作成

1. GitHubのリポジトリページにアクセスします。
2. 「Pull requests」タブをクリックし、「New pull request」ボタンをクリックします。
3. ベースブランチとコンペアブランチを選択します。
4. 「Create pull request」ボタンをクリックします。
5. プルリクエストのタイトルと説明を入力し、「Create pull request」ボタンをクリックします。

## トラブルシューティング

### よくある問題と解決策

#### `ERR_PACKAGE_PATH_NOT_EXPORTED` エラー

このエラーは、`@modelcontextprotocol/sdk` パッケージのインポートパスが正しくない場合に発生します。以下のように修正してください：

```typescript
// 誤ったインポート
import { McpServer } from "@modelcontextprotocol/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/transports";

// 正しいインポート
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

#### ネットワーク接続エラー

API呼び出し中にネットワークエラーが発生した場合、プロキシ設定を確認してください。環境変数 `HTTP_PROXY` または `HTTPS_PROXY` を設定することで、プロキシを使用できます：

```bash
export HTTP_PROXY=http://プロキシサーバー:ポート
export HTTPS_PROXY=https://プロキシサーバー:ポート
```

#### その他の問題

問題が解決しない場合は、以下の情報を含むイシューを作成してください：

- 発生したエラーメッセージ
- 使用しているNode.jsとnpmのバージョン
- 実行したコマンド
- 期待される動作と実際の動作
