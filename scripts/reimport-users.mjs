/**
 * Re-importa TODOS os usuários do base44 para base44_users_import (refresh completo).
 * Lê os 2 arquivos de resultado do MCP query_entities e regrava a tabela.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://twkftwjsvhlczwlhdwzu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2Z0d2pzdmhsY3p3bGhkd3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg5NDc0MiwiZXhwIjoyMDk1NDcwNzQyfQ.wtz-X9sLEwQRjMdPYM7CWdr0Tf0jygnlVE2rEKNlFbU';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FILES = [
  'C:/Users/User/.claude/projects/C--Users-User-Desktop-Novo-app/4b222c2f-ca47-48dd-9eec-d5a6c17b14ad/tool-results/mcp-6bd86479-36c2-4fa6-9798-9988b23fc76f-query_entities-1780094323431.txt',
  'C:/Users/User/.claude/projects/C--Users-User-Desktop-Novo-app/4b222c2f-ca47-48dd-9eec-d5a6c17b14ad/tool-results/mcp-6bd86479-36c2-4fa6-9798-9988b23fc76f-query_entities-1780094331383.txt',
];

const toText = (v) => {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.filter(Boolean).join(', ') || null;
  return String(v) || null;
};

function mapUser(u) {
  return {
    email: u.email,
    base44_id: u.id || null,
    display_name: u.display_name || u.full_name || null,
    role: u.role === 'admin' ? 'admin' : 'user',
    plan: u.plan || 'free',
    status: u.disabled ? 'blocked' : 'active',
    bio: u.bio || null,
    age: (typeof u.age === 'number') ? u.age : null,
    photo_url: u.photo_url || null,
    dietary_tags_profile: Array.isArray(u.dietary_tags_profile) ? u.dietary_tags_profile : [],
    dietary_restrictions: toText(u.dietary_restrictions),
    health_conditions: toText(u.health_conditions),
    dark_mode: !!u.dark_mode,
    base44_created_at: u.created_date || null,
    imported_at: new Date().toISOString(),
  };
}

async function main() {
  // 1. Lê e combina os arquivos
  const byEmail = new Map();
  for (const f of FILES) {
    const parsed = JSON.parse(readFileSync(f, 'utf8'));
    for (const u of parsed.entities || []) {
      if (u.email) byEmail.set(u.email.toLowerCase(), u); // dedupe por email
    }
  }
  const rows = [...byEmail.values()].map(mapUser);
  const admins = rows.filter(r => r.role === 'admin');
  const premium = rows.filter(r => r.plan === 'premium');
  console.log(`Lidos: ${rows.length} usuários únicos | admins: ${admins.length} | premium: ${premium.length}`);
  console.log('Admins:', admins.map(a => a.email).join(', '));

  // 2. Refresh completo
  const { error: delErr } = await supabase.from('base44_users_import').delete().neq('email', '___nunca___');
  if (delErr) throw new Error('delete: ' + delErr.message);

  let inserted = 0;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('base44_users_import').insert(slice);
    if (error) throw new Error(`insert chunk ${i}: ${error.message}`);
    inserted += slice.length;
    process.stdout.write(`\r  inseridos: ${inserted}/${rows.length}`);
  }
  console.log(`\n✅ Re-import completo: ${inserted} usuários`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
