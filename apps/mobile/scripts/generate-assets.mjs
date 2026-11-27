// Generates the app icon, adaptive icon layers, splash mark and notification
// icon from docs/ux/icon.svg (brand mark). Run: pnpm -F @entre-nos/mobile assets
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const out = resolve(here, '../assets');
mkdirSync(out, { recursive: true });

const iconSvg = readFileSync(resolve(root, 'docs/ux/icon.svg'), 'utf8');
const CREAM = '#FFF8F3';

// Inner drawing of the mark (viewBox units of the 122x122 logo group).
const MARK = iconSvg.slice(iconSvg.indexOf('<g '), iconSvg.lastIndexOf('</g>') + 4);

function render(svg, width, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(resolve(out, file), png);
  console.log(`assets/${file} (${png.length} bytes)`);
}

// 1. Adaptive icon foreground: transparent, drawing inside the safe zone.
render(iconSvg, 1024, 'adaptive-icon.png');

// 2. Legacy/full icon: cream background + the same drawing.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" fill="${CREAM}"/>${MARK.replace(/transform="[^"]*"/, 'transform="translate(36 36) scale(7.8)"')}</svg>`,
  1024,
  'icon.png',
);

// 3. Monochrome silhouette (Android 13 themed icon / notification):
//    both bubbles in white with the spark cut out.
const silhouette = (scaleGroup) => `
  <defs><mask id="m"><rect x="0" y="0" width="1024" height="1024" fill="white"/>
    <g ${scaleGroup}><path d="M61 44 Q62.6 54.4 72 56 Q62.6 57.6 61 68 Q59.4 57.6 50 56 Q59.4 54.4 61 44 Z" fill="black"/></g>
  </mask></defs>
  <g mask="url(#m)"><g ${scaleGroup} fill="#FFFFFF">
    <path d="M24 80 L14 100 L40 88 Z"/><path d="M98 80 L108 100 L82 88 Z"/>
    <circle cx="48" cy="56" r="34"/><circle cx="74" cy="56" r="34"/>
  </g></g>`;
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${silhouette('transform="translate(207 207) scale(5)"')}</svg>`,
  1024,
  'adaptive-icon-monochrome.png',
);
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${silhouette('transform="translate(-20 -20) scale(8.7)"')}</svg>`,
  96,
  'notification-icon.png',
);

// 4. Splash mark (transparent, cropped to the drawing; shown at 120 dp).
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 12 114 98" width="456" height="392">${MARK.replace(/transform="[^"]*"/, '')}</svg>`,
  480,
  'splash-icon.png',
);
