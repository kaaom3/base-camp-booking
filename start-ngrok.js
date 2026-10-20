const { spawn } = require('child_process');
const path = require('path');

const ngrokPath = path.join(__dirname, 'ngrok.exe');
const args = [
    'http',
    '--authtoken', '3JXYrYchYzyScmfL3Sufv5iOoRo_4LKtXQHvC7xtNbZmCj4ug',
    '--domain=sibling-compacted-decrease.ngrok-free.dev',
    '5050'
];

console.log('Starting ngrok tunnel for Base Camp...');
const ngrok = spawn(ngrokPath, args, { stdio: 'inherit' });

ngrok.on('error', (err) => {
    console.error('Failed to start ngrok:', err);
});

ngrok.on('close', (code) => {
    console.log(`ngrok process exited with code ${code}`);
    process.exit(code);
});
