import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LIFETIME_PRODUCT_ID = "7079227";
const SUBSCRIPTION_PRODUCT_ID = "6991197";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Called by entity automation on User create
    const payload = await req.json();
    const userEmail = payload?.data?.email || payload?.email || null;

    if (!userEmail) {
      return Response.json({ skipped: true, reason: "no_email" });
    }

    // Check for pending premium for this email
    const pending = await base44.asServiceRole.entities.PendingPremium.filter({
      email: userEmail,
      status: "pending",
    });

    if (pending.length === 0) {
      return Response.json({ skipped: true, reason: "no_pending_premium" });
    }

    // Get the user
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (users.length === 0) {
      return Response.json({ skipped: true, reason: "user_still_not_found" });
    }

    const userId = users[0].id;
    const record = pending[0];
    const productId = String(record.product_id);

    if (productId === LIFETIME_PRODUCT_ID) {
      await base44.asServiceRole.entities.User.update(userId, {
        role: "premium",
        plan: "premium",
        subscription_level: "premium",
        subscription_status: "active",
        subscription_plan: "lifetime",
        expiration_date: null,
        hotmart_product_id: productId,
      });
    } else if (productId === SUBSCRIPTION_PRODUCT_ID) {
      let rawBody = {};
      try { rawBody = JSON.parse(record.raw_payload || "{}"); } catch { rawBody = {}; }
      const data = rawBody?.data || {};
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
      const expirationDate = nextBillingDate
        ? new Date(nextBillingDate).toISOString().split("T")[0]
        : null;

      await base44.asServiceRole.entities.User.update(userId, {
        role: "premium",
        plan: "premium",
        subscription_level: "premium",
        subscription_status: "active",
        subscription_plan: subscriptionPlan,
        expiration_date: expirationDate,
        hotmart_product_id: productId,
      });
    }

    // Mark as applied
    await base44.asServiceRole.entities.PendingPremium.update(record.id, { status: "applied" });

    return Response.json({ success: true, email: userEmail, product: productId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});