import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduler (no user) or admin
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      isAuthorized = true; // scheduler
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const toBase64url = (k) => (k || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const vapidPublicKey = toBase64url(Deno.env.get('VAPID_PUBLIC_KEY'));
    const vapidPrivateKey = toBase64url(Deno.env.get('VAPID_PRIVATE_KEY'));
    const vapidEmailRaw = (Deno.env.get('VAPID_EMAIL') || '').trim();
    const vapidEmail = vapidEmailRaw.startsWith('mailto:') ? vapidEmailRaw : `mailto:${vapidEmailRaw}`;

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    // Get today's notification
    const today = new Date().toISOString().split('T')[0];
    const notifs = await base44.asServiceRole.entities.DailyNotification.filter({ date: today }, '-created_date', 1);
    if (!notifs.length) {
      return Response.json({ error: 'No daily notification found for today' }, { status: 404 });
    }
    const notif = notifs[0];

    // Build notification body
    const body = (notif.occasions || []).map((occ, i) => {
      const icons = { Colazione: '☕', Pranzo: '🍝', Cena: '🍷' };
      return `${icons[occ] || '🍽️'} ${occ}: ${notif.recipe_titles?.[i] || ''}`;
    }).join('\n');

    // Get all subscriptions
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    let sent = 0;
    let failed = 0;
    const toDelete = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title: '🍽️ Ricette di oggi',
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: '/' },
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err) {
        // 410 Gone = subscription expired, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          toDelete.push(sub.id);
        }
        failed++;
      }
    }

    // Clean up expired subscriptions
    for (const id of toDelete) {
      await base44.asServiceRole.entities.PushSubscription.delete(id);
    }

    return Response.json({ success: true, sent, failed, removed: toDelete.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});