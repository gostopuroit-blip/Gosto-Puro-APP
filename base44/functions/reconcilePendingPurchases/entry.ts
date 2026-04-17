import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    // Allow scheduled calls (no user context)
  }

  try {
    const pending = await base44.asServiceRole.entities.PendingPremium.filter({ status: "pending" });

    if (!pending || pending.length === 0) {
      console.log('[reconcile] Nenhum PendingPremium pendente.');
      return Response.json({ status: "ok", processed: 0 });
    }

    console.log(`[reconcile] Processando ${pending.length} registros pendentes...`);
    let applied = 0;

    for (const record of pending) {
      const email = (record.email || "").toLowerCase().trim();
      const productId = String(record.product_id || "").trim();

      if (!email || !productId) continue;

      // Buscar usuário
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (!users || users.length === 0) {
        console.log(`[reconcile] Usuário ainda não registrado: ${email}`);
        continue;
      }

      // Buscar produto
      const products = await base44.asServiceRole.entities.GostoPuroProduct.filter({ hotmart_product_id: productId });
      if (!products || products.length === 0) {
        console.log(`[reconcile] Produto não encontrado: ${productId} para ${email}`);
        continue;
      }

      const dbUser = users[0];
      const slug = products[0].slug;

      // Adicionar slug sem duplicar
      const current = dbUser.purchased_products || [];
      if (!current.includes(slug)) {
        await base44.asServiceRole.entities.User.update(dbUser.id, {
          purchased_products: [...current, slug],
        });
      }

      // Marcar como applied
      await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied" });

      // Logar sucesso
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "reconcile",
        event_type: "RECONCILE_APPLIED",
        status: "success",
        user_email: email,
        payload: JSON.stringify({ product_id: productId, slug }),
        error_message: "",
        timestamp: new Date().toISOString(),
      });

      console.log(`[reconcile] Aplicado: ${email} → ${slug}`);
      applied++;
    }

    return Response.json({ status: "ok", processed: applied, total_pending: pending.length });
  } catch (error) {
    console.error('[reconcile] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});