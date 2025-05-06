MCP Weather サーバー ハンズオン資料

## ゴール
- Model Context Protocol (MCP) を用いて、都市名を引数に天気予報を返すサーバーを Node.js (TypeScript) で構築する
- ローカルで起動した MCP サーバーを Claude Desktop から呼び出し、ツールとして活用できることを確認する

## 想定所要時間

30 〜 60 分

## 前提条件

項目           | 推奨バージョン               | 備考
---------------|-------------------------|------------------------------------------
OS             | macOS / Windows / Linux | いずれも可
Node.js        | 18 以上                 | node -v で確認
npm            | 9 以上                  | npm -v で確認
TypeScript     | 5.0 以上                | devDependency として導入
Claude Desktop | v0.7 以上               | "Experimental Features" → MCP toggle がある版

Tip: nvm / nvs など任意の Node バージョンマネージャを使うと複数バージョンを楽に切り替えられます。

---

## 0. 事前準備

### プロジェクト用フォルダの作成

```bash
mkdir mcp-weather && cd mcp-weather
```

---

## 1. Node プロジェクト初期化

```bash
npm init -y
npm i -D typescript ts-node nodemon
npm i @modelcontextprotocol/sdk axios zod
```

- `typescript` & `ts-node` : TypeScript 実行環境
- `nodemon` : 保存時に自動再起動
- `@modelcontextprotocol/sdk` : MCP サーバー公式 SDK
- `axios` : HTTP クライアント
- `zod` : スキーマバリデーション

### TypeScript 設定

```bash
npx tsc --init --rootDir src --outDir dist \
  --moduleResolution node --esModuleInterop true
```

---

## 2. ソースコード実装

新規ディレクトリ `src` を作成し、`index.ts` を以下の内容で保存します。

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { z } from "zod";

// デバッグメッセージを出力する関数
function debug(...args: any[]) {
  console.error("[DEBUG]", ...args);
}

// 天気コードと日本語の天気状態の対応を定義
const weatherCodes: Record<number, string> = {
  0: "快晴",
  1: "晴れ",
  2: "晴れ時々曇り",
  3: "曇り",
  45: "霧",
  48: "霧氷",
  51: "小雨",
  // 他の天気コードも追加可能
};

