import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Product IDs
const LIFETIME_PRODUCT_ID = "7079227";    // Accesso Premium vitalício
const SUBSCRIPTION_PRODUCT_ID = "6991197"; // Ricette per ogni occasione premium (mensal/anual)

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

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
  const productId = String(body?.data?.product?.id || body?.product?.id || "");

  // Log all events
  await base44.asServiceRole.entities.WebhookLog.create({
    timestamp: new Date().toISOString(),
    source: "Hotmart",
    event_type: eventType,
    status: "success",
    payload: JSON.stringify(body),
    user_email: buyerEmail || "",
  });

  // Skip if not one of our products
  if (productId !== LIFETIME_PRODUCT_ID && productId !== SUBSCRIPTION_PRODUCT_ID) {
    return Response.json({ received: true, skipped: true, reason: "product_not_matched" });
  }

  if (!buyerEmail) {
    return Response.json({ received: true, skipped: true, reason: "no_email" });
  }

  const users = await base44.asServiceRole.entities.User.filter({ email: buyerEmail });
  
  // If user doesn't exist yet, save as pending premium so it's applied when they register
  if (users.length === 0) {
    const pendingData = {
      email: buyerEmail,
      product_id: productId,
      event_type: eventType,
      raw_payload: JSON.stringify(body),
      status: "pending",
    };
    await base44.asServiceRole.entities.PendingPremium.create(pendingData);
    return Response.json({ received: true, queued: true, reason: "user_not_found_yet", email: buyerEmail });
  }

  const userId = users[0].id;

  // ── LIFETIME PRODUCT (7079227) ──────────────────────────────────────────
  if (productId === LIFETIME_PRODUCT_ID) {
    const approvedEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
    const revokedEvents = ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELLED"];

    if (approvedEvents.includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "premium",
        plan: "premium",
        subscription_level: "premium",
        subscription_status: "active",
        subscription_plan: "lifetime",
        expiration_date: null,
        hotmart_product_id: productId,
      });
    } else if (revokedEvents.includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "user",
        plan: "free",
        subscription_level: "free",
        subscription_status: "refunded",
        subscription_plan: null,
        expiration_date: null,
      });
    }

    return Response.json({ received: true, event: eventType, product: "lifetime" });
  }

  // ── SUBSCRIPTION PRODUCT (6991197) ─────────────────────────────────────
  if (productId === SUBSCRIPTION_PRODUCT_ID) {
    const data = body?.data || body || {};
    const subscription = data?.subscription || {};
    const purchase = data?.purchase || {};

    // Detect plan: monthly or yearly
    const planName = (subscription?.plan?.name || "").toLowerCase();
    const recurrence = (subscription?.recurrence || purchase?.recurrence || "").toLowerCase();
    let subscriptionPlan = "monthly";
    if (planName.includes("annual") || planName.includes("anual") || planName.includes("year") ||
        recurrence.includes("annual") || recurrence.includes("anual") || recurrence.includes("year")) {
      subscriptionPlan = "yearly";
    }

    // Expiration = next_billing_date from Hotmart (never calculate manually)
    const nextBillingDate = subscription?.next_billing_date || purchase?.next_billing_date || null;
    const expirationDate = nextBillingDate
      ? new Date(nextBillingDate).toISOString().split("T")[0]
      : null;

    const approvedEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "SUBSCRIPTION_REACTIVATED"];
    const billingUpdatedEvents = ["PURCHASE_DELAYED", "SUBSCRIPTION_PURCHASE"]; // renewal billing updates
    const cancelledEvents = ["SUBSCRIPTION_CANCELLATION"];
    const revokedEvents = ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_EXPIRED", "PURCHASE_CANCELLED"];

    if (approvedEvents.includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "premium",
        plan: "premium",
        subscription_level: "premium",
        subscription_status: "active",
        subscription_plan: subscriptionPlan,
        expiration_date: expirationDate,
        hotmart_product_id: productId,
      });
    } else if (billingUpdatedEvents.includes(eventType)) {
      // Renewal: just update expiration_date
      await base44.asServiceRole.entities.User.update(userId, {
        expiration_date: expirationDate,
        subscription_status: "active",
      });
    } else if (cancelledEvents.includes(eventType)) {
      // Cancelled but keep premium until expiration_date
      await base44.asServiceRole.entities.User.update(userId, {
        subscription_status: "cancelled",
        expiration_date: expirationDate,
      });
    } else if (revokedEvents.includes(eventType)) {
      // Immediate revoke
      await base44.asServiceRole.entities.User.update(userId, {
        role: "user",
        plan: "free",
        subscription_level: "free",
        subscription_status: eventType === "PURCHASE_EXPIRED" ? "expired" : "refunded",
        expiration_date: null,
      });
    }

    return Response.json({ received: true, event: eventType, product: "subscription", plan: subscriptionPlan });
  }

  return Response.json({ received: true, event: eventType });
});