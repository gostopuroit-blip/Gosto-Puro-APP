import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Buscar TODOS os PendingPremium sem filtro primeiro
  const allPending = await base44.asServiceRole.entities.PendingPremium.list('-created_date', 500);

  // Filtrar manualmente os que têm status "pending"
  const pendingRecords = allPending.filter(r => r.status === "pending");

  console.log(`[processPendingPremium] Total: ${allPending.length}, Pendentes: ${pendingRecords.length}`);

  if (pendingRecords.length === 0) {
    return Response.json({ processed: 0, still_pending: 0, total: 0 });
  }

  // Buscar usuários e produtos UMA VEZ SÓ fora do loop
  const [users, products] = await Promise.all([
    base44.asServiceRole.entities.User.list('-created_date', 5000),
    base44.asServiceRole.entities.GostoPuroProduct.list('-created_date', 200),
  ]);

  let processed = 0;
  let still_pending = 0;

  for (const record of pendingRecords) {
    try {
      const email = record.email.toLowerCase().trim();
      const productId = String(record.product_id);

      const user = users.find(u => u.email && u.email.toLowerCase().trim() === email);
      if (!user) {
        console.log(`[processPendingPremium] Usuário não encontrado: ${email}`);
        still_pending++;
        continue;
      }

      const product = products.find(p => String(p.hotmart_product_id) === productId);
      if (!product) {
        console.log(`[processPendingPremium] Produto não encontrado: ${productId} (${email})`);
        still_pending++;
        continue;
      }

      // Adicionar slug ao purchased_products
      const currentProducts = user.purchased_products || [];
      if (!currentProducts.includes(product.slug)) {
        currentProducts.push(product.slug);
        await base44.asServiceRole.entities.User.update(user.id, { purchased_products: currentProducts });
        // Atualizar cache local para evitar duplicatas em registros seguintes do mesmo usuário
        user.purchased_products = currentProducts;
        console.log(`[processPendingPremium] Aplicado: ${email} → ${product.slug}`);
      } else {
        console.log(`[processPendingPremium] Já tinha: ${email} → ${product.slug}`);
      }

      // Marcar como applied
      await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied" });
      processed++;

    } catch (err) {
      console.log(`[processPendingPremium] Erro: ${err.message}`);
      still_pending++;
    }
  }

  console.log(`[processPendingPremium] Processados: ${processed}, Ainda pendentes: ${still_pending}`);
  return Response.json({ processed, still_pending, total: pendingRecords.length });
});