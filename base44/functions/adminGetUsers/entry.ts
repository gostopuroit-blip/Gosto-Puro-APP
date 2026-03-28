import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const usersArray = Array.isArray(users) ? users : [];
    return Response.json(usersArray);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});