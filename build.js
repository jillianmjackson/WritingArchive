// Builds the writing archive into site/.
// Run with: npm run build
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'site');
const SITE_NAME = 'jillianis. writing';

// Each category is a folder in content/ and a tab in the nav.
const CATEGORIES = [
  { key: 'essays', label: 'Essays', empty: 'No essays yet.' },
  { key: 'creative', label: 'Creative', empty: 'Nothing here yet. Creative writing is coming soon.' },
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

// Wrap quotations of 6+ words in a highlight span. A quote may contain inline
// tags like <em> but never runs across paragraphs.
function highlightQuotes(html) {
  return html.replace(/“((?:(?!<\/?p[\s>])[^”])+)”/g, (match, inner) =>
    inner.replace(/<[^>]+>/g, '').trim().split(/\s+/).length >= 6 ? `<span class="quote">${match}</span>` : match
  );
}

function loadCategory(key) {
  const dir = path.join(ROOT, 'content', key);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data, body } = parseFrontMatter(fs.readFileSync(path.join(dir, file), 'utf8'));
      const rendered = renderBody(body);
      rendered.body = highlightQuotes(rendered.body);
      return { ...data, slug: file.replace(/\.md$/, ''), category: key, ...rendered };
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
  <link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Old+Standard+TT:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}assets/css/style.css">
  <link rel="icon" type="image/svg+xml" href="${up}assets/img/favicon-light.svg">
  <script>
    // Apply dark mode before first paint so pages don't flash light.
    try {
      if (localStorage.getItem('lamp-switched') === 'true') {
        document.documentElement.dataset.theme = 'dark';
        const icon = document.querySelector('link[rel="icon"]');
        icon.href = icon.href.replace('favicon-light', 'favicon-dark');
      }
    } catch (_) {}
  </script>
  <script src="${up}assets/js/lamp.js" defer></script>
</head>
<body>
  <!-- Ink filter for titles: roughened, slightly spread edges and uneven ink,
       like letterpress on cheap paper. Applied in CSS via filter: url(#ink). -->
  <svg class="defs" aria-hidden="true">
    <filter id="ink" x="-5%" y="-10%" width="110%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="grain"/>
      <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feGaussianBlur in="rough" stdDeviation="0.5" result="soft"/>
      <feComponentTransfer in="soft" result="bled"><feFuncA type="linear" slope="1.8" intercept="-0.25"/></feComponentTransfer>
      <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="2" seed="9" result="patches"/>
      <feColorMatrix in="patches" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.15" result="coverage"/>
      <feComposite in="bled" in2="coverage" operator="in"/>
    </filter>
  </svg>
  <div class="page">
    <div class="rail">
    <header class="masthead">
      <button class="lamp" type="button" aria-pressed="false" aria-label="Toggle the lamp">
        <img class="lamp-img" src="${up}assets/img/lamp-normal.svg" alt="">
      </button>
      <p class="site-name">${SITE_NAME}</p>
      <nav class="tabs" aria-label="Categories">
        ${tabs}
      </nav>
    </header>

    <aside class="sidebar">
${sidebar}
    </aside>
    </div>

    <main class="content">
${main}
    </main>
  </div>
</body>
</html>
`;
}

function piecePage(piece, label) {
  const sidebar = `      <p>${label}</p>
      ${piece.year ? `<p>${esc(piece.year)}</p>` : ''}
      ${piece.description ? `<p>${esc(piece.description)}</p>` : ''}
      <p class="archive-note">This ${label === 'Essays' ? 'essay' : 'piece'} is part of the writing archive.<br>
        <a href="../${piece.category}.html">View all writing</a></p>`;

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
  const page = indexPage(category, pieces);
  fs.writeFileSync(path.join(OUT, `${category.key}.html`), page);
  // The first category doubles as the home page.
  if (category === CATEGORIES[0]) fs.writeFileSync(path.join(OUT, 'index.html'), page);
  if (pieces.length) fs.mkdirSync(path.join(OUT, category.key), { recursive: true });
  for (const piece of pieces) {
    fs.writeFileSync(path.join(OUT, category.key, `${piece.slug}.html`), piecePage(piece, category.label));
    count++;
  }
}

console.log(`Built ${count} pieces into site/`);
