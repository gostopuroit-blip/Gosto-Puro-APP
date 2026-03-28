import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Roda periodicamente (a cada hora via automation).
// Busca EbookPurchaseTriggers com email_trigger_at <= agora e followup_email_sent = false
// e dispara o email usando o template chamado "Ebook Followup".

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Permite chamada tanto por automation (sem user) quanto por admin logado
  const now = new Date().toISOString();

  // Busca triggers pendentes
  const pending = await base44.asServiceRole.entities.EbookPurchaseTrigger.filter(
    { followup_email_sent: false },
    "email_trigger_at",
    200
  );

  // Filtra apenas os que já passaram do horário agendado
  const toSend = pending.filter(t => t.email_trigger_at && t.email_trigger_at <= now);

  if (toSend.length === 0) {
    return Response.json({ success: true, sent: 0, message: "Nenhum disparo pendente" });
  }

  // Busca o template de ebook
  const templates = await base44.asServiceRole.entities.EmailTemplate.filter(
    { name: "Ebook Followup" },
    "-created_date",
    1
  );

  if (!templates || templates.length === 0) {
    return Response.json({ error: "Template 'Ebook Followup' não encontrado. Crie-o na aba Email Templates." }, { status: 404 });
  }

  const template = templates[0];
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const trigger of toSend) {
    try {
      const subject = template.subject
        .replace(/\{\{USER_NAME\}\}/g, trigger.user_name || "")
        .replace(/\{\{USER_EMAIL\}\}/g, trigger.user_email || "");

      const body = template.body
        .replace(/\{\{USER_NAME\}\}/g, trigger.user_name || "")
        .replace(/\{\{USER_EMAIL\}\}/g, trigger.user_email || "");

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: trigger.user_email,
        subject,
        body,
        from_name: "Gosto Puro"
      });

      // Marca como enviado
      await base44.asServiceRole.entities.EbookPurchaseTrigger.update(trigger.id, {
        followup_email_sent: true
      });

      sent++;
    } catch (err) {
      failed++;
      errors.push({ email: trigger.user_email, error: err.message });
    }
  }

  return Response.json({ success: true, sent, failed, errors });
});