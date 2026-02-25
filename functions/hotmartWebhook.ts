import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Only accept POST
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body?.event || body?.data?.event || "unknown";
  const buyerEmail = body?.data?.buyer?.email || body?.buyer?.email || null;
  const productId = body?.data?.product?.id || body?.product?.id || null;

  const PREMIUM_PRODUCT_ID = 7079227;

  // Log the webhook
  await base44.asServiceRole.entities.WebhookLog.create({
    timestamp: new Date().toISOString(),
    source: "Hotmart",
    event_type: eventType,
    status: "success",
    payload: JSON.stringify(body),
    user_email: buyerEmail || "",
  });

  // Only process events for the Premium product
  if (String(productId) !== String(PREMIUM_PRODUCT_ID)) {
    return Response.json({ received: true, skipped: true, reason: "product_not_matched" });
  }

  const approvedEvents = [
    "PURCHASE_APPROVED",
    "PURCHASE_COMPLETE",
    "SUBSCRIPTION_REACTIVATED",
  ];

  const revokedEvents = [
    "PURCHASE_REFUNDED",
    "PURCHASE_CHARGEBACK",
    "SUBSCRIPTION_CANCELLATION",
    "PURCHASE_CANCELLED",
  ];

  if (buyerEmail) {
    if (approvedEvents.includes(eventType)) {
      // Find user and set role to premium (lifetime access)
      const users = await base44.asServiceRole.entities.User.filter({ email: buyerEmail });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, { role: "premium" });
      }
    } else if (revokedEvents.includes(eventType)) {
      // Revert to free user
      const users = await base44.asServiceRole.entities.User.filter({ email: buyerEmail });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, { role: "user" });
      }
    }
  }

  return Response.json({ received: true, event: eventType });
});