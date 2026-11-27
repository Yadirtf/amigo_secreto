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
// Lavender mist behind the pastel bubbles (identidad-visual.md, paleta 1.1).
const CREAM = '#F3EDFF';

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

// 5. Google Play store graphics (docs/tienda/graficos): 512 icon and the
//    1024×500 feature graphic, with the app fonts so text renders the same.
const store = resolve(root, 'docs/tienda/graficos');
mkdirSync(store, { recursive: true });
const fontDir = resolve(root, 'node_modules/@expo-google-fonts');
const fontFiles = [
  resolve(fontDir, 'fredoka/600SemiBold/Fredoka_600SemiBold.ttf'),
  resolve(fontDir, 'nunito/700Bold/Nunito_700Bold.ttf'),
];
function renderStore(svg, width, file) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Fredoka' },
  })
    .render()
    .asPng();
  writeFileSync(resolve(store, file), png);
  console.log(`docs/tienda/graficos/${file} (${png.length} bytes)`);
}
renderStore(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" fill="${CREAM}"/>${MARK.replace(/transform="[^"]*"/, 'transform="translate(36 36) scale(7.8)"')}</svg>`,
  512,
  'icono-512.png',
);
renderStore(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE3DC"/><stop offset="0.55" stop-color="#F3EDFF"/><stop offset="1" stop-color="#DDF5EC"/>
    </linearGradient></defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <circle cx="930" cy="70" r="46" fill="#FFD166" opacity="0.55"/>
    <circle cx="80" cy="440" r="60" fill="#FF7F6B" opacity="0.25"/>
    ${MARK.replace(/transform="[^"]*"/, 'transform="translate(40 105) scale(2.6)"')}
    <text x="400" y="225" font-family="Fredoka" font-weight="600" font-size="64" fill="#2A1F2D">Entre Nos</text>
    <text x="400" y="290" font-family="Nunito" font-weight="700" font-size="34" fill="#665A6B">Tu amigo secreto,</text>
    <text x="400" y="335" font-family="Nunito" font-weight="700" font-size="34" fill="#665A6B">sin papelitos ni enredos</text>
  </svg>`,
  1024,
  'grafico-funciones-1024x500.png',
);
