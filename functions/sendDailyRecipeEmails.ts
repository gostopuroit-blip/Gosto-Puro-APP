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
    
    // Get active email template
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ is_active: true }, '-created_date', 1);
    const template = templates[0] || {
      subject: '🍽️ Le ricette di oggi - Gosto Puro',
      body: '<h2>Ciao {{USER_NAME}}! 👋</h2><p>Ecco le ricette speciali di oggi:</p><br>{{RECIPE_LIST}}<br><br><p><a href="https://gostopuro.it">Vedi sul app</a></p>'
    };
    
    // Build recipe list
    const recipeList = (notif.occasions || []).map((occ, i) => {
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
        const body = template.body
          .replace('{{USER_NAME}}', user.full_name || 'Amico')
          .replace('{{RECIPE_LIST}}', recipeList);
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: template.subject,
          body,
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