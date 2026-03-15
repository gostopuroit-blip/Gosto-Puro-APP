import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PRODUCT_LIFETIME = "7079227";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Called from entity automation: payload has event + data (new user)
  const userEmail = (body.data?.email || body.email || "").toLowerCase().trim();
  const userId = body.data?.id || body.user_id || "";

  if (!userEmail || !userId) {
    return Response.json({ skipped: true, reason: "No email or user_id" });
  }

  // Look for pending premium entries for this email
  const pending = await base44.asServiceRole.entities.PendingPremium.filter(
    { email: userEmail, status: "pending" },
    "-created_date",
    10
  );

  if (!pending || pending.length === 0) {
    return Response.json({ skipped: true, reason: "No pending premium for " + userEmail });
  }

  // Use the most recent pending entry
  const entry = pending[0];
  const productId = String(entry.product_id || "");

  let rawPayload;
  try {
    rawPayload = JSON.parse(entry.raw_payload || "{}");
  } catch {
    rawPayload = {};
  }

  const subscription = rawPayload.data?.subscription || {};
  const purchaseData = rawPayload.data?.purchase || {};

  // Detect plan type
  const detectPlanType = () => {
    const planName = (subscription.plan?.name || "").toLowerCase();
    const offerCode = (purchaseData.offer?.code || "").toLowerCase();
    const offerDesc = (purchaseData.offer?.description || "").toLowerCase();
    const combined = planName + " " + offerCode + " " + offerDesc;
    if (combined.includes("anual") || combined.includes("annual") || combined.includes("yearly")) return "yearly";
    if (combined.includes("mensal") || combined.includes("monthly")) return "monthly";
    if (purchaseData.date_next_charge) {
      const msUntilNext = purchaseData.date_next_charge - Date.now();
      const daysUntilNext = msUntilNext / (1000 * 60 * 60 * 24);
      return daysUntilNext > 60 ? "yearly" : "monthly";
    }
    return "yearly"; // safe default for annual offer
  };

  const getExpirationDate = (planType) => {
    if (purchaseData.date_next_charge) {
      return new Date(purchaseData.date_next_charge).toISOString().split("T")[0];
    }
    const d = new Date();
    if (planType === "yearly") d.setDate(d.getDate() + 370);
    else d.setDate(d.getDate() + 35);
    return d.toISOString().split("T")[0];
  };

  let updateData = {
    plan: "premium",
    subscription_level: "premium",
    subscription_status: "active",
    hotmart_product_id: productId,
  };

  if (productId === PRODUCT_LIFETIME) {
    updateData.subscription_plan = "lifetime";
    updateData.expiration_date = null;
  } else {
    const planType = detectPlanType();
    updateData.subscription_plan = planType;
    updateData.expiration_date = getExpirationDate(planType);
  }

  // Apply premium to the user
  await base44.asServiceRole.entities.User.update(userId, updateData);

  // Mark all pending entries for this email as applied
  for (const p of pending) {
    await base44.asServiceRole.entities.PendingPremium.update(p.id, { status: "applied" });
  }

  // Log it
  try {
    await base44.asServiceRole.entities.WebhookLog.create({
      source: "System",
      event_type: "PENDING_PREMIUM_APPLIED",
      status: "success",
      user_email: userEmail,
      payload: JSON.stringify({ userId, productId, plan: updateData.subscription_plan }),
      error_message: "",
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}

  return Response.json({ success: true, email: userEmail, plan: updateData.subscription_plan });
});