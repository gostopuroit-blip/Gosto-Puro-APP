import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// v2 - fixed array return
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const result = Array.isArray(users) ? users : [];
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});