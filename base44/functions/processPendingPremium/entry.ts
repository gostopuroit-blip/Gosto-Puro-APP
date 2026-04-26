import { createClientFromRequest } from "npm:@base44/sdk";

// IDs de produtos que concedem plan=premium (vitalício ou anual/mensal)
const PREMIUM_PLAN_PRODUCT_IDS = ["7079227", "6991197"];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Busca tudo de uma vez para evitar timeout
  const [pending, allUsers, allGpProducts] = await Promise.all([
    base44.asServiceRole.entities.PendingPremium.filter({ status: "pending" }),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.GostoPuroProduct.list(),
  ]);

  console.log("Found pending:", pending.length, "| users:", allUsers.length, "| products:", allGpProducts.length);

  // Mapas para lookup rápido
  const userByEmail = {};
  for (const u of allUsers) {
    userByEmail[(u.email || "").toLowerCase().trim()] = u;
  }

  const slugByProductId = {};
  for (const p of allGpProducts) {
    if (p.hotmart_product_id) {
      slugByProductId[String(p.hotmart_product_id).trim()] = p.slug;
    }
  }

  let processedCount = 0;
  let skippedNoUser = 0;
  let skippedNoProduct = 0;

  for (const record of pending) {
    const email = (record.email || "").toLowerCase().trim();
    const productId = String(record.product_id || "").trim();

    const user = userByEmail[email];
    if (!user) {
      skippedNoUser++;
      continue;
    }

    if (PREMIUM_PLAN_PRODUCT_IDS.includes(productId)) {
      // É produto premium do app → dar plan=premium
      await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
      console.log("plan=premium applied:", email);
    } else {
      const slug = slugByProductId[productId];
      if (!slug) {
        console.log("No slug for product_id:", productId, "- skipping");
        skippedNoProduct++;
        continue;
      }

      const currentProducts = Array.isArray(user.purchased_products) ? user.purchased_products : [];
      if (!currentProducts.includes(slug)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          purchased_products: [...currentProducts, slug]
        });
        console.log("Slug applied:", email, "->", slug);
      } else {
        console.log("Slug already present:", email, "->", slug);
      }
    }

    await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "processed", processed_by: "processPendingPremium" });
    processedCount++;
  }

  return Response.json({
    found: pending.length,
    processed: processedCount,
    skipped_no_user: skippedNoUser,
    skipped_no_product: skippedNoProduct,
    still_pending: pending.length - processedCount,
    source: "processPendingPremium"
  });
});