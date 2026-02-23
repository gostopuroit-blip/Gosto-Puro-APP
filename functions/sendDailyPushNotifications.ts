import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function toBase64url(str) {
  return (str || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function buildVapidAuth(endpoint, publicKeyBase64url, privateKeyBase64url, email) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = btoa(JSON.stringify({ aud: audience, exp: expiry, sub: `mailto:${email}` })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);

  const privBytes = Uint8Array.from(atob(privateKeyBase64url.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + privBytes.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(privBytes, pkcs8Header.length);

  const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, sigInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `vapid t=${header}.${payload}.${sig},k=${publicKeyBase64url}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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

    const vapidPublicKey = toBase64url(Deno.env.get('VAPID_PUBLIC_KEY'));
    const vapidPrivateKey = toBase64url(Deno.env.get('VAPID_PRIVATE_KEY'));
    const vapidEmail = (Deno.env.get('VAPID_EMAIL') || '').trim().replace(/^mailto:/, '');

    // Get today's notification
    const today = new Date().toISOString().split('T')[0];
    const notifs = await base44.asServiceRole.entities.DailyNotification.filter({ date: today }, '-created_date', 1);
    if (!notifs.length) {
      return Response.json({ error: 'No daily notification found for today' }, { status: 404 });
    }
    const notif = notifs[0];

    const body = (notif.occasions || []).map((occ, i) => {
      const icons = { Colazione: '☕', Pranzo: '🍝', Cena: '🍷' };
      return `${icons[occ] || '🍽️'} ${occ}: ${notif.recipe_titles?.[i] || ''}`;
    }).join('\n');

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    let sent = 0;
    let failed = 0;
    const toDelete = [];

    for (const sub of subscriptions) {
      try {
        const vapidAuth = await buildVapidAuth(sub.endpoint, vapidPublicKey, vapidPrivateKey, vapidEmail);
        const pushPayload = JSON.stringify({
          title: '🍽️ Ricette di oggi',
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: '/' },
        });

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidAuth,
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: pushPayload,
        });

        if (res.status === 410 || res.status === 404) {
          toDelete.push(sub.id);
          failed++;
        } else if (res.ok || res.status === 201 || res.status === 204) {
          sent++;
        } else {
          failed++;
        }
      } catch (_err) {
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