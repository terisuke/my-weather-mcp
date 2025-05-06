#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from 'axios';
import { z } from "zod";

function debug(...args: any[]) {
  console.error('[DEBUG]', ...args);
}

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

/**
 * Get weather information for a city
 */
async function getWeatherForCity(city: string) {
  try {
    const normalizedCity = city.trim();
    debug(`Getting weather for city: ${normalizedCity}`);
    
    const geocodingResponse = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search`,
      {
        params: {
          name: normalizedCity,
          count: 1,
          language: 'en'
        },
        timeout: 10000
      }
    );
    
    if (!geocodingResponse.data.results || geocodingResponse.data.results.length === 0) {
      throw new Error(`City "${normalizedCity}" not found`);
    }
    
    const { latitude, longitude, name } = geocodingResponse.data.results[0];
    debug(`Found coordinates for ${name}: ${latitude}, ${longitude}`);
    
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,weather_code',
          timezone: 'Asia/Tokyo'
        },
        timeout: 10000
      }
    );
    
    const weatherCode = weatherResponse.data.current.weather_code;
    const weatherDescription = weatherCodes[weatherCode] || "Unknown";
    
    return {
      cityName: name,
      temperature: `${weatherResponse.data.current.temperature_2m}${weatherResponse.data.current_units.temperature_2m}`,
      condition: weatherDescription
    };
  } catch (error) {
    debug(`Error getting weather for city ${city}:`, error);
    throw error;
  }
}

/**
 * Main function to start the MCP server
 */
async function main() {
  debug('Starting MCP Weather Server');
  
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
    'get-weather', 
    'Get weather information for a city', 
    {
      city: z.string().describe('City name to get weather for')
    }, 
    async ({ city }) => {
      debug(`Handling get-weather request for city: ${city}`);
      
      try {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError: Error | null = null;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            debug(`Attempt ${attempts}/${maxAttempts} for city: ${city}`);
            const weather = await getWeatherForCity(city);
            
            return {
              content: [{
                type: 'text',
                text: `Weather in ${weather.cityName}:\nTemperature: ${weather.temperature}\nCondition: ${weather.condition}`
              }]
            };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            debug(`Attempt ${attempts} failed:`, lastError.message);
            
            if (attempts < maxAttempts) {
              const waitTime = 1000 * attempts;
              debug(`Waiting ${waitTime}ms before next retry`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `Error getting weather for ${city}: ${lastError?.message || 'Unknown error'}`
          }]
        };
      } catch (error) {
        debug(`Error processing weather request:`, error);
        
        return {
          content: [{
            type: 'text',
            text: `Error getting weather for ${city}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  debug('Creating StdioServerTransport');
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
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
