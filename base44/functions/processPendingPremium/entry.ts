import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Buscar todos os PendingPremium com status "pending"
  const pending = await base44.asServiceRole.entities.PendingPremium.filter({
    status: "pending"
  });

  let processed = 0;
  let still_pending = 0;

  for (const record of pending) {
    try {
      // Buscar usuário pelo email
      const users = await base44.asServiceRole.entities.User.filter({
        email: record.email
      });

      if (users.length === 0) {
        still_pending++;
        continue;
      }

      const user = users[0];

      // Buscar produto pelo hotmart_product_id para pegar o slug correto
      const products = await base44.asServiceRole.entities.GostoPuroProduct.filter({
        hotmart_product_id: String(record.product_id)
      });

      if (products.length === 0) {
        // Produto não encontrado, marcar como processed para não reprocessar
        await base44.asServiceRole.entities.PendingPremium.update(record.id, {
          status: "processed"
        });
        processed++;
        continue;
      }

      const product = products[0];
      const slug = product.slug;

      // Adicionar slug ao purchased_products sem duplicar
      const currentProducts = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      if (!currentProducts.includes(slug)) {
        currentProducts.push(slug);
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: currentProducts
        });
      }

      // Marcar como processed
      await base44.asServiceRole.entities.PendingPremium.update(record.id, {
        status: "processed"
      });

      processed++;
    } catch (err) {
      still_pending++;
    }
  }

  return Response.json({ processed, still_pending, total: pending.length });
});