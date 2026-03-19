import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const FREE_LIMIT = 4;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get all users
  const allUsers = await base44.asServiceRole.entities.User.list("-created_date", 5000);
  const freeUsers = allUsers.filter(u => u.plan !== 'premium' && u.role !== 'admin' && u.subscription_level !== 'premium');

  let totalDeleted = 0;
  let usersAffected = 0;
  const report = [];

  for (const freeUser of freeUsers) {
    // Get all saved UserRecipes for this user
    const userRecipes = await base44.asServiceRole.entities.UserRecipe.filter(
      { created_by: freeUser.email, is_saved: true },
      "created_date",
      500
    );

    if (userRecipes.length <= FREE_LIMIT) continue;

    // Keep the first 4 (oldest), delete the rest
    const toDelete = userRecipes.slice(FREE_LIMIT);
    
    for (const ur of toDelete) {
      await base44.asServiceRole.entities.UserRecipe.delete(ur.id);
      totalDeleted++;
    }

    usersAffected++;
    report.push({
      email: freeUser.email,
      had: userRecipes.length,
      kept: FREE_LIMIT,
      deleted: toDelete.length,
    });
  }

  return Response.json({
    success: true,
    usersAffected,
    totalDeleted,
    report,
  });
});