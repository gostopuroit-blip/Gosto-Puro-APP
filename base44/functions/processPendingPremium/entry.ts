import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const pending = await base44.asServiceRole.entities.PendingPremium.filter({
    status: "pending"
  });

  console.log("Found pending:", pending.length);

  let processedCount = 0;

  for (const record of pending) {
    console.log("Processing:", record.id, "| email:", record.email, "| product_id:", record.product_id);

    // Step 1: Look up the product by hotmart_product_id to get the slug
    const products = await base44.asServiceRole.entities.GostoPuroProduct.filter({
      hotmart_product_id: record.product_id
    });

    console.log("Products found for product_id", record.product_id, "->", products.length);

    if (products.length === 0) {
      console.log("No product found for hotmart_product_id:", record.product_id, "- skipping");
      continue;
    }

    // Step 2: Get the slug
    const productSlug = products[0].slug;
    console.log("Resolved slug:", productSlug);

    // Step 3: Find the user by email
    const users = await base44.asServiceRole.entities.User.filter({
      email: record.email
    });

    console.log("Users found for email:", record.email, "->", users.length);

    if (users.length === 0) {
      console.log("No user found for email:", record.email, "- skipping");
      continue;
    }

    const user = users[0];
    const currentProducts = Array.isArray(user.purchased_products)
      ? user.purchased_products
      : [];

    // Avoid duplicates
    if (!currentProducts.includes(productSlug)) {
      await base44.asServiceRole.entities.User.update(user.id, {
        purchased_products: [...currentProducts, productSlug]
      });
      console.log("Updated user", user.id, "with slug:", productSlug);
    } else {
      console.log("Slug already exists for user, skipping duplicate:", productSlug);
    }

    // Mark as processed regardless (even if slug was duplicate)
    await base44.asServiceRole.entities.PendingPremium.update(record.id, {
      status: "processed"
    });

    processedCount++;
  }

  return Response.json({ found: pending.length, processed: processedCount });
});