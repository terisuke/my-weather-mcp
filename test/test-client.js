const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverPath = path.resolve(__dirname, '../build/index.js');

async function testCity(city) {
  return new Promise((resolve, reject) => {
    console.log(`\n----- Testing city: ${city} -----`);
    
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let jsonResponse = null;
    
    server.stdout.on('data', (data) => {
      stdout += data.toString();
      
      try {
        const lines = stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'response') {
              jsonResponse = parsed;
            }
          } catch (e) {
          }
        }
      } catch (e) {
      }
    });
    
    server.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      if (jsonResponse) {
        console.log('Response:', JSON.stringify(jsonResponse, null, 2));
        resolve({ city, success: true, response: jsonResponse });
      } else {
        console.log('No valid response received');
        console.log('Stderr:', stderr);
        resolve({ city, success: false, error: stderr });
      }
    });
    
    const request = {
      type: 'request',
      id: '1',
      tool: 'get-weather',
      params: { city }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    setTimeout(() => {
      if (!server.killed) {
        server.kill();
        resolve({ city, success: false, error: 'Timeout' });
      }
    }, 10000);
  });
}

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
  for (const result of results) {
    console.log(`${result.city}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  }
}

runTests().catch(console.error);
