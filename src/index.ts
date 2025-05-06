#!/usr/bin/env node
import dns from 'dns';
import http from 'http';
import https from 'https';
import { createInterface } from 'readline';

// DNS設定の変更
dns.setDefaultResultOrder('ipv4first');

function debug(...args: any[]) {
  console.error('[DEBUG]', ...args);
}

// HTTPリクエスト用の関数
async function makeRequest(url: string): Promise<any> {
  debug(`Making HTTP request to: ${url}`);
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
        if (res.statusCode && res.statusCode >= 400) {
          debug(`HTTP error: ${res.statusCode}`);
          reject(new Error(`HTTP error: ${res.statusCode}`));
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          debug(`Received response: ${JSON.stringify(parsed).substring(0, 100)}...`);
          resolve(parsed);
        } catch (error) {
          debug(`Failed to parse response: ${error instanceof Error ? error.message : String(error)}`);
          reject(new Error(`Failed to parse response: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });

    req.on('error', (error) => {
      debug(`Request error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      debug('Request timed out');
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.end();
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
      debug(`Retry attempt ${i + 1}/${maxRetries}`);
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      debug(`Attempt ${i + 1} failed:`, lastError.message);
      
      if (i < maxRetries - 1) {
        const waitTime = delay * (i + 1);
        debug(`Waiting ${waitTime}ms before next retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('Unknown error during retry');
}

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

async function getWeatherForCity(city: string) {
  debug(`Getting weather for city: ${city}`);
  try {
    const normalizedCity = city.trim();
    
    // ジオコーディングAPIの呼び出し
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedCity)}&count=1&language=en`;
    debug(`Geocoding URL: ${geocodingUrl}`);
    const geocodingResponse = await makeRequest(geocodingUrl);
    
    if (!geocodingResponse.results || geocodingResponse.results.length === 0) {
      debug(`City "${normalizedCity}" not found in geocoding API`);
      throw new Error(`City "${normalizedCity}" not found`);
    }
    
    const { latitude, longitude, name } = geocodingResponse.results[0];
    debug(`Found coordinates for ${name}: ${latitude}, ${longitude}`);
    
    // 天気APIの呼び出し
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Asia/Tokyo`;
    debug(`Weather URL: ${weatherUrl}`);
    const weatherResponse = await makeRequest(weatherUrl);
    
    // 天気コードを人間が読める形式に変換
    const weatherDescription = getWeatherDescription(weatherResponse.current.weather_code);
    debug(`Weather description: ${weatherDescription}`);
    
    return {
      cityName: name,
      temperature: `${weatherResponse.current.temperature_2m}${weatherResponse.current_units.temperature_2m}`,
      condition: weatherDescription
    };
  } catch (error) {
    debug(`Error getting weather for city ${city}:`, error);
    throw error;
  }
}

// 天気情報を取得するツール
async function getWeatherTool(params: { city: string }) {
  debug(`Handling get-weather request for city: ${params.city}`);
  
  try {
    const weather = await retryRequest(() => getWeatherForCity(params.city));
    
    return {
      content: [{
        type: "text",
        text: `Weather in ${weather.cityName}:\nTemperature: ${weather.temperature}\nCondition: ${weather.condition}`
      }]
    };
  } catch (error) {
    debug(`Error processing weather request:`, error);
    
    return {
      content: [{
        type: "text",
        text: `Error getting weather for ${params.city}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleMcpRequest(request: any) {
  debug(`Processing MCP request: ${JSON.stringify(request)}`);
  
  if (request.type !== 'request') {
    debug(`Ignoring non-request message: ${request.type}`);
    return;
  }
  
  if (request.tool === 'get-weather') {
    try {
      const result = await getWeatherTool(request.params);
      debug(`Got result for ${request.params.city}: ${JSON.stringify(result)}`);
      
      const response = {
        type: 'response',
        id: request.id,
        result
      };
      
      debug(`Sending response: ${JSON.stringify(response)}`);
      console.log(JSON.stringify(response));
    } catch (error) {
      debug(`Error handling request: ${error}`);
      
      const response = {
        type: 'response',
        id: request.id,
        error: {
          message: error instanceof Error ? error.message : String(error)
        }
      };
      
      debug(`Sending error response: ${JSON.stringify(response)}`);
      console.log(JSON.stringify(response));
    }
  } else {
    debug(`Unknown tool: ${request.tool}`);
    
    const response = {
      type: 'response',
      id: request.id,
      error: {
        message: `Unknown tool: ${request.tool}`
      }
    };
    
    debug(`Sending error response: ${JSON.stringify(response)}`);
    console.log(JSON.stringify(response));
  }
}

async function main() {
  debug('Starting MCP Weather Server');
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  
  rl.on('line', async (line) => {
    debug(`Received line: ${line}`);
    
    try {
      const request = JSON.parse(line);
      await handleMcpRequest(request);
    } catch (error) {
      debug(`Error parsing request: ${error}`);
      
      const response = {
        type: 'response',
        id: 'unknown',
        error: {
          message: `Failed to parse request: ${error instanceof Error ? error.message : String(error)}`
        }
      };
      
      debug(`Sending error response: ${JSON.stringify(response)}`);
      console.log(JSON.stringify(response));
    }
  });
  
  debug('MCP server ready to receive requests');
}

process.on('uncaughtException', (error) => {
  debug('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  debug('Unhandled rejection at:', promise, 'reason:', reason);
});

main().catch((error) => {
  debug('Fatal error in main:', error);
  process.exit(1);
});
