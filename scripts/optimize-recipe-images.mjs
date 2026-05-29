/**
 * Re-otimiza as imagens já no Supabase Storage:
 * - Baixa cada uma
 * - Re-encoda em WebP qualidade 75, max 800px largura
 * - Faz upload de volta (upsert) com cacheControl de 1 ano
 *
 * Uso: node scripts/optimize-recipe-images.mjs [--limit=N] [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2Z0d2pzdmhsY3p3bGhkd3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5NDc0MiwiZXhwIjoyMDk1NDcwNzQyfQ.wtz-X9sLEwQRjMdPYM7CWdr0Tf0jygnlVE2rEKNlFbU';
const BUCKET = 'recipe-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;

async function listAllFiles() {
  const all = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function downloadFile(name) {
  const { data, error } = await supabase.storage.from(BUCKET).download(name);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN\n' : '🚀 Otimizando imagens (800px, q75, cache 1 ano)\n');

  let files = await listAllFiles();
  files = files.filter(f => f.name.endsWith('.webp'));
  if (LIMIT) files = files.slice(0, LIMIT);

  console.log(`Total de arquivos: ${files.length}`);

  if (isDryRun) {
    const sample = files[0];
    console.log('Exemplo:', sample?.name, '-', sample?.metadata?.size, 'bytes');
    return;
  }

  let done = 0, errors = 0, savedBytes = 0;
  for (const f of files) {
    try {
      const original = await downloadFile(f.name);
      const optimized = await sharp(original)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      const { error } = await supabase.storage.from(BUCKET).upload(f.name, optimized, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 ano
      });
      if (error) throw new Error(error.message);

      const before = original.length, after = optimized.length;
      savedBytes += (before - after);
      done++;
      process.stdout.write(`\r  ✅ ${done}/${files.length} — economizados ${(savedBytes / 1024 / 1024).toFixed(1)} MB | ❌ ${errors}`);
    } catch (e) {
      errors++;
      console.error(`\n  Erro [${f.name}]: ${e.message}`);
    }
  }

  console.log(`\n\n✅ Done.`);
  console.log(`   Processadas: ${done}`);
  console.log(`   Erros: ${errors}`);
  console.log(`   Espaço economizado: ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error);
