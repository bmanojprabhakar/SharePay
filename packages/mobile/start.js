#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set environment to ensure proper resolution
process.env.NODE_PATH = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  process.env.NODE_PATH
].filter(Boolean).join(':');

// Start Expo with the local installation
const expo = spawn('npx', ['expo', 'start', '--clear', '--tunnel'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_USE_FAST_RESOLVER: 'true',
  }
});

expo.on('close', (code) => {
  console.log(`Expo process exited with code ${code}`);
});

expo.on('error', (error) => {
  console.error('Error starting Expo:', error);
});