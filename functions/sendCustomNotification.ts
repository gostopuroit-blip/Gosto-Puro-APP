import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { /* unauthenticated */ }
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, body, url } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'title and body are required' }, { status: 400 });
    }

    // Sanitize VAPID keys: remove whitespace, convert standard base64 to url-safe base64, strip padding
    const sanitizeKey = (k) => k?.trim().replace(/\s/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const vapidPublicKey = sanitizeKey(Deno.env.get('VAPID_PUBLIC_KEY'));
    const vapidPrivateKey = sanitizeKey(Deno.env.get('VAPID_PRIVATE_KEY'));
    const vapidEmailRaw = Deno.env.get('VAPID_EMAIL')?.trim();
    const vapidEmail = vapidEmailRaw?.startsWith('mailto:') ? vapidEmailRaw : `mailto:${vapidEmailRaw}`;

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const { title, body, url } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'title and body are required' }, { status: 400 });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    let sent = 0;
    let failed = 0;
    const toDelete = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: url || '/' },
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          toDelete.push(sub.id);
        }
        failed++;
      }
    }

    for (const id of toDelete) {
      await base44.asServiceRole.entities.PushSubscription.delete(id);
    }

    return Response.json({ success: true, sent, failed, removed: toDelete.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});