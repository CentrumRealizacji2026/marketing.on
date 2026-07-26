/**
 * Generuje ikony PWA z jednego glifu. Uruchom po zmianie znaku:
 *   node scripts/make-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../public/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Glif kokpitu: układ kafelków w kolorach serii, na ciemnym tle aplikacji.
const glyph = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0d0d0d"/>
  <g transform="translate(${pad}, ${pad}) scale(${(512 - pad * 2) / 512})">
    <rect x="96"  y="96"  width="146" height="146" rx="28" fill="#3987e5"/>
    <rect x="270" y="96"  width="146" height="146" rx="28" fill="#3987e5" opacity="0.45"/>
    <rect x="96"  y="270" width="146" height="146" rx="28" fill="#3987e5" opacity="0.45"/>
    <rect x="270" y="270" width="146" height="146" rx="28" fill="#199e70"/>
  </g>
</svg>`;

writeFileSync(`${OUT}icon.svg`, glyph(0).trim());

const jobs = [
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  // Maskable potrzebuje marginesu, żeby system mógł przyciąć rogi bez ucinania glifu.
  { file: "maskable-512.png", size: 512, pad: 64 },
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
];

for (const job of jobs) {
  await sharp(Buffer.from(glyph(job.pad))).resize(job.size, job.size).png().toFile(`${OUT}${job.file}`);
  console.log("zapisano", job.file);
}
