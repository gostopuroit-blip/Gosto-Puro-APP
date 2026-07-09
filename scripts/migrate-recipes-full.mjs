/**
 * Migra/completa receitas do base44 (com ingredientes + instruções).
 * - Upsert por base44_id
 * - Receita existente: atualiza campos (ingredients, instructions, etc.), mantém image_url já migrada
 * - Receita nova: insere + migra imagem (WebP 800px)
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';

const URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'recipe-images';
const STORAGE = `${URL}/storage/v1/object/public/${BUCKET}`;
const supabase = createClient(URL, KEY);

const DIR = 'C:/Users/User/.claude/projects/C--Users-User-Desktop-Novo-app/4b222c2f-ca47-48dd-9eec-d5a6c17b14ad/tool-results/';
const FILES = [
  'mcp-6bd86479-36c2-4fa6-9798-9988b23fc76f-query_entities-1780106052677.txt', // Brucia Grassi
  'mcp-6bd86479-36c2-4fa6-9798-9988b23fc76f-query_entities-1780106091961.txt', // Reset
  'mcp-6bd86479-36c2-4fa6-9798-9988b23fc76f-query_entities-1780106101440.txt', // 99 Dolci
  'mcp-6bd86479-36c2-4fa6-9798-9988b23fc76f-query_entities-1780106108653.txt', // Piatti
];

async function fetchRetry(u, n = 3) {
  for (let i = 0; i < n; i++) {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r; }
    catch (e) { if (i === n - 1) throw e; await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
  }
}

function contentFields(r) {
  return {
    base44_id: r.id,
    title: r.title,
    description: r.description || null,
    category: r.category || null,
    occasions: r.occasions || [],
    lifestyle: r.lifestyle || [],
    dietary_tags: r.dietary_tags || [],
    prep_time: r.prep_time ?? null,
    calories: r.calories ?? null,
    difficulty: r.difficulty || null,
    servings: r.servings ?? null,
    paese: r.paese || null,
    status: r.status || 'pubblicata',
    numero_salvate: r.numero_salvate || 0,
    numero_preparate: r.numero_preparate || 0,
    media_rating: r.media_rating || 0,
    rating_count: r.rating_count || 0,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : null,
    instructions: Array.isArray(r.instructions) ? r.instructions : null,
  };
}

async function main() {
  // 1. Lê e dedupe por base44_id
  const byId = new Map();
  for (const f of FILES) {
    const parsed = JSON.parse(readFileSync(DIR + f, 'utf8'));
    for (const r of parsed.entities || []) if (r.id) byId.set(r.id, r);
  }
  const recipes = [...byId.values()];
  console.log(`Total de receitas (4 ocasiões, dedup): ${recipes.length}`);

  let updated = 0, inserted = 0, imgOk = 0, errors = 0;
  for (const r of recipes) {
    try {
      const { data: existing } = await supabase
        .from('recipes').select('id, image_url').eq('base44_id', r.id).maybeSingle();

      const fields = contentFields(r);
      let supaId, curImg;
      if (existing) {
        // mantém a image_url já migrada
        await supabase.from('recipes').update(fields).eq('id', existing.id);
        supaId = existing.id; curImg = existing.image_url;
        updated++;
      } else {
        const { data: ins, error } = await supabase.from('recipes').insert(fields).select('id').single();
        if (error) throw new Error(error.message);
        supaId = ins.id; curImg = null;
        inserted++;
      }

      // Migra imagem só se ainda não está no nosso storage
      if (r.image_url && !(curImg || '').includes('twkftwjsvhlczwlhdwzu')) {
        try {
          const res = await fetchRetry(r.image_url);
          const webp = await sharp(Buffer.from(await res.arrayBuffer()))
            .resize({ width: 800, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
          const fn = `${supaId}.webp`;
          await supabase.storage.from(BUCKET).upload(fn, webp, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
          await supabase.from('recipes').update({ image_url: `${STORAGE}/${fn}` }).eq('id', supaId);
          imgOk++;
        } catch (e) { console.error(`\n  ⚠️ img [${r.title}]: ${e.message}`); }
      }
      process.stdout.write(`\r  ✏️ ${updated} atualizadas | ➕ ${inserted} novas | 🖼️ ${imgOk} imagens | ❌ ${errors}`);
    } catch (e) { errors++; console.error(`\n  ❌ [${r.title}]: ${e.message}`); }
  }
  console.log(`\n\n✅ Concluído! Atualizadas: ${updated} | Novas: ${inserted} | Imagens: ${imgOk} | Erros: ${errors}`);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
