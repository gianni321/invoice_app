const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Invoice App...\n');

// Kill any existing processes
try {
  require('child_process').execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
} catch (e) {}

// Start backend
console.log('📊 Starting backend server...');
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe',
  detached: false
});

backend.stdout.on('data', (data) => {
  console.log(`[BACKEND] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.log(`[BACKEND ERROR] ${data.toString().trim()}`);
});

// Wait for backend to start
setTimeout(() => {
  console.log('🌐 Starting frontend server...');
  
  const frontend = spawn('npx', ['vite', '--port', '3000', '--host', '0.0.0.0'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'pipe',
    detached: false
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[FRONTEND] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.log(`[FRONTEND ERROR] ${data.toString().trim()}`);
  });

  setTimeout(() => {
    console.log('\n================================');
    console.log('✅ Invoice App is running!');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend:  http://localhost:3001');
    console.log('================================\n');
    console.log('Press CTRL+C to stop servers...');
  }, 3000);

}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping servers...');
  try {
    require('child_process').execSync('taskkill /F /IM node.exe');
  } catch (e) {}
  process.exit(0);
});