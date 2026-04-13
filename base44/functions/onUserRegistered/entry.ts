import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const entityId = body?.event?.entity_id;
  const userData = body?.data;

  const email = userData?.email?.toLowerCase()?.trim();
  if (!email) {
    return Response.json({ skipped: "no email" });
  }

  // Look for pending entries for this email
  const pending = await base44.asServiceRole.entities.PendingPremium.filter({
    email,
    status: "pending",
  });

  if (!pending || pending.length === 0) {
    return Response.json({ skipped: "no pending premium for " + email });
  }

  const slugsToAdd = [];
  let grantPremium = false;
  let premiumProductId = null;

  for (const entry of pending) {
    const productId = String(entry.product_id || "");

    // Try to find matching GostoPuroProduct
    const allProducts = await base44.asServiceRole.entities.GostoPuroProduct.list("-created_date", 200);
    const gpProduct = allProducts.find(p => String(p.hotmart_product_id) === productId);

    if (gpProduct) {
      slugsToAdd.push(gpProduct.slug);
    } else {
      // It's a premium plan product
      grantPremium = true;
      premiumProductId = productId;
    }

    await base44.asServiceRole.entities.PendingPremium.update(entry.id, { status: "applied" });
  }

  // Build update object
  const updateData = {};

  if (grantPremium) {
    updateData.plan = "premium";
    updateData.subscription_level = "premium";
    updateData.subscription_status = "active";
    updateData.subscription_plan = "lifetime";
    updateData.expiration_date = null;
    if (premiumProductId) updateData.hotmart_product_id = premiumProductId;
  }

  if (slugsToAdd.length > 0) {
    const current = userData?.purchased_products || [];
    updateData.purchased_products = [...new Set([...current, ...slugsToAdd])];
  }

  if (Object.keys(updateData).length > 0) {
    await base44.asServiceRole.entities.User.update(entityId, updateData);
  }

  await base44.asServiceRole.entities.WebhookLog.create({
    source: "onUserRegistered",
    event_type: "AUTO_APPLY_PENDING",
    status: "success",
    user_email: email,
    payload: JSON.stringify({ applied: pending.length, slugs: slugsToAdd, premium: grantPremium }),
    error_message: "",
    timestamp: new Date().toISOString(),
  });

  return Response.json({ success: true, email, applied: pending.length, slugs: slugsToAdd, premium: grantPremium });
});