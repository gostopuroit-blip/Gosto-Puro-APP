import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_PRODUCT_ID = "7079227";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();

    const email = (body?.data?.buyer?.email || "").toLowerCase().trim();
    const productId = String(body?.data?.product?.id || "").trim();
    const purchaseStatus = body?.data?.purchase?.status || "";
    const event = body?.event || "";
    const payloadStr = JSON.stringify(body);

    console.log(`[hotmartWebhook] Recebido — event=${event}, status=${purchaseStatus}, email=${email}, productId=${productId}`);

    // Aceitar apenas eventos e statuses válidos
    const validEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
    const validStatuses = ["APPROVED", "COMPLETED"];
    if (!validEvents.includes(event) || !validStatuses.includes(purchaseStatus)) {
      console.log(`[hotmartWebhook] Ignorando evento/status inválido`);
      return Response.json({ status: "ok" });
    }

    if (!email || !productId) {
      console.log(`[hotmartWebhook] Email ou productId ausente`);
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: event, status: "error",
        user_email: email || "unknown", payload: payloadStr,
        error_message: "Missing email or product_id",
        timestamp: new Date().toISOString(),
      });
      return Response.json({ status: "ok" });
    }

    // PASSO 1: Buscar GostoPuroProduct pelo hotmart_product_id
    console.log(`[hotmartWebhook] Buscando GostoPuroProduct com hotmart_product_id=${productId}`);
    const allGpProducts = await base44.asServiceRole.entities.GostoPuroProduct.list();
    const gpProduct = allGpProducts.find(p => String(p.hotmart_product_id || "").trim() === productId);
    console.log(`[hotmartWebhook] GostoPuroProduct encontrado: ${gpProduct ? gpProduct.slug : "NÃO"}`);

    // PASSO 2: Buscar User pelo email (case-insensitive)
    console.log(`[hotmartWebhook] Buscando usuário com email=${email}`);
    const allUsers = await base44.asServiceRole.entities.User.list();
    const user = allUsers.find(u => (u.email || "").toLowerCase().trim() === email);
    console.log(`[hotmartWebhook] Usuário encontrado: ${user ? user.id : "NÃO"}`);

    // CASO 1: Usuário encontrado E produto GP encontrado → liberar imediatamente
    if (user && gpProduct) {
      const slug = gpProduct.slug;
      const current = user.purchased_products || [];
      if (!current.includes(slug)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: [...current, slug],
        });
        console.log(`[hotmartWebhook] Produto liberado: ${email} → ${slug}`);
      } else {
        console.log(`[hotmartWebhook] Produto já presente: ${email} → ${slug}`);
      }
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: event, status: "success",
        user_email: email, payload: payloadStr,
        error_message: `Produto liberado: ${slug}`,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, action: "unlocked", slug });
    }

    // CASO 2: Usuário NÃO encontrado E produto GP encontrado → salvar como pending
    if (!user && gpProduct) {
      const existing = await base44.asServiceRole.entities.PendingPremium.list();
      const alreadyExists = existing.find(r => 
        (r.email || "").toLowerCase().trim() === email && 
        String(r.product_id || "").trim() === productId &&
        r.status === "pending"
      );
      if (!alreadyExists) {
        await base44.asServiceRole.entities.PendingPremium.create({
          email, product_id: productId, event_type: event,
          raw_payload: payloadStr, status: "pending",
        });
        console.log(`[hotmartWebhook] Salvo como pending: ${email} → ${gpProduct.slug}`);
      } else {
        console.log(`[hotmartWebhook] Já existe pending para: ${email} → ${productId}`);
      }
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: event, status: "success",
        user_email: email, payload: payloadStr,
        error_message: `User not found - saved as pending (slug: ${gpProduct.slug})`,
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, action: "pending" });
    }

    // CASO 3: Produto NÃO encontrado em GostoPuroProduct
    if (productId === APP_PRODUCT_ID) {
      // É o app principal — dar plan premium
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
        console.log(`[hotmartWebhook] Plan premium aplicado: ${email}`);
      } else {
        // Salvar como pending
        const existing = await base44.asServiceRole.entities.PendingPremium.list();
        const alreadyExists = existing.find(r =>
          (r.email || "").toLowerCase().trim() === email &&
          String(r.product_id || "").trim() === productId &&
          r.status === "pending"
        );
        if (!alreadyExists) {
          await base44.asServiceRole.entities.PendingPremium.create({
            email, product_id: productId, event_type: event,
            raw_payload: payloadStr, status: "pending",
          });
          console.log(`[hotmartWebhook] App principal — usuário não registrado, salvo como pending: ${email}`);
        }
      }
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: event, status: "success",
        user_email: email, payload: payloadStr,
        error_message: user ? "App principal — plan=premium aplicado" : "App principal — saved as pending",
        timestamp: new Date().toISOString(),
      });
      return Response.json({ success: true, action: "premium" });
    }

    // É um ebook → salvar em EbookPurchaseTrigger para followup 48h
    const approvedAt = new Date().toISOString();
    const triggerAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.EbookPurchaseTrigger.create({
      user_email: email,
      user_name: body?.data?.buyer?.name || "",
      hotmart_product_id: productId,
      hotmart_transaction_id: String(body?.data?.purchase?.transaction || ""),
      purchase_status: "approved",
      purchase_approved_at: approvedAt,
      email_trigger_at: triggerAt,
      followup_email_sent: false,
    });
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart", event_type: event, status: "success",
      user_email: email, payload: payloadStr,
      error_message: `Ebook registrado para followup 48h: ${productId}`,
      timestamp: new Date().toISOString(),
    });
    console.log(`[hotmartWebhook] Ebook followup agendado: ${email} → ${productId}`);
    return Response.json({ success: true, action: "ebook" });

  } catch (error) {
    console.error("[hotmartWebhook] Erro:", error.message);
    return Response.json({ status: "ok" });
  }
});