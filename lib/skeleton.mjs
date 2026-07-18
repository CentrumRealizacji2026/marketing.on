// Buduje "szkielet" strony: zachowuje strukturę DOM + klasy CSS, ale zamienia
// oryginalną treść (teksty, obrazy) na placeholdery. Wynik to czysty SZABLON
// układu — bez plagiatu treści, gotowy jako referencja layoutu.

export async function buildSkeleton(page) {
  return page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true);

    // Usuń rzeczy nieistotne dla układu
    clone
      .querySelectorAll('script, noscript, style, link[rel="stylesheet"], meta, iframe')
      .forEach((n) => n.remove());

    // Zamień węzły tekstowe na placeholdery zależne od kontekstu
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const raw = child.textContent.trim();
          if (!raw) continue;
          const tag = node.tagName ? node.tagName.toLowerCase() : '';
          let ph = '[TEKST]';
          if (/^h[1-6]$/.test(tag)) ph = '[NAGŁÓWEK]';
          else if (tag === 'a') ph = '[LINK]';
          else if (tag === 'button') ph = '[PRZYCISK]';
          else if (tag === 'li') ph = '[POZYCJA LISTY]';
          else if (raw.length > 60) ph = '[AKAPIT TEKSTU — lorem ipsum...]';
          child.textContent = ph;
        } else if (child.nodeType === 1) {
          walk(child);
        }
      }
    };
    const body = clone.querySelector('body');
    if (body) walk(body);

    // Obrazy -> placeholder
    clone.querySelectorAll('img').forEach((img) => {
      const w = img.getAttribute('width') || '';
      const h = img.getAttribute('height') || '';
      img.setAttribute('src', 'https://placehold.co/600x400?text=IMG');
      img.setAttribute('alt', '[OBRAZ]');
      if (w) img.setAttribute('width', w);
      if (h) img.setAttribute('height', h);
    });

    // Wyczyść atrybuty, które ujawniają treść/źródło, ale zostaw class/id/struktura
    clone.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name;
        if (
          name.startsWith('data-') ||
          name.startsWith('on') ||
          name === 'style' ||
          name === 'srcset' ||
          name === 'href' ||
          name === 'aria-label' ||
          name === 'title'
        ) {
          el.removeAttribute(name);
        }
      }
    });

    const head = document.createElement('head');
    head.innerHTML =
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Szablon układu (szkielet)</title>' +
      '<!-- To jest SZKIELET układu: struktura + klasy zachowane, treść = placeholdery. ' +
      'Style oryginału NIE są dołączone celowo — odtwórz je z design-notes.md + zrzutów. -->';

    const bodyHtml = body ? body.outerHTML : '';
    return (
      '<!doctype html>\n<html>\n' +
      head.outerHTML +
      '\n' +
      bodyHtml +
      '\n</html>\n'
    );
  });
}
