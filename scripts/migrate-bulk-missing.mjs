/**
 * Migra em lote receitas faltantes do base44 -> Supabase.
 * Lê o arquivo missing-recipes.json (gerado via MCP) com array de receitas completas.
 * Insere com status='pubblicata' (forçado) e migra imagem em WebP.
 * Idempotente: pula receitas com base44_id já existente.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';

const URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'recipe-images';
const STORAGE = `${URL}/storage/v1/object/public/${BUCKET}`;
const supabase = createClient(URL, KEY);

const file = process.argv[2] || 'scripts/missing-recipes.json';
const parsed = JSON.parse(readFileSync(file, 'utf8'));
const recipes = Array.isArray(parsed) ? parsed : (parsed.entities || []);
console.log(`Processando ${recipes.length} receitas de ${file}`);

let inserted = 0, skipped = 0, errors = 0, imgOk = 0;

for (const r of recipes) {
  try {
    // Skip se já existe
    const { data: existing } = await supabase
      .from('recipes').select('id').eq('base44_id', r.id).maybeSingle();
    if (existing) { skipped++; continue; }

    const { data: ins, error } = await supabase.from('recipes').insert({
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
      status: 'pubblicata',
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : null,
      instructions: Array.isArray(r.instructions) ? r.instructions : null,
    }).select('id').single();
    if (error) throw new Error(error.message);
    inserted++;

    if (r.image_url) {
      try {
        const res = await fetch(r.image_url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const webp = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 75 }).toBuffer();
        const fn = `${ins.id}.webp`;
        await supabase.storage.from(BUCKET).upload(fn, webp, {
          contentType: 'image/webp', upsert: true, cacheControl: '31536000'
        });
        await supabase.from('recipes').update({
          image_url: `${STORAGE}/${fn}`
        }).eq('id', ins.id);
        imgOk++;
      } catch (e) {
        console.error(`  ⚠️  img [${r.title}]: ${e.message}`);
      }
    }
    process.stdout.write(`\r  inseridas: ${inserted} | skip: ${skipped} | img: ${imgOk} | err: ${errors}`);
  } catch (e) {
    errors++;
    console.error(`\n  ❌ [${r.title}]: ${e.message}`);
  }
}
console.log(`\n\n✅ Concluído. Inseridas: ${inserted} | Skipped: ${skipped} | Imagens: ${imgOk} | Erros: ${errors}`);
