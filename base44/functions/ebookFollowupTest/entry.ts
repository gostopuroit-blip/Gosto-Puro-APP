import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { to_email, user_name } = await req.json().catch(() => ({}));
  const testEmail = to_email || "fernandesbrandom@gmail.com";
  const testName = user_name || "Teste";

  const templates = await base44.asServiceRole.entities.EmailTemplate.filter(
    { name: "Ebook Followup" },
    "-created_date",
    1
  );

  if (!templates || templates.length === 0) {
    return Response.json({ error: "Template 'Ebook Followup' não encontrado." }, { status: 404 });
  }

  const template = templates[0];

  const subject = template.subject
    .replace(/\{\{USER_NAME\}\}/g, testName)
    .replace(/\{\{USER_EMAIL\}\}/g, testEmail);

  const body = template.body
    .replace(/\{\{USER_NAME\}\}/g, testName)
    .replace(/\{\{USER_EMAIL\}\}/g, testEmail);

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Gosto Puro <onboarding@resend.dev>",
      to: [testEmail],
      subject,
      html: body
    })
  });
  if (!resendRes.ok) {
    const errData = await resendRes.json();
    throw new Error(errData.message || "Resend error");
  }

  return Response.json({ success: true, sent_to: testEmail });
});