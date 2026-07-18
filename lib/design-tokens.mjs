// Zbiera "design tokeny" ze zrenderowanej strony: paleta kolorów, fonty,
// struktura sekcji, podstawowe komponenty. Wszystko liczone w kontekście
// przeglądarki (page.evaluate) na podstawie getComputedStyle.

export async function collectDesignTokens(page) {
  return page.evaluate(() => {
    const rgbToHex = (color) => {
      if (!color) return null;
      const m = color.match(/rgba?\(([^)]+)\)/);
      if (!m) return color;
      const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
      const [r, g, b, a = 1] = parts;
      if (a === 0) return null; // przezroczyste — pomijamy
      const hex = (n) => n.toString(16).padStart(2, '0');
      return `#${hex(Math.round(r))}${hex(Math.round(g))}${hex(Math.round(b))}`;
    };

    // --- Kolory: policz częstość występowania koloru tła i tekstu ---
    const bgCount = new Map();
    const fgCount = new Map();
    const bump = (map, key) => {
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    };

    const els = Array.from(document.querySelectorAll('body *')).slice(0, 4000);
    for (const el of els) {
      const cs = getComputedStyle(el);
      bump(bgCount, rgbToHex(cs.backgroundColor));
      bump(fgCount, rgbToHex(cs.color));
    }
    const top = (map, n) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([hex, count]) => ({ hex, count }));

    // --- Fonty ---
    const fontFamilies = new Set();
    const fontOf = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontFamily : null;
    };
    for (const el of els) fontFamilies.add(getComputedStyle(el).fontFamily);

    // --- Typografia nagłówków ---
    const headings = ['h1', 'h2', 'h3'].map((tag) => {
      const el = document.querySelector(tag);
      if (!el) return { tag, present: false };
      const cs = getComputedStyle(el);
      return {
        tag,
        present: true,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
        color: rgbToHex(cs.color),
        sample: (el.textContent || '').trim().slice(0, 80),
      };
    });

    // --- Struktura sekcji: górny poziom układu strony ---
    const roots = Array.from(
      document.querySelectorAll(
        'body > *, main > *, header, nav, footer, section'
      )
    );
    const seen = new Set();
    const sections = [];
    for (const el of roots) {
      if (seen.has(el)) continue;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      if (rect.height < 40) continue; // pomiń drobne elementy
      const cs = getComputedStyle(el);
      const heading = el.querySelector('h1, h2, h3');
      sections.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || null,
        classes: (el.className || '').toString().slice(0, 120),
        heading: heading ? (heading.textContent || '').trim().slice(0, 80) : null,
        heightPx: Math.round(rect.height),
        display: cs.display,
        columns:
          cs.display.includes('grid') || cs.display.includes('flex')
            ? el.children.length
            : null,
        backgroundColor: rgbToHex(cs.backgroundColor),
      });
    }

    // --- Komponenty ---
    const components = {
      buttons: document.querySelectorAll('button, .btn, [class*="button"], a[class*="btn"]').length,
      images: document.querySelectorAll('img').length,
      forms: document.querySelectorAll('form').length,
      inputs: document.querySelectorAll('input, textarea, select').length,
      navLinks: document.querySelectorAll('nav a').length,
      cards: document.querySelectorAll('[class*="card"]').length,
      icons: document.querySelectorAll('svg').length,
    };

    // Przykładowy styl przycisku
    const btn = document.querySelector('button, .btn, a[class*="btn"]');
    const buttonStyle = btn
      ? (() => {
          const cs = getComputedStyle(btn);
          return {
            backgroundColor: rgbToHex(cs.backgroundColor),
            color: rgbToHex(cs.color),
            borderRadius: cs.borderRadius,
            padding: cs.padding,
            fontWeight: cs.fontWeight,
          };
        })()
      : null;

    return {
      url: location.href,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      colors: {
        backgrounds: top(bgCount, 8),
        text: top(fgCount, 6),
      },
      fonts: {
        body: fontOf('body'),
        headings: fontOf('h1') || fontOf('h2'),
        all: Array.from(fontFamilies).slice(0, 12),
      },
      headings,
      buttonStyle,
      components,
      sections,
    };
  });
}

// Renderuje zebrane tokeny do czytelnego pliku Markdown.
export function renderDesignNotes(tokens) {
  const L = [];
  L.push(`# Design notes — szablon do odtworzenia`);
  L.push('');
  L.push(`> Źródło: ${tokens.url}`);
  L.push(`> Tytuł oryginału: ${tokens.title || '(brak)'}`);
  L.push('');
  L.push(`Ten plik opisuje UKŁAD i STYL strony-wzoru. Wklej go razem z \`desktop.png\``);
  L.push(`do Claude Code i poproś o zbudowanie NOWEJ strony (inna tematyka) w tym układzie.`);
  L.push('');

  L.push(`## Paleta kolorów`);
  L.push('');
  L.push(`**Tła (najczęstsze):**`);
  for (const c of tokens.colors.backgrounds) L.push(`- \`${c.hex}\``);
  L.push('');
  L.push(`**Kolory tekstu:**`);
  for (const c of tokens.colors.text) L.push(`- \`${c.hex}\``);
  L.push('');

  L.push(`## Typografia`);
  L.push('');
  L.push(`- Font tekstu (body): \`${tokens.fonts.body}\``);
  L.push(`- Font nagłówków: \`${tokens.fonts.headings}\``);
  L.push('');
  for (const h of tokens.headings) {
    if (!h.present) continue;
    L.push(`- \`${h.tag}\`: ${h.fontSize} / waga ${h.fontWeight} / kolor \`${h.color}\` — np. „${h.sample}"`);
  }
  L.push('');

  if (tokens.buttonStyle) {
    const b = tokens.buttonStyle;
    L.push(`## Styl przycisku (CTA)`);
    L.push('');
    L.push(`- Tło: \`${b.backgroundColor}\`, tekst: \`${b.color}\``);
    L.push(`- Zaokrąglenie: ${b.borderRadius}, padding: ${b.padding}, waga: ${b.fontWeight}`);
    L.push('');
  }

  L.push(`## Komponenty (liczności)`);
  L.push('');
  for (const [k, v] of Object.entries(tokens.components)) {
    L.push(`- ${k}: ${v}`);
  }
  L.push('');

  L.push(`## Struktura sekcji (od góry strony)`);
  L.push('');
  L.push(`Kolejność bloków układu — odtwórz tę samą sekwencję z własną treścią:`);
  L.push('');
  tokens.sections.forEach((s, i) => {
    const cols = s.columns ? `, ${s.columns} kolumn/elem. (${s.display})` : '';
    const bg = s.backgroundColor ? `, tło \`${s.backgroundColor}\`` : '';
    const head = s.heading ? ` — nagłówek: „${s.heading}"` : '';
    L.push(`${i + 1}. \`<${s.tag}>\` ~${s.heightPx}px${cols}${bg}${head}`);
    if (s.classes) L.push(`   - klasy: \`${s.classes}\``);
  });
  L.push('');

  return L.join('\n');
}
