import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_PRODUCT_ID = "7079227";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();

    const email = (body?.data?.buyer?.email || "").toLowerCase().trim();
    const hotmartProductId = String(body?.data?.product?.id || "").trim();
    const purchaseStatus = body?.data?.purchase?.status || "";
    const event = body?.event || "";
    const payloadStr = JSON.stringify(body);

    console.log(`[hotmartWebhook] Event: ${event}, Status: ${purchaseStatus}, Email: ${email}, ProductId: ${hotmartProductId}`);

    // Aceitar apenas PURCHASE_APPROVED ou PURCHASE_COMPLETE com status válido
    const validEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
    const validStatuses = ["APPROVED", "COMPLETED"];
    if (!validEvents.includes(event) || !validStatuses.includes(purchaseStatus)) {
      console.log(`[hotmartWebhook] Ignorando: event=${event}, status=${purchaseStatus}`);
      return Response.json({ status: "ok" });
    }

    if (!email || !hotmartProductId) {
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart", event_type: event, status: "error",
        user_email: email || "unknown", payload: payloadStr,
        error_message: "Missing email or product_id",
        timestamp: new Date().toISOString(),
      });
      return Response.json({ status: "ok" });
    }

    // PASSO 1: Verificar se é um produto GostoPuro
    const gpProducts = await base44.asServiceRole.entities.GostoPuroProduct.filter({
      hotmart_product_id: hotmartProductId,
    });

    if (gpProducts && gpProducts.length > 0) {
      // É um produto Gosto Puro — liberar acesso pelo slug
      const slug = gpProducts[0].slug;
      const users = await base44.asServiceRole.entities.User.filter({ email });

      if (users && users.length > 0) {
        // Usuário existe — adicionar slug ao purchased_products
        const user = users[0];
        const current = user.purchased_products || [];
        if (!current.includes(slug)) {
          await base44.asServiceRole.entities.User.update(user.id, {
            purchased_products: [...current, slug],
          });
        }
        await base44.asServiceRole.entities.WebhookLog.create({
          source: "Hotmart", event_type: event, status: "success",
          user_email: email, payload: payloadStr,
          error_message: `Produto GP liberado: ${slug}`,
          timestamp: new Date().toISOString(),
        });
        console.log(`[hotmartWebhook] Produto GP liberado: ${email} → ${slug}`);
      } else {
        // Usuário não existe — salvar em PendingPremium
        const existing = await base44.asServiceRole.entities.PendingPremium.filter({
          email, product_id: hotmartProductId,
        });
        if (!existing || existing.length === 0) {
          await base44.asServiceRole.entities.PendingPremium.create({
            email, product_id: hotmartProductId, event_type: event,
            raw_payload: payloadStr, status: "pending",
          });
        }
        await base44.asServiceRole.entities.WebhookLog.create({
          source: "Hotmart", event_type: event, status: "pending",
          user_email: email, payload: payloadStr,
          error_message: `Usuário não registrado — PendingPremium GP: ${slug}`,
          timestamp: new Date().toISOString(),
        });
        console.log(`[hotmartWebhook] Usuário não registrado, PendingPremium GP: ${email} → ${slug}`);
      }
      return Response.json({ status: "ok" });
    }

    // PASSO 2: Não é produto GP — verificar se é o App principal
    if (hotmartProductId === APP_PRODUCT_ID) {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users && users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, { plan: "premium" });
        await base44.asServiceRole.entities.WebhookLog.create({
          source: "Hotmart", event_type: event, status: "success",
          user_email: email, payload: payloadStr,
          error_message: "App principal — plan=premium aplicado",
          timestamp: new Date().toISOString(),
        });
        console.log(`[hotmartWebhook] App principal premium: ${email}`);
      } else {
        // Salvar pendente
        const existing = await base44.asServiceRole.entities.PendingPremium.filter({
          email, product_id: hotmartProductId,
        });
        if (!existing || existing.length === 0) {
          await base44.asServiceRole.entities.PendingPremium.create({
            email, product_id: hotmartProductId, event_type: event,
            raw_payload: payloadStr, status: "pending",
          });
        }
        console.log(`[hotmartWebhook] App principal, usuário não registrado: ${email}`);
      }
      return Response.json({ status: "ok" });
    }

    // PASSO 3: É um ebook — salvar em EbookPurchaseTrigger para followup 48h
    const approvedAt = new Date().toISOString();
    const triggerAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.EbookPurchaseTrigger.create({
      user_email: email,
      user_name: body?.data?.buyer?.name || "",
      hotmart_product_id: hotmartProductId,
      hotmart_transaction_id: String(body?.data?.purchase?.transaction || ""),
      purchase_status: "approved",
      purchase_approved_at: approvedAt,
      email_trigger_at: triggerAt,
      followup_email_sent: false,
    });
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart", event_type: event, status: "success",
      user_email: email, payload: payloadStr,
      error_message: `Ebook registrado para followup 48h: ${hotmartProductId}`,
      timestamp: new Date().toISOString(),
    });
    console.log(`[hotmartWebhook] Ebook followup agendado: ${email} → ${hotmartProductId}`);
    return Response.json({ status: "ok" });

  } catch (error) {
    console.error("[hotmartWebhook] Erro:", error.message);
    return Response.json({ status: "ok" });
  }
});