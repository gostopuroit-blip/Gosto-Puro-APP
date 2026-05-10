import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PREMIUM_PLAN_PRODUCT_IDS = ["7079227"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const email = (
    body?.data?.buyer?.email ||
    body?.buyer?.email ||
    body?.data?.purchase?.buyer?.email ||
    ""
  ).toLowerCase().trim();

  const productId = String(
    body?.data?.product?.id ||
    body?.product?.id ||
    body?.data?.purchase?.product?.id ||
    ""
  ).trim();

  const eventType = body?.event || body?.data?.purchase?.status || "PURCHASE_COMPLETE";
  const payloadStr = JSON.stringify(body);
  const transactionId = String(body?.data?.purchase?.transaction || body?.transaction || body?.id || "").trim();

  // IDEMPOTÊNCIA: checar se já processamos este transaction_id com sucesso
  if (transactionId) {
    const existingLogs = await base44.asServiceRole.entities.WebhookLog.filter({ transaction_id: transactionId, status: "success" });
    if (existingLogs.length > 0) {
      console.log(`[hotmartProductWebhook] Duplicado ignorado — transaction_id=${transactionId}`);
      return Response.json({ success: true, message: "Already processed", duplicate: true });
    }
  }

  if (!email || !productId) {
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart", event_type: eventType, status: "error",
      user_email: email || "unknown", payload: payloadStr,
      error_message: "Missing email or product_id",
      transaction_id: transactionId || undefined,
      timestamp: new Date().toISOString(),
    });
    return Response.json({ error: "Missing email or product_id" }, { status: 400 });
  }

  // Buscar GostoPuroProduct pelo hotmart_product_id
  const gpProducts = await base44.asServiceRole.entities.GostoPuroProduct.filter({ hotmart_product_id: productId });
  const gpProduct = gpProducts[0];

  // CASO 1: Produto encontrado no GostoPuroProduct → libera produto
  if (gpProduct) {
    const slug = gpProduct.slug;
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const user = users[0];

    if (user) {
      const current = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      if (!current.includes(slug)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: [...current, slug],
        });
      }
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: eventType, status: "success",
        user_email: email, payload: payloadStr,
        error_message: `Slug applied: ${slug}`,
        transaction_id: transactionId || undefined,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, email, slug });
    } else {
      await base44.asServiceRole.entities.PendingPremium.create({
        email, product_id: productId, event_type: eventType,
        raw_payload: payloadStr, status: "pending",
      });
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: eventType, status: "success",
        user_email: email, payload: payloadStr,
        error_message: `User not registered yet — saved to PendingPremium (slug: ${slug})`,
        transaction_id: transactionId || undefined,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, pending: true, email, slug });
    }
  }

  // CASO 2: Produto premium do app principal → dá plan=premium
  if (PREMIUM_PLAN_PRODUCT_IDS.includes(productId)) {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const user = users[0];
    if (user) {
      await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
    } else {
      await base44.asServiceRole.entities.PendingPremium.create({
        email, product_id: productId, event_type: eventType,
        raw_payload: payloadStr, status: "pending",
      });
    }
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart", event_type: eventType, status: "success",
      user_email: email, payload: payloadStr,
      error_message: user ? "Premium plan applied directly" : "Saved to PendingPremium (premium plan)",
      transaction_id: transactionId || undefined,
      timestamp: new Date().toISOString(),
    });
    return Response.json({ success: true, email, plan: "premium" });
  }

  // CASO 3: Produto desconhecido → dar plan=premium ao usuário
  const unknownUsers = await base44.asServiceRole.entities.User.list();
  const unknownUser = unknownUsers.find(u => (u.email || "").toLowerCase().trim() === email);
  if (unknownUser) {
    await base44.asServiceRole.entities.User.update(unknownUser.id, { plan: "premium" });
  } else {
    await base44.asServiceRole.entities.PendingPremium.create({
      email, product_id: productId, event_type: eventType,
      raw_payload: payloadStr, status: "pending",
    });
  }
  await base44.asServiceRole.entities.WebhookLog.create({
    source: "Hotmart", event_type: eventType, status: "success",
    user_email: email, payload: payloadStr,
    error_message: unknownUser ? "Unknown product — premium granted" : "Unknown product — saved to PendingPremium",
    transaction_id: transactionId || undefined,
    timestamp: new Date().toISOString(),
  });
  return Response.json({ success: true, action: unknownUser ? "premium_granted" : "pending", productId });
});