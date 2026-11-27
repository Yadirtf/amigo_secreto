// Generates the app icon, adaptive icon layers, splash, notification icon,
// in-app logo and Play Store graphics from the gift mascot
// (docs/ux/logo-regalo.png, cut out by scripts/cutout-logo.py).
// Run: pnpm -F @entre-nos/mobile assets
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const out = resolve(here, '../assets');
const store = resolve(root, 'docs/tienda/graficos');
mkdirSync(out, { recursive: true });
mkdirSync(store, { recursive: true });

const dataUri = (file) =>
  `data:image/png;base64,${readFileSync(resolve(root, file)).toString('base64')}`;
const GIFT = dataUri('docs/ux/logo-regalo.png');
const SILHOUETTE = dataUri('docs/ux/logo-regalo-silueta.png');
const GIFT_RATIO = 864 / 900; // height / width of the cut-out

const fontDir = resolve(root, 'node_modules/@expo-google-fonts');
const fontFiles = [
  resolve(fontDir, 'fredoka/600SemiBold/Fredoka_600SemiBold.ttf'),
  resolve(fontDir, 'nunito/700Bold/Nunito_700Bold.ttf'),
];

function render(svg, width, path) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Fredoka' },
  })
    .render()
    .asPng();
  writeFileSync(path, png);
  console.log(`${path.slice(root.length + 1)} (${png.length} bytes)`);
}
const asset = (file) => resolve(out, file);

/** The mascot, centred on (cx, cy), `w` units wide, with a soft floor shadow. */
function gift(cx, cy, w, { shadow = true, href = GIFT } = {}) {
  const h = w * GIFT_RATIO;
  const floor = shadow
    ? `<ellipse cx="${cx}" cy="${cy + h * 0.47}" rx="${w * 0.36}" ry="${w * 0.05}" fill="#5B3A6B" opacity="0.18" filter="url(#blur)"/>`
    : '';
  return `${floor}<image href="${href}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}"/>`;
}

const DEFS = `
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#D9C6FF"/><stop offset="0.5" stop-color="#EDE3FF"/><stop offset="1" stop-color="#B8E9D6"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.4">
    <stop offset="0" stop-color="#FFF4D6" stop-opacity="1"/><stop offset="0.55" stop-color="#FFF4D6" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0"/>
  </radialGradient>`;

const sparkle = (x, y, s, fill = '#FFFFFF') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10 Z" fill="${fill}"/>`;
const piece = (x, y, w, h, rot, fill) =>
  `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="${fill}" transform="rotate(${rot} ${x} ${y})"/>`;

/** Pastel confetti and sparkles around the edge of a 1024 square. */
const CONFETTI = [
  piece(150, 190, 54, 20, -30, '#FF9E8A'),
  piece(880, 170, 50, 18, 35, '#FFD36B'),
  piece(110, 560, 46, 18, 60, '#7DD9BF'),
  piece(915, 600, 52, 20, -55, '#B9A4F5'),
  piece(250, 905, 50, 18, 20, '#FFD36B'),
  piece(800, 900, 54, 20, -20, '#FF9E8A'),
  `<circle cx="300" cy="120" r="14" fill="#7DD9BF"/>`,
  `<circle cx="720" cy="95" r="12" fill="#FF9E8A"/>`,
  `<circle cx="95" cy="380" r="12" fill="#FFD36B"/>`,
  `<circle cx="940" cy="400" r="14" fill="#7DD9BF"/>`,
  `<circle cx="120" cy="790" r="13" fill="#B9A4F5"/>`,
  `<circle cx="930" cy="790" r="12" fill="#FFD36B"/>`,
  `<circle cx="520" cy="955" r="11" fill="#B9A4F5"/>`,
  sparkle(215, 330, 2.6),
  sparkle(840, 300, 3.2),
  sparkle(860, 760, 2.4),
  sparkle(175, 700, 2),
  sparkle(560, 70, 2.2),
].join('');

const background = (confetti = true) =>
  `<rect width="1024" height="1024" fill="url(#sky)"/><rect width="1024" height="1024" fill="url(#glow)"/>${confetti ? CONFETTI : ''}`;
const square = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>${DEFS}</defs>${body}</svg>`;

// 1. Full icon (iOS / legacy Android / Play Store 512).
const fullIcon = square(`${background()}${gift(512, 520, 700)}`);
render(fullIcon, 1024, asset('icon.png'));
render(fullIcon, 512, resolve(store, 'icono-512.png'));

// 2. Adaptive icon: background layer (sky + confetti) and a transparent
//    foreground with the mascot inside the 66/108 safe zone.
render(square(background()), 1024, asset('adaptive-icon-background.png'));
render(square(gift(512, 520, 510)), 1024, asset('adaptive-icon.png'));

// 3. Monochrome silhouette (Android 13 themed icon) and notification icon.
render(
  square(gift(512, 512, 520, { shadow: false, href: SILHOUETTE })),
  1024,
  asset('adaptive-icon-monochrome.png'),
);
render(
  square(gift(512, 512, 1000, { shadow: false, href: SILHOUETTE })),
  96,
  asset('notification-icon.png'),
);

// 4. Splash mark and in-app logo: the mascot alone, transparent.
const mascot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 864" width="900" height="864"><image href="${GIFT}" x="0" y="0" width="900" height="864"/></svg>`;
render(mascot, 600, asset('splash-icon.png'));
render(mascot, 360, asset('logo-mascota.png'));

// 5. Play Store feature graphic (1024×500).
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <defs>${DEFS}
      <linearGradient id="wide" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#EADFFF"/><stop offset="0.55" stop-color="#F3EDFF"/><stop offset="1" stop-color="#CDEFE3"/>
      </linearGradient>
      <radialGradient id="spot" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#FFF4D6"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#wide)"/>
    <circle cx="225" cy="250" r="240" fill="url(#spot)"/>
    ${piece(60, 70, 44, 16, -30, '#FF9E8A')}${piece(420, 60, 40, 15, 35, '#FFD36B')}
    ${piece(950, 430, 44, 16, -50, '#B9A4F5')}${piece(70, 440, 40, 15, 60, '#7DD9BF')}
    <circle cx="960" cy="80" r="12" fill="#7DD9BF"/><circle cx="400" cy="445" r="10" fill="#FF9E8A"/>
    ${sparkle(410, 150, 2.4)}${sparkle(930, 250, 2)}${sparkle(50, 250, 1.8)}
    ${gift(225, 245, 380)}
    <text x="450" y="225" font-family="Fredoka" font-weight="600" font-size="66" fill="#2A1F2D">Entre Nos</text>
    <text x="450" y="290" font-family="Nunito" font-weight="700" font-size="34" fill="#665A6B">Tu amigo secreto,</text>
    <text x="450" y="335" font-family="Nunito" font-weight="700" font-size="34" fill="#665A6B">sin papelitos ni enredos</text>
  </svg>`,
  1024,
  resolve(store, 'grafico-funciones-1024x500.png'),
);
