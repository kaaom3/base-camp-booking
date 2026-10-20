const { spawn } = require('child_process');
const path = require('path');

const ngrokPath = path.join(__dirname, 'ngrok.exe');
const configPath = path.join(__dirname, 'ngrok.yml');

const args = [
    'http',
    '--config', configPath,
    '--domain=sibling-compacted-decrease.ngrok-free.dev',
    '--log=stdout',
    '5050'
];

console.log('Starting ngrok tunnel for Base Camp in background (silent mode)...');

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
    console.error('Failed to start ngrok:', err);
});

ngrok.on('close', (code) => {
    console.log(`ngrok process exited with code ${code}`);
    process.exit(code || 0);
});

// Graceful shutdown
process.on('SIGINT', () => {
    ngrok.kill('SIGINT');
    process.exit(0);
});
process.on('SIGTERM', () => {
    ngrok.kill('SIGTERM');
    process.exit(0);
});
