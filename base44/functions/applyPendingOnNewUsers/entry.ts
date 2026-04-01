import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const pendingList = await base44.asServiceRole.entities.PendingPremium.filter(
    { status: "pending" },
    "-created_date",
    3
  ).catch(() => []);

  if (!pendingList || pendingList.length === 0) {
    return Response.json({ skipped: "no pending premiums" });
  }

  const results = [];

  for (const entry of pendingList) {
    const email = entry.email?.toLowerCase()?.trim();
    if (!email) continue;

    const users = await base44.asServiceRole.entities.User.filter(
      { email },
      "-created_date",
      1
    ).catch(() => []);

    if (!users || users.length === 0) {
      results.push({ email, status: "still_not_registered" });
      continue;
    }

    const user = users[0];
    const updateData = {
      plan: "premium",
      subscription_level: "premium",
      subscription_status: "active",
      hotmart_product_id: entry.product_id,
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
      payload: JSON.stringify({ pending_id: entry.id, product_id: entry.product_id }),
      error_message: "",
      timestamp: new Date().toISOString(),
    });

    results.push({ email, status: "applied" });
  }

  return Response.json({ processed: results.length, results });
});