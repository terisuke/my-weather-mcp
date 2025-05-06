// Test script for MCP Weather Server
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP server executable
const serverPath = path.resolve(__dirname, '../build/index.js');

// Debug flag
const DEBUG = true;

// Function to test a city
async function testCity(city) {
  return new Promise((resolve, reject) => {
    console.log(`\n----- Testing city: ${city} -----`);
    
    // Spawn the MCP server process
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let jsonResponse = null;
    
    // Collect stdout
    server.stdout.on('data', (data) => {
      const dataStr = data.toString();
      stdout += dataStr;
      
      if (DEBUG) {
        console.log(`[STDOUT] ${dataStr}`);
      }
      
      try {
        // Try to parse JSON from stdout
        const lines = stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'response') {
              jsonResponse = parsed;
              
              // If we got a valid response, kill the server
              if (!server.killed) {
                setTimeout(() => {
                  server.kill();
                }, 100);
              }
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    // Collect stderr
    server.stderr.on('data', (data) => {
      const dataStr = data.toString();
      stderr += dataStr;
      
      if (DEBUG) {
        console.log(`[STDERR] ${dataStr}`);
      }
    });
    
    // Handle server exit
    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      if (jsonResponse) {
        console.log('Response:', JSON.stringify(jsonResponse, null, 2));
        
        // Check if the response contains weather data
        const isSuccess = 
          jsonResponse.result && 
          jsonResponse.result.content && 
          jsonResponse.result.content[0] && 
          jsonResponse.result.content[0].text && 
          jsonResponse.result.content[0].text.includes(city) &&
          jsonResponse.result.content[0].text.includes('Temperature') &&
          jsonResponse.result.content[0].text.includes('Condition');
        
        resolve({ 
          city, 
          success: isSuccess, 
          response: jsonResponse 
        });
      } else {
        console.log('No valid response received');
        console.log('Stderr:', stderr);
        resolve({ city, success: false, error: stderr });
      }
    });
    
    // Send request to the server
    const request = {
      type: 'request',
      id: '1',
      tool: 'get-weather',
      params: { city }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    // Set timeout to kill the server if it hangs
    setTimeout(() => {
      if (!server.killed) {
        server.kill();
        resolve({ city, success: false, error: 'Timeout' });
      }
    }, 10000);
  });
}

// Test multiple cities
async function runTests() {
  const cities = ['Fukuoka', 'Tokyo', 'Osaka', 'Moscow', 'New York'];
  const results = [];
  
  for (const city of cities) {
    try {
      const result = await testCity(city);
      results.push(result);
    } catch (error) {
      console.error(`Error testing ${city}:`, error);
      results.push({ city, success: false, error: error.message });
    }
  }
  
  console.log('\n----- Test Summary -----');
  let allSuccess = true;
  
  for (const result of results) {
    console.log(`${result.city}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result.success) {
      allSuccess = false;
    }
  }
  
  if (allSuccess) {
    console.log('\nAll tests passed successfully! 🎉');
    process.exit(0);
  } else {
    console.log('\nSome tests failed. Please check the output above.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
