import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const entityId = body?.event?.entity_id;
  const userData = body?.data;

  const email = userData?.email?.toLowerCase()?.trim();
  if (!email) {
    return Response.json({ skipped: "no email" });
  }

  // Look for a pending premium entry for this email
  const pending = await base44.asServiceRole.entities.PendingPremium.filter({
    email,
    status: "pending",
  });

  if (!pending || pending.length === 0) {
    return Response.json({ skipped: "no pending premium for " + email });
  }

  const entry = pending[0];
  const productId = entry.product_id;

  const PRODUCT_LIFETIME = "7079227";

  let updateData = {
    plan: "premium",
    subscription_level: "premium",
    subscription_status: "active",
    hotmart_product_id: productId,
  };

  if (productId === PRODUCT_LIFETIME) {
    updateData.subscription_plan = "lifetime";
    updateData.expiration_date = null;
  } else {
    // Default: treat as lifetime if unknown
    updateData.subscription_plan = "lifetime";
    updateData.expiration_date = null;
  }

  // Apply premium to the new user
  await base44.asServiceRole.entities.User.update(entityId, updateData);

  // Mark pending as applied
  await base44.asServiceRole.entities.PendingPremium.update(entry.id, { status: "applied" });

  await base44.asServiceRole.entities.WebhookLog.create({
    source: "onUserRegistered",
    event_type: "AUTO_APPLY_PREMIUM",
    status: "success",
    user_email: email,
    payload: JSON.stringify({ pending_id: entry.id, product_id: productId }),
    error_message: "",
    timestamp: new Date().toISOString(),
  });

  return Response.json({ success: true, email, plan: updateData.subscription_plan });
});