/**
 * Migra usuários do Base44 para a tabela base44_users_import do Supabase.
 * Uso: node scripts/migrate-users.mjs <arquivo-batch1.json> [arquivo-batch2.json]
 * Os arquivos são os resultados do MCP query_entities para User.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2Z0d2pzdmhsY3p3bGhkd3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5NDc0MiwiZXhwIjoyMDk1NDcwNzQyfQ.wtz-X9sLEwQRjMdPYM7CWdr0Tf0jygnlVE2rEKNlFbU';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function mapUser(u) {
  return {
    base44_id: u.id,
    email: (u.email || '').toLowerCase().trim(),
    display_name: u.full_name || null,
    role: u.role || 'user',
    plan: u.plan || null,
    status: u.status || null,
    bio: u.bio || null,
    age: u.age || null,
    photo_url: u.photo_url || null,
    dietary_tags_profile: u.dietary_tags_profile || [],
    dietary_restrictions: u.dietary_restrictions || null,
    health_conditions: u.health_conditions || null,
    dark_mode: u.dark_mode ?? false,
    base44_created_at: u.created_date ? new Date(u.created_date).toISOString() : null,
  };
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) { console.error('Forneça ao menos um arquivo JSON'); process.exit(1); }

  let allUsers = [];
  for (const f of files) {
    console.log(`Lendo ${f}...`);
    const data = JSON.parse(readFileSync(f, 'utf8'));
    const entities = data.entities || [];
    allUsers = allUsers.concat(entities);
    console.log(`  ${entities.length} usuários no arquivo`);
  }

  // Deduplicar por email
  const seen = new Set();
  const unique = allUsers.filter(u => {
    const email = (u.email || '').toLowerCase().trim();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  console.log(`\nTotal: ${allUsers.length} | Únicos por email: ${unique.length}`);

  const rows = unique.map(mapUser);

  const BATCH = 50;
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('base44_users_import')
      .upsert(chunk, { onConflict: 'email', ignoreDuplicates: false });
    if (error) {
      console.error(`\nErro no batch ${i}:`, error.message);
      errors++;
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r  Inseridos: ${inserted}/${rows.length}`);
    }
  }
  console.log(`\n✅ Concluído: ${inserted} inseridos, ${errors} erros de batch`);
}

main().catch(console.error);
