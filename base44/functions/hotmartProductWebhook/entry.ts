import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PREMIUM_PLAN_PRODUCT_IDS = ["7079227"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();

  // 1. Extrair email
  const email = (
    body?.data?.buyer?.email ||
    body?.buyer?.email ||
    body?.data?.purchase?.buyer?.email ||
    ""
  ).toLowerCase().trim();

  // 2. Extrair product_id
  const productId = String(
    body?.data?.product?.id ||
    body?.product?.id ||
    body?.data?.purchase?.product?.id ||
    ""
  ).trim();

  const eventType = body?.event || body?.data?.purchase?.status || "PURCHASE_COMPLETE";
  const payloadStr = JSON.stringify(body);

  if (!email || !productId) {
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart", event_type: eventType, status: "error",
      user_email: email || "unknown", payload: payloadStr,
      error_message: "Missing email or product_id", timestamp: new Date().toISOString(),
    });
    return Response.json({ error: "Missing email or product_id" }, { status: 400 });
  }

  // 3. Buscar GostoPuroProduct pelo hotmart_product_id
  const gpProducts = await base44.asServiceRole.entities.GostoPuroProduct.filter({ hotmart_product_id: productId });
  const gpProduct = gpProducts[0];

  // 4. SE encontrou produto GP
  if (gpProduct) {
    const slug = gpProduct.slug;
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const user = users[0];

    if (user) {
      // Usuário existe → adicionar slug ao purchased_products
      const current = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      if (!current.includes(slug)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: [...current, slug],
        });
      }
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: eventType, status: "success",
        user_email: email, payload: payloadStr, error_message: "",
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, email, slug });
    } else {
      // Usuário não existe → salvar em PendingPremium
      await base44.asServiceRole.entities.PendingPremium.create({
        email, product_id: productId, event_type: eventType,
        raw_payload: payloadStr, status: "pending",
      });
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: eventType, status: "success",
        user_email: email, payload: payloadStr,
        error_message: "User not found — saved as pending",
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, pending: true, email, slug });
    }
  }

  // 5. NÃO encontrou produto GP + é produto premium do app
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
      user_email: email, payload: payloadStr, error_message: "Premium plan applied",
      timestamp: new Date().toISOString(),
    });
    return Response.json({ success: true, email, plan: "premium" });
  }

  // 6. NÃO encontrou produto GP + NÃO é produto premium → é ebook real → salvar em EbookPurchaseTrigger
  const buyerName = body?.data?.buyer?.name || body?.buyer?.name || "";
  const transactionId = body?.data?.purchase?.transaction || body?.purchase?.transaction || `hotmart_${Date.now()}`;
  const approvedAt = new Date().toISOString();

  await base44.asServiceRole.entities.EbookPurchaseTrigger.create({
    user_email: email,
    user_name: buyerName,
    hotmart_product_id: productId,
    hotmart_transaction_id: transactionId,
    purchase_status: "approved",
    purchase_approved_at: approvedAt,
    email_trigger_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    followup_email_sent: false,
  });

  await base44.asServiceRole.entities.WebhookLog.create({
    source: "Hotmart", event_type: eventType, status: "success",
    user_email: email, payload: payloadStr,
    error_message: "No GP product found — saved as EbookPurchaseTrigger",
    timestamp: new Date().toISOString(),
  });

  return Response.json({ success: true, email, ebook: true, productId });
});