// 都市の天気情報を取得
async function getWeatherForCity(city: string) {
  try {
    const normalizedCity = city.trim();
    debug(`Getting weather for city: ${normalizedCity}`);
    
    // ジオコーディングAPIを使用して座標を取得
    const geocodingResponse = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search`,
      {
        params: {
          name: normalizedCity,
          count: 1,
          language: "ja"
        },
        timeout: 5000
      }
    );
    
    if (!geocodingResponse.data.results || geocodingResponse.data.results.length === 0) {
      throw new Error(`都市「${normalizedCity}」が見つかりません`);
    }
    
    const { latitude, longitude, name } = geocodingResponse.data.results[0];
    debug(`Found coordinates for ${name}: ${latitude}, ${longitude}`);
    
    // 天気APIを使用して天気情報を取得
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          current: "temperature_2m,weather_code",
          hourly: "temperature_2m,weather_code",
          forecast_days: 1,
          timezone: "Asia/Tokyo"
        },
        timeout: 5000
      }
    );
    
    const weatherCode = weatherResponse.data.current.weather_code;
    const weatherDescription = weatherCodes[weatherCode] || "不明";
    
    // 3時間ごとの予報データを抽出
    const hourlyData = weatherResponse.data.hourly;
    const next24h = [];
    
    for (let i = 0; i < 24; i += 3) {
      next24h.push({
        time: hourlyData.time[i],
        temp: hourlyData.temperature_2m[i],
        weather: weatherCodes[hourlyData.weather_code[i]] || "不明"
      });
    }
    
    return {
      cityName: name,
      temperature: `${weatherResponse.data.current.temperature_2m}${weatherResponse.data.current_units.temperature_2m}`,
      condition: weatherDescription,
      forecast: next24h
    };
  } catch (error) {
    debug(`Error getting weather for city ${city}:`, error);
    throw error;
  }
}

// MCPサーバーを開始するメイン関数
async function main() {
  debug("Starting MCP Weather Server");
  
  const server = new McpServer({
    name: "Weather MCP",
    version: "1.0.0",
    description: "A simple MCP server for weather data",
  }, { 
    capabilities: { 
      logging: {},
      sampling: {},
      roots: {
        listChanged: true
      }
    } 
  });
  
  server.tool(
    "get-weather", 
    "都市の天気情報を取得する", 
    {
      city: z.string().describe("天気を取得したい都市名")
    }, 
    async ({ city }) => {
      debug(`Handling get-weather request for city: ${city}`);
      
      try {
        const weather = await getWeatherForCity(city);
        
        // 3時間ごとの予報データを整形
        const forecastText = weather.forecast.map(f => 
          `${new Date(f.time).getHours()}時: ${f.temp}°C (${f.weather})`
        ).join("\n");
        
        return {
          content: [{
            type: "text",
            text: `${weather.cityName}の天気情報:\n` +
                 `現在の気温: ${weather.temperature}\n` +
                 `現在の天気: ${weather.condition}\n\n` +
                 `24時間予報 (3時間ごと):\n${forecastText}`
          }]
        };
      } catch (error) {
        debug(`Error processing weather request:`, error);
        
        return {
          content: [{
            type: "text",
            text: `${city}の天気情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  debug("Creating StdioServerTransport");
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  debug("MCP server ready to receive requests");
}

// エラーハンドリング
process.on("uncaughtException", (error) => {
  debug("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  debug("Unhandled rejection at:", promise, "reason:", reason);
});

// メイン処理を開始
main().catch((error) => {
  debug("Fatal error in main:", error);
  process.exit(1);
});
```

### package.json の修正

`package.json` のスクリプトセクションを以下のように修正してください：

```json
"scripts": {
  "dev": "nodemon --exec ts-node src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "inspect": "npx @modelcontextprotocol/inspector ."
}
```

---

## 3. サーバー起動

```bash
npm run dev
```

成功すると以下のようなログが表示されます：

```
[DEBUG] Starting MCP Weather Server
[DEBUG] Creating StdioServerTransport
[DEBUG] MCP server ready to receive requests
```

※ ポート変更したい場合は設定を書き換えてください。

---

## 4. Claude Desktop の MCP 設定

1. Settings → Experimental Features で Model Context Protocol を ON
2. Add endpoint → `http://localhost:6275/mcp` と入力し Save

Firewall や VPN がある場合は localhost へのアクセスがブロックされていないか確認してください。

---

## 5. インスペクタの実行（オプション）

MCPサーバーの動作を確認するため、インスペクタを使用できます：

```bash
npm run inspect
```

これを実行後、ブラウザで `http://127.0.0.1:6274` にアクセスします。

---

## 6. 動作確認

Claude のチャット欄に以下を入力します。

```
#assistant_tools: get-weather
東京の天気を教えて
```

Claude が自動で `get-weather` ツールを実行し、現在の天気と24時間分の予報をわかりやすく自然言語で返すはずです。

例: 「東京の天気情報: 現在の気温: 21°C、現在の天気: 晴れ、24時間予報 (3時間ごと): 12時: 22°C (晴れ)...」

---

## 7. トラブルシューティング

症状              | 原因・対応策
------------------|------------------------------------------------------------------
都市「◯◯」が見つかりません | 誤字／マイナー地名。英語表記などで再試行
Claude がツールを選ばない | プロンプトに `#assistant_tools: get-weather` を含めているか、endpoint URL が正しいか
タイムアウトエラー         | 接続環境を確認。プロキシ設定が必要な場合は対応
インスペクタが起動しない    | Node.js のバージョンを確認（18以上が必要）

---

## 8. 応用課題（任意）

項目         | ヒント
------------|-------------------------------------
Web UIの作成  | expessを使って簡易WebUIからも天気を検索できるようにする
キャッシュ機能    | node-cacheを使って同じ都市のリクエストをキャッシュする
複数言語対応 | 言語パラメータを追加し、多言語での結果を返せるようにする
グラフ表示      | SVGやChartJSを使って温度変化をグラフ化する
Docker化     | FROM node:18-alpineをベースにDockerfile作成

---

## 参考リンク

- MCP GitHub: https://github.com/modelcontextprotocol
- Open-Meteo API Docs: https://open-meteo.com/en/docs
- Claude Desktop Release Notes: https://www.anthropic.com/

---

Happy Coding! ✨