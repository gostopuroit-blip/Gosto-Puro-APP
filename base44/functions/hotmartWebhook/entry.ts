import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Product IDs
const PRODUCT_LIFETIME = "7079227";   // Accesso Premium: App Gosto Puro (lifetime)
const PRODUCT_SUBSCRIPTION = "6991197"; // Ricette per ogni occasione premium (monthly/yearly)

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

  // ─── Detect plan type for subscription product ───────────────────────────
  const detectPlanType = () => {
    const planName = (subscription.plan?.name || "").toLowerCase();
    const offerCode = (body.data?.purchase?.offer?.code || "").toLowerCase();
    const combined = planName + " " + offerCode;
    if (combined.includes("anual") || combined.includes("annual") || combined.includes("yearly")) return "yearly";
    if (combined.includes("mensal") || combined.includes("monthly")) return "monthly";
    // Fallback: check recurrence period in ms (Hotmart dateNextCharge - now)
    if (subscription.dateNextCharge) {
      const msUntilNext = subscription.dateNextCharge - Date.now();
      const daysUntilNext = msUntilNext / (1000 * 60 * 60 * 24);
      return daysUntilNext > 60 ? "yearly" : "monthly";
    }
    return "monthly"; // safe default
  };

  // ─── Compute expiration date ──────────────────────────────────────────────
  const getExpirationDate = (planType) => {
    if (subscription.dateNextCharge) {
      return new Date(subscription.dateNextCharge).toISOString().split("T")[0];
    }
    // Fallback if no dateNextCharge
    const d = new Date();
    if (planType === "yearly") d.setDate(d.getDate() + 370);
    else d.setDate(d.getDate() + 35);
    return d.toISOString().split("T")[0];
  };

  // ─── Find user by email ───────────────────────────────────────────────────
  const findUser = async (email) => {
    // List all and match manually (handles case differences and filter indexing issues)
    const users = await base44.asServiceRole.entities.User.list("-created_date", 5000);
    return users.find(u => u.email?.toLowerCase()?.trim() === email) || null;
  };

  // ─── Events that GRANT premium ────────────────────────────────────────────
  const PURCHASE_EVENTS = ["PURCHASE_APPROVED", "SUBSCRIPTION_REACTIVATED", "PURCHASE_REACTIVATED"];
  // ─── Events that REVOKE premium immediately ───────────────────────────────
  const REVOKE_EVENTS = ["PURCHASE_REFUNDED", "PURCHASE_REVERSED", "PURCHASE_CHARGEBACK"];
  // ─── Cancellation: keep access until expiry, but mark cancelled ──────────
  const CANCEL_EVENTS = ["SUBSCRIPTION_CANCELLATION", "PURCHASE_CANCELLED"];

  try {
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
        // Unknown product — grant lifetime to be safe
        updateData.subscription_plan = "lifetime";
        updateData.expiration_date = null;
      }

      const user = await findUser(email);
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, updateData);
        await logEvent(event, "success", email, rawBody, "");
        return Response.json({ success: true, action: "plan_upgraded", email, plan: updateData.subscription_plan });
      } else {
        // User not registered yet — save as pending
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
        const statusMap = {
          PURCHASE_REFUNDED: "refunded",
          PURCHASE_REVERSED: "refunded",
          PURCHASE_CHARGEBACK: "refunded",
        };
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
      // Cancelled: mark cancelled but keep premium until expiration_date
      if (!email) {
        await logEvent(event, "error", "", rawBody, "No buyer email");
        return Response.json({ error: "No email" }, { status: 400 });
      }
      const user = await findUser(email);
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: "cancelled",
          // Keep plan as-is — the scheduled job will revoke when expired
        });
        await logEvent(event, "success", email, rawBody, "Marked cancelled, access until expiry");
        return Response.json({ success: true, action: "marked_cancelled", email });
      } else {
        await logEvent(event, "success", email, rawBody, "User not found");
        return Response.json({ success: true, action: "user_not_found", email });
      }

    } else {
      // Unknown event — log and return 200 so Hotmart doesn't retry
      await logEvent(event, "success", email, rawBody, "");
      return Response.json({ success: true, action: "ignored", event });
    }

  } catch (error) {
    await logEvent(event, "error", email, rawBody, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});