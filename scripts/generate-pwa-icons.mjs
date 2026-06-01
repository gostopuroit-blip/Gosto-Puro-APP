/**
 * Gera os ícones PWA a partir do logo (PNG/WEBP/SVG).
 * - icon-192.png, icon-512.png (Android)
 * - icon-512-maskable.png (Android adaptive)
 * - apple-touch-icon.png 180x180 (iOS)
 * - favicon-32.png (browser tab)
 *
 * Procura source em ordem:
 *   public/logo-source.png
 *   public/logo gosto puro.webp
 *   public/logo.webp
 *   public/logo.png
 *   public/logo.svg (fallback)
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';

const candidates = [
  'public/logo-source.png',
  'public/logo gosto puro.webp',
  'public/logo.webp',
  'public/logo.png',
  'public/logo.svg',
];
const sourceFile = candidates.find(p => existsSync(p));
if (!sourceFile) {
  console.error('❌ Nenhum logo encontrado em public/');
  process.exit(1);
}
const source = readFileSync(sourceFile);
console.log(`📥 Source: ${sourceFile}`);

// Cor de fundo (verde escuro do logo) usada no maskable safe-zone padding
const BG = { r: 17, g: 49, b: 38, alpha: 1 };

async function main() {
  // Android — full bleed (logo ocupa toda a área)
  await sharp(source).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(source).resize(512, 512).png().toFile('public/icon-512.png');

  // Maskable — adiciona safe zone (Android adaptive icon precisa de 12.5% padding)
  const innerPng = await sharp(source).resize(384, 384, { fit: 'contain', background: BG }).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BG }
  })
    .composite([{ input: innerPng, gravity: 'center' }])
    .png()
    .toFile('public/icon-512-maskable.png');

  // iOS — apple-touch-icon
  await sharp(source).resize(180, 180).png().toFile('public/apple-touch-icon.png');

  // Favicon
  await sharp(source).resize(32, 32).png().toFile('public/favicon-32.png');

  console.log('✅ Ícones PWA gerados em public/');
}

main().catch(e => { console.error(e); process.exit(1); });
