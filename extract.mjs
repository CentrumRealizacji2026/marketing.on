#!/usr/bin/env node
// Website Template Extractor
// Użycie:  node extract.mjs <URL>
//
// Wklej link do dowolnej strony -> narzędzie generuje "pakiet szablonu"
// w output/<domena>/:
//   desktop.png     - pełny zrzut układu (desktop)
//   mobile.png      - pełny zrzut układu (mobile)
//   design-notes.md - kolory, fonty, struktura sekcji, komponenty
//   skeleton.html   - szkielet DOM (struktura + klasy, treść na placeholderach)
//   raw.html        - surowy render (pomocniczo)
//
// Ten pakiet wklejasz/wrzucasz do Claude Code jako WZÓR układu dla nowej strony.

import { chromium } from 'playwright';
import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { collectDesignTokens, renderDesignNotes } from './lib/design-tokens.mjs';
import { buildSkeleton } from './lib/skeleton.mjs';

// W tym środowisku pre-instalowana wersja Chromium może nie zgadzać się z build,
// którego szuka zainstalowany playwright. Wskaż istniejący plik wykonywalny,
// jeśli go znajdziemy; w innym wypadku pozwól playwright użyć domyślnego.
async function resolveChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const entries = await readdir(base);
    const dirs = entries.filter((e) => /^chromium-\d+$/.test(e)).sort();
    for (const d of dirs.reverse()) {
      const exe = join(base, d, 'chrome-linux', 'chrome');
      try {
        await access(exe);
        return exe;
      } catch {
        // spróbuj kolejny
      }
    }
  } catch {
    // brak katalogu — użyj domyślnego playwright
  }
  return undefined;
}

function slugFromUrl(u) {
  try {
    const { hostname, pathname } = new URL(u);
    const path = pathname.replace(/\/+$/, '').replace(/[^a-z0-9]+/gi, '-');
    return (hostname + path).replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '');
  } catch {
    return 'site';
  }
}

// Przewiń do końca strony, by wywołać lazy-loading zanim zrobimy full-page screenshot.
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
  await page.waitForTimeout(500);
}

async function main() {
  const url = process.argv[2];
  if (!url || !/^https?:\/\//i.test(url)) {
    console.error('Użycie: node extract.mjs <URL>');
    console.error('Przykład: node extract.mjs https://stripe.com');
    process.exit(1);
  }

  const slug = slugFromUrl(url);
  const outDir = join('output', slug);
  await mkdir(outDir, { recursive: true });

  console.log(`> Otwieram: ${url}`);
  const executablePath = await resolveChromiumPath();
  // Ruch wychodzący przechodzi przez proxy środowiska (jeśli ustawione).
  const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy;
  const launchOpts = { headless: true, executablePath };
  if (proxyServer) {
    launchOpts.proxy = { server: proxyServer, bypass: 'localhost,127.0.0.1' };
  }
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    // Niektóre strony nigdy nie osiągają "networkidle" — spróbuj łagodniej.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await autoScroll(page);

  // 1) Zrzut desktop
  console.log('> Zrzut desktop...');
  await page.screenshot({ path: join(outDir, 'desktop.png'), fullPage: true });

  // 2) Surowy HTML (pomocniczo)
  const raw = await page.content();
  await writeFile(join(outDir, 'raw.html'), raw, 'utf8');

  // 3) Design tokeny -> design-notes.md
  console.log('> Ekstrakcja design tokenów...');
  const tokens = await collectDesignTokens(page);
  await writeFile(join(outDir, 'design-notes.md'), renderDesignNotes(tokens), 'utf8');

  // 4) Szkielet HTML
  console.log('> Budowa szkieletu HTML...');
  const skeleton = await buildSkeleton(page);
  await writeFile(join(outDir, 'skeleton.html'), skeleton, 'utf8');

  // 5) Zrzut mobile
  console.log('> Zrzut mobile...');
  await page.setViewportSize({ width: 390, height: 844 });
  await autoScroll(page);
  await page.screenshot({ path: join(outDir, 'mobile.png'), fullPage: true });

  await browser.close();

  console.log('\n✓ Gotowe. Pakiet szablonu:');
  console.log(`  ${join(outDir, 'desktop.png')}`);
  console.log(`  ${join(outDir, 'mobile.png')}`);
  console.log(`  ${join(outDir, 'design-notes.md')}`);
  console.log(`  ${join(outDir, 'skeleton.html')}`);
  console.log(`  ${join(outDir, 'raw.html')}`);
  console.log('\nCo dalej: otwórz nową sesję Claude Code, wrzuć desktop.png + design-notes.md');
  console.log('i napisz: „Zbuduj stronę o [MOJA TEMATYKA] używając tego układu i stylu".');
}

main().catch((err) => {
  console.error('Błąd:', err.message);
  process.exit(1);
});
