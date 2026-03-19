import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// This function runs daily and revokes premium for users whose subscription has expired.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date().toISOString().split("T")[0];

  // Get all premium users with a non-null expiration_date
  const users = await base44.asServiceRole.entities.User.list("-created_date", 1000);

  const expired = users.filter(u =>
    u.plan === "premium" &&
    u.subscription_plan !== "lifetime" &&
    u.expiration_date &&
    u.expiration_date < today
  );

  let revoked = 0;
  for (const u of expired) {
    await base44.asServiceRole.entities.User.update(u.id, {
      plan: "free",
      subscription_level: "free",
      subscription_status: "expired",
    });
    revoked++;
  }

  return Response.json({ success: true, revoked, today });
});