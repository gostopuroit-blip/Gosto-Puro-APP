/**
 * Gera os ícones PWA a partir do logo SVG.
 * - icon-192.png, icon-512.png (Android)
 * - icon-512-maskable.png (Android adaptive)
 * - apple-touch-icon.png 180x180 (iOS)
 * - favicon.ico (browser tab)
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const svg = readFileSync('public/logo.svg');

async function main() {
  // Android — full bleed
  await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');

  // Maskable — adiciona safe zone (padding 12.5% pra Android adaptive icon)
  const maskable = await sharp(svg)
    .resize(384, 384) // 75% do 512 = safe zone
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#2D6A4F' }
  })
    .composite([{ input: maskable, gravity: 'center' }])
    .png()
    .toFile('public/icon-512-maskable.png');

  // iOS — apple-touch-icon
  await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png');

  // Favicon
  await sharp(svg).resize(32, 32).png().toFile('public/favicon-32.png');

  console.log('✅ Ícones PWA gerados em public/');
}

main().catch(e => { console.error(e); process.exit(1); });
