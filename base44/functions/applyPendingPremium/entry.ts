import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

  try {
    // Fetch small batch of pending entries (5 per run to minimize quota)
    const pendingList = await base44.asServiceRole.entities.PendingPremium.filter(
      { status: "pending" }, "-created_date", 5
    ).catch(() => []);

    if (!pendingList || pendingList.length === 0) {
      return Response.json({ success: true, processed: 0, message: "No pending entries" });
    }

    let applied = 0;

    // Process each pending entry
    for (const pending of pendingList) {
      const email = pending.email?.toLowerCase()?.trim();
      if (!email) continue;

      // Get single user by email (minimizes quota usage)
      const users = await base44.asServiceRole.entities.User.filter(
        { email },
        "-created_date",
        1
      ).catch(() => []);

      if (!users || users.length === 0) {
        continue; // User not found, skip this one
      }

      const user = users[0];
      let rawPayload = {};
      try {
        rawPayload = JSON.parse(pending.raw_payload || "{}");
      } catch (_) {}

      const purchaseData = rawPayload.data?.purchase || {};
      const subscription = rawPayload.data?.subscription || {};
      const productId = String(pending.product_id || "");

      const updateData = {
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

      // Update user and mark pending as applied
      await Promise.all([
        base44.asServiceRole.entities.User.update(user.id, updateData).catch(() => {}),
        base44.asServiceRole.entities.PendingPremium.update(pending.id, { status: "applied" }).catch(() => {})
      ]);

      applied++;
    }

    return Response.json({ success: true, processed: pendingList.length, applied });
  } catch (err) {
    console.error("Error in applyPendingPremium:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});