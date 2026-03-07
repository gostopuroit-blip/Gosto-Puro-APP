import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      isAuthorized = true; // scheduler call
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get today's daily notification
    const today = new Date().toISOString().split('T')[0];
    const notifs = await base44.asServiceRole.entities.DailyNotification.filter({ date: today }, '-created_date', 1);
    
    if (!notifs.length) {
      return Response.json({ error: 'No daily notification found for today' }, { status: 404 });
    }

    const notif = notifs[0];
    
    // Build email body
    const emailBody = (notif.occasions || []).map((occ, i) => {
      const icons = { Colazione: '☕', Pranzo: '🍝', Cena: '🍷' };
      const title = notif.recipe_titles?.[i] || 'Ricetta';
      return `<strong>${icons[occ] || '🍽️'} ${occ}</strong><br>${title}`;
    }).join('<br><br>');

    // Get all users
    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.email) continue;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: '🍽️ Le ricette di oggi - Gosto Puro',
          body: `
            <h2>Ciao ${user.full_name || 'Amico'}! 👋</h2>
            <p>Ecco le ricette speciali di oggi per te:</p>
            <br>
            ${emailBody}
            <br><br>
            <p><a href="https://gostopuro.it" style="background: #2D6A4F; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Vedi sul app</a></p>
            <br>
            <p style="font-size: 12px; color: #999;">Non vuoi ricevere questi email? Scrivici su support.</p>
          `,
        });
        sent++;
      } catch (err) {
        failed++;
      }
    }

    return Response.json({ success: true, sent, failed, users_total: users.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});