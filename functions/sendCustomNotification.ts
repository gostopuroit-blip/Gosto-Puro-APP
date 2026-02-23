import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim();
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim();
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