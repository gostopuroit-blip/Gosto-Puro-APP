import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Product IDs
const LIFETIME_PRODUCT_ID = "7079227";
const SUBSCRIPTION_PRODUCT_ID = "6991197";

async function processWebhook(base44, body) {
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

  if (productId !== LIFETIME_PRODUCT_ID && productId !== SUBSCRIPTION_PRODUCT_ID) return;
  if (!buyerEmail) return;

  const users = await base44.asServiceRole.entities.User.filter({ email: buyerEmail });

  if (users.length === 0) {
    await base44.asServiceRole.entities.PendingPremium.create({
      email: buyerEmail,
      product_id: productId,
      event_type: eventType,
      raw_payload: JSON.stringify(body),
      status: "pending",
    });
    return;
  }

  const userId = users[0].id;

  if (productId === LIFETIME_PRODUCT_ID) {
    const approvedEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
    const revokedEvents = ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELLED"];

    if (approvedEvents.includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "premium", plan: "premium", subscription_level: "premium",
        subscription_status: "active", subscription_plan: "lifetime",
        expiration_date: null, hotmart_product_id: productId,
      });
    } else if (revokedEvents.includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "user", plan: "free", subscription_level: "free",
        subscription_status: "refunded", subscription_plan: null, expiration_date: null,
      });
    }
    return;
  }

  if (productId === SUBSCRIPTION_PRODUCT_ID) {
    const data = body?.data || body || {};
    const subscription = data?.subscription || {};
    const purchase = data?.purchase || {};
    const planName = (subscription?.plan?.name || "").toLowerCase();
    const recurrence = (subscription?.recurrence || purchase?.recurrence || "").toLowerCase();
    let subscriptionPlan = "monthly";
    if (planName.includes("annual") || planName.includes("anual") || planName.includes("year") ||
        recurrence.includes("annual") || recurrence.includes("anual") || recurrence.includes("year")) {
      subscriptionPlan = "yearly";
    }
    const nextBillingDate = subscription?.next_billing_date || purchase?.next_billing_date || null;
    const expirationDate = nextBillingDate ? new Date(nextBillingDate).toISOString().split("T")[0] : null;

    if (["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "SUBSCRIPTION_REACTIVATED"].includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "premium", plan: "premium", subscription_level: "premium",
        subscription_status: "active", subscription_plan: subscriptionPlan,
        expiration_date: expirationDate, hotmart_product_id: productId,
      });
    } else if (["PURCHASE_DELAYED", "SUBSCRIPTION_PURCHASE"].includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, { expiration_date: expirationDate, subscription_status: "active" });
    } else if (["SUBSCRIPTION_CANCELLATION"].includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, { subscription_status: "cancelled", expiration_date: expirationDate });
    } else if (["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_EXPIRED", "PURCHASE_CANCELLED"].includes(eventType)) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "user", plan: "free", subscription_level: "free",
        subscription_status: eventType === "PURCHASE_EXPIRED" ? "expired" : "refunded",
        expiration_date: null,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Respond immediately to avoid timeout, then process in background
  const response = Response.json({ received: true });
  
  // Process asynchronously after responding
  processWebhook(base44, body).catch(console.error);

  return response;
});