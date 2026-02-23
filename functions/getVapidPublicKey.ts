import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Always return as base64url (no +, /, or = padding)
    const raw = (Deno.env.get('VAPID_PUBLIC_KEY') || '').trim();
    const key = raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return Response.json({ publicKey: key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});