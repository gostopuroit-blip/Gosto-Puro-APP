import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();

    const email = (body?.data?.buyer?.email || "").toLowerCase().trim();
    const hotmartProductId = String(body?.data?.product?.id || "").trim();
    const purchaseStatus = body?.data?.purchase?.status || "";
    const event = body?.event || "";
    const payloadStr = JSON.stringify(body);

    // Log a tentativa
    console.log(`[hotmartWebhook] Event: ${event}, Status: ${purchaseStatus}, Email: ${email}, ProductId: ${hotmartProductId}`);

    // Aceitar PURCHASE_APPROVED ou PURCHASE_COMPLETE
    const validEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
    const validStatuses = ["APPROVED", "COMPLETED"];
    if (!validEvents.includes(event) || !validStatuses.includes(purchaseStatus)) {
      console.log(`[hotmartWebhook] Ignorando evento: event=${event}, status=${purchaseStatus}`);
      return Response.json({ status: "ok" });
    }

    if (!email || !hotmartProductId) {
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart",
        event_type: event,
        status: "error",
        user_email: email || "unknown",
        payload: payloadStr,
        error_message: "Missing email or product_id",
        timestamp: new Date().toISOString(),
      });
      return Response.json({ status: "ok" });
    }

    // Buscar produto pelo hotmart_product_id
    const products = await base44.asServiceRole.entities.GostoPuroProduct.filter({
      hotmart_product_id: hotmartProductId,
    });

    if (!products || products.length === 0) {
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart",
        event_type: event,
        status: "error",
        user_email: email,
        payload: payloadStr,
        error_message: `Produto não encontrado: ${hotmartProductId}`,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ status: "ok" });
    }

    const product = products[0];
    const slug = product.slug;

    // Buscar usuário pelo email
    const users = await base44.asServiceRole.entities.User.filter({ email });

    if (!users || users.length === 0) {
      // Verificar se já existe PendingPremium com mesmo email + product_id
      const existing = await base44.asServiceRole.entities.PendingPremium.filter({
        email,
        product_id: hotmartProductId,
      });
      if (existing && existing.length > 0) {
        console.log(`[hotmartWebhook] PendingPremium já existe para ${email} / ${hotmartProductId}, ignorando duplicata`);
        return Response.json({ status: "ok" });
      }

      // Salvar compra pendente para aplicar quando usuário criar conta
      await base44.asServiceRole.entities.PendingPremium.create({
        email,
        product_id: hotmartProductId,
        event_type: event,
        raw_payload: payloadStr,
        status: "pending",
      });
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart",
        event_type: event,
        status: "pending",
        user_email: email,
        payload: payloadStr,
        error_message: "Compra salva — usuário ainda não registrado",
        timestamp: new Date().toISOString(),
      });
      console.log(`[hotmartWebhook] Usuário não encontrado, compra salva em PendingPremium: ${email}`);
      return Response.json({ status: "ok" });
    }

    const user = users[0];

    // Adicionar slug ao array purchased_products sem duplicar
    const current = user.purchased_products || [];
    if (!current.includes(slug)) {
      await base44.asServiceRole.entities.User.update(user.id, {
        purchased_products: [...current, slug],
      });
    }

    // Logar sucesso
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart",
      event_type: event,
      status: "success",
      user_email: email,
      payload: payloadStr,
      error_message: "",
      timestamp: new Date().toISOString(),
    });

    console.log(`[hotmartWebhook] Sucesso: ${email} → ${slug}`);
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[hotmartWebhook] Erro:", error.message);
    return Response.json({ status: "ok" });
  }
});