/**
 * Migra as receitas faltando do arquivo de resultado do MCP para o Supabase.
 * Uso: node scripts/migrate-missing.mjs <caminho-do-arquivo-json>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CATEGORY_MAP = {
  'Spuntino': 'Snack', 'Merenda': 'Snack', 'Dolci': 'Dolce', 'Antipasto': 'Pranzo',
  'Appetizer': 'Pranzo', 'Dessert': 'Dolce', 'Primo': 'Pranzo', 'Secondo': 'Pranzo',
  'Contorno': 'Pranzo', 'Zuppa': 'Pranzo', 'Insalata': 'Pranzo', 'Aperitivo': 'Pranzo',
};
const DIFFICULTY_MAP = { 'Medio': 'Media', 'Easy': 'Facile', 'Hard': 'Difficile' };

function mapRecipe(r) {
  return {
    base44_id: r.id || null,
    title: r.title || '',
    description: r.description || '',
    image_url: r.image_url || null,
    gen_prompt: r.gen_prompt || null,
    status: r.status || 'bozza',
    is_premium: r.is_premium ?? false,
    category: CATEGORY_MAP[r.category] || r.category || 'Pranzo',
    occasions: r.occasions || [],
    lifestyle: r.lifestyle || [],
    dietary_tags: r.dietary_tags || [],
    paese: r.paese || null,
    prep_time: r.prep_time || 30,
    servings: r.servings || null,
    difficulty: DIFFICULTY_MAP[r.difficulty] || r.difficulty || null,
    calories: r.calories || null,
    calorie: r.calorie || null,
    proteine: r.proteine || null,
    carboidrati: r.carboidrati || null,
    grassi: r.grassi || null,
    fibre: r.fibre || null,
    zuccheri: r.zuccheri || null,
    sodio: r.sodio || null,
    ingredients: r.ingredients || null,
    instructions: r.instructions || [],
    sostituzioni: r.sostituzioni || null,
    numero_salvate: r.numero_salvate || 0,
    numero_preparate: r.numero_preparate || 0,
    total_rating: r.total_rating || 0,
    rating_count: r.rating_count || 0,
    media_rating: r.media_rating || 0,
    created_by: r.created_by || null,
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Uso: node migrate-missing.mjs <arquivo.json>'); process.exit(1); }

  console.log(`Lendo ${filePath}...`);
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const entities = data.entities || [];
  console.log(`Total de receitas no arquivo: ${entities.length}`);

  const recipes = entities.map(mapRecipe);

  const BATCH = 50;
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < recipes.length; i += BATCH) {
    const chunk = recipes.slice(i, i + BATCH);
    const { error } = await supabase.from('recipes').upsert(chunk, { onConflict: 'base44_id', ignoreDuplicates: true });
    if (error) {
      console.error(`Erro no batch ${i}-${i+BATCH}:`, error.message);
      errors++;
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r  Inserindo: ${inserted}/${recipes.length}`);
    }
  }
  console.log(`\n✅ Concluído: ${inserted} processadas, ${errors} erros`);
}

main().catch(console.error);
