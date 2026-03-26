import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Runs every 5 minutes — finds pending premiums and applies them to registered users
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const pendingList = await base44.asServiceRole.entities.PendingPremium.filter({ status: "pending" });

  if (!pendingList || pendingList.length === 0) {
    return Response.json({ skipped: "no pending premiums" });
  }

  const users = await base44.asServiceRole.entities.User.list("-created_date", 5000);

  const PRODUCT_LIFETIME = "7079227";
  const results = [];

  for (const entry of pendingList) {
    const email = entry.email?.toLowerCase()?.trim();
    const user = users.find(u => u.email?.toLowerCase()?.trim() === email);

    if (!user) {
      results.push({ email, status: "still_not_registered" });
      continue;
    }

    const productId = entry.product_id;
    let updateData = {
      plan: "premium",
      subscription_level: "premium",
      subscription_status: "active",
      hotmart_product_id: productId,
      subscription_plan: "lifetime",
      expiration_date: null,
    };

    await base44.asServiceRole.entities.User.update(user.id, updateData);
    await base44.asServiceRole.entities.PendingPremium.update(entry.id, { status: "applied" });

    await base44.asServiceRole.entities.WebhookLog.create({
      source: "applyPendingOnNewUsers",
      event_type: "AUTO_APPLY_PREMIUM",
      status: "success",
      user_email: email,
      payload: JSON.stringify({ pending_id: entry.id, product_id: productId }),
      error_message: "",
      timestamp: new Date().toISOString(),
    });

    results.push({ email, status: "applied" });
  }

  return Response.json({ processed: results.length, results });
});