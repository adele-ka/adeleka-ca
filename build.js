// Builds the website: reads content/ and static/, writes finished pages into dist/.
//   node build.js            -> normal build
//   BASE_PATH=/adeleka-ca node build.js   -> when the site lives at user.github.io/adeleka-ca/
const fs = require('fs');
const path = require('path');
const { parse } = require('./lib/frontmatter');
const { makeRenderer, esc, fmtDate, plain } = require('./lib/render');
const { readtime } = require('./lib/readtime');

const ROOT = __dirname;

function readDir(type) {
  const dir = path.join(ROOT, 'content', type);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const { data, body } = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { slug: f.replace(/\.md$/, ''), data, body };
    })
    .filter((x) => !x.data.draft);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from, { withFileTypes: true }).forEach((e) => {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  });
}

function write(out, rel, content) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function build(opts) {
  opts = opts || {};
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8'));
  const base = String(opts.basePath != null ? opts.basePath : (process.env.BASE_PATH || '')).replace(/\/$/, '');
  const siteUrl = String(opts.siteUrl != null ? opts.siteUrl : (process.env.SITE_URL || site.url || '')).replace(/\/$/, '');
  const out = path.join(ROOT, opts.out || 'dist');

  fs.rmSync(out, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'static'), out);

  const byDate = (a, b) => String(b.data.date || '').localeCompare(String(a.data.date || ''));
  const byOrder = (a, b) => (+a.data.order || 99) - (+b.data.order || 99);
  const posts = readDir('writing').sort(byDate);
  posts.forEach((p) => { if (!p.data.readtime) p.data.readtime = readtime(p.body); });
  const projects = readDir('projects').sort(byOrder);
  const favs = readDir('favourites').sort(byOrder);
  const photos = readDir('photos').sort(byDate);

  const r = makeRenderer({ site, base, siteUrl: siteUrl ? siteUrl + base : '' });
  const pages = [];
  const add = (rel, html, url) => { write(out, rel, html); if (url) pages.push(url); };

  add('index.html', r.home({ posts, projects, favs, photos }), '/');
  add('projects/index.html', r.projectsIndex({ projects }), '/projects/');
  projects.forEach((p) => add('projects/' + p.slug + '/index.html', r.projectPage(p, projects), '/projects/' + p.slug + '/'));
  add('writing/index.html', r.writingIndex({ posts }), '/writing/');
  posts.forEach((p) => add('writing/' + p.slug + '/index.html', r.postPage(p, posts), '/writing/' + p.slug + '/'));
  add('favourites/index.html', r.favouritesPage({ favs }), '/favourites/');
  add('snapshots/index.html', r.snapshotsPage({ photos }), '/snapshots/');
  add('404.html', r.notFound());

  // sitemap, robots, and RSS feed (only useful once the site has an address)
  if (siteUrl) {
    write(out, 'sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      pages.map((p) => '  <url><loc>' + esc(siteUrl + base + p) + '</loc></url>').join('\n') + '\n</urlset>\n');
  }
  write(out, 'robots.txt', 'User-agent: *\nAllow: /\n' + (siteUrl ? 'Sitemap: ' + siteUrl + base + '/sitemap.xml\n' : ''));
  const rfc = (d) => { const t = new Date(String(d || '').slice(0, 10) + 'T12:00:00Z'); return isNaN(t) ? '' : t.toUTCString(); };
  write(out, 'feed.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>' + esc(site.name) + '</title><link>' + esc(siteUrl + base + '/') + '</link><description>' + esc(site.description) + '</description>\n' +
    posts.map((p) => '<item><title>' + esc(p.data.title) + '</title><link>' + esc(siteUrl + base + '/writing/' + p.slug + '/') + '</link><guid>' + esc(siteUrl + base + '/writing/' + p.slug + '/') + '</guid><pubDate>' + rfc(p.data.date) + '</pubDate><description>' + esc(p.data.dek) + '</description></item>').join('\n') +
    '\n</channel></rss>\n');

  // warn (but keep building) if site.json points at a CV file that is not in static/
  if (site.cv && site.cv.startsWith('/') && !fs.existsSync(path.join(ROOT, 'static', site.cv))) {
    console.warn('note: the CV file ' + site.cv + ' is not in static' + site.cv.replace(/\/[^/]*$/, '/') + ' yet, so "download CV" will not work until you add it.');
  }

  // a ".nojekyll" file tells GitHub Pages to publish the folder exactly as built
  write(out, '.nojekyll', '');

  const n = pages.length + 1;
  if (!opts.quiet) console.log('built ' + n + ' pages (' + posts.length + ' posts, ' + projects.length + ' projects, ' + favs.length + ' lists, ' + photos.length + ' photos) into ' + path.relative(ROOT, out) + '/');
  return { pages: n, posts: posts.length, projects: projects.length, favs: favs.length, photos: photos.length };
}

module.exports = { build };
if (require.main === module) build();
