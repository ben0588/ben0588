// Central configuration for the dynamic profile README.
// Everything visual / textual lives here so generate.mjs stays logic-only.

export const config = {
  username: process.env.GITHUB_USER || 'ben0588',

  theme: {
    bg: '#0d1117',
    panel: '#161b22',
    border: '#30363d',
    accent: '#b713ff',
    accentSoft: '#d68bff',
    text: '#c9d1d9',
    muted: '#8b949e',
    bright: '#f0f6fc',
  },

  font: {
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
    size: 14,
    charWidth: 8.4, // ≈ 0.6em, typical monospace advance
    lineHeight: 22,
  },

  terminal: {
    width: 760,
    title: 'ben0588@github: ~',
    prompt: { user: 'ben0588', host: 'github', path: '~' },
    // timing (seconds)
    startDelay: 0.6,
    typeSpeed: 0.07, // per character
    outputDelay: 0.3, // after a command finishes typing
    outputStagger: 0.14, // between output lines
    commandGap: 0.7, // after the last output line
    // Output line: a string, or an array of { text, color?, bold? } (color = theme key)
    session: [
      {
        cmd: 'whoami',
        output: [
          [
            { text: 'Ben', color: 'bright', bold: true },
            { text: ' · Frontend Engineer · React / Next.js · 2+ yrs', color: 'text' },
          ],
        ],
      },
      {
        cmd: 'cat focus.txt',
        output: [
          [{ text: '▸ ', color: 'accent' }, { text: 'Next.js App Router architecture in practice' }],
          [{ text: '▸ ', color: 'accent' }, { text: 'Enterprise back-office systems (Laravel / Vite / Pure JS)' }],
          [{ text: '▸ ', color: 'accent' }, { text: 'Learning: Next.js 16 · TypeScript · web performance' }],
        ],
      },
      {
        cmd: 'ls stack/',
        output: [
          ['react/', 'next.js/', 'typescript/', 'tailwind/', 'node/', 'express/', 'laravel/', 'vite/'].flatMap(
            (d, i, arr) => [
              { text: d, color: 'accentSoft', bold: true },
              ...(i < arr.length - 1 ? [{ text: '  ' }] : []),
            ]
          ),
        ],
      },
      {
        cmd: './contact.sh',
        output: [
          [{ text: '✓ web    ', color: 'accent' }, { text: 'nextjs-personal-site-pi.vercel.app' }],
          [{ text: '✓ mail   ', color: 'accent' }, { text: 'energy9527z@gmail.com' }],
          [{ text: '✓ github ', color: 'accent' }, { text: 'github.com/ben0588' }],
        ],
      },
    ],
  },

  stats: {
    width: 760,
    topLanguages: 6,
    excludeLanguages: [], // e.g. ['HTML', 'SCSS']
    excludeRepos: [], // repo names to ignore for stars / languages
    palette: ['#b713ff', '#8a5cff', '#d68bff', '#6e40c9', '#e8c4ff', '#4c2a85'],
  },

  stack: {
    width: 760,
    categories: [
      {
        name: 'FRONTEND',
        skills: ['React', 'Next.js', 'JavaScript', 'TypeScript', 'Tailwind CSS'],
      },
      {
        name: 'BACKEND',
        skills: ['Node.js', 'Express.js', 'Laravel'],
      },
      {
        name: 'TOOLING & DEPLOY',
        skills: ['Vite', 'Git', 'Vercel'],
      },
    ],
  },
};
