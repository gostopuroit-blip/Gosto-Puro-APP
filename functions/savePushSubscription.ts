import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint, p256dh, auth } = await req.json();

    // Check if subscription already exists
    const existing = await base44.entities.PushSubscription.filter({ endpoint });
    if (existing.length > 0) {
      return Response.json({ success: true, already_exists: true });
    }

    await base44.entities.PushSubscription.create({
      endpoint,
      p256dh,
      auth,
      user_email: user.email,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});