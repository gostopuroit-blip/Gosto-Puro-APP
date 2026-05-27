/**
 * Script de migração Base44 → Supabase
 * Executa: node scripts/migrate-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
// service_role bypassa RLS — só usar neste script de migração
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2Z0d2pzdmhsY3p3bGhkd3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5NDc0MiwiZXhwIjoyMDk1NDcwNzQyfQ.wtz-X9sLEwQRjMdPYM7CWdr0Tf0jygnlVE2rEKNlFbU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function insertBatch(table, rows, label) {
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.error(`  ❌ Erro no batch ${i}-${i + BATCH}:`, error.message);
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r  ${label}: ${inserted}/${rows.length}`);
    }
  }
  console.log(`\n  ✅ ${label}: ${inserted} inseridos`);
}

// ─── RECIPE OCCASIONS ───────────────────────────────────────────────────────
const occasionsData = [
  { label:'Ricette Sane', icon:'🥗', tipo:'stile_vita', stagione:null, linee_guida:['Ricette sane ed equilibrate','Ingredienti naturali e non processati'], image_modifiers:[], sort_order:21, is_active:true, show_in_home:false },
  { label:'Facili da Congelare', icon:'❄️', tipo:'stile_vita', stagione:null, linee_guida:[], image_modifiers:[], sort_order:null, is_active:true, show_in_home:false },
  { label:'Cene in Friggitrice', icon:'🍗', tipo:'stile_vita', stagione:null, linee_guida:[], image_modifiers:[], sort_order:null, is_active:true, show_in_home:false },
  { label:'Instagram', icon:'📸', tipo:'speciale', stagione:'all', linee_guida:['Ricetta visivamente spettacolare','Colori vivaci e presentazione curata'], image_modifiers:['vibrant colors','top-down flat lay'], sort_order:5, is_active:true, show_in_home:true, image_url:'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699707f25ff5e371dc9a1c99/7913ab823_Instagram.png' },
  { label:'Veloci', icon:'⚡', tipo:'speciale', stagione:'all', linee_guida:['Ricette pronte in meno di 15 minuti','Ingredienti semplici e reperibili'], image_modifiers:[], sort_order:14, is_active:true, show_in_home:true },
  { label:'Inverno', icon:'❄️', tipo:'speciale', stagione:'inverno', linee_guida:['Ricette calde e confortanti','Ingredienti stagionali invernali'], image_modifiers:[], sort_order:10, is_active:true, show_in_home:true },
  { label:'Primavera', icon:'🌸', tipo:'speciale', stagione:'primavera', linee_guida:['Ricette fresche e leggere','Ingredienti stagionali primaverili'], image_modifiers:[], sort_order:11, is_active:true, show_in_home:true },
  { label:'Capodanno', icon:'✨', tipo:'speciale', stagione:'inverno', linee_guida:['Ricetta tradizionale italiana di Capodanno','Ingredienti di qualità premium'], image_modifiers:[], sort_order:23, is_active:true, show_in_home:true },
  { label:'Natale', icon:'🎄', tipo:'speciale', stagione:'inverno', linee_guida:['Ricetta tipica della tradizione natalizia italiana','Ingredienti classici e stagionali'], image_modifiers:[], sort_order:22, is_active:true, show_in_home:true },
  { label:'Low carb', icon:'🥑', tipo:'stile_vita', stagione:'all', linee_guida:['Riduzione dei carboidrati raffinati','Proteine magre come base del piatto'], image_modifiers:[], sort_order:21, is_active:true, show_in_home:true },
  { label:'Dal mondo', icon:'🌍', tipo:'speciale', stagione:'all', linee_guida:['ispirazione internazionale','ingredienti reperibili in Italia'], image_modifiers:[], sort_order:15, is_active:true, show_in_home:true },
  { label:'365 Ricette Deliziose per Diabetici', icon:'🩺', tipo:'stile_vita', stagione:'all', linee_guida:['Preferire farine integrali','Ridurre zuccheri raffinati'], image_modifiers:[], sort_order:19, is_active:true, show_in_home:true, image_url:'https://base44.app/api/apps/699707f25ff5e371dc9a1c99/files/mp/public/699707f25ff5e371dc9a1c99/a2cea4a8b_365RicetteDelizioseperDiabeticiPianodiRefezionidi52Settimane.png' },
  { label:'Senza zucchero', icon:'🍰', tipo:'stile_vita', stagione:'all', linee_guida:['Nessuno zucchero raffinato','Farine integrali o di mandorle quando possibile'], image_modifiers:[], sort_order:17, is_active:true, show_in_home:true },
  { label:'Proteiche', icon:'🥩', tipo:'stile_vita', stagione:'all', linee_guida:['Almeno 25-35g di proteine per porzione','Fonti proteiche italiane'], image_modifiers:[], sort_order:20, is_active:true, show_in_home:true },
  { label:'Detox', icon:'🥬', tipo:'stile_vita', stagione:'all', linee_guida:['Ingredienti freschi, non processati e stagionali','Verdure, erbe aromatiche e frutta'], image_modifiers:[], sort_order:18, is_active:true, show_in_home:true },
  { label:'275 Ricette Fitness Pratiche ed Economiche', icon:'💪', tipo:'stile_vita', stagione:'all', linee_guida:['Alto contenuto proteico','Carboidrati complessi come fonte di energia'], image_modifiers:[], sort_order:16, is_active:true, show_in_home:true, image_url:'https://base44.app/api/apps/699707f25ff5e371dc9a1c99/files/mp/public/699707f25ff5e371dc9a1c99/12d9cc326_75RicetteFitnessPraticheedEconomiche.png' },
  { label:'Cena', icon:'🍷', tipo:'giorno', stagione:'all', linee_guida:['più leggera del pranzo','equilibrio tra proteine e verdure'], image_modifiers:[], sort_order:3, is_active:true, show_in_home:true },
  { label:'Colazione', icon:'☕', tipo:'giorno', stagione:'all', linee_guida:['ricetta adatta al mattino','ingredienti tipici italiani'], image_modifiers:[], sort_order:1, is_active:true, show_in_home:true },
  { label:'Leggera', icon:'🥗', tipo:'giorno', stagione:'all', linee_guida:['pochi grassi','ingredienti freschi','porzione moderata'], image_modifiers:[], sort_order:4, is_active:true, show_in_home:true },
  { label:'Dolci', icon:'🍏', tipo:'giorno', stagione:'all', linee_guida:['dolce senza eccessi','zuccheri ridotti','ingredienti naturali'], image_modifiers:[], sort_order:5, is_active:true, show_in_home:true },
  { label:'Autunno', icon:'🍂', tipo:'speciale', stagione:'autunno', linee_guida:['ingredienti autunnali','colori caldi'], image_modifiers:[], sort_order:11, is_active:true, show_in_home:true },
  { label:'Estate', icon:'☀️', tipo:'speciale', stagione:'estate', linee_guida:['ingredienti di stagione estiva','poca cottura'], image_modifiers:[], sort_order:10, is_active:true, show_in_home:true },
  { label:'Pranzo', icon:'🍝', tipo:'giorno', stagione:'all', linee_guida:['piatto completo','ingredienti stagionali','porzione adeguata'], image_modifiers:[], sort_order:2, is_active:true, show_in_home:true },
  { label:'Feste', icon:'🎄', tipo:'speciale', stagione:'inverno', linee_guida:['ingredienti tipici italiani','ricetta più ricca'], image_modifiers:[], sort_order:9, is_active:true, show_in_home:true },
  { label:'In famiglia', icon:'👨‍👩‍👧', tipo:'speciale', stagione:'all', linee_guida:[], image_modifiers:[], sort_order:null, is_active:true, show_in_home:false },
  { label:'Per due', icon:'🥂', tipo:'speciale', stagione:'all', linee_guida:[], image_modifiers:[], sort_order:null, is_active:true, show_in_home:false },
  { label:'Con amici', icon:'🎉', tipo:'speciale', stagione:'all', linee_guida:[], image_modifiers:[], sort_order:null, is_active:true, show_in_home:false },
  { label:'Friggitrice ad Aria', icon:'🍗', tipo:'stile_vita', stagione:'all', linee_guida:[], image_modifiers:[], sort_order:null, is_active:true, show_in_home:false },
];

// ─── GOSTO PURO PRODUCTS ────────────────────────────────────────────────────
const productsData = [
  { nome:'Cucina Senza Tempo', slug:'cucina_senza_tempo', occasioni:['Cucina Senza Tempo'], is_active:true, is_free:false, sort_order:null },
  { nome:'Collezione Gosto Puro', slug:'504_ricette_collezione', occasioni:['Collezione Gosto Puro'], is_active:true, is_free:false, hotmart_product_id:'7546493', sort_order:0, image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/ca172c376_WhatsAppImage2026-04-22at201718.jpg', descricao:'Ricette golose, veloci e gourmet — a collezione completa Gosto Puro' },
  { nome:'Ricette Senza Zucchero – Dolce Senza Senso di Colpa', slug:'senza_zucchero', occasioni:['Senza zucchero'], is_active:true, is_free:false, hotmart_product_id:'7079366', image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/a786d7eb2_RicetteSenzaZucchero.png' },
  { nome:'Ricette Low Carb per Dimagrire', slug:'low_carb', occasioni:['Low carb'], is_active:true, is_free:false, hotmart_product_id:'7079437', image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/ef3e8a07d_RicetteLowCarb.png' },
  { nome:'Ricette Detox per il Benessere', slug:'ricette_detox', occasioni:['Detox'], is_active:true, is_free:null, hotmart_product_id:'7546464', image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/8c0b83736_RicetteDetox.png' },
  { nome:'275 Ricette Fitness Pratiche ed Economiche', slug:'fitness_pratiche', occasioni:['275 Ricette Fitness Pratiche ed Economiche'], is_active:true, is_free:null, hotmart_product_id:'7079407', sort_order:6, image_url:'https://base44.app/api/apps/699707f25ff5e371dc9a1c99/files/mp/public/699707f25ff5e371dc9a1c99/12d9cc326_75RicetteFitnessPraticheedEconomiche.png' },
  { nome:'365 Ricette Deliziose per Diabetici', slug:'diabetici', occasioni:['365 Ricette Deliziose per Diabetici'], is_active:true, is_free:null, hotmart_product_id:'7079636', sort_order:5, image_url:'https://base44.app/api/apps/699707f25ff5e371dc9a1c99/files/mp/public/699707f25ff5e371dc9a1c99/a2cea4a8b_365RicetteDelizioseperDiabeticiPianodiRefezionidi52Settimane.png' },
  { nome:'150 Ricette Sane + Piano di 35 Giorni', slug:'ricette_sane_35', occasioni:['Ricette Sane'], is_active:true, is_free:null, hotmart_product_id:'7546507', image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/cbb40fb0b_150ricettesanepianoalimentaredi35giorni.png', descricao:'150 ricette sane con piano alimentare di 35 giorni' },
  { nome:'350 Ricette Facili da Congelare', slug:'ricette_congelare', occasioni:['Facili da Congelare'], is_active:true, is_free:null, hotmart_product_id:'7546431', image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/f6571f98e_350ricettefacilidacongelare.png', descricao:'350 ricette pratiche e facili da congelare' },
  { nome:'365 Cene con la Friggitrice ad Aria', slug:'cene_friggitrice', occasioni:['Friggitrice ad Aria'], is_active:true, is_free:null, hotmart_product_id:'7567601', image_url:'https://media.base44.com/images/public/699707f25ff5e371dc9a1c99/c205a688e_365CeneconlaFriggitriceadAria.png', descricao:'365 cene deliziose preparate con la friggitrice ad aria' },
];

// ─── APP CONFIG ─────────────────────────────────────────────────────────────
const appConfigData = [
  { key: 'prompt_mestre', label: 'Prompt Mestre Generatore', value: '📂 CATEGORIA Colazione\n🎯 DIFFICOLTÀ Facile\n⏱ TEMPO (MIN) 15\n🍽 PORZIONI 2' },
];

// ─── BAD WORDS ──────────────────────────────────────────────────────────────
const badWordsData = [
  { word:'cazzo', severity:'block', category:'offensive' },
  { word:'vaffanculo', severity:'block', category:'offensive' },
  { word:'stronzo', severity:'block', category:'offensive' },
  { word:'figlio di puttana', severity:'block', category:'offensive' },
  { word:'bastardo', severity:'warning', category:'offensive' },
  { word:'idiota', severity:'warning', category:'offensive' },
  { word:'imbecille', severity:'warning', category:'offensive' },
  { word:'coglione', severity:'block', category:'offensive' },
  { word:'merda', severity:'warning', category:'offensive' },
  { word:'puttana', severity:'block', category:'offensive' },
  { word:'troia', severity:'block', category:'offensive' },
  { word:'deficiente', severity:'warning', category:'offensive' },
  { word:'ritardato', severity:'warning', category:'offensive' },
  { word:'scemo', severity:'warning', category:'offensive' },
  { word:'cretino', severity:'warning', category:'offensive' },
  { word:'porco', severity:'warning', category:'offensive' },
  { word:'maledetto', severity:'warning', category:'offensive' },
  { word:'assassino', severity:'warning', category:'violence' },
  { word:'negro', severity:'block', category:'hate_speech' },
  { word:'frocio', severity:'block', category:'hate_speech' },
  { word:'lesbica di merda', severity:'block', category:'hate_speech' },
  { word:'terrone', severity:'block', category:'hate_speech' },
  { word:'extracomunitario di merda', severity:'block', category:'hate_speech' },
  { word:'handicappato', severity:'warning', category:'offensive' },
  { word:'va a fanculo', severity:'block', category:'offensive' },
  { word:'pezzo di merda', severity:'block', category:'offensive' },
  { word:'figlio di troia', severity:'block', category:'offensive' },
  { word:'sei una merda', severity:'block', category:'offensive' },
  { word:'vai a morire', severity:'block', category:'violence' },
  { word:'ti ammazzo', severity:'block', category:'violence' },
];

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────
const emailTemplatesData = [
  {
    name: 'Ebook Followup',
    subject: 'Hai già sbloccato questo nel tuo accesso 👀',
    is_active: true,
    body: '<h2>Congratulazioni {{USER_NAME}}! 🎉</h2><p>Hai appena sbloccato l\'<strong>accesso base all\'App Ricette Gosto Puro</strong>…</p>',
  },
  {
    name: 'Ricette del giorno online',
    subject: '🍽️ Le ricette di oggi sono online',
    is_active: true,
    body: '<h2>Ciao {{USER_NAME}}! 👋</h2><p>Le ricette di oggi sono appena arrivate su <strong>Gosto Puro</strong>.</p><p>{{RECIPE_LIST}}</p>',
  },
];

// ─── RECIPE FIELD MAPPING ───────────────────────────────────────────────────
const CATEGORY_MAP = {
  'Spuntino': 'Snack', 'Merenda': 'Snack', 'Dolci': 'Dolce', 'Antipasto': 'Pranzo',
  'Appetizer': 'Pranzo', 'Dessert': 'Dolce', 'Primo': 'Pranzo', 'Secondo': 'Pranzo',
  'Contorno': 'Pranzo', 'Zuppa': 'Pranzo', 'Insalata': 'Pranzo',
};

const DIFFICULTY_MAP = {
  'Medio': 'Media',
  'Easy': 'Facile',
  'Hard': 'Difficile',
};

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

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando migração de dados Base44 → Supabase\n');

  // 1. Ocasiões
  console.log('📍 Inserindo recipe_occasions...');
  await insertBatch('recipe_occasions', occasionsData, 'recipe_occasions');

  // 2. Produtos
  console.log('📦 Inserindo gosto_puro_products...');
  await insertBatch('gosto_puro_products', productsData, 'gosto_puro_products');

  // 3. App Config
  console.log('⚙️  Inserindo app_config...');
  await insertBatch('app_config', appConfigData, 'app_config');

  // 4. Bad Words
  console.log('🚫 Inserindo bad_words...');
  await insertBatch('bad_words', badWordsData, 'bad_words');

  // 5. Email Templates
  console.log('📧 Inserindo email_templates...');
  await insertBatch('email_templates', emailTemplatesData, 'email_templates');

  // 6. Receitas — todos os batches (deduplicado por base44_id)
  const batches = ['recipes_batch1.json','recipes_batch2.json','recipes_batch3.json','recipes_batch4.json','recipes_batch5.json','recipes_batch6.json'];
  for (let i = 0; i < batches.length; i++) {
    const file = batches[i];
    console.log(`🍝 Inserindo receitas (${file})...`);
    try {
      const raw = readFileSync(join(__dirname, file), 'utf8').replace(/^﻿/, '');
      const data = JSON.parse(raw);
      const recipes = data.entities.map(mapRecipe);
      // Usar base44_id como chave de deduplicação
      const BATCH = 50;
      let inserted = 0;
      for (let j = 0; j < recipes.length; j += BATCH) {
        const chunk = recipes.slice(j, j + BATCH);
        const { error } = await supabase.from('recipes').upsert(chunk, { onConflict: 'base44_id', ignoreDuplicates: true });
        if (error) {
          console.error(`  ❌ Erro ${j}-${j+BATCH}:`, error.message);
        } else {
          inserted += chunk.length;
          process.stdout.write(`\r  ${file}: ${inserted}/${recipes.length}`);
        }
      }
      console.log(`\n  ✅ ${file}: ${inserted} inseridos`);
    } catch (e) {
      console.error(`  ❌ Erro ao ler ${file}:`, e.message);
    }
  }

  console.log('\n✅ Migração concluída!');
}

main().catch(console.error);
