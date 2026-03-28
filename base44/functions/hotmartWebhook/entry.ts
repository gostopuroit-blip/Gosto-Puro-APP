import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Product IDs
const PRODUCT_LIFETIME = "7079227";
const PRODUCT_SUBSCRIPTION = "6991197";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const logEvent = async (event_type, status, user_email, payload, error_message) => {
    try {
      await base44.asServiceRole.entities.WebhookLog.create({
        source: "Hotmart",
        event_type,
        status,
        user_email: user_email || "",
        payload: typeof payload === "string" ? payload : JSON.stringify(payload),
        error_message: error_message || "",
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}
  };

  let rawBody, body;
  try {
    rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event || "";
  const buyer = body.data?.buyer || {};
  const email = buyer.email?.toLowerCase()?.trim() || "";
  const productId = String(body.data?.product?.id || "");
  const subscription = body.data?.subscription || {};

  const detectPlanType = () => {
    const planName = (subscription.plan?.name || "").toLowerCase();
    const offerCode = (body.data?.purchase?.offer?.code || "").toLowerCase();
    const combined = planName + " " + offerCode;
    if (combined.includes("anual") || combined.includes("annual") || combined.includes("yearly")) return "yearly";
    if (combined.includes("mensal") || combined.includes("monthly")) return "monthly";
    if (subscription.dateNextCharge) {
      const daysUntilNext = (subscription.dateNextCharge - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilNext > 60 ? "yearly" : "monthly";
    }
    return "monthly";
  };

  const getExpirationDate = (planType) => {
    if (subscription.dateNextCharge) {
      return new Date(subscription.dateNextCharge).toISOString().split("T")[0];
    }
    const d = new Date();
    if (planType === "yearly") d.setDate(d.getDate() + 370);
    else d.setDate(d.getDate() + 35);
    return d.toISOString().split("T")[0];
  };

  const findUser = async (email) => {
    const users = await base44.asServiceRole.entities.User.list("-created_date", 5000);
    return users.find(u => u.email?.toLowerCase()?.trim() === email) || null;
  };

  // --- Read ebook product ID from AppConfig ---
  let PRODUCT_EBOOK = null;
  try {
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "ebook_product_id" }, "-created_date", 1);
    if (configs && configs.length > 0) PRODUCT_EBOOK = configs[0].value?.trim() || null;
  } catch (_) {}

  // --- Ebook purchase handler ---
  const handleEbookPurchase = async () => {
    if (!email) return;
    const transactionId = body.data?.purchase?.transaction || body.data?.purchase?.order_date || `${email}-${Date.now()}`;
    const transactionStr = String(transactionId);

    // Evitar duplicidade
    const existing = await base44.asServiceRole.entities.EbookPurchaseTrigger.filter(
      { hotmart_transaction_id: transactionStr },
      "-created_date",
      1
    ).catch(() => []);

    if (existing && existing.length > 0) {
      await logEvent(event, "success", email, rawBody, "Ebook duplicate — ignored");
      return Response.json({ success: true, action: "ebook_duplicate_ignored", email });
    }

    const approvedAt = new Date().toISOString();
    const triggerAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.EbookPurchaseTrigger.create({
      user_email: email,
      user_name: buyer.name || buyer.full_name || "",
      hotmart_product_id: productId,
      hotmart_transaction_id: transactionStr,
      purchase_status: "approved",
      purchase_approved_at: approvedAt,
      email_trigger_at: triggerAt,
      followup_email_sent: false,
    });

    await logEvent(event, "success", email, rawBody, "Ebook purchase registered — followup scheduled 48h");
    return Response.json({ success: true, action: "ebook_purchase_registered", email, trigger_at: triggerAt });
  };

  const PURCHASE_EVENTS = ["PURCHASE_APPROVED", "SUBSCRIPTION_REACTIVATED", "PURCHASE_REACTIVATED"];
  const REVOKE_EVENTS = ["PURCHASE_REFUNDED", "PURCHASE_REVERSED", "PURCHASE_CHARGEBACK"];
  const CANCEL_EVENTS = ["SUBSCRIPTION_CANCELLATION", "PURCHASE_CANCELLED"];

  try {
    // Check if this is an ebook purchase (runs before the main flow)
    if (PRODUCT_EBOOK && productId === PRODUCT_EBOOK && PURCHASE_EVENTS.includes(event)) {
      return await handleEbookPurchase();
    }

    if (PURCHASE_EVENTS.includes(event)) {
      if (!email) {
        await logEvent(event, "error", "", rawBody, "No buyer email");
        return Response.json({ error: "No email" }, { status: 400 });
      }

      let updateData = {
        plan: "premium",
        subscription_level: "premium",
        subscription_status: "active",
        hotmart_product_id: productId,
      };

      if (productId === PRODUCT_LIFETIME) {
        updateData.subscription_plan = "lifetime";
        updateData.expiration_date = null;
      } else if (productId === PRODUCT_SUBSCRIPTION) {
        const planType = detectPlanType();
        updateData.subscription_plan = planType;
        updateData.expiration_date = getExpirationDate(planType);
      } else {
        updateData.subscription_plan = "lifetime";
        updateData.expiration_date = null;
      }

      const user = await findUser(email);
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, updateData);
        await logEvent(event, "success", email, rawBody, "");
        return Response.json({ success: true, action: "plan_upgraded", email, plan: updateData.subscription_plan });
      } else {
        await base44.asServiceRole.entities.PendingPremium.create({
          email,
          product_id: productId,
          event_type: event,
          raw_payload: rawBody,
          status: "pending",
        });
        await logEvent(event, "success", email, rawBody, "User not found — saved as pending");
        return Response.json({ success: true, action: "pending_created", email });
      }

    } else if (REVOKE_EVENTS.includes(event)) {
      if (!email) {
        await logEvent(event, "error", "", rawBody, "No buyer email");
        return Response.json({ error: "No email" }, { status: 400 });
      }
      const user = await findUser(email);
      if (user) {
        const statusMap = { PURCHASE_REFUNDED: "refunded", PURCHASE_REVERSED: "refunded", PURCHASE_CHARGEBACK: "refunded" };
        await base44.asServiceRole.entities.User.update(user.id, {
          plan: "free",
          subscription_level: "free",
          subscription_status: statusMap[event] || "cancelled",
          expiration_date: null,
        });
        await logEvent(event, "success", email, rawBody, "");
        return Response.json({ success: true, action: "plan_downgraded", email });
      } else {
        await logEvent(event, "success", email, rawBody, "User not found");
        return Response.json({ success: true, action: "user_not_found", email });
      }

    } else if (CANCEL_EVENTS.includes(event)) {
      if (!email) {
        await logEvent(event, "error", "", rawBody, "No buyer email");
        return Response.json({ error: "No email" }, { status: 400 });
      }
      const user = await findUser(email);
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, { subscription_status: "cancelled" });
        await logEvent(event, "success", email, rawBody, "Marked cancelled, access until expiry");
        return Response.json({ success: true, action: "marked_cancelled", email });
      } else {
        await logEvent(event, "success", email, rawBody, "User not found");
        return Response.json({ success: true, action: "user_not_found", email });
      }

    } else {
      await logEvent(event, "success", email, rawBody, "");
      return Response.json({ success: true, action: "ignored", event });
    }

  } catch (error) {
    await logEvent(event, "error", email, rawBody, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});