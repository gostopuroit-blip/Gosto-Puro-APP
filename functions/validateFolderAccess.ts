import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    // Only validate non-system folders
    if (data.is_system) {
      return Response.json({ success: true });
    }

    // Check if user is premium or admin
    const isPremium = user.plan === "premium" || user.role === "admin";
    
    if (!isPremium) {
      return Response.json(
        { error: 'Solo gli utenti premium possono creare/modificare cartelle personalizzate' },
        { status: 403 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});