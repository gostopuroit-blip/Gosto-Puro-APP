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

  // Fetch pending entries first
  const pendingList = await base44.asServiceRole.entities.PendingPremium.filter(
    { status: "pending" }, "-created_date", 200
  );

  if (!pendingList || pendingList.length === 0) {
    return Response.json({ success: true, processed: 0, message: "No pending entries" });
  }

  // Get unique emails from pending list
  const pendingEmails = [...new Set(pendingList.map(p => p.email?.toLowerCase()?.trim()).filter(Boolean))];

  // Fetch only the users that match the pending emails (one query per email, in parallel)
  const userResults = await Promise.all(
    pendingEmails.map(email =>
      base44.asServiceRole.entities.User.filter({ email }, "-created_date", 1).catch(() => [])
    )
  );

  // Build a map of email -> user for O(1) lookup
  const userByEmail = {};
  pendingEmails.forEach((email, i) => {
    if (userResults[i] && userResults[i].length > 0) {
      userByEmail[email] = userResults[i][0];
    }
  });

  // Group pending entries by email (deduplicate)
  const pendingByEmail = {};
  for (const p of pendingList) {
    const email = p.email?.toLowerCase()?.trim();
    if (!email) continue;
    if (!pendingByEmail[email]) pendingByEmail[email] = [];
    pendingByEmail[email].push(p);
  }

  let applied = 0;
  let notFound = 0;
  const updates = [];

  for (const [email, entries] of Object.entries(pendingByEmail)) {
    const user = userByEmail[email];
    if (!user) {
      notFound++;
      continue;
    }

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

    // Collect all update promises
    updates.push(
      base44.asServiceRole.entities.User.update(user.id, updateData),
      ...entries.map(p => base44.asServiceRole.entities.PendingPremium.update(p.id, { status: "applied" })),
      base44.asServiceRole.entities.WebhookLog.create({
        source: "System",
        event_type: "PENDING_PREMIUM_APPLIED",
        status: "success",
        user_email: email,
        payload: JSON.stringify({ userId: user.id, productId, plan: updateData.subscription_plan }),
        error_message: "",
        timestamp: new Date().toISOString(),
      }).catch(() => {}),
    );

    applied++;
  }

  // Run all updates in parallel
  await Promise.all(updates);

  return Response.json({ success: true, processed: Object.keys(pendingByEmail).length, applied, notFound });
});