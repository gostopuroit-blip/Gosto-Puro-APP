import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_PRODUCT_ID = "7079227";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const pending = await base44.asServiceRole.entities.PendingPremium.filter({ status: "pending" });
  console.log(`[processPendingPremium] ${pending.length} registros pendentes encontrados`);

  let processed = 0;

  for (const record of pending) {
    const email = (record.email || "").toLowerCase().trim();
    const productId = String(record.product_id || "").trim();

    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      console.log(`[processPendingPremium] Usuário não encontrado ainda: ${email}`);
      continue;
    }

    const user = users[0];

    // Buscar produto GP pelo hotmart_product_id
    const gpProducts = await base44.asServiceRole.entities.GostoPuroProduct.filter({ hotmart_product_id: productId });

    if (gpProducts && gpProducts.length > 0) {
      const slug = gpProducts[0].slug;
      const current = user.purchased_products || [];
      if (!current.includes(slug)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: [...current, slug],
        });
      }
      console.log(`[processPendingPremium] Produto GP aplicado: ${email} → ${slug}`);
    } else if (productId === APP_PRODUCT_ID) {
      await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
      console.log(`[processPendingPremium] Plan premium aplicado: ${email}`);
    } else {
      console.log(`[processPendingPremium] Produto não encontrado (${productId}), marcando como applied mesmo assim: ${email}`);
    }

    await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied" });
    processed++;
  }

  console.log(`[processPendingPremium] Processados: ${processed}/${pending.length}`);
  return Response.json({ processed, total: pending.length });
});