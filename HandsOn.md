MCP Weather サーバー ハンズオン資料

ゴール
	•	Model Context Protocol (MCP) を用いて、都市名を引数に天気予報を返すサーバーを Node.js (TypeScript) で構築する
	•	ローカルで起動した MCP サーバーを Claude Desktop から呼び出し、ツールとして活用できることを確認する

想定所要時間

30 〜 60 分（API キー取得を除く）

前提条件

項目	推奨バージョン	備考
OS	macOS / Windows / Linux	いずれも可
Node.js	20 以上	node -v で確認
npm	10 以上	npm -v で確認
TypeScript	5.4 以上	devDependency として導入
Claude Desktop	v0.7 以上	“Experimental Features” → MCP toggle がある版
OpenWeatherMap アカウント	無料プラン可	API Key を取得済み

Tip: nvm / nvs など任意の Node バージョンマネージャを使うと複数バージョンを楽に切り替えられます。

⸻

0. 事前準備
	1.	OpenWeatherMap API Key の取得
	1.	https://home.openweathermap.org/users/sign_up でアカウント作成
	2.	“My API Keys” → “Create” でキーを発行
	3.	後ほど .env に貼り付けるのでメモしておく
	2.	プロジェクト用フォルダの作成

mkdir mcp-weather && cd mcp-weather



⸻

1. Node プロジェクト初期化

npm init -y
npm i -D typescript ts-node nodemon
npm i @modelcontextprotocol/server axios dotenv

	•	typescript & ts-node : TypeScript 実行環境
	•	nodemon : 保存時に自動再起動
	•	@modelcontextprotocol/server : MCP サーバー公式 SDK
	•	axios : HTTP クライアント
	•	dotenv : .env 読み込み

TypeScript 設定

npx tsc --init --rootDir src --outDir dist \
  --moduleResolution node --esModuleInterop true



⸻

2. 環境変数ファイル作成

echo "OPENWEATHER_KEY=YOUR_API_KEY" > .env

.env は Git には含めないよう .gitignore に *.env* を追加しておきましょう。

⸻

3. ソースコード実装

新規ディレクトリ src を作成し、index.ts を以下の内容で保存します。

// src/index.ts
import { MCPServer, Tool } from "@modelcontextprotocol/server";
import axios from "axios";
import "dotenv/config";

const apiKey = process.env.OPENWEATHER_KEY!;
if (!apiKey) throw new Error("OPENWEATHER_KEY が未設定です");

/**
 * 都市名から 24 時間分 (3 時間毎) の予報を取得
 */
const getForecast = async (city: string) => {
  // 1) Geocoding
  const geoRes = await axios.get(
    `https://api.openweathermap.org/geo/1.0/direct`,
    { params: { q: city, limit: 1, appid: apiKey } }
  );
  const loc = geoRes.data[0];
  if (!loc) throw new Error(`都市「${city}」が見つかりません`);

  // 2) Forecast
  const fcRes = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast`,
    { params: { lat: loc.lat, lon: loc.lon, units: "metric", lang: "ja", appid: apiKey } }
  );

  const next8 = fcRes.data.list.slice(0, 8).map((e: any) => ({
    time: e.dt_txt,
    temp: e.main.temp,
    weather: e.weather[0].description,
  }));

  return {
    city: `${loc.name}, ${loc.country}`,
    forecast: next8,
  };
};

const weatherTool: Tool = {
  name: "weather",
  description: "都市名を渡すと 24 時間分の 3 時間ステップ天気予報を返す",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "都市名 (例: Tokyo, Paris)" },
    },
    required: ["city"],
  },
  execute: async ({ city }) => await getForecast(city),
};

new MCPServer()
  .registerTool(weatherTool)
  .listen(3000, () => console.log("\u2705 MCP Weather server running on :3000"));

スクリプト追加

package.json に dev スクリプトを追加。

"scripts": {
  "dev": "nodemon --exec ts-node src/index.ts"
}



⸻

4. サーバー起動

npm run dev

成功すると次のログが表示されます。

✅ MCP Weather server running on :3000

※ ポート変更したい場合は listen(3000, …) の数値を書き換えてください。

⸻

5. Claude Desktop の MCP 設定
	1.	Settings → Experimental Features で Model Context Protocol を ON
	2.	Add endpoint → http://localhost:3000/mcp と入力し Save

Firewall や VPN がある場合は localhost へのアクセスがブロックされていないか確認してください。

⸻

6. 動作確認

Claude のチャット欄に以下を入力します。

#assistant_tools: weather
東京の天気を教えて

Claude が自動で weather ツールを実行し、24 時間分の予報をわかりやすく自然言語で返すはずです。

例: 「東京, JP の直近 24 時間予報です。15 時 ☁️ 21 °C、18 時 🌧️ 19 °C …」

⸻

7. 応用課題（任意）

項目	ヒント
キャッシュ	node-cache で都市ごとに 10 分ほど保存し API 呼び出し回数を削減
引数バリデーション	zod や @hapi/joi を使い、不正入力を検知
Docker 化	FROM node:20-alpine → .env を docker run --env-file で注入
ユニットテスト	Jest + nock で外部 API をモック
SSE ストリーム	@modelcontextprotocol/server/sse を利用し、リアルタイム更新を送信



⸻

8. トラブルシューティング

症状	原因・対応策
OPENWEATHER_KEY が未設定です	.env が読み込まれていない → dotenv/config を import し忘れていないか確認
都市「◯◯」が見つかりません	誤字／マイナー地名。英語表記などで再試行
Claude がツールを選ばない	プロンプトに #assistant_tools: weather を含めているか、endpoint URL が正しいか
429 Too Many Requests	OpenWeatherMap のレート制限。1 分あたりの呼び出し上限を超えていないか



⸻

参考リンク
	•	Lynn Mikami 氏 MCP チュートリアル JP: https://huggingface.co/blog/lynn-mikami/mcp-server-tutorial-jp
	•	Model Context Protocol GitHub: https://github.com/modelcontextprotocol
	•	OpenWeatherMap API Docs: https://openweathermap.org/api
	•	Claude Desktop Release Notes: https://www.anthropic.com/

⸻

Happy Coding! ✨