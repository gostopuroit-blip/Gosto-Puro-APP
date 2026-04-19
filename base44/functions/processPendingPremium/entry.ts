import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_PRODUCT_ID = "7079227";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Busca todos e filtra manualmente para garantir que o filtro funciona
  const all = await base44.asServiceRole.entities.PendingPremium.list();
  const pending = all.filter(r => r.status === "pending");

  console.log(`[processPendingPremium] Total registros: ${all.length}, Pendentes: ${pending.length}`);
  // Log detalhado dos pendentes para debug
  for (const r of pending) {
    console.log(`[processPendingPremium] Pendente: email=${r.email}, product_id=${r.product_id}, status=${r.status}`);
  }

  let processed = 0;

  for (const record of pending) {
    const email = (record.email || "").toLowerCase().trim();
    const productId = String(record.product_id || "").trim();

    // Busca todos os usuários e filtra manualmente para case-insensitive
    const allUsers = await base44.asServiceRole.entities.User.list();
    const users = allUsers.filter(u => (u.email || "").toLowerCase().trim() === email);

    if (!users || users.length === 0) {
      console.log(`[processPendingPremium] Usuário não encontrado ainda: ${email}`);
      continue;
    }

    const user = users[0];
    console.log(`[processPendingPremium] Usuário encontrado: ${user.email} (id=${user.id})`);

    // Buscar produto GP pelo hotmart_product_id
    const allGpProducts = await base44.asServiceRole.entities.GostoPuroProduct.list();
    const gpProducts = allGpProducts.filter(p => String(p.hotmart_product_id || "").trim() === productId);

    if (gpProducts && gpProducts.length > 0) {
      const slug = gpProducts[0].slug;
      const current = user.purchased_products || [];
      if (!current.includes(slug)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: [...current, slug],
        });
        console.log(`[processPendingPremium] Produto GP aplicado: ${email} → ${slug}`);
      } else {
        console.log(`[processPendingPremium] Produto GP já presente: ${email} → ${slug}`);
      }
    } else if (productId === APP_PRODUCT_ID) {
      await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
      console.log(`[processPendingPremium] Plan premium aplicado: ${email}`);
    } else {
      console.log(`[processPendingPremium] Produto não encontrado (${productId}) para: ${email}`);
    }

    await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied" });
    processed++;
  }

  const still_pending = pending.length - processed;
  console.log(`[processPendingPremium] Processados: ${processed}, Ainda pendentes: ${still_pending}`);
  return Response.json({ processed, still_pending, total: pending.length });
});