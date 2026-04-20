import { createClientFromRequest } from "npm:@base44/sdk";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const allPending = await db.PendingPremium.filter({ status: "pending" });
  const pending = allPending.slice(0, 3);
  
  let processed = 0;
  const debug = [];

  for (const record of pending) {
    const info = { email: record.email, product_id: record.product_id, step: "" };
    
    try {
      await sleep(300);

      // Buscar usuário
      const users = await db.User.filter({ email: record.email });
      await sleep(200);
      
      info.users_found = users ? users.length : 0;
      
      if (!users || users.length === 0) {
        info.step = "user_not_found";
        debug.push(info);
        continue;
      }

      const user = users[0];
      info.user_id = user.id;
      info.current_products = user.purchased_products;

      // Buscar produto
      await sleep(200);
      const products = await db.GostoPuroProduct.filter({ hotmart_product_id: String(record.product_id) });
      await sleep(200);

      info.products_found = products ? products.length : 0;

      if (!products || products.length === 0) {
        info.step = "product_not_found";
        debug.push(info);
        // Marcar como processed para não reprocessar
        await db.PendingPremium.update(record.id, { status: "processed" });
        processed++;
        continue;
      }

      const slug = products[0].slug;
      info.slug = slug;

      const current = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      const updated = !current.includes(slug) ? [...current, slug] : current;

      await db.User.update(user.id, { purchased_products: updated });
      await sleep(200);

      await db.PendingPremium.update(record.id, { status: "processed" });
      await sleep(200);

      info.step = "success";
      processed++;

    } catch (err) {
      info.step = "error";
      info.error = err.message;
    }

    debug.push(info);
  }

  return Response.json({ processed, total: pending.length, debug });
});