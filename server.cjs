const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT_HTTPS = 3443;
const PORT_HTTP = 3000;
const DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function handleRequest(req, res) {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;

    // Support Range Requests (crucial for streaming large 3D .glb assets)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, ip: iface.address });
      }
    }
  }
  return addresses;
}

// Start HTTPS Server
let httpsServer = null;
try {
  const sslOptions = {
    key: fs.readFileSync(path.join(DIR, 'key.pem')),
    cert: fs.readFileSync(path.join(DIR, 'cert.pem')),
  };
  httpsServer = https.createServer(sslOptions, handleRequest);
  httpsServer.listen(PORT_HTTPS, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`  SCHRÖDINGER'S CAT — WEBXR QUANTUM SIMULATION`);
    console.log(`==================================================`);
    console.log(`[HTTPS Server] Running on https://localhost:${PORT_HTTPS}`);
    const ips = getLocalIpAddresses();
    if (ips.length > 0) {
      console.log(`\nFor Meta Quest VR Headset (Oculus Browser):`);
      ips.forEach((item) => {
        console.log(`  -> https://${item.ip}:${PORT_HTTPS} (${item.name})`);
      });
    }
    console.log(`==================================================\n`);
  });
} catch (e) {
  console.warn(`[HTTPS Warning] Could not start HTTPS: ${e.message}`);
}

// Start HTTP Server
const httpServer = http.createServer(handleRequest);
httpServer.listen(PORT_HTTP, '0.0.0.0', () => {
  console.log(`[HTTP Server] Running on http://localhost:${PORT_HTTP}\n`);
});
