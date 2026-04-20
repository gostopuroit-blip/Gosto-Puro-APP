import { createClientFromRequest } from "npm:@base44/sdk";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Buscar apenas 10 pendentes por vez para não estourar rate limit
  const allPending = await db.PendingPremium.filter({ status: "pending" });
  const pending = allPending.slice(0, 10);
  
  let processed = 0;
  let still_pending = 0;
  const errors = [];

  for (const record of pending) {
    try {
      // Pausa de 300ms entre cada registro para evitar rate limit
      await sleep(300);

      const productId = String(record.product_id);

      // Buscar usuário
      const users = await db.User.filter({ email: record.email });
      await sleep(200);
      
      if (!users || users.length === 0) {
        still_pending++;
        continue;
      }

      const user = users[0];

      // Buscar produto
      const products = await db.GostoPuroProduct.filter({ hotmart_product_id: productId });
      await sleep(200);

      let slug = null;
      if (products && products.length > 0) {
        slug = products[0].slug;
      }

      // Montar purchased_products
      const current = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      const updated = slug && !current.includes(slug) ? [...current, slug] : current;

      // Update usuário
      await db.User.update(user.id, { purchased_products: updated });
      await sleep(200);

      // Marcar como processed
      await db.PendingPremium.update(record.id, { status: "processed" });
      await sleep(200);

      processed++;
    } catch (err) {
      errors.push({ email: record.email, error: err.message });
      still_pending++;
    }
  }

  return Response.json({ 
    processed, 
    still_pending, 
    total: pending.length,
    errors: errors.slice(0, 5),
    note: "Processando 10 por vez. Rode novamente para processar mais."
  });
});