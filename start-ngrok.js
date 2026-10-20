const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== Base Camp Ngrok Tunnel Starting ===');

// 1. Locate ngrok executable
let ngrokPath = path.join(__dirname, 'ngrok.exe');
if (!fs.existsSync(ngrokPath)) {
    console.log('ngrok.exe not found in directory, falling back to system PATH "ngrok"');
    ngrokPath = 'ngrok';
} else {
    console.log('Using local ngrok binary:', ngrokPath);
}

// 2. Ensure ngrok.yml exists with web_addr: false and authtoken
const configPath = path.join(__dirname, 'ngrok.yml');
if (!fs.existsSync(configPath)) {
    console.log('Creating ngrok.yml configuration file...');
    const configContent = `version: "3"
agent:
  authtoken: 3JXYrYchYzyScmfL3Sufv5iOoRo_4LKtXQHvC7xtNbZmCj4ug
  web_addr: false
`;
    fs.writeFileSync(configPath, configContent, 'utf8');
}

// 3. Command line arguments
const args = [
    'http',
    '--config', configPath,
    '--domain=sibling-compacted-decrease.ngrok-free.dev',
    '--log=stdout',
    '5050'
];

console.log('Launching ngrok in background (windowsHide: true, web_addr: false)...');

const ngrok = spawn(ngrokPath, args, {
    windowsHide: true,
    stdio: 'pipe'
});

ngrok.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
        console.log(`[ngrok] ${text}`);
    }
});

ngrok.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
        console.error(`[ngrok error] ${text}`);
    }
});

ngrok.on('error', (err) => {
    console.error('CRITICAL: Failed to spawn ngrok process:', err);
});

ngrok.on('close', (code) => {
    console.log(`ngrok process closed with exit code: ${code}`);
    process.exit(code || 0);
});

// Graceful shutdown
process.on('SIGINT', () => {
    if (ngrok) ngrok.kill('SIGINT');
    process.exit(0);
});
process.on('SIGTERM', () => {
    if (ngrok) ngrok.kill('SIGTERM');
    process.exit(0);
});
