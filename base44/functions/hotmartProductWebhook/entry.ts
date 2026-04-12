import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();

  // Extract email and product ID from Hotmart payload (multiple possible paths)
  const email = (
    body?.data?.buyer?.email ||
    body?.buyer?.email ||
    body?.data?.purchase?.buyer?.email ||
    ""
  ).toLowerCase().trim();

  const hotmartProductId = String(
    body?.data?.product?.id ||
    body?.product?.id ||
    body?.data?.purchase?.product?.id ||
    ""
  ).trim();

  const eventType = body?.event || body?.data?.purchase?.status || "PURCHASE_COMPLETE";
  const payloadStr = JSON.stringify(body);

  if (!email || !hotmartProductId) {
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart",
      event_type: eventType,
      status: "error",
      user_email: email || "unknown",
      payload: payloadStr,
      error_message: "Missing email or product_id",
      timestamp: new Date().toISOString(),
    });
    return Response.json({ error: "Missing email or product_id" }, { status: 400 });
  }

  // Find the GostoPuroProduct with this hotmart_product_id
  const products = await base44.asServiceRole.entities.GostoPuroProduct.filter({ hotmart_product_id: hotmartProductId });
  const product = products[0];

  if (!product) {
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart",
      event_type: eventType,
      status: "error",
      user_email: email,
      payload: payloadStr,
      error_message: `No GostoPuroProduct found for hotmart_product_id: ${hotmartProductId}`,
      timestamp: new Date().toISOString(),
    });
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const slug = product.slug;

  // Find user by email
  const users = await base44.asServiceRole.entities.User.filter({ email });
  const user = users[0];

  if (user) {
    // Add slug to purchased_products without duplicating
    const current = user.purchased_products || [];
    if (!current.includes(slug)) {
      await base44.asServiceRole.entities.User.update(user.id, {
        purchased_products: [...current, slug],
      });
    }

    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart",
      event_type: eventType,
      status: "success",
      user_email: email,
      payload: payloadStr,
      error_message: "",
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true, email, slug });
  } else {
    // User not registered yet — save as pending
    await base44.asServiceRole.entities.PendingPremium.create({
      email,
      product_id: hotmartProductId,
      event_type: eventType,
      raw_payload: payloadStr,
      status: "pending",
    });

    await base44.asServiceRole.entities.WebhookLog.create({
      source: "Hotmart",
      event_type: eventType,
      status: "success",
      user_email: email,
      payload: payloadStr,
      error_message: "User not found — saved as pending",
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true, pending: true, email, slug });
  }
});