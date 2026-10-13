// ka-cms: a small content editor that runs on YOUR computer.
//   npm run cms     then open  http://localhost:4321
// It edits the files in content/, uploads photos into static/uploads/, previews the site,
// and publishes (git add, commit, pull, push) to GitHub with one button.
// No database and no accounts: your files are the source of truth.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { marked } = require('marked');
const { parse, stringify } = require('../lib/frontmatter');
const { build } = require('../build');
const { readtime } = require('../lib/readtime');

const ROOT = path.join(__dirname, '..');
const PORT = +process.env.CMS_PORT || 4321;
const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf8'));
const MAX_UPLOAD = 25 * 1024 * 1024;

// ---------- helpers ----------
const send = (res, code, body, type) => {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const fail = (res, code, msg) => send(res, code, { error: msg });
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const typeOf = (t) => (Object.prototype.hasOwnProperty.call(SCHEMA.types, t) ? SCHEMA.types[t] : null);
const fileFor = (t, slug) => path.join(ROOT, typeOf(t).dir, slug + '.md');
const readBody = (req, limit) => new Promise((resolve, reject) => {
  const chunks = []; let n = 0;
  req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});
const git = (args) => new Promise((resolve) => {
  execFile('git', args, { cwd: ROOT, timeout: 120000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
    resolve({ ok: !err, code: err && err.code, out: (stdout || '').trim(), err: (stderr || '').trim() || (err && err.code === 'ENOENT' ? 'git is not installed' : '') });
  });
});
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.xml': 'application/xml', '.txt': 'text/plain' };
function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) return fail(res, 403, 'no');
  fs.readFile(file, (e, d) => (e ? fail(res, 404, 'not found') : send(res, 200, d, MIME[path.extname(file)] || 'application/octet-stream')));
}

