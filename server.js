import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url);
  const ext = path.extname(filePath).toLowerCase();

  if (req.url === '/' || ext === '') {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(DIST_DIR, 'index.html'), (indexErr, indexContent) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      });
      return;
    }

    let contentType = 'application/octet-stream';
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.ico') contentType = 'image/x-icon';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('✅ Server running on port ' + PORT);
  console.log('📍 Serving files from: ' + DIST_DIR);
});
