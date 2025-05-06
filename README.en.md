# MCP Weather Service

This repository contains a simple weather service using the Model Context Protocol (MCP). It provides weather information for multiple cities including Fukuoka, Tokyo, Osaka, Moscow, New York, and more.

<a href="https://glama.ai/mcp/servers/@terisuke/my-weather-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@terisuke/my-weather-mcp/badge" alt="Weather Service MCP server" />
</a>

## License

This project is licensed under the [MIT License](LICENSE).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Usage](#usage)
4. [Development Guide](#development-guide)
5. [Uploading to GitHub](#uploading-to-github)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

The following software is required to run this project:

- Node.js (version 18 or higher)
- npm (usually installed with Node.js)
- Git

### Installation Instructions

#### Installing Node.js and npm

1. Download and install the installer from the [Node.js official website](https://nodejs.org/).
2. After installation, verify by running the following commands in your terminal:

```bash
node -v
npm -v
```

#### Installing Git

1. Download and install the installer from the [Git official website](https://git-scm.com/).
2. After installation, verify by running the following command in your terminal:

```bash
git --version
```

## Project Setup

### Creating a New Project

1. Create a new directory and navigate to it:

```bash
mkdir my-weather-mcp
cd my-weather-mcp
```

2. Initialize the npm project:

```bash
npm init -y
```

3. Install required packages:

```bash
npm install @modelcontextprotocol/sdk axios zod typescript @types/node https-proxy-agent
npm install --save-dev ts-node
```

4. Create TypeScript configuration file:

```bash
npx tsc --init
```

5. Edit the `tsconfig.json` file as follows:

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

6. Edit the scripts section in `package.json`:

```json
"scripts": {
  "build": "tsc && node -e \"import('fs').then(fs => fs.default.chmodSync('build/index.js', '755'))\"",
  "start": "node build/index.js",
  "inspect": "npx @modelcontextprotocol/inspector build/index.js",
  "dev": "ts-node src/index.ts"
}
```

7. Create the project directory structure:

```bash
mkdir -p src test
```

### Cloning an Existing Project

To use an existing project, clone it using the following steps:

```bash
git clone https://github.com/terisuke/my-weather-mcp.git
cd my-weather-mcp
npm install
```

## Usage

### Building and Running

To build and run the project, use the following command:

```bash
npm run build && npm run start
```

### Using the Inspector

To test the weather service using the MCP inspector, run:

```bash
npm run build && npm run inspect
```

Once the inspector is running, access `http://127.0.0.1:6274` in your browser to interact with the weather service.

### Getting Weather Information

Using the inspector, you can get weather information for the following cities:

- Fukuoka
- Tokyo
- Osaka
- Moscow
- New York

You can also specify other cities, but they must be recognized by the Open-Meteo API.

## Development Guide

### File Structure

```
my-weather-mcp/
├── build/              # Compiled JavaScript files
├── src/                # TypeScript source code
│   └── index.ts        # Main application code
├── test/               # Test files
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

### Weather Code Language Settings

The default implementation in `index.ts` converts weather codes to Japanese descriptions. If you prefer English or another language, you can modify the `weatherCodes` object in `src/index.ts`. Here's an example of how to change it to English:

```typescript
const weatherCodes: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
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
  99: "Thunderstorm with heavy hail"
};
```

### Modifying Code

1. Edit the `src/index.ts` file to add or modify features.
2. To test changes, run:

```bash
npm run build && npm run inspect
```

3. After confirming the changes work correctly, commit your changes.

## Uploading to GitHub

### Creating Your First GitHub Repository

1. Visit [GitHub](https://github.com/) and create an account or log in.
2. Click the "+" button in the top right and select "New repository".
3. Enter a repository name (e.g., `my-weather-mcp`) and add a description if desired.
4. Choose public or private visibility and click "Create repository".

### Initializing and Pushing Local Repository

1. Initialize Git repository in your local project directory:

```bash
git init
```

2. Add changes to staging area:

```bash
git add .
```

3. Commit changes:

```bash
git commit -m "Initial commit: MCP Weather Service implementation"
```

4. Add remote repository (using your GitHub repository URL):

```bash
git remote add origin https://github.com/username/my-weather-mcp.git
```

5. Push changes to remote repository:

```bash
git push -u origin main
```

### Pushing Changes to Existing Repository

1. Add changes to staging area:

```bash
git add .
```

2. Commit changes:

```bash
git commit -m "Description of changes"
```

3. Push changes to remote repository:

```bash
git push
```

### Creating Pull Requests

1. Visit your GitHub repository page.
2. Click the "Pull requests" tab and click "New pull request".
3. Select base and compare branches.
4. Click "Create pull request".
5. Enter title and description for the pull request and click "Create pull request".

## Troubleshooting

### Common Issues and Solutions

#### `ERR_PACKAGE_PATH_NOT_EXPORTED` Error

This error occurs when the import path for `@modelcontextprotocol/sdk` is incorrect. Fix it as follows:

```typescript
// Incorrect import
import { McpServer } from "@modelcontextprotocol/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/transports";

// Correct import
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

#### Network Connection Error

If you encounter network errors during API calls, check your proxy settings. You can use a proxy by setting the `HTTP_PROXY` or `HTTPS_PROXY` environment variables:

```bash
export HTTP_PROXY=http://proxy-server:port
export HTTPS_PROXY=https://proxy-server:port
```

#### Other Issues

If problems persist, create an issue with the following information:

- Error message received
- Node.js and npm versions used
- Commands executed
- Expected behavior vs actual behavior