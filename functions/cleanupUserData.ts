import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Delete all folders for this user
    const folders = await base44.asServiceRole.entities.Folder.filter({ created_by: email });
    for (const folder of folders) {
      await base44.asServiceRole.entities.Folder.delete(folder.id);
    }

    // Delete all user recipes for this user
    const userRecipes = await base44.asServiceRole.entities.UserRecipe.filter({ created_by: email });
    for (const ur of userRecipes) {
      await base44.asServiceRole.entities.UserRecipe.delete(ur.id);
    }

    return Response.json({
      success: true,
      foldersDeleted: folders.length,
      userRecipesDeleted: userRecipes.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});