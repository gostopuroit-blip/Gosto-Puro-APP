import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const key = (Deno.env.get('VAPID_PUBLIC_KEY') || '').trim();
    return Response.json({ publicKey: key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});