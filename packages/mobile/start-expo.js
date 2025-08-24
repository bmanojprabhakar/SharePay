#!/usr/bin/env node

// Custom start script that bypasses global expo-cli
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Use the local @expo/cli installation - check both mobile and root locations
const localCliPath = path.resolve(__dirname, 'node_modules', '@expo', 'cli', 'build', 'bin', 'cli');
const rootCliPath = path.resolve(__dirname, '../../node_modules', '@expo', 'cli', 'build', 'bin', 'cli');

let expoCliPath;
if (fs.existsSync(localCliPath)) {
  expoCliPath = localCliPath;
} else if (fs.existsSync(rootCliPath)) {
  expoCliPath = rootCliPath;
} else {
  console.error('❌ Expo CLI not found in local or root node_modules');
  console.error('Local path:', localCliPath);
  console.error('Root path:', rootCliPath);
  console.error('Run: npm install');
  process.exit(1);
}

console.log('🚀 Starting SharePay Mobile with local Expo CLI...');
console.log('📍 Working Directory:', __dirname);
console.log('📍 CLI Path:', expoCliPath);

const args = process.argv.slice(2);
console.log('📍 Starting with args:', ['start', '--clear', ...args]);

const expo = spawn(process.execPath, [expoCliPath, 'start', '--clear', ...args], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    // Ensure clean PATH without global expo
    PATH: process.env.PATH.split(':').filter(p => !p.includes('homebrew')).join(':'),
    // Force interactive mode
    CI: 'false',
    EXPO_NO_TELEMETRY: '1',
  }
});

expo.on('close', (code) => {
  console.log(`📱 Expo CLI exited with code ${code}`);
  process.exit(code);
});

expo.on('error', (error) => {
  console.error('❌ Error starting Expo:', error);
  process.exit(1);
});