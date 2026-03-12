import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Log helper
  const logEvent = async (source, event_type, status, user_email, payload, error_message) => {
    try {
      await base44.asServiceRole.entities.WebhookLog.create({
        source,
        event_type,
        status,
        user_email: user_email || "",
        payload: typeof payload === "string" ? payload : JSON.stringify(payload),
        error_message: error_message || "",
        timestamp: new Date().toISOString(),
      });
    } catch (_) { /* silently ignore log errors */ }
  };

  let body;
  let rawBody;
  try {
    rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch (e) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event || "";
  const buyer = body.data?.buyer || {};
  const email = buyer.email?.toLowerCase() || "";
  const hottok = body.hottok || "";

  // Optional: validate hottok if secret is configured
  const expectedHottok = Deno.env.get("HOTMART_TOKEN");
  if (expectedHottok && hottok !== expectedHottok) {
    await logEvent("Hotmart", event, "error", email, rawBody, "Invalid hottok");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Events that grant premium
  const PURCHASE_EVENTS = ["PURCHASE_APPROVED", "SUBSCRIPTION_REACTIVATED", "PURCHASE_REACTIVATED"];
  // Events that revoke premium
  const REVOKE_EVENTS = ["PURCHASE_REFUNDED", "PURCHASE_REVERSED", "SUBSCRIPTION_CANCELLATION", "PURCHASE_CANCELLED", "PURCHASE_CHARGEBACK"];

  try {
    if (PURCHASE_EVENTS.includes(event)) {
      if (!email) {
        await logEvent("Hotmart", event, "error", "", rawBody, "No buyer email in payload");
        return Response.json({ error: "No email" }, { status: 400 });
      }

      // Find user by email
      const users = await base44.asServiceRole.entities.User.list("-created_date", 500);
      const user = users.find(u => u.email?.toLowerCase() === email);

      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, { plan: "premium" });
        await logEvent("Hotmart", event, "success", email, rawBody, "");
        return Response.json({ success: true, action: "plan_upgraded", email });
      } else {
        // User not registered yet — save as pending
        await base44.asServiceRole.entities.PendingPremium.create({
          email,
          product_id: String(body.data?.product?.id || ""),
          event_type: event,
          raw_payload: rawBody,
          status: "pending",
        });
        await logEvent("Hotmart", event, "success", email, rawBody, "User not found — saved as pending");
        return Response.json({ success: true, action: "pending_created", email });
      }

    } else if (REVOKE_EVENTS.includes(event)) {
      if (!email) {
        await logEvent("Hotmart", event, "error", "", rawBody, "No buyer email in payload");
        return Response.json({ error: "No email" }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.list("-created_date", 500);
      const user = users.find(u => u.email?.toLowerCase() === email);

      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, { plan: "free" });
        await logEvent("Hotmart", event, "success", email, rawBody, "");
        return Response.json({ success: true, action: "plan_downgraded", email });
      } else {
        await logEvent("Hotmart", event, "success", email, rawBody, "User not found — no action");
        return Response.json({ success: true, action: "user_not_found", email });
      }

    } else {
      // Unhandled event — just log and return 200 so Hotmart doesn't retry
      await logEvent("Hotmart", event, "success", email, rawBody, "");
      return Response.json({ success: true, action: "ignored", event });
    }

  } catch (error) {
    await logEvent("Hotmart", event, "error", email, rawBody, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});