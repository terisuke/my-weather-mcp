#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dns from 'dns';
import http from 'http';
import https from 'https';
import { z } from "zod";

// DNS設定の変更
dns.setDefaultResultOrder('ipv4first');

// HTTPリクエスト用の関数
async function makeRequest(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'MCP Weather App',
        'Accept': 'application/json'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

// リトライ用の関数
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${i + 1} failed:`, lastError.message);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

async function main() {
  // MCPサーバーを作成
  const server = new McpServer({
    name: "Weather MCP",
    version: "1.0.0",
    description: "A simple MCP server for weather data",
  });

  // 天気情報を取得するツールを追加
  server.tool(
    "get-weather",
    {
      city: z.string().describe("City name to get weather for"),
    },
    async ({ city }: { city: string }) => {
      try {
        console.error(`Searching for city: ${city}`);
        
        // ジオコーディングAPIの呼び出し（リトライ付き）
        const geocodingResponse = await retryRequest(() => 
          makeRequest(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`)
        );
        
        console.error('Geocoding response:', JSON.stringify(geocodingResponse, null, 2));
        
        if (!geocodingResponse.results || geocodingResponse.results.length === 0) {
          throw new Error(`City "${city}" not found`);
        }
        
        const { latitude, longitude } = geocodingResponse.results[0];
        console.error(`Found coordinates: ${latitude}, ${longitude}`);
        
        // 天気APIの呼び出し（リトライ付き）
        const weatherResponse = await retryRequest(() =>
          makeRequest(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Asia/Tokyo`)
        );

        console.error('Weather response:', JSON.stringify(weatherResponse, null, 2));
        
        // 天気コードを人間が読める形式に変換
        const weatherDescription = getWeatherDescription(weatherResponse.current.weather_code);
        
        return {
          content: [
            {
              type: "text",
              text: `Weather in ${city}:\nTemperature: ${weatherResponse.current.temperature_2m}${weatherResponse.current_units.temperature_2m}\nCondition: ${weatherDescription}`,
            },
          ],
        };
      } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        return {
          content: [
            {
              type: "text",
              text: `Error getting weather for ${city}: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );

  // 天気コードを人間が読める形式に変換する関数
  function getWeatherDescription(code: number): string {
    const weatherCodes: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Light freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow fall",
      73: "Moderate snow fall",
      75: "Heavy snow fall",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };
    
    return weatherCodes[code] || "Unknown";
  }

  // MCPサーバーをトランスポートに接続
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.exit(1);
});
