// Generate assets/terminal.svg and assets/stats.svg.
// Pure Node, zero dependencies. SVGs animate with CSS @keyframes only (no JS, no web fonts).
//
//   GITHUB_TOKEN=xxx node scripts/generate.mjs

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { fetchGitHubStats } from './fetch-github.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sec = (n) => `${Math.round(n * 1000) / 1000}s`;
const px = (n) => Math.round(n * 100) / 100;
const minify = (s) => s.replace(/\n\s*/g, '\n').trim() + '\n';

/* ------------------------------------------------------------------ */
/* terminal.svg                                                        */
/* ------------------------------------------------------------------ */

function renderTerminal({ theme: T, font: F, terminal: C }) {
  const W = C.width;
  const cw = F.charWidth;
  const LH = F.lineHeight;
  const padX = 22;
  const barH = 36;
  const firstBaseline = barH + 22 + F.size;
  const baseline = (row) => firstBaseline + row * LH;

  const { user, host, path: cwd } = C.prompt;
  const promptLen = `${user}@${host}:${cwd}$`.length;
  const cmdX = padX + (promptLen + 1) * cw;
  const prompt = (y) =>
    `<text x="${padX}" y="${y}" textLength="${px(promptLen * cw)}" lengthAdjust="spacingAndGlyphs">` +
    `<tspan class="pu">${esc(`${user}@${host}`)}</tspan><tspan>:</tspan>` +
    `<tspan class="pp">${esc(cwd)}</tspan><tspan>$</tspan></text>`;

  const curH = F.size + 4;
  const curY = (y) => px(y - F.size + 1);

  const lineMarkup = (parts) =>
    (Array.isArray(parts) ? parts : [{ text: parts }])
      .map(
        (p) =>
          `<tspan fill="${T[p.color || 'text']}"${p.bold ? ' font-weight="700"' : ''}>${esc(p.text)}</tspan>`
      )
      .join('');

  const css = [];
  const rows = [];
  let t = C.startDelay;
  let row = 0;

  C.session.forEach(({ cmd, output = [] }, k) => {
    const y = baseline(row);
    const n = cmd.length;
    const w = n * cw;
    const typeDur = n * C.typeSpeed;
    const typedAt = t + typeDur;

    css.push(
      `.ty${k}{animation:ty${k} ${sec(typeDur)} steps(${n}) ${sec(t)} both}`,
      `@keyframes ty${k}{to{transform:translateX(${px(w)}px)}}`
    );

    rows.push(`<g class="ln" style="animation-delay:${sec(t)}">
      ${prompt(y)}
      <text x="${px(cmdX)}" y="${y}" class="cmd" textLength="${px(w)}" lengthAdjust="spacingAndGlyphs">${esc(cmd)}</text>
      <g class="ty${k}">
        <rect x="${px(cmdX)}" y="${px(y - F.size - 3)}" width="${px(w + cw + 6)}" height="${LH}" fill="${T.bg}"/>
        <rect class="cur" x="${px(cmdX)}" y="${curY(y)}" width="${px(cw)}" height="${curH}" style="animation-delay:${sec(typedAt + C.outputDelay)}"/>
      </g>
    </g>`);

    t = typedAt + C.outputDelay;
    row++;
    for (const line of output) {
      rows.push(
        `<text class="ln" x="${padX}" y="${baseline(row)}" style="animation-delay:${sec(t)}">${lineMarkup(line)}</text>`
      );
      t += C.outputStagger;
      row++;
    }
    t += C.commandGap;
  });

  // Final idle prompt with a blinking cursor
  const yEnd = baseline(row);
  rows.push(`<g class="ln" style="animation-delay:${sec(t)}">
    ${prompt(yEnd)}
    <rect class="blink" x="${px(cmdX)}" y="${curY(yEnd)}" width="${px(cw)}" height="${curH}" style="animation-delay:${sec(t)}"/>
  </g>`);

  const H = yEnd + 24;

  return minify(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xml:space="preserve">
  <title id="t">${esc(C.title)}</title>
  <desc id="d">${esc(C.session.map((s) => `$ ${s.cmd}`).join(' · '))}</desc>
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.accent}" stop-opacity=".75"/>
      <stop offset=".45" stop-color="${T.border}"/>
      <stop offset="1" stop-color="${T.border}"/>
    </linearGradient>
  </defs>
  <style>
    text{font-family:${F.mono};font-size:${F.size}px;fill:${T.text};white-space:pre}
    .title{fill:${T.muted};font-size:12px}
    .pu{fill:${T.accent};font-weight:700}
    .pp{fill:${T.accentSoft}}
    .cmd{fill:${T.bright}}
    .ln{opacity:0;animation:show .18s ease-out forwards}
    .cur{fill:${T.accent};animation:hide .01s linear forwards}
    .blink{fill:${T.accent};animation:blink 1.1s linear infinite}
    @keyframes show{to{opacity:1}}
    @keyframes hide{to{opacity:0}}
    @keyframes blink{0%,49.9%{opacity:1}50%,100%{opacity:0}}
    ${css.join('\n')}
    @media (prefers-reduced-motion:reduce){
      .ln{animation:none;opacity:1}
      [class^="ty"],.cur{display:none}
    }
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${T.bg}" stroke="url(#edge)"/>
  <path d="M1 ${barH}V10.5A9.5 9.5 0 0 1 10.5 1H${W - 10.5}A9.5 9.5 0 0 1 ${W - 1} 10.5V${barH}Z" fill="${T.panel}"/>
  <line x1="1" y1="${barH + 0.5}" x2="${W - 1}" y2="${barH + 0.5}" stroke="${T.border}"/>
  <circle cx="20" cy="18" r="6" fill="#ff5f57"/>
  <circle cx="40" cy="18" r="6" fill="#febc2e"/>
  <circle cx="60" cy="18" r="6" fill="#28c840"/>
  <text class="title" x="${W / 2}" y="22" text-anchor="middle">${esc(C.title)}</text>
  ${rows.join('\n')}
</svg>`);
}

/* ------------------------------------------------------------------ */
/* stats.svg                                                           */
/* ------------------------------------------------------------------ */

function renderStats({ theme: T, font: F, stats: S, username }, data) {
  const W = S.width;
  const pad = 24;
  const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US'));

  const tiles = [
    ['PUBLIC REPOS', data?.repos],
    ['TOTAL STARS', data?.stars],
    [data?.sinceYear ? `COMMITS · SINCE ${data.sinceYear}` : 'COMMITS', data?.commits],
  ];
  const gap = 16;
  const tileW = (W - pad * 2 - gap * 2) / 3;
  const tileH = 80;
  const tileY = 62;

  const tileMarkup = tiles
    .map(
      ([label, value], i) => `<g transform="translate(${px(pad + i * (tileW + gap))} ${tileY})">
      <g class="fade" style="animation-delay:${sec(0.15 + i * 0.12)}">
        <rect width="${px(tileW)}" height="${tileH}" rx="8" fill="${T.panel}" stroke="${T.border}"/>
        <rect x="0" y="16" width="3" height="${tileH - 32}" rx="1.5" fill="${T.accent}"/>
        <text class="lbl" x="18" y="30">${esc(label)}</text>
        <text class="val" x="18" y="62">${esc(fmt(value))}</text>
      </g>
    </g>`
    )
    .join('\n');

  const langs = data?.languages ?? [];
  const barY = tileY + tileH + 50;
  const barW = W - pad * 2;
  const cols = 3;
  const colW = barW / cols;
  const legendY = barY + 36;
  const legendRows = Math.max(1, Math.ceil(langs.length / cols));
  const H = legendY + (legendRows - 1) * 24 + 26;

  let x = pad;
  const segs = langs
    .map((l, i) => {
      const w = (l.percent / 100) * barW;
      const s = `<rect class="seg" x="${px(x)}" y="${barY}" width="${px(w)}" height="10" fill="${S.palette[i % S.palette.length]}" style="animation-delay:${sec(0.55 + i * 0.12)}"/>`;
      x += w;
      return s;
    })
    .join('\n');

  const legend = langs.length
    ? langs
        .map((l, i) => {
          const lx = pad + (i % cols) * colW;
          const ly = legendY + Math.floor(i / cols) * 24;
          return `<g class="fade" style="animation-delay:${sec(0.8 + i * 0.08)}">
          <circle cx="${px(lx + 5)}" cy="${ly - 4}" r="5" fill="${S.palette[i % S.palette.length]}"/>
          <text class="lang" x="${px(lx + 16)}" y="${ly}">${esc(l.name)}<tspan class="pct">  ${l.percent.toFixed(1)}%</tspan></text>
        </g>`;
        })
        .join('\n')
    : `<text class="lang pct" x="${pad}" y="${legendY}">No language data yet</text>`;

  return minify(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xml:space="preserve">
  <title id="t">GitHub stats for ${esc(username)}</title>
  <desc id="d">Repos ${fmt(data?.repos)}, stars ${fmt(data?.stars)}, commits ${fmt(data?.commits)}. Top languages: ${esc(langs.map((l) => `${l.name} ${l.percent.toFixed(1)}%`).join(', ') || 'n/a')}</desc>
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.accent}" stop-opacity=".75"/>
      <stop offset=".45" stop-color="${T.border}"/>
      <stop offset="1" stop-color="${T.border}"/>
    </linearGradient>
    <clipPath id="bar"><rect x="${pad}" y="${barY}" width="${barW}" height="10" rx="5"/></clipPath>
  </defs>
  <style>
    text{font-family:${F.sans};fill:${T.text};white-space:pre}
    .h{font-family:${F.mono};font-size:14px;fill:${T.bright}}
    .a{fill:${T.accent};font-weight:700}
    .m{fill:${T.muted}}
    .sub{font-family:${F.mono};font-size:12px;fill:${T.muted}}
    .lbl{font-size:11px;font-weight:600;letter-spacing:.08em;fill:${T.muted}}
    .val{font-size:28px;font-weight:700;fill:${T.bright}}
    .sec{font-size:11px;font-weight:600;letter-spacing:.08em;fill:${T.muted}}
    .lang{font-size:13px;fill:${T.text}}
    .pct{fill:${T.muted}}
    .fade{opacity:0;animation:up .6s cubic-bezier(.2,.7,.2,1) forwards}
    .seg{transform-box:fill-box;transform-origin:left center;transform:scaleX(0);animation:grow .6s ease-out forwards}
    @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes grow{to{transform:scaleX(1)}}
    @media (prefers-reduced-motion:reduce){.fade,.seg{animation:none;opacity:1;transform:none}}
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${T.bg}" stroke="url(#edge)"/>
  <text class="h" x="${pad}" y="38"><tspan class="a">$</tspan> gh stats <tspan class="m">--user</tspan> ${esc(username)}</text>
  <text class="sub" x="${W - pad}" y="38" text-anchor="end">github.com/${esc(username)}</text>
  ${tileMarkup}
  <text class="sec" x="${pad}" y="${barY - 14}">TOP LANGUAGES</text>
  <rect x="${pad}" y="${barY}" width="${barW}" height="10" rx="5" fill="${T.panel}"/>
  <g clip-path="url(#bar)">${segs}</g>
  ${legend}
</svg>`);
}

