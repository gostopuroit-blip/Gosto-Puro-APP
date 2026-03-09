import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    let allUsers = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list("-created_date", 200, skip);
      allUsers = allUsers.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    const usersWithEmail = allUsers.filter((u) => u.email && u.status !== "blocked");

    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ is_active: true }, "-created_date", 1).catch(() => []);
    const template = templates[0];

    if (!template) {
      return Response.json({ error: "Nenhum template de email ativo encontrado." }, { status: 400 });
    }

    const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(now);
    const dailyNotifs = await base44.asServiceRole.entities.DailyNotification.filter({ date: todayStr }, "-created_date", 1).catch(() => []);
    const todayNotif = dailyNotifs[0];

    let recipeListHtml = "";
    if (todayNotif && todayNotif.recipe_titles) {
      recipeListHtml = todayNotif.recipe_titles
        .map((title, i) => `<li style="margin-bottom:8px"><strong>${todayNotif.occasions?.[i] || ""}</strong>: ${title}</li>`)
        .join("");
      recipeListHtml = `<ul style="padding-left:20px">${recipeListHtml}</ul>`;
    } else {
      recipeListHtml = "<p>Scopri le ricette di oggi su Gosto Puro!</p>";
    }

    const emailBody = template.body.replace("{{RECIPE_LIST}}", recipeListHtml);

    let sent = 0;
    let failed = 0;
    for (const u of usersWithEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject: template.subject,
          body: emailBody,
          from_name: "Gosto Puro",
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return Response.json({
      success: true,
      date: todayStr,
      total_users: usersWithEmail.length,
      sent,
      failed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});