import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const pending = await db.PendingPremium.filter({ status: "pending" });
  
  let processed = 0;
  let still_pending = 0;
  const errors = [];

  for (const record of pending) {
    try {
      const email = (record.email || "").toLowerCase().trim();
      const productId = String(record.product_id);

      // Buscar usuário
      const users = await db.User.filter({ email: record.email });
      
      if (!users || users.length === 0) {
        still_pending++;
        continue;
      }

      const user = users[0];

      // Buscar produto
      const products = await db.GostoPuroProduct.filter({ hotmart_product_id: productId });

      let slug = null;
      if (products && products.length > 0) {
        slug = products[0].slug;
      }

      // Montar purchased_products
      const current = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      const updated = slug && !current.includes(slug) ? [...current, slug] : current;

      // Fazer update
      const updateResult = await db.User.update(user.id, { purchased_products: updated });

      // Marcar como processed
      await db.PendingPremium.update(record.id, { status: "processed" });

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
    errors: errors.slice(0, 5)
  });
});