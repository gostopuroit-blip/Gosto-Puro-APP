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

  // Look for a pending premium entry for this email
  const pending = await base44.asServiceRole.entities.PendingPremium.filter({
    email,
    status: "pending",
  });

  if (!pending || pending.length === 0) {
    return Response.json({ skipped: "no pending premium for " + email });
  }

  // Apply purchased_products slugs for all pending entries
  const slugsToAdd = [];
  for (const entry of pending) {
    const productId = entry.product_id;

    // Try to find GostoPuroProduct and add slug
    const gpProducts = await base44.asServiceRole.entities.GostoPuroProduct.filter({ hotmart_product_id: productId });
    if (gpProducts.length > 0) {
      slugsToAdd.push(gpProducts[0].slug);
    }

    // Legacy premium logic for first entry
    const PRODUCT_LIFETIME = "7079227";
    let updateData = {
      plan: "premium",
      subscription_level: "premium",
      subscription_status: "active",
      hotmart_product_id: productId,
      subscription_plan: "lifetime",
      expiration_date: null,
    };

    await base44.asServiceRole.entities.User.update(entityId, updateData);
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
  }

  // Apply all slugs to purchased_products
  if (slugsToAdd.length > 0) {
    const currentUser = await base44.asServiceRole.entities.User.filter({ email });
    if (currentUser.length > 0) {
      const current = currentUser[0].purchased_products || [];
      const merged = [...new Set([...current, ...slugsToAdd])];
      await base44.asServiceRole.entities.User.update(entityId, { purchased_products: merged });
    }
  }

  return Response.json({ success: true, email, applied: pending.length, slugs: slugsToAdd });
});