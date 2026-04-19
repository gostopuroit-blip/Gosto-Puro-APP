import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Usa asServiceRole para contornar a RLS (read: false na entidade PendingPremium)
  const all = await base44.asServiceRole.entities.PendingPremium.list('-created_date', 200);
  const pending = all.filter(r => r.status === "pending");

  console.log(`[processPendingPremium] Total registros: ${all.length}, Pendentes: ${pending.length}`);

  for (const r of pending) {
    console.log(`[processPendingPremium] Pendente: email=${r.email}, product_id=${r.product_id}, status=${r.status}`);
  }

  if (pending.length === 0) {
    return Response.json({ processed: 0, still_pending: 0, total: 0 });
  }

  const allGpProducts = await base44.asServiceRole.entities.GostoPuroProduct.list('-created_date', 200);
  const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 5000);

  const APP_PRODUCT_ID = "7079227";
  let processed = 0;

  for (const record of pending) {
    const email = (record.email || "").toLowerCase().trim();
    const productId = String(record.product_id || "").trim();

    const user = allUsers.find(u => (u.email || "").toLowerCase().trim() === email);

    if (!user) {
      console.log(`[processPendingPremium] Usuário não encontrado ainda: ${email}`);
      continue;
    }

    console.log(`[processPendingPremium] Usuário encontrado: ${user.email} (id=${user.id})`);

    const gpProduct = allGpProducts.find(p => String(p.hotmart_product_id || "").trim() === productId);

    if (gpProduct) {
      const slug = gpProduct.slug;
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