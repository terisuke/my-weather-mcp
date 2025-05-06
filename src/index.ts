#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from 'axios';
import { z } from "zod";

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
        const geocodingResponse = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search`,
          {
            params: {
              name: city,
              count: 1
            },
            timeout: 10000, // 10秒のタイムアウト
            headers: {
              'User-Agent': 'MCP Weather App',
              'Accept': 'application/json'
            }
          }
        );
        
        if (!geocodingResponse.data.results || geocodingResponse.data.results.length === 0) {
          throw new Error(`City "${city}" not found`);
        }
        
        const { latitude, longitude } = geocodingResponse.data.results[0];
        
        // 無料の天気API（OpenMeteo）を使用 - 動的に取得した座標を使用
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast`,
          {
            params: {
              latitude,
              longitude,
              current: 'temperature_2m,weather_code',
              timezone: 'Asia/Tokyo'
            },
            timeout: 10000, // 10秒のタイムアウト
            headers: {
              'User-Agent': 'MCP Weather App',
              'Accept': 'application/json'
            }
          }
        );

        const data = response.data;
        
        // 天気コードを人間が読める形式に変換
        const weatherDescription = getWeatherDescription(data.current.weather_code);
        
        return {
          content: [
            {
              type: "text",
              text: `Weather in ${city}:\nTemperature: ${data.current.temperature_2m}${data.current_units.temperature_2m}\nCondition: ${weatherDescription}`,
            },
          ],
        };
      } catch (error: unknown) {
        let errorMessage = "Unknown error";
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            errorMessage = "Request timed out. Please try again.";
          } else if (error.response) {
            errorMessage = `API request failed with status ${error.response.status}`;
          } else if (error.request) {
            errorMessage = "No response received from the server";
          } else {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
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
