// Turns content into HTML. Every function here returns a string of HTML.
// The class names (hero, cover, post, proj, ...) match static/css/site.css.
const { marked } = require('marked');

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function fmtDate(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return MONTHS[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1];
}
function plain(md) { return String(md || '').replace(/[*_`>#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim(); }
function md(text) { return marked.parse(String(text || '')); }

// Splits a project body into sections using "## heading" lines.
function sections(body) {
  const out = {};
  let cur = null;
  String(body || '').split('\n').forEach((line) => {
    const h = line.match(/^##\s+(.*)$/);
    if (h) { cur = h[1].trim().toLowerCase(); out[cur] = []; }
    else if (cur) out[cur].push(line);
  });
  Object.keys(out).forEach((k) => { out[k] = out[k].join('\n').trim(); });
  return out;
}

function makeRenderer(ctx) {
  const { site, base } = ctx;
  const u = (p) => base + p;
  // Words you can change in content/site.json (or "site settings" in ka-cms). The second value is used if the setting is empty.
  const t = (key, fallback) => (site[key] != null && String(site[key]).trim() !== '' ? String(site[key]) : fallback);
  const art = (name) => (/[./]/.test(name || '') ? u(name.startsWith('/') ? name : '/uploads/' + name) : u('/img/' + name + '.webp'));
  const ARROW = '<div class="go" aria-hidden="true"></div>';
  const ASSETS = [
    'flower-zinnia-coral', 'flower-zinnia-blue', 'flower-zinnia-lilac', 'flower-zinnia-peach',
    'flower-daisy-lilac', 'flower-daisy-blue', 'flower-daisy-peach', 'flower-daisy-sage',
    'flower-daisy-pink', 'flower-sprig-pink', 'flower-sprig-blue', 'flower-sprig-yellow', 'flower-sprig-magenta',
    'garden-tomato-red', 'garden-tomato-yellow', 'garden-tomato-deep', 'garden-tomato-orange', 'garden-tomato-green',
    'garden-corn', 'garden-pea', 'garden-pepper', 'garden-carrot'
  ];

  // Cover photos: an optional list in a post or project header, each "src" (and "alt").
  //   photos:
  //     - src: /uploads/garden.webp
  //       alt: tomatoes ripening on the vine
  // The first photo is the one used on cards. With no photos, the illustration is used instead.
  const photosOf = (d) => (Array.isArray(d.photos) ? d.photos : d.photos ? [d.photos] : [])
    .map((x) => (typeof x === 'string' ? { src: x, alt: '' } : x || {}))
    .filter((x) => x.src)
    .map((x) => ({ src: art(x.src), alt: String(x.alt || '') }));
  const cardPhoto = (d) => {
    const ph = photosOf(d);
    if (!ph.length) return '';
    return '<img class="cover-photo" src="' + esc(ph[0].src) + '" alt="' + esc(ph[0].alt) + '" loading="lazy">' +
      (ph.length > 1 ? '<span class="photo-count" aria-label="' + ph.length + ' photos">' + ph.length + ' photos</span>' : '');
  };
  // The photo layout on a post or project page grows with the number of photos:
  // 1 = one wide photo, 2 = side by side, 3 = one large and two stacked, 4 = a 2 by 2 grid,
  // 5 or more = one large and four small, with "+N" on the last tile. Every photo opens in the photo viewer.
  const SHOWN = 5;
  function gallery(d, caption) {
    const ph = photosOf(d);
    const n = ph.length, layout = Math.min(n, SHOWN);
    return '<div class="gallery" data-n="' + layout + '">' + ph.map((x, i) => {
      const more = i === SHOWN - 1 && n > SHOWN ? '<span class="gal-more">+' + (n - SHOWN) + '</span>' : '';
      return '<button type="button" class="gal-item"' + (i >= SHOWN ? ' hidden' : '') + ' data-src="' + esc(x.src) + '" data-cap="' + esc(x.alt || caption) + '" aria-label="open photo ' + (i + 1) + ' of ' + n + (x.alt ? ': ' + esc(x.alt) : '') + '">' +
        '<img src="' + esc(x.src) + '" alt="' + esc(x.alt) + '"' + (i ? ' loading="lazy"' : '') + '>' + more + '</button>';
    }).join('') + '</div>';
  }

  const artPair = (o, extra) =>
    '<img class="art art-flowers' + (extra || '') + '" src="' + art(o.art_flowers || 'flower-zinnia-coral') + '" alt="" loading="lazy">' +
    '<img class="art art-garden' + (extra || '') + '" src="' + art(o.art_garden || 'garden-tomato-red') + '" alt="" loading="lazy">';

  function head({ title, desc, path, image }) {
    const full = title === site.name ? site.name + ' | ' + site.tagline : title + ' | ' + site.name;
    const canon = ctx.siteUrl ? ctx.siteUrl + path : '';
    const img = image ? (ctx.siteUrl || '') + image : '';
    return '<!DOCTYPE html>\n<html lang="' + esc(site.lang || 'en') + '">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      '<title>' + esc(full) + '</title>\n<meta name="description" content="' + esc(desc || site.description) + '">\n' +
      (canon ? '<link rel="canonical" href="' + esc(canon) + '">\n' : '') +
      '<meta property="og:title" content="' + esc(full) + '">\n<meta property="og:description" content="' + esc(desc || site.description) + '">\n<meta property="og:type" content="website">\n' +
      (canon ? '<meta property="og:url" content="' + esc(canon) + '">\n' : '') +
      (img ? '<meta property="og:image" content="' + esc(img) + '">\n' : '') +
      '<meta name="twitter:card" content="summary">\n' +
      '<link rel="icon" href="' + u('/img/favicon.svg') + '" type="image/svg+xml">\n' +
      '<link rel="alternate" type="application/rss+xml" title="' + esc(site.name) + '" href="' + u('/feed.xml') + '">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">\n' +
      '<script>try{document.documentElement.setAttribute("data-bg",localStorage.getItem("ka-bg")==="garden"?"garden":"flowers")}catch(e){document.documentElement.setAttribute("data-bg","flowers")}</script>\n' +
      '<link rel="stylesheet" href="' + u('/css/site.css') + '">\n</head>\n';
  }

  function nav(current) {
    const items = [['projects', '/projects/'], ['writing', '/writing/'], ['favourites', '/favourites/'], ['snapshots', '/snapshots/']];
    const link = (n, p, cls) => '<a href="' + u(p) + '"' + (current === n ? ' class="w--current" aria-current="page"' : '') + '>' + n + '</a>';
    return '<div class="nav-outer"><div class="nav-inner">' +
      '<a href="' + u('/') + '" class="brand" aria-label="' + esc(site.name) + ', home">' +
      '<img class="logo-img logo-light" src="' + u('/img/logo-black.png') + '" alt=""><img class="logo-img logo-dark" src="' + u('/img/logo-cream.png') + '" alt=""></a>' +
      '<div class="links">' + items.map((i) => link(i[0], i[1])).join('') +
      '<button class="menu-btn" id="menubtn" aria-expanded="false" aria-controls="mm">menu</button>' +
      '<a class="pill" href="mailto:' + esc(site.email) + '">say hello</a></div></div>' +
      '<div class="mobile-menu" id="mm">' + items.map((i) => link(i[0], i[1])).join('') +
      // on phones the seed packet is hidden, so the CV lives in the menu instead
      (site.cv ? '<a class="menu-cv" href="' + esc(cvHref()) + '" download><span>' + esc(t('cvButton', 'download CV')) + '</span><img src="' + u('/img/flower-daisy-pink.webp') + '" alt=""></a>' : '') +
      '</div></div>\n';
  }

  function footer() {
    const links = [];
    if (site.linkedin) links.push('<a href="' + esc(site.linkedin) + '">linkedin</a>');
    if (site.cv) links.push('<a href="' + esc(cvHref()) + '" download>cv</a>');
    links.push('<a href="' + u('/feed.xml') + '">rss</a>');
    return '<footer class="footer"><div class="wrap"><div class="foot-row"><div>' + esc(site.footer) + '</div><div>' + links.join(' &nbsp; ') + '</div></div>' +
      '<div class="giant" aria-hidden="true">' + esc(site.name) + '</div></div>' +
      '<div class="asset-bank" aria-hidden="true">' + ASSETS.map((a) => '<img src="' + u('/img/' + a + '.webp') + '" alt="" loading="lazy">').join('') + '</div>' +
      '<div class="bgpick" role="radiogroup" aria-label="choose a background">' +
      '<button type="button" role="radio" aria-checked="true" data-bg="flowers" aria-label="flowers" title="flowers"><img data-key="flower-daisy-blue" alt=""><span>flowers</span></button>' +
      '<button type="button" role="radio" aria-checked="false" data-bg="garden" aria-label="garden veggies" title="garden veggies"><img data-key="garden-corn" alt=""><span>garden</span></button></div></footer>\n';
  }

  function lightbox() {
    return '<dialog class="lb" id="lb" aria-label="photo viewer"><div class="lb-panel"><div class="lb-stage"></div>' +
      '<div class="lb-bar"><span class="lb-cap"></span><div class="lb-btns"><button type="button" class="lb-prev">prev</button><button type="button" class="lb-next">next</button><button type="button" class="lb-close">close</button></div></div></div></dialog>\n';
  }

  // The CV seed packet pinned to the bottom-left of every page.
  // Its text comes from cvLabel, cvTitle and cvRows in content/site.json; leave cvTitle empty to hide it.
  // "download CV" links to "cv" in site.json. Put your PDF in static/uploads/ and write its path, like /uploads/adele-ka-cv.pdf
  const cvHref = () => (String(site.cv || '').startsWith('/') ? u(site.cv) : site.cv);
  function cvPacket() {
    if (!site.cvTitle) return '';
    const rows = (site.cvRows || []).map((r) => String(r).split(':')).filter((r) => r.length > 1)
      .map((r) => '<dt>' + esc(r[0].trim()) + '</dt><dd>' + esc(r.slice(1).join(':').trim()) + '</dd>').join('');
    const dl = site.cv ? '<a class="btn btn-fill" href="' + esc(cvHref()) + '" download>' + esc(t('cvButton', 'download CV')) + '</a>' : '';
    const li = site.linkedin ? '<a class="btn" href="' + esc(site.linkedin) + '" target="_blank" rel="noopener">linkedin</a>' : '';
    return '<div class="cvp" id="cvp">' +
      '<div class="cvp-card" id="cvp-card" role="region" aria-label="cv" hidden><button class="cvp-close" type="button">close</button>' +
      '<h2 class="cvp-title">' + esc(site.cvTitle) + '</h2>' + (rows ? '<dl class="cvp-rows">' + rows + '</dl>' : '') +
      (dl || li ? '<div class="cvp-btns">' + dl + li + '</div>' : '') + '</div>' +
      '<button class="cvp-packet" id="cvp-btn" type="button" aria-expanded="false" aria-controls="cvp-card" aria-label="open my cv">' +
      '<span class="cvp-flap" aria-hidden="true"></span><span class="cvp-body" aria-hidden="true"><span class="cvp-tear">' + esc(t('cvTear', 'tear here')) + '</span>' +
      '<img class="art art-flowers" src="' + u('/img/flower-daisy-pink.webp') + '" alt=""><img class="art art-garden" src="' + u('/img/garden-tomato-red.webp') + '" alt="">' +
      '<span class="cvp-brand">' + esc(t('cvBrand', 'ka seed co.')) + '</span><span class="cvp-hire">' + esc(t('cvLabel', 'CV')) + '</span></span></button></div>\n';
  }

  function page({ title, desc, path, current, body, image, withLightbox }) {
    return head({ title, desc, path, image }) + '<body>\n<a class="skip" href="#main">skip to content</a>\n' + nav(current) +
      '<main id="main">\n' + body + '\n</main>\n' + footer() + cvPacket() + (withLightbox ? lightbox() : '') +
      '<script src="' + u('/js/site.js') + '" defer></script>\n</body>\n</html>\n';
  }

  const chips = (list) => '<div class="chips" role="group" aria-label="filter">' +
    list.map((x, i) => '<button type="button" class="chip" data-f="' + esc(x) + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + esc(x) + '</button>').join('') + '</div>';
  const uniq = (a) => a.filter((x, i) => x && a.indexOf(x) === i);
  // Filter chips come from "filters" in content/site.json, so you can rename or reorder them there.
  // If a list is missing, the chips are made from the tags the content actually uses.
  const filterList = (key, used) => ['all'].concat((site.filters && site.filters[key]) || uniq(used));
  const emptyNote = '<p class="empty-note" hidden>nothing here yet. check back soon.</p>';
  // Shown in place of a list that has nothing published yet. It disappears by itself once you publish the first item.
  const SOON = {
    projects: [t('soonProjects', 'projects are being written up. check back soon.'), 'flower-daisy-sage', 'garden-pea'],
    writing: [t('soonWriting', 'new writing is on its way. check back soon.'), 'flower-zinnia-lilac', 'garden-corn'],
    snapshots: [t('soonSnapshots', 'photos from the trail, the desk, and the garden are on their way.'), 'flower-daisy-pink', 'garden-carrot']
  };
  const comingSoon = (kind) => '<div class="soon"><div><h2 class="soon-title">' + esc(t('soonTitle', 'coming soon')) + '</h2><p class="soon-text">' + esc(SOON[kind][0]) + '</p></div>' +
    '<div class="soon-art" aria-hidden="true">' + artPair({ art_flowers: SOON[kind][1], art_garden: SOON[kind][2] }) + '</div></div>';

  function postCard(p) {
    return '<a class="card post" href="' + u('/writing/' + p.slug + '/') + '" data-t="' + esc(p.data.topic) + '">' +
      '<div class="thumb' + (photosOf(p.data).length ? ' has-photo' : '') + '" data-tint="' + esc(p.data.tint || 'sage') + '">' + ARROW + (cardPhoto(p.data) || artPair(p.data)) + '</div>' +
      '<div class="body"><div class="post-meta">' + [p.data.topic, fmtDate(p.data.date)].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ') + '</div>' +
      '<h3 class="post-title">' + esc(p.data.title) + '</h3></div></a>';
  }
  function projCard(p) {
    const d = p.data;
    return '<a class="proj" href="' + u('/projects/' + p.slug + '/') + '" data-t="' + esc(d.type) + '">' +
      '<div class="shot' + (photosOf(d).length ? ' has-photo' : '') + '" data-tint="' + esc(d.tint || 'sage') + '">' + ARROW + (cardPhoto(d) || '<img class="sketch-img" src="' + u('/img/' + (d.sketch || 'two-way-sync.svg')) + '" alt="">') + '</div>' +
      '<div class="body"><div class="facts">' + [d.type, d.hats].filter(Boolean).map((f) => '<span class="fact">' + esc(f) + '</span>').join('') + '</div>' +
      '<h3 class="proj-title">' + esc(d.title) + '</h3><p class="proj-text">' + esc(d.summary) + '</p></div></a>';
  }
  function favCard(f, h) {
    const tag = h || 'h3';
    return '<section class="fav-card" data-tint="' + esc(f.data.tint || 'sage') + '"><' + tag + ' class="fav-title">' + esc(f.data.title) + '</' + tag + '>' +
      '<p class="fav-desc">' + esc(f.data.description) + '</p><div class="fav-items">' + md(f.body) + '</div></section>';
  }
  function snap(ph) {
    const d = ph.data;
    const ratio = d.ratio ? ' style="aspect-ratio:' + esc(d.ratio) + '"' : '';
    if (d.image) {
      const src = art(d.image);
      return '<button type="button" class="snap" data-t="' + esc(d.category) + '" data-cap="' + esc(d.caption) + '" data-src="' + src + '" aria-label="open photo: ' + esc(d.caption) + '">' +
        '<img class="photo" src="' + src + '" alt="' + esc(d.alt || d.caption) + '" loading="lazy"></button>';
    }
    return '<button type="button" class="snap is-ph" data-tint="' + esc(d.tint || 'sage') + '" data-t="' + esc(d.category) + '" data-cap="' + esc(d.caption) + '"' + ratio + ' aria-label="open photo: ' + esc(d.caption) + '">' +
      '<span class="snap-cap">' + esc(d.caption) + '</span>' + artPair(d) + '</button>';
  }

  return {
    page, chips, uniq, postCard, projCard, favCard, snap, u, art, ARROW, artPair,

    home({ posts, projects, favs, photos }) {
      const cover = posts.find((p) => p.data.cover) || posts[0];
      const others = posts.filter((p) => p !== cover);
      // show 3 or 6 cards so the row is always full (fewer than 3 shows them all)
      const rest = others.slice(0, others.length >= 6 ? 6 : others.length >= 3 ? 3 : others.length);
      const words = site.marquee || [];
      const group = (hidden) => '<div class="track-group"' + (hidden ? ' aria-hidden="true"' : '') + '>' + words.map((w) => '<span>' + esc(w) + '</span><div class="dot"></div>').join('') + '</div>';
      const body =
        '<div class="hero"><div class="wrap"><div class="hero-top"><h1 class="hero-title reveal">' + esc(site.heroTitle) + '</h1>' +
        '<div class="reveal" style="animation-delay:.12s"><p class="lede">' + esc(site.heroLede) + '</p><div class="btns"><a class="btn btn-fill" href="' + u('/writing/') + '">read the latest</a><a class="btn" href="' + u('/projects/') + '">see projects</a></div></div></div>' +
        (cover ? '<a class="cover reveal" style="animation-delay:.2s" href="' + u('/writing/' + cover.slug + '/') + '">' + ARROW +
          '<div class="cover-text"><span class="tag">cover story</span><div><h3 class="cover-title">' + esc(cover.data.title) + '</h3><p class="cover-dek">' + esc(cover.data.dek) + '</p>' +
          '<div class="meta">by ' + esc(site.name) + ' &nbsp;·&nbsp; ' + esc(cover.data.readtime) + '</div></div></div>' +
          (photosOf(cover.data).length ? '<div class="cover-art has-photo">' + cardPhoto(cover.data) + '</div></a>'
            : '<div class="cover-art" data-tint="' + esc(cover.data.tint || 'peach') + '" aria-hidden="true">' + artPair(cover.data) + '</div></a>') : '') +
        '</div></div>\n' +
        (words.length ? '<div class="marquee" aria-hidden="true"><div class="track">' + group(false) + group(true) + '</div></div>\n' : '') +
        '<section class="sec projects" id="projects"><div class="wrap"><div class="sec-head"><h2 class="sec-title">' + esc(t('projectsTitle', 'projects')) + '</h2><p class="sec-note">' + esc(t('projectsNote', 'a few things i\'ve owned, designed, and shipped.')) + ' <a class="more" href="' + u('/projects/') + '">see all</a></p></div>' +
        (projects.length ? '<div class="grid3">' + projects.slice(0, 3).map(projCard).join('') + '</div>' : comingSoon('projects')) + '</div></section>\n' +
        '<section class="sec" id="writing"><div class="wrap"><div class="sec-head"><h2 class="sec-title">' + esc(t('writingTitle', 'ponderings and hot takes')) + '</h2><a class="more" href="' + u('/writing/') + '">all writing</a></div>' +
        (rest.length ? '<div class="grid3">' + rest.map(postCard).join('') + '</div>' : comingSoon('writing')) + '</div></section>\n' +
        '<section class="sec" id="favourites"><div class="wrap"><div class="sec-head"><h2 class="sec-title">' + esc(t('favouritesTitle', 'favourite things')) + '</h2><p class="sec-note">' + esc(t('favouritesNote', 'lists i keep updating.')) + ' <a class="more" href="' + u('/favourites/') + '">see all lists</a></p></div>' +
        '<div class="grid3">' + favs.slice(0, 3).map((f) => favCard(f)).join('') + '</div></div></section>\n' +
        '<section class="sec" id="snapshots"><div class="wrap"><div class="sec-head"><h2 class="sec-title">' + esc(t('snapshotsTitle', 'snapshots')) + '</h2><a class="more" href="' + u('/snapshots/') + '">see more</a></div>' +
        (photos.length ? '<div class="masonry">' + photos.slice(0, 6).map(snap).join('') + '</div>' : comingSoon('snapshots')) + '</div></section>\n' +
        this.contact();
      return page({ title: site.name, desc: site.description, path: '/', body, withLightbox: true, image: '/img/flower-zinnia-coral.webp' });
    },

    contact() {
      const form = site.newsletterAction
        ? '<form class="sub" action="' + esc(site.newsletterAction) + '" method="post"><input class="sub-input" type="email" name="email" placeholder="you@example.com" aria-label="email address" required><button class="sub-btn" type="submit">subscribe</button></form>'
        : '<a class="btn btn-fill" href="mailto:' + esc(site.email) + '">' + esc(site.email) + '</a>';
      return '<section class="sec" style="padding-top:0"><div class="wrap"><div class="contact-card"><h2>' + esc(site.contactTitle) + '</h2><p>' + esc(site.contactText) + '</p>' + form + '</div>' +
        '<div class="about-line"><h3>' + esc(site.aboutTitle) + '</h3><div class="about-body"><p>' + esc(site.aboutText) + '</p><a class="pill about-hello" href="mailto:' + esc(site.email) + '">say hello</a></div></div></div></section>';
    },

    projectsIndex({ projects }) {
      const body = '<div class="wrap page"><div class="page-head"><h1 class="page-title">' + esc(t('projectsTitle', 'projects')) + '</h1><p class="page-lede">' + esc(t('projectsLede', 'things i\'ve owned, designed, and shipped. each one starts with a real problem and ends with something i learned.')) + '</p></div>' +
        chips(filterList('projects', projects.map((p) => p.data.type))) +
        (projects.length ? '<div class="deep-panel"><div class="grid3 filterable">' + projects.map(projCard).join('') + '</div>' + emptyNote + '</div>' : comingSoon('projects')) + '</div>';
      return page({ title: 'projects', desc: 'Projects by ' + site.name + '.', path: '/projects/', current: 'projects', body });
    },

    projectPage(p, all) {
      const d = p.data, s = sections(p.body);
      const others = all.filter((x) => x !== p).slice(0, 2);
      const stat = (n, l, cls) => (n && l ? '<div class="stat ' + cls + '"><div class="stat-num">' + esc(n) + '</div><div class="stat-label">' + esc(l) + '</div></div>' : '');
      const stats = stat(d.result1_num, d.result1_label, 'tint-butter') + stat(d.result2_num, d.result2_label, 'tint-pink');
      const row = (k, v) => '<div><div class="meta-label">' + k + '</div><div class="meta-value">' + esc(v || 'coming soon') + '</div></div>';
      const body = '<div class="wrap page">' +
        '<a class="crumb" href="' + u('/projects/') + '">← all projects</a>' +
        '<h1 class="case-title">' + esc(d.title) + '</h1><p class="case-dek">' + esc(d.dek) + '</p>' +
        '<div class="meta-grid">' + row('type', d.type) + row('hats', d.hats) + row('timeline', d.timeline) + row('tools', d.tools) + '</div>' +
        (photosOf(d).length ? gallery(d, d.title) : '<div class="case-hero" data-tint="' + esc(d.tint || 'sage') + '"><img class="sketch-img" src="' + u('/img/' + (d.sketch || 'two-way-sync.svg')) + '" alt=""></div>') +
        (s['the problem'] ? '<div class="cs"><h2 class="cs-title">the problem</h2><div class="cs-body">' + md(s['the problem']) + '</div></div>' : '') +
        (s['what i did'] ? '<div class="cs"><h2 class="cs-title">what i did</h2><div class="steps">' + md(s['what i did']) + '</div></div>' : '') +
        (stats ? '<div class="cs"><h2 class="cs-title">the results</h2><div class="stats-row">' + stats + '</div></div>' : '') +
        (d.learned ? '<div class="cs" style="border-bottom:0"><h2 class="cs-title">what i learned</h2><div class="learned">' + esc(d.learned) + '</div></div>' : '') +
        (others.length ? '<h2 class="more-head">more projects</h2><div class="deep-panel"><div class="grid2">' + others.map(projCard).join('') + '</div></div>' : '') +
        '</div>';
      const ph = photosOf(d);
      return page({ title: d.title, desc: d.summary, path: '/projects/' + p.slug + '/', current: 'projects', body, withLightbox: ph.length > 0,
        image: ph.length ? ph[0].src.replace(base, '') : '/img/' + (d.sketch || '') });
    },

    writingIndex({ posts }) {
      const body = '<div class="wrap page"><div class="page-head"><h1 class="page-title">' + esc(t('writingTitle', 'ponderings and hot takes')) + '</h1><p class="page-lede">' + esc(t('writingLede', 'essays, opinions, and notes to self about building things and getting a little better.')) + '</p></div>' +
        chips(filterList('writing', posts.map((p) => p.data.topic))) +
        (posts.length ? '<div class="grid3 filterable">' + posts.map(postCard).join('') + '</div>' + emptyNote : comingSoon('writing')) + '</div>';
      return page({ title: 'ponderings and hot takes', desc: 'Essays and notes by ' + site.name + '.', path: '/writing/', current: 'writing', body });
    },

    postPage(p, all) {
      const d = p.data;
      const i = all.indexOf(p);
      const next = [all[(i + 1) % all.length], all[(i + 2) % all.length]].filter((x, n, a) => x !== p && a.indexOf(x) === n);
      const body = '<div class="wrap page">' +
        '<a class="crumb" href="' + u('/writing/') + '">← all writing</a>' +
        '<div class="post-head"><h1 class="post-h1">' + esc(d.title) + '</h1><div class="byline-row">' + (d.topic ? '<span class="topic">' + esc(d.topic) + '</span>' : '') + '<span>by ' + esc(site.name) + '</span><span>' + esc(fmtDate(d.date)) + '</span><span>' + esc(d.readtime) + '</span></div></div>' +
        (photosOf(d).length ? gallery(d, d.title) : '<div class="post-hero" data-tint="' + esc(d.tint || 'sage') + '" aria-hidden="true">' + artPair(d) + '</div>') +
        '<div class="article">' + (d.dek ? '<p class="lead">' + esc(d.dek) + '</p>' : '') + md(p.body) +
        '<p class="note" style="font-size:15px;color:var(--muted);margin-top:40px">thanks for reading. say hello at <a href="mailto:' + esc(site.email) + '">' + esc(site.email) + '</a>.</p></div>' +
        (next.length ? '<h2 class="more-head">keep reading</h2><div class="grid2">' + next.map(postCard).join('') + '</div>' : '') +
        '</div>' + this.contact();
      const ph = photosOf(d);
      return page({ title: d.title, desc: d.dek, path: '/writing/' + p.slug + '/', current: 'writing', body, withLightbox: ph.length > 0,
        image: (ph.length ? ph[0].src : art(d.art_flowers || 'flower-zinnia-coral')).replace(base, '') });
    },

    favouritesPage({ favs }) {
      const body = '<div class="wrap page"><div class="page-head"><h1 class="page-title">' + esc(t('favouritesTitle', 'favourite things')) + '</h1><p class="page-lede">' + esc(t('favouritesLede', 'lists i keep updating. products first, everything else after.')) + '</p></div>' +
        '<div class="fav-grid">' + favs.map((f) => favCard(f, 'h2')).join('') + '</div></div>';
      return page({ title: 'favourite things', desc: 'Lists of favourite things by ' + site.name + '.', path: '/favourites/', current: 'favourites', body });
    },

    snapshotsPage({ photos }) {
      const body = '<div class="wrap page"><div class="page-head"><h1 class="page-title">' + esc(t('snapshotsTitle', 'snapshots')) + '</h1><p class="page-lede">' + esc(t('snapshotsLede', 'a photo dump from the trail, the desk, and everywhere in between.')) + '</p></div>' +
        chips(filterList('snapshots', photos.map((p) => p.data.category))) +
        // data-shuffle: the photos are put in a random order on every visit (see static/js/site.js)
        (photos.length ? '<div class="masonry filterable" data-shuffle>' + photos.map(snap).join('') + '</div>' + emptyNote : comingSoon('snapshots')) + '</div>';
      return page({ title: 'snapshots', desc: 'Photos by ' + site.name + '.', path: '/snapshots/', current: 'snapshots', body, withLightbox: true });
    },

    notFound() {
      const body = '<div class="wrap page"><h1 class="page-title">lost?</h1><p class="page-lede" style="margin:24px 0">that page isn\'t here, but there\'s plenty more.</p><a class="btn btn-fill" href="' + u('/') + '">back home</a></div>';
      return page({ title: 'not found', desc: 'Page not found.', path: '/404.html', body });
    }
  };
}

module.exports = { makeRenderer, esc, fmtDate, plain, md, sections };
