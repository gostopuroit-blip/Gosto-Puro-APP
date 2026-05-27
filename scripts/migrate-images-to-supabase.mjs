/**
 * Migra imagens do Cloudinary para o Supabase Storage.
 * - Baixa cada imagem em WebP via Cloudinary
 * - Sobe no bucket 'recipe-images' do Supabase
 * - Atualiza image_url na tabela recipes
 *
 * Uso: node scripts/migrate-images-to-supabase.mjs
 * Flags:
 *   --dry-run    Só lista o que faria, sem alterar nada
 *   --limit=N    Processa só N receitas (teste)
 *   --skip-existing  Pula receitas que já têm URL do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2Z0d2pzdmhsY3p3bGhkd3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5NDc0MiwiZXhwIjoyMDk1NDcwNzQyfQ.wtz-X9sLEwQRjMdPYM7CWdr0Tf0jygnlVE2rEKNlFbU';
const BUCKET = 'recipe-images';
const SUPABASE_STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const isDryRun = process.argv.includes('--dry-run');
const skipExisting = process.argv.includes('--skip-existing');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Adiciona transformação WebP na URL do Cloudinary
function toWebpUrl(url) {
  if (!url) return null;
  if (!url.includes('cloudinary.com')) return url; // já não é cloudinary
  // Injeta f_webp,q_auto,w_800 na URL
  return url.replace('/upload/', '/upload/f_webp,q_auto,w_800/');
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    console.log(`Criando bucket '${BUCKET}'...`);
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Erro ao criar bucket: ${error.message}`);
    console.log(`Bucket '${BUCKET}' criado ✅`);
  } else {
    console.log(`Bucket '${BUCKET}' já existe ✅`);
  }
}

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN — nenhuma alteração será feita\n' : '🚀 Iniciando migração de imagens para Supabase Storage\n');

  if (!isDryRun) await ensureBucket();

  // Busca todas as receitas com imagem
  let query = supabase
    .from('recipes')
    .select('id, base44_id, title, image_url')
    .not('image_url', 'is', null)
    .neq('image_url', '');

  if (skipExisting) {
    query = query.not('image_url', 'like', `${SUPABASE_STORAGE_BASE}%`);
  }

  if (LIMIT) query = query.limit(LIMIT);

  const { data: recipes, error } = await query;
  if (error) throw error;

  console.log(`Total de receitas para processar: ${recipes.length}`);
  if (isDryRun) {
    console.log('Exemplo de URL de entrada:', recipes[0]?.image_url);
    console.log('Exemplo de URL de saída:  ', `${SUPABASE_STORAGE_BASE}/${recipes[0]?.id}.webp`);
    return;
  }

  let done = 0, skipped = 0, errors = 0;

  for (const recipe of recipes) {
    const fileName = `${recipe.id}.webp`;
    const newUrl = `${SUPABASE_STORAGE_BASE}/${fileName}`;

    // Pula se já está no Supabase
    if (recipe.image_url?.startsWith(SUPABASE_STORAGE_BASE)) {
      skipped++;
      continue;
    }

    try {
      // Baixa a imagem em WebP do Cloudinary
      const webpUrl = toWebpUrl(recipe.image_url);
      const res = await fetchWithRetry(webpUrl);
      const buffer = Buffer.from(await res.arrayBuffer());

      // Sobe para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      // Atualiza image_url na receita
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ image_url: newUrl })
        .eq('id', recipe.id);

      if (updateError) throw new Error(updateError.message);

      done++;
      process.stdout.write(`\r  ✅ ${done} feitas | ⏭️  ${skipped} puladas | ❌ ${errors} erros`);

    } catch (e) {
      errors++;
      console.error(`\n  Erro [${recipe.id}] ${recipe.title}: ${e.message}`);
    }
  }

  console.log(`\n\n✅ Concluído!`);
  console.log(`   Migradas:  ${done}`);
  console.log(`   Puladas:   ${skipped}`);
  console.log(`   Erros:     ${errors}`);
  console.log(`\nURL base das imagens: ${SUPABASE_STORAGE_BASE}/<recipe-id>.webp`);
}

main().catch(console.error);