// ---------- the server ----------
const server = http.createServer(async (req, res) => {
  try {
    // Only answer requests addressed to localhost. This blocks "DNS rebinding" tricks from other websites.
    const host = String(req.headers.host || '');
    if (host !== 'localhost:' + PORT && host !== '127.0.0.1:' + PORT) return fail(res, 403, 'bad host');
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const q = url.searchParams;

    // Anything that changes something must carry a custom header. Other websites cannot send it.
    if (req.method !== 'GET' && req.headers['x-ka-cms'] !== '1') return fail(res, 403, 'missing header');

    // static files for the editor and image previews
    if (req.method === 'GET' && !p.startsWith('/api/')) {
      if (p === '/' || p === '/index.html') return serveFile(res, path.join(__dirname, 'public'), 'index.html');
      if (p.startsWith('/static/')) return serveFile(res, path.join(ROOT, 'static'), p.slice('/static/'.length));
      if (p.startsWith('/preview')) {
        let rel = p.slice('/preview'.length) || '/';
        if (rel.endsWith('/')) rel += 'index.html';
        return serveFile(res, path.join(ROOT, 'dist'), rel);
      }
      return fail(res, 404, 'not found');
    }

    if (req.method === 'GET' && p === '/api/schema') return send(res, 200, SCHEMA);

    if (req.method === 'GET' && p === '/api/list') {
      const t = typeOf(q.get('type'));
      if (!t) return fail(res, 400, 'unknown type');
      if (t.kind === 'json') return send(res, 200, []);
      const dir = path.join(ROOT, t.dir);
      const items = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
        const { data } = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        return { slug: f.replace(/\.md$/, ''), title: data[t.titleField] || f, date: data.date || '', order: data.order || '', draft: !!data.draft };
      }) : [];
      items.sort((a, b) => String(b.date).localeCompare(String(a.date)) || (+a.order || 99) - (+b.order || 99));
      return send(res, 200, items);
    }

    if (req.method === 'GET' && p === '/api/item') {
      const t = typeOf(q.get('type'));
      if (!t) return fail(res, 400, 'unknown type');
      if (t.kind === 'json') return send(res, 200, { data: JSON.parse(fs.readFileSync(path.join(ROOT, t.file), 'utf8')), body: '' });
      const slug = slugify(q.get('slug'));
      const f = fileFor(q.get('type'), slug);
      if (!fs.existsSync(f)) return fail(res, 404, 'not found');
      const { data, body } = parse(fs.readFileSync(f, 'utf8'));
      return send(res, 200, { slug, data, body });
    }

    if (req.method === 'POST' && p === '/api/item') {
      const j = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8'));
      const t = typeOf(j.type);
      if (!t) return fail(res, 400, 'unknown type');
      if (t.kind === 'json') {
        // merge into the existing file, so settings that are not on the form (name, filters, ...) are kept
        const file = path.join(ROOT, t.file);
        let current = {};
        try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
        const next = Object.assign({}, current);
        t.fields.forEach((fd) => { if (j.data && fd.name in j.data) next[fd.name] = j.data[fd.name]; });
        fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
        return send(res, 200, { ok: true });
      }
      const slug = slugify(j.slug || (j.data && j.data[t.titleField]));
      if (!slug) return fail(res, 400, 'please give it a title');
      const f = fileFor(j.type, slug);
      if (j.isNew && fs.existsSync(f)) return fail(res, 409, 'something with that name already exists');
      const data = {};
      t.fields.forEach((fd) => {
        if (fd.name === 'body') return;
        let v = j.data ? j.data[fd.name] : undefined;
        if (fd.type === 'number') v = v === '' || v == null ? undefined : +v;
        if (fd.type === 'bool') v = v ? true : undefined;
        data[fd.name] = v;
      });
      // fields marked "auto" are worked out here, not typed: reading time comes from the post's length
      t.fields.forEach((fd) => { if (fd.auto === 'readtime') data[fd.name] = readtime(j.body); });
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, stringify(data, j.body || ''));
      return send(res, 200, { ok: true, slug });
    }

    if (req.method === 'DELETE' && p === '/api/item') {
      const t = typeOf(q.get('type'));
      if (!t || t.kind === 'json') return fail(res, 400, 'unknown type');
      const f = fileFor(q.get('type'), slugify(q.get('slug')));
      if (!fs.existsSync(f)) return fail(res, 404, 'not found');
      fs.unlinkSync(f);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && p === '/api/upload') {
      const name = String(q.get('name') || 'photo').toLowerCase();
      const ext = (name.match(/\.(jpe?g|png|webp|gif)$/) || [])[1];
      if (!ext) return fail(res, 400, 'use a jpg, png, webp, or gif');
      const base = slugify(name.replace(/\.[^.]+$/, '')) || 'photo';
      const buf = await readBody(req, MAX_UPLOAD);
      if (!buf.length) return fail(res, 400, 'empty file');
      const dir = path.join(ROOT, 'static', 'uploads');
      fs.mkdirSync(dir, { recursive: true });
      let file = base + '.' + ext, i = 2;
      while (fs.existsSync(path.join(dir, file))) file = base + '-' + i++ + '.' + ext;
      fs.writeFileSync(path.join(dir, file), buf);
      return send(res, 200, { path: '/uploads/' + file });
    }

    if (req.method === 'POST' && p === '/api/preview') {
      const j = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8'));
      return send(res, 200, { html: marked.parse(String(j.md || '')) });
    }

    if (req.method === 'POST' && p === '/api/build') {
      const r = build({ basePath: '', siteUrl: '', quiet: true });
      return send(res, 200, { ok: true, result: r });
    }

    if (req.method === 'GET' && p === '/api/git') {
      const inside = await git(['rev-parse', '--is-inside-work-tree']);
      if (!inside.ok) return send(res, 200, { repo: false, message: inside.err || 'this folder is not a git repository yet' });
      const [branch, remote, status] = await Promise.all([git(['branch', '--show-current']), git(['remote', '-v']), git(['status', '--porcelain'])]);
      return send(res, 200, { repo: true, branch: branch.out, remote: remote.out.split('\n')[0] || '', changes: status.out ? status.out.split('\n') : [] });
    }

    if (req.method === 'POST' && p === '/api/git/publish') {
      const j = JSON.parse((await readBody(req, 100 * 1024)).toString('utf8') || '{}');
      const message = String(j.message || 'update content').replace(/[\r\n]+/g, ' ').slice(0, 200) || 'update content';
      const log = [];
      const run = async (label, args) => { const r = await git(args); log.push({ step: label, ok: r.ok, out: r.out, err: r.err }); return r; };
      const hasRemote = (await git(['remote'])).out.length > 0;
      let r = await run('add changes', ['add', '-A']);
      if (!r.ok) return send(res, 200, { ok: false, log });
      const status = await git(['status', '--porcelain']);
      if (status.out) {
        r = await run('save a version (commit)', ['commit', '-m', message]);
        if (!r.ok) return send(res, 200, { ok: false, log });
      } else log.push({ step: 'save a version (commit)', ok: true, out: 'nothing new to save', err: '' });
      if (!hasRemote) { log.push({ step: 'send to GitHub', ok: false, out: '', err: 'no GitHub address is set up yet (see the guide, "Put it on GitHub")' }); return send(res, 200, { ok: false, log }); }
      r = await run('get the latest from GitHub', ['pull', '--rebase', '--autostash']);
      if (!r.ok) return send(res, 200, { ok: false, log });
      r = await run('send to GitHub (push)', ['push']);
      if (!r.ok && /no upstream|has no upstream/i.test(r.err)) r = await run('send to GitHub (first push)', ['push', '-u', 'origin', 'HEAD']);
      return send(res, 200, { ok: r.ok, log });
    }

    return fail(res, 404, 'not found');
  } catch (e) {
    return fail(res, 500, e.message || 'error');
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log('\n  ka-cms is running.\n  open  http://localhost:' + PORT + '  in your browser.\n  (press Ctrl+C to stop)\n');
  });
}
module.exports = { server, PORT };
