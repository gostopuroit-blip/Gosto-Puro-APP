import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const pendingList = await base44.asServiceRole.entities.PendingPremium.filter(
    { status: "pending" },
    "-created_date",
    100
  ).catch(() => []);

  if (!pendingList || pendingList.length === 0) {
    return Response.json({ skipped: "no pending premiums" });
  }

  // Load all products once
  const allProducts = await base44.asServiceRole.entities.GostoPuroProduct.list("-created_date", 200).catch(() => []);

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
    const productId = String(entry.product_id || "");
    const gpProduct = allProducts.find(p => String(p.hotmart_product_id) === productId);

    const updateData = {};

    if (gpProduct) {
      // Add slug to purchased_products
      const current = user.purchased_products || [];
      if (!current.includes(gpProduct.slug)) {
        updateData.purchased_products = [...current, gpProduct.slug];
      }
    } else {
      // Fallback: grant generic premium
      updateData.plan = "premium";
      updateData.subscription_level = "premium";
      updateData.subscription_status = "active";
      updateData.subscription_plan = "lifetime";
      updateData.expiration_date = null;
      if (productId) updateData.hotmart_product_id = productId;
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updateData);
    }

    await base44.asServiceRole.entities.PendingPremium.update(entry.id, { status: "applied" });
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "applyPendingOnNewUsers",
      event_type: "AUTO_APPLY_PREMIUM",
      status: "success",
      user_email: email,
      payload: JSON.stringify({ pending_id: entry.id, product_id: productId, slug: gpProduct?.slug || null }),
      error_message: "",
      timestamp: new Date().toISOString(),
    });

    results.push({ email, status: "applied", slug: gpProduct?.slug || null });
    console.log(`[applyPendingOnNewUsers] Aplicado: ${email} → ${gpProduct?.slug || "premium genérico"}`);
  }

  return Response.json({ processed: results.length, results });
});