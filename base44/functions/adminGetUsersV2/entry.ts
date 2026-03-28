import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users with pagination to avoid limit issues
    let allUsers = [];
    let skip = 0;
    const pageSize = 100;
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', pageSize, skip);
      if (!Array.isArray(batch) || batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    return new Response(JSON.stringify(allUsers), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});