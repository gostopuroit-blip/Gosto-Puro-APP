import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PRODUCT_LIFETIME = "7079227";

const detectPlanType = (purchaseData, subscription) => {
  const planName = (subscription?.plan?.name || "").toLowerCase();
  const offerCode = (purchaseData?.offer?.code || "").toLowerCase();
  const offerDesc = (purchaseData?.offer?.description || "").toLowerCase();
  const combined = planName + " " + offerCode + " " + offerDesc;
  if (combined.includes("anual") || combined.includes("annual") || combined.includes("yearly")) return "yearly";
  if (combined.includes("mensal") || combined.includes("monthly")) return "monthly";
  if (purchaseData?.date_next_charge) {
    const msUntilNext = purchaseData.date_next_charge - Date.now();
    return msUntilNext / (1000 * 60 * 60 * 24) > 60 ? "yearly" : "monthly";
  }
  return "yearly";
};

const getExpirationDate = (purchaseData, planType) => {
  if (purchaseData?.date_next_charge) {
    return new Date(purchaseData.date_next_charge).toISOString().split("T")[0];
  }
  const d = new Date();
  if (planType === "yearly") d.setDate(d.getDate() + 370);
  else d.setDate(d.getDate() + 35);
  return d.toISOString().split("T")[0];
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Fetch all pending premium entries
  const pendingList = await base44.asServiceRole.entities.PendingPremium.filter(
    { status: "pending" },
    "-created_date",
    100
  );

  if (!pendingList || pendingList.length === 0) {
    return Response.json({ success: true, processed: 0, message: "No pending entries" });
  }

  // Get unique emails
  const emails = [...new Set(pendingList.map(p => p.email?.toLowerCase()?.trim()).filter(Boolean))];

  let applied = 0;
  let notFound = 0;

  for (const email of emails) {
    // Try to find the user by email
    let user = null;
    try {
      const results = await base44.asServiceRole.entities.User.filter({ email }, "-created_date", 5);
      if (results && results.length > 0) user = results[0];
    } catch (_) {}

    if (!user) {
      // Try case-insensitive fallback
      try {
        const all = await base44.asServiceRole.entities.User.list("-created_date", 2000);
        user = all.find(u => u.email?.toLowerCase()?.trim() === email) || null;
      } catch (_) {}
    }

    if (!user) {
      notFound++;
      continue;
    }

    // Get the pending entries for this email
    const entries = pendingList.filter(p => p.email?.toLowerCase()?.trim() === email);
    const entry = entries[0]; // most recent

    let rawPayload = {};
    try { rawPayload = JSON.parse(entry.raw_payload || "{}"); } catch (_) {}

    const purchaseData = rawPayload.data?.purchase || {};
    const subscription = rawPayload.data?.subscription || {};
    const productId = String(entry.product_id || "");

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
      const planType = detectPlanType(purchaseData, subscription);
      updateData.subscription_plan = planType;
      updateData.expiration_date = getExpirationDate(purchaseData, planType);
    }

    await base44.asServiceRole.entities.User.update(user.id, updateData);

    // Mark all pending entries for this email as applied
    for (const p of entries) {
      await base44.asServiceRole.entities.PendingPremium.update(p.id, { status: "applied" });
    }

    // Log
    try {
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "System",
        event_type: "PENDING_PREMIUM_APPLIED",
        status: "success",
        user_email: email,
        payload: JSON.stringify({ userId: user.id, productId, plan: updateData.subscription_plan }),
        error_message: "",
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    applied++;
  }

  return Response.json({ success: true, processed: emails.length, applied, notFound });
});