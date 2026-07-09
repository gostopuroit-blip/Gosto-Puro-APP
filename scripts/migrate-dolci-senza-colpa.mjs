/**
 * Migra as 50 receitas "99 Dolci Senza Colpa" do base44 para o Supabase:
 * - Insere/atualiza receitas na tabela recipes
 * - Baixa imagem do base44, converte pra WebP 800px, sobe no Supabase Storage
 * - Atualiza image_url
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'recipe-images';
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const recipes = JSON.parse(readFileSync('./scripts/dolci_senza_colpa.json', 'utf8'));

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

async function main() {
  console.log(`🚀 Migrando ${recipes.length} receitas "99 Dolci Senza Colpa"\n`);
  let done = 0, imgOk = 0, errors = 0;

  for (const r of recipes) {
    try {
      // 1. Verificar se já existe no Supabase pelo base44_id
      const { data: existing } = await supabase
        .from('recipes')
        .select('id, image_url')
        .eq('base44_id', r.id)
        .single();

      let supabaseId = existing?.id;

      // 2. Upsert da receita
      const payload = {
        base44_id: r.id,
        title: r.title,
        description: r.description || null,
        category: r.category || null,
        occasions: r.occasions || [],
        lifestyle: r.lifestyle || [],
        dietary_tags: r.dietary_tags || [],
        prep_time: r.prep_time || null,
        calories: r.calories || null,
        difficulty: r.difficulty || null,
        servings: r.servings || null,
        paese: r.paese || null,
        status: r.status || 'pubblicata',
        numero_salvate: r.numero_salvate || 0,
        numero_preparate: r.numero_preparate || 0,
        media_rating: r.media_rating || 0,
        rating_count: r.rating_count || 0,
      };

      if (supabaseId) {
        await supabase.from('recipes').update(payload).eq('id', supabaseId);
      } else {
        const { data: inserted, error } = await supabase
          .from('recipes').insert(payload).select('id').single();
        if (error) throw new Error(error.message);
        supabaseId = inserted.id;
      }

      // 3. Migrar imagem se ainda não está no Supabase
      const currentUrl = existing?.image_url || '';
      if (r.image_url && !currentUrl.includes('twkftwjsvhlczwlhdwzu')) {
        try {
          const res = await fetchWithRetry(r.image_url);
          const buffer = Buffer.from(await res.arrayBuffer());
          const webp = await sharp(buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 75 })
            .toBuffer();

          const fileName = `${supabaseId}.webp`;
          await supabase.storage.from(BUCKET).upload(fileName, webp, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: '31536000',
          });

          await supabase.from('recipes')
            .update({ image_url: `${STORAGE_BASE}/${fileName}` })
            .eq('id', supabaseId);
          imgOk++;
        } catch (imgErr) {
          console.error(`\n  ⚠️ Imagem falhou [${r.title}]: ${imgErr.message}`);
        }
      } else {
        imgOk++;
      }

      done++;
      process.stdout.write(`\r  ✅ ${done}/${recipes.length} receitas | 🖼️ ${imgOk} imagens | ❌ ${errors} erros`);
    } catch (e) {
      errors++;
      console.error(`\n  ❌ Erro [${r.title}]: ${e.message}`);
    }
  }

  console.log(`\n\n✅ Concluído!`);
  console.log(`   Receitas: ${done}`);
  console.log(`   Imagens:  ${imgOk}`);
  console.log(`   Erros:    ${errors}`);
}

main().catch(console.error);