/* ------------------------------------------------------------------ */
/* stack.svg                                                           */
/* ------------------------------------------------------------------ */

function renderStack({ theme: T, font: F, stack: ST }) {
  const W = ST.width;
  const pad = 24;
  let curY = 62;
  const sections = [];
  let animIdx = 0;

  ST.categories.forEach((cat) => {
    const titleY = curY + 12;
    curY += 28;

    let rowX = pad;
    const pillH = 34;
    const pills = [];

    cat.skills.forEach((skill) => {
      // 估算字寬 (字元數 * 8 + padding)
      const textW = Math.round(skill.length * 8.2);
      const pillW = textW + 28;

      if (rowX + pillW > W - pad) {
        rowX = pad;
        curY += pillH + 10;
      }

      const delay = sec(0.1 + animIdx * 0.05);
      animIdx++;

      pills.push(`
      <g class="pill" style="animation-delay:${delay}">
        <rect x="${px(rowX)}" y="${px(curY)}" width="${px(pillW)}" height="${pillH}" rx="8" class="pill-bg"/>
        <circle cx="${px(rowX + 14)}" cy="${px(curY + pillH / 2)}" r="3" fill="${T.accent}"/>
        <text class="pill-txt" x="${px(rowX + 24)}" y="${px(curY + 21)}">${esc(skill)}</text>
      </g>`);

      rowX += pillW + 10;
    });

    curY += pillH + 24;

    sections.push(`
    <g>
      <text class="cat-title" x="${pad}" y="${titleY}">${esc(cat.name)}</text>
      ${pills.join('\n')}
    </g>`);
  });

  const H = curY + 6;

  return minify(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xml:space="preserve">
  <title id="t">Tech Stack</title>
  <desc id="d">Interactive tech stack pills categorized by domain</desc>
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.accent}" stop-opacity=".75"/>
      <stop offset=".45" stop-color="${T.border}"/>
      <stop offset="1" stop-color="${T.border}"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${T.accentSoft}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <style>
    text{font-family:${F.sans};fill:${T.text};white-space:pre}
    .h{font-family:${F.mono};font-size:14px;fill:${T.bright}}
    .a{fill:${T.accent};font-weight:700}
    .m{fill:${T.muted}}
    .sub{font-family:${F.mono};font-size:12px;fill:${T.muted}}
    .cat-title{font-family:${F.mono};font-size:11px;font-weight:600;letter-spacing:.08em;fill:${T.accentSoft}}
    .pill-bg{fill:${T.panel};stroke:${T.border};stroke-width:1;transition:all .2s ease}
    .pill-txt{font-size:13px;font-weight:500;fill:${T.bright}}
    .pill{opacity:0;animation:pill-in .5s cubic-bezier(.2,.7,.2,1) forwards}
    .pill:hover .pill-bg{fill:url(#glow);stroke:${T.accent};stroke-width:1.5;filter:drop-shadow(0 0 6px ${T.accent}88)}
    .pill:hover .pill-txt{fill:#ffffff}
    @keyframes pill-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){.pill{animation:none;opacity:1}}
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${T.bg}" stroke="url(#edge)"/>
  <text class="h" x="${pad}" y="38"><tspan class="a">$</tspan> tree <tspan class="m">--depth=1</tspan> stack/</text>
  <text class="sub" x="${W - pad}" y="38" text-anchor="end">skills &amp; ecosystem</text>
  ${sections.join('\n')}
</svg>`);
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

const exists = (p) =>
  access(p).then(
    () => true,
    () => false
  );

async function main() {
  await mkdir(ASSETS, { recursive: true });

  const terminalPath = path.join(ASSETS, 'terminal.svg');
  await writeFile(terminalPath, renderTerminal(config));
  console.log('✔ assets/terminal.svg');

  const stackPath = path.join(ASSETS, 'stack.svg');
  await writeFile(stackPath, renderStack(config));
  console.log('✔ assets/stack.svg');

  const statsPath = path.join(ASSETS, 'stats.svg');
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    if (await exists(statsPath)) {
      console.warn('⚠ No GITHUB_TOKEN — keeping existing assets/stats.svg');
    } else {
      await writeFile(statsPath, renderStats(config, null));
      console.warn('⚠ No GITHUB_TOKEN — wrote placeholder assets/stats.svg');
    }
    return;
  }

  try {
    const data = await fetchGitHubStats({
      username: config.username,
      token,
      excludeRepos: config.stats.excludeRepos,
      excludeLanguages: config.stats.excludeLanguages,
      topLanguages: config.stats.topLanguages,
    });
    await writeFile(statsPath, renderStats(config, data));
    console.log('✔ assets/stats.svg', JSON.stringify({ ...data, languages: data.languages.map((l) => l.name) }));
  } catch (err) {
    console.error('✖ Failed to fetch GitHub stats — existing stats.svg left untouched.\n', err.message);
    process.exitCode = 1;
  }
}

main();
