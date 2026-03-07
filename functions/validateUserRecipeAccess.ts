import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    // Check if trying to add to custom folder
    if (data.folder_ids && Array.isArray(data.folder_ids) && data.folder_ids.length > 0) {
      const isPremium = user.plan === "premium" || user.role === "admin";
      
      if (!isPremium) {
        return Response.json(
          { error: 'Solo gli utenti premium possono usare cartelle personalizzate' },
          { status: 403 }
        );
      }

      // Verify all folders exist and belong to user
      for (const folderId of data.folder_ids) {
        const folder = await base44.asServiceRole.entities.Folder.get(folderId).catch(() => null);
        if (!folder) {
          return Response.json(
            { error: 'Cartella non trovata' },
            { status: 404 }
          );
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});