// Local preview: builds the site, serves it at http://localhost:8080, and rebuilds when files change.
//   npm run dev
const http = require('http');
const fs = require('fs');
const path = require('path');
const { build } = require('./build');

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };

function safeBuild() { try { build({ basePath: '', siteUrl: '' }); } catch (e) { console.error('build failed:', e.message); } }
safeBuild();

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(file, (err, data) => {
    if (err) {
      return fs.readFile(path.join(DIST, '404.html'), (e2, d2) => { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); res.end(d2 || 'not found'); });
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('preview running at http://localhost:' + PORT + '  (press Ctrl+C to stop)'));

// rebuild when anything in content/, static/ or lib/ changes (checks once a second, works on every system)
function signature(dir) {
  let sig = '';
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f); else { const s = fs.statSync(f); sig += f + s.mtimeMs + s.size; }
    });
  })(dir);
  return sig;
}
let last = ['content', 'static', 'lib'].map((d) => signature(path.join(__dirname, d))).join('|');
setInterval(() => {
  const now = ['content', 'static', 'lib'].map((d) => signature(path.join(__dirname, d))).join('|');
  if (now !== last) { last = now; console.log('change detected, rebuilding...'); safeBuild(); }
}, 1000);
