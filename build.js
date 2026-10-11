// Builds the writing archive into site/.
// Run with: npm run build
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'site');
const SITE_NAME = 'Jillian’s Writing Archive';

// Each category is a folder in content/ and a tab in the nav.
const CATEGORIES = [
  { key: 'essays', label: 'Essays', empty: 'No essays yet.' },
  { key: 'personal', label: 'Personal', empty: 'Nothing here yet. Personal writing is coming soon.' },
];

const REFERENCES_HEADING = /^\s*(Works Cited|Bibliography|References)\s*$/im;

// ---------- content ----------

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (value.startsWith('"')) value = JSON.parse(value);
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    data[key] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

// Google Docs exports carry comment anchors like \[GC1\] and blank
// non-breaking-space lines; strip them so they don't render. Leading
// indentation is dropped too, or markdown would treat it as a code block.
function cleanMarkdown(md) {
  return md
    .replace(/\\\[GC\d+\\\]\s?/g, '')
    .split(/\r?\n/)
    .filter((line) => line.replace(/[\s ]/g, '') !== '' || line === '')
    .map((line) => line.replace(/^[ \t]+/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function renderBody(md) {
  const cleaned = cleanMarkdown(md);
  const match = cleaned.match(REFERENCES_HEADING);
  if (!match) return { body: marked.parse(cleaned), references: '' };

  const body = cleaned.slice(0, match.index);
  // Entries separated by hard line breaks become their own paragraphs.
  const refs = cleaned.slice(match.index + match[0].length).replace(/ {2,}\n/g, '\n\n');
  return {
    body: marked.parse(body),
    referencesHeading: match[1],
    references: marked.parse(refs),
  };
}

function loadCategory(key) {
  const dir = path.join(ROOT, 'content', key);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data, body } = parseFrontMatter(fs.readFileSync(path.join(dir, file), 'utf8'));
      return { ...data, slug: file.replace(/\.md$/, ''), category: key, ...renderBody(body) };
    })
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
}

// ---------- templates ----------

const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function layout({ title, activeTab, depth, sidebar, main }) {
  const up = '../'.repeat(depth);
  const tabs = CATEGORIES.map(
    (c) =>
      `<a class="tab${c.key === activeTab ? ' is-active' : ''}" href="${up}${c.key}.html"${
        c.key === activeTab ? ' aria-current="page"' : ''
      }>${c.label}</a>`
  ).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cousine:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}assets/css/style.css">
  <script>
    // Apply dark mode before first paint so pages don't flash light.
    try {
      if (localStorage.getItem('lamp-switched') === 'true') document.documentElement.dataset.theme = 'dark';
    } catch (_) {}
  </script>
  <script src="${up}assets/js/lamp.js" defer></script>
</head>
<body>
  <div class="page">
    <header class="masthead">
      <button class="lamp" type="button" aria-pressed="false" aria-label="Toggle the lamp">
        <img class="lamp-img lamp-on" src="${up}assets/img/lamp-invert.svg" alt="">
        <img class="lamp-img lamp-off" src="${up}assets/img/lamp-normal.svg" alt="">
      </button>
      <p class="site-name">${SITE_NAME}</p>
      <nav class="tabs" aria-label="Categories">
        ${tabs}
      </nav>
    </header>

    <aside class="sidebar">
${sidebar}
    </aside>

    <main class="content">
${main}
    </main>
  </div>
</body>
</html>
`;
}

function shareLinks(piece) {
  // Share URLs need the live address; until the site is deployed they
  // fall back to whatever page the reader is on (set in lamp.js).
  return `      <div class="share" data-share-title="${esc(piece.title)}">
        <a class="share-link" data-share="facebook" href="#" aria-label="Share on Facebook" target="_blank" rel="noopener">f</a>
        <a class="share-link" data-share="x" href="#" aria-label="Share on X" target="_blank" rel="noopener">X</a>
        <button class="share-link" data-share="copy" type="button" aria-label="Copy link">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>
        </button>
        <a class="share-link" data-share="email" href="#" aria-label="Share by email">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/></svg>
        </a>
        <span class="share-status" role="status"></span>
      </div>`;
}

function piecePage(piece, label) {
  const sidebar = `      <p>${label}</p>
      ${piece.year ? `<p>${esc(piece.year)}</p>` : ''}
      ${piece.description ? `<p>${esc(piece.description)}</p>` : ''}
      <p class="archive-note">This ${label === 'Essays' ? 'essay' : 'piece'} is part of the writing archive.<br>
        <a href="../${piece.category}.html">View all writing</a></p>
${shareLinks(piece)}`;

  const main = `      <article class="piece">
        <h1 class="piece-title">${esc(piece.title)}</h1>
        ${piece.prompt ? `<p class="piece-prompt">${esc(piece.prompt)}</p>` : ''}
        <div class="prose">
${piece.body}
        </div>
        ${
          piece.references
            ? `<section class="references">
          <h2>${piece.referencesHeading}</h2>
${piece.references}
        </section>`
            : ''
        }
      </article>`;

  return layout({ title: `${piece.title} — ${SITE_NAME}`, activeTab: piece.category, depth: 1, sidebar, main });
}

function indexPage(category, pieces) {
  const sidebar = `      <p>${category.label}</p>
      <p>${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}</p>`;

  const list = pieces.length
    ? `<ol class="index-list">
${pieces
  .map(
    (p) => `          <li>
            <a href="${category.key}/${p.slug}.html">
              <span class="index-title">${esc(p.title)}</span>
              <span class="index-meta">${[p.year, p.description].filter(Boolean).map(esc).join(' · ')}</span>
            </a>
          </li>`
  )
  .join('\n')}
        </ol>`
    : `<p class="empty">${category.empty}</p>`;

  const main = `      <h1 class="piece-title">${category.label}</h1>
        ${list}`;

  return layout({ title: `${category.label} — ${SITE_NAME}`, activeTab: category.key, depth: 0, sidebar, main });
}

// ---------- write ----------

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(src, dest) : fs.copyFileSync(src, dest);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));

let count = 0;
for (const category of CATEGORIES) {
  const pieces = loadCategory(category.key);
  fs.writeFileSync(path.join(OUT, `${category.key}.html`), indexPage(category, pieces));
  if (pieces.length) fs.mkdirSync(path.join(OUT, category.key), { recursive: true });
  for (const piece of pieces) {
    fs.writeFileSync(path.join(OUT, category.key, `${piece.slug}.html`), piecePage(piece, category.label));
    count++;
  }
}

// Placeholder until the landing page exists.
fs.writeFileSync(
  path.join(OUT, 'index.html'),
  `<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=essays.html"><title>${SITE_NAME}</title><a href="essays.html">Enter the archive</a>\n`
);

console.log(`Built ${count} pieces into site/`);
