import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Convert standard base64 to base64url (url-safe, no padding)
function toBase64url(str) {
  return (str || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// HMAC-SHA256 using Web Crypto
async function hmacSHA256(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

// Build VAPID Authorization header manually
async function buildVapidAuth(endpoint, publicKeyBase64url, privateKeyBase64url, email) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = btoa(JSON.stringify({ aud: audience, exp: expiry, sub: `mailto:${email}` })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);

  // Import private key as PKCS8 raw EC key
  const privBytes = Uint8Array.from(atob(privateKeyBase64url.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  // Build PKCS8 wrapper for P-256 private key
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

  const jwt = `${header}.${payload}.${sig}`;
  return `vapid t=${jwt},k=${publicKeyBase64url}`;
}

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

    const vapidPublicKey = toBase64url(Deno.env.get('VAPID_PUBLIC_KEY'));
    const vapidPrivateKey = toBase64url(Deno.env.get('VAPID_PRIVATE_KEY'));
    const vapidEmail = (Deno.env.get('VAPID_EMAIL') || '').trim().replace(/^mailto:/, '');

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    let sent = 0;
    let failed = 0;
    const toDelete = [];

    for (const sub of subscriptions) {
      try {
        const auth = await buildVapidAuth(sub.endpoint, vapidPublicKey, vapidPrivateKey, vapidEmail);
        const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: url || '/' } });

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload,
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