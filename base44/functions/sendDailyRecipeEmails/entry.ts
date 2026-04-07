import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();

    // Busca todos os usuarios com email
    let allUsers = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list("-created_date", 200, skip);
      allUsers = allUsers.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    const usersWithEmail = allUsers.filter((u) => u.email && u.status !== "blocked");

    // Busca template de email ativo
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ is_active: true }, "-created_date", 1).catch(() => []);
    const template = templates[0];

    if (!template) {
      return Response.json({ error: "Nenhum template de email ativo encontrado." }, { status: 400 });
    }

    // Busca as receitas do dia (DailyNotification de hoje)
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

    // Envia para todos os usuarios (substituindo placeholders por usuario)
    let sent = 0;
    let failed = 0;
    for (const user of usersWithEmail) {
      try {
        const userName = user.full_name || user.email.split("@")[0];
        const personalizedBody = template.body
          .replace(/\{\{RECIPE_LIST\}\}/g, recipeListHtml)
          .replace(/\{\{USER_NAME\}\}/g, userName)
          .replace(/\{\{APP_LINK\}\}/g, "https://run.base44.app/699707f25ff5e371dc9a1c99");
        const personalizedSubject = template.subject
          .replace(/\{\{USER_NAME\}\}/g, userName);
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: personalizedSubject,
          body: personalizedBody,
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
      rome_hour: romeHour,
      total_users: usersWithEmail.length,
      sent,
      failed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});