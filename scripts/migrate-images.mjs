import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';

// Supabase
const SUPABASE_URL = 'https://szgxfgjspdpwdrdrmbxx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'COLE_AQUI';

// Cloudinary
const CLOUDINARY_CLOUD = 'ddyab6iek';
const CLOUDINARY_KEY = '342826843437149';
const CLOUDINARY_SECRET = 'A4J7WnsqBs1uvM2GivXnDTdUn3c';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// SHA-1 para assinar requests do Cloudinary
import crypto from 'crypto';

function cloudinarySign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + CLOUDINARY_SECRET).digest('hex');
}

async function uploadToCloudinary(imageUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const signature = cloudinarySign(params);

  const body = new URLSearchParams({
    file: imageUrl,
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: CLOUDINARY_KEY,
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary error: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

function cloudinaryWebpUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_webp,q_auto,w_800/${publicId}`;
}

async function main() {
  console.log('Buscando receitas com image_url...');

  let allRecipes = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, base44_id, title, image_url')
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .range(from, from + pageSize - 1);

    if (error) { console.error('Erro ao buscar receitas:', error); process.exit(1); }
    if (!data || data.length === 0) break;

    allRecipes = allRecipes.concat(data);
    console.log(`  Carregadas ${allRecipes.length} receitas...`);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Filtra receitas que já foram migradas (URL já é do Cloudinary)
  const toMigrate = allRecipes.filter(r => !r.image_url.includes('cloudinary.com'));
  const alreadyDone = allRecipes.length - toMigrate.length;

  console.log(`\nTotal com imagem: ${allRecipes.length}`);
  console.log(`Já migradas: ${alreadyDone}`);
  console.log(`Para migrar: ${toMigrate.length}\n`);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < toMigrate.length; i++) {
    const recipe = toMigrate[i];
    const publicId = `recipes/${recipe.base44_id || recipe.id}`;

    try {
      process.stdout.write(`[${i + 1}/${toMigrate.length}] ${recipe.title.slice(0, 40)}... `);

      const cloudinaryUrl = await uploadToCloudinary(recipe.image_url, publicId);
      const webpUrl = cloudinaryWebpUrl(publicId);

      const { error: updateError } = await supabase
        .from('recipes')
        .update({ image_url: webpUrl })
        .eq('id', recipe.id);

      if (updateError) throw updateError;

      console.log('OK');
      success++;
    } catch (err) {
      console.log(`ERRO: ${err.message}`);
      errors.push({ id: recipe.id, title: recipe.title, error: err.message });
      failed++;
    }

    // Pausa a cada 50 para não sobrecarregar a API
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- ${i + 1} processadas, aguardando 2s ---\n`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== CONCLUÍDO ===`);
  console.log(`Sucesso: ${success}`);
  console.log(`Erros: ${failed}`);

  if (errors.length > 0) {
    console.log('\nReceitas com erro:');
    errors.forEach(e => console.log(`  ${e.id} — ${e.title}: ${e.error}`));
  }
}

main();
