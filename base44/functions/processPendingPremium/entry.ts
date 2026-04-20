import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Usa filter com asServiceRole — o .list() é bloqueado pela RLS "read: false"
  // mesmo com asServiceRole, enquanto .filter() com query vazia funciona
  let pending = [];
  try {
    pending = await base44.asServiceRole.entities.PendingPremium.filter(
      { status: "pending" },
      "-created_date",
      200
    );
  } catch (e) {
    console.log(`[processPendingPremium] Erro ao buscar pendentes: ${e.message}`);
    return Response.json({ processed: 0, still_pending: 0, total: 0, error: e.message });
  }

  console.log(`[processPendingPremium] Pendentes encontrados: ${pending.length}`);

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

    if (!email) continue;

    const user = allUsers.find(u => (u.email || "").toLowerCase().trim() === email);

    if (!user) {
      console.log(`[processPendingPremium] Usuário não registrado ainda: ${email}`);
      continue;
    }

    console.log(`[processPendingPremium] Processando: ${email} → productId=${productId}`);

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
        console.log(`[processPendingPremium] Produto já presente: ${email} → ${slug}`);
      }
    } else if (productId === APP_PRODUCT_ID) {
      await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
      console.log(`[processPendingPremium] Plan premium aplicado: ${email}`);
    } else {
      console.log(`[processPendingPremium] Produto desconhecido (${productId}) — ignorando: ${email}`);
    }

    await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied" });
    processed++;
  }

  const still_pending = pending.length - processed;
  console.log(`[processPendingPremium] Processados: ${processed}, Ainda pendentes: ${still_pending}`);
  return Response.json({ processed, still_pending, total: pending.length });
});