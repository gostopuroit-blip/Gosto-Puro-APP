import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const FREE_LIMIT = 4;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  // Step 1: Get ALL UserRecipes where is_saved=true, sorted by created_date ASC
  // Group by created_by (user email)
  const allSaved = await base44.asServiceRole.entities.UserRecipe.filter(
    { is_saved: true },
    "created_date",
    10000
  );

  // Step 2: Check which users are premium (build a lookup set)
  const allUsers = await base44.asServiceRole.entities.User.list("-created_date", 5000);
  const premiumEmails = new Set(
    allUsers
      .filter(u => u.plan === 'premium' || u.role === 'admin' || u.subscription_level === 'premium')
      .map(u => u.email?.toLowerCase()?.trim())
      .filter(Boolean)
  );

  // Step 3: Group saved recipes by user email
  const byUser = {};
  for (const ur of allSaved) {
    const email = ur.created_by?.toLowerCase()?.trim();
    if (!email || premiumEmails.has(email)) continue; // skip premium
    if (!byUser[email]) byUser[email] = [];
    byUser[email].push(ur);
  }

  // Step 4: Find users with more than FREE_LIMIT saved
  const toDeleteIds = [];
  const report = [];

  for (const [email, recipes] of Object.entries(byUser)) {
    if (recipes.length <= FREE_LIMIT) continue;
    // Already sorted by created_date ASC — keep first 4, delete the rest
    const excess = recipes.slice(FREE_LIMIT);
    toDeleteIds.push(...excess.map(r => r.id));
    report.push({ email, had: recipes.length, kept: FREE_LIMIT, deleted: excess.length });
  }

  if (dryRun) {
    return Response.json({ dryRun: true, usersAffected: report.length, totalToDelete: toDeleteIds.length, report });
  }

  // Step 5: Delete in parallel batches of 20
  let totalDeleted = 0;
  const batchSize = 20;
  for (let i = 0; i < toDeleteIds.length; i += batchSize) {
    const batch = toDeleteIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => base44.asServiceRole.entities.UserRecipe.delete(id)));
    totalDeleted += batch.length;
  }

  return Response.json({ success: true, usersAffected: report.length, totalDeleted, report });
});