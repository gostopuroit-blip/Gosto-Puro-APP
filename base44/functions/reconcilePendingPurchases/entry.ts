import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Buscar todos e filtrar manualmente (evita rate limit de múltiplos .filter())
    const allPending = await base44.asServiceRole.entities.PendingPremium.list('-created_date', 500);
    const pending = allPending.filter(r => r.status === "pending");

    if (pending.length === 0) {
      console.log('[reconcile] Nenhum PendingPremium pendente.');
      return Response.json({ status: "ok", processed: 0 });
    }

    console.log(`[reconcile] Processando ${pending.length} registros pendentes...`);

    // Buscar usuários e produtos UMA VEZ SÓ fora do loop
    const [users, products] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 5000),
      base44.asServiceRole.entities.GostoPuroProduct.list('-created_date', 200),
    ]);

    // Indexar por email e hotmart_product_id para lookup O(1)
    const usersByEmail = {};
    for (const u of users) {
      if (u.email) usersByEmail[u.email.toLowerCase().trim()] = u;
    }
    const productsByHotmartId = {};
    for (const p of products) {
      if (p.hotmart_product_id) productsByHotmartId[String(p.hotmart_product_id)] = p;
    }

    let applied = 0;

    for (const record of pending) {
      try {
        const email = (record.email || "").toLowerCase().trim();
        const productId = String(record.product_id || "").trim();

        if (!email || !productId) continue;

        const dbUser = usersByEmail[email];
        if (!dbUser) {
          console.log(`[reconcile] Usuário ainda não registrado: ${email}`);
          continue;
        }

        const product = productsByHotmartId[productId];
        if (!product) {
          // Produto não existe — marcar como applied para não reprocessar
          console.log(`[reconcile] Produto não encontrado, marcando applied: ${productId} (${email})`);
          await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied", processed_by: "reconcilePendingPurchases" });
          applied++;
          continue;
        }

        const slug = product.slug;
        const current = Array.isArray(dbUser.purchased_products) ? dbUser.purchased_products : [];
        if (!current.includes(slug)) {
          const updated = [...current, slug];
          await base44.asServiceRole.entities.User.update(dbUser.id, { purchased_products: updated });
          // Atualizar cache local para evitar duplicatas no mesmo loop
          dbUser.purchased_products = updated;
        }

        await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied", processed_by: "reconcilePendingPurchases" });
        console.log(`[reconcile] Aplicado: ${email} → ${slug}`);
        applied++;

      } catch (err) {
        console.log(`[reconcile] Erro no registro ${record.id}: ${err.message}`);
      }
    }

    return Response.json({ status: "ok", processed: applied, total_pending: pending.length, source: "reconcilePendingPurchases" });

  } catch (error) {
    console.error('[reconcile] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});