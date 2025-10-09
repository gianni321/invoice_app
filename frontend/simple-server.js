import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = req.url;
  
  // Handle SPA routing - serve index.html for unknown routes
  if (filePath === '/' || !path.extname(filePath)) {
    filePath = '/index.html';
  }
  
  // Add src prefix for JS files
  if (filePath.endsWith('.jsx') || filePath.startsWith('/src/')) {
    // Serve the actual file path
  } else if (filePath.endsWith('.js') && !filePath.startsWith('/node_modules/')) {
    filePath = '/src' + filePath;
  }
  
  const fullPath = path.join(__dirname, filePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    // For SPA, serve index.html for routes that don't exist
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end('File not found');
    return;
  }
  
  // Set content type based on file extension
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
  };
  
  const contentType = contentTypes[ext] || 'text/plain';
  
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(fullPath).pipe(res);
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple server running on http://localhost:${PORT}`);
  console.log(`Network access: http://0.0.0.0:${PORT}`);
});