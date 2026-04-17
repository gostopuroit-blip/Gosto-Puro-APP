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

  // --- Processar PendingPremium (planos premium) ---
  const slugsToAdd = [];
  let grantPremium = false;
  let premiumProductId = null;

  if (pending && pending.length > 0) {
    const allProducts = await base44.asServiceRole.entities.GostoPuroProduct.list("-created_date", 200);

    for (const entry of pending) {
      const productId = String(entry.product_id || "");
      const gpProduct = allProducts.find(p => String(p.hotmart_product_id) === productId);

      if (gpProduct) {
        slugsToAdd.push(gpProduct.slug);
      } else {
        grantPremium = true;
        premiumProductId = productId;
      }

      await base44.asServiceRole.entities.PendingPremium.update(entry.id, { status: "applied" });
    }
  }

  // --- Processar PendingPurchase (produtos GostoPuro) ---
  const pendingPurchases = await base44.asServiceRole.entities.PendingPurchase.filter({
    email,
    applied: false,
  });

  if (pendingPurchases && pendingPurchases.length > 0) {
    for (const pp of pendingPurchases) {
      if (pp.slug) slugsToAdd.push(pp.slug);
      await base44.asServiceRole.entities.PendingPurchase.update(pp.id, { applied: true });
    }
    console.log(`[onUserRegistered] PendingPurchase encontradas: ${email} → ${pendingPurchases.map(p => p.slug).join(", ")}`);
  }

  // Se não há nada para aplicar, encerrar
  if (!grantPremium && slugsToAdd.length === 0) {
    return Response.json({ skipped: "nothing pending for " + email });
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

  await base44.asServiceRole.entities.User.update(entityId, updateData);

  await base44.asServiceRole.entities.WebhookLog.create({
    source: "onUserRegistered",
    event_type: "AUTO_APPLY_PENDING",
    status: "success",
    user_email: email,
    payload: JSON.stringify({ applied: (pending?.length || 0) + (pendingPurchases?.length || 0), slugs: slugsToAdd, premium: grantPremium }),
    error_message: "",
    timestamp: new Date().toISOString(),
  });

  console.log(`[onUserRegistered] Aplicado: ${email} → slugs: ${slugsToAdd.join(", ")}, premium: ${grantPremium}`);
  return Response.json({ success: true, email, slugs: slugsToAdd, premium: grantPremium });
});