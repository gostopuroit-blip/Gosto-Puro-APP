import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função de uso único para liberar produtos manualmente e marcar PendingPremium como aplicados
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const USER_ID = "69e5d50ee8316610f3b20404";
  const PRODUCTS_TO_ADD = ["cene_leggere", "fitness_pratiche"];
  const PENDING_IDS = [
    "69e46169f85cf65e3e04c8cf",
    "69e46167c69c0bdfe87e0fea",
    "69e461665609c9883924ed82"
  ];

  // 1. Buscar usuário
  const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 5000);
  const user = allUsers.find(u => u.id === USER_ID);

  if (!user) {
    return Response.json({ error: "Usuário não encontrado: " + USER_ID }, { status: 404 });
  }

  // 2. Adicionar produtos ao usuário
  const current = user.purchased_products || [];
  const merged = [...new Set([...current, ...PRODUCTS_TO_ADD])];
  await base44.asServiceRole.entities.User.update(USER_ID, { purchased_products: merged });
  console.log(`[manualApplyProducts] Usuário ${user.email} atualizado: ${JSON.stringify(merged)}`);

  // 3. Marcar PendingPremium como applied
  for (const id of PENDING_IDS) {
    await base44.asServiceRole.entities.PendingPremium.update(id, { status: "applied" });
    console.log(`[manualApplyProducts] PendingPremium ${id} → applied`);
  }

  return Response.json({
    success: true,
    user_email: user.email,
    purchased_products: merged,
    pending_marked: PENDING_IDS.length
  });
});