import { supabase } from "@/lib/supabase";

// Sino de notificações internas (curtidas, comentários, follow, reações de story).
// Lê da tabela `notifications` (RLS: cada um lê/atualiza só as suas). As escritas
// são best-effort: a INSERT policy exige sender_email = e-mail do usuário logado.

export async function fetchNotifications(limit = 50) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function countUnreadNotifications() {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  return count || 0;
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("is_read", false);
}

// --- Escritas (fire-and-forget; nunca quebram a ação principal) ---
async function insertNotif(row) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // sender_email TEM que ser o e-mail do logado (exigência da RLS de INSERT).
    await supabase.from("notifications").insert({
      ...row,
      sender_id: user.id,
      sender_email: user.email,
      is_read: false,
    });
  } catch {
    /* silencioso */
  }
}

const senderName = (me) => me?.display_name || me?.email?.split("@")[0] || "Qualcuno";

export function notifyPostLike({ post, me }) {
  if (!post?.author_id || post.author_id === me?.id) return;
  const name = senderName(me);
  return insertNotif({
    recipient_id: post.author_id,
    sender_name: name,
    sender_photo: me?.photo_url || null,
    type: "like",
    message: `${name} ha messo mi piace al tuo post`,
    reference_id: post.id,
    reference_type: "post",
  });
}

export function notifyComment({ post, me }) {
  if (!post?.author_id || post.author_id === me?.id) return;
  const name = senderName(me);
  return insertNotif({
    recipient_id: post.author_id,
    sender_name: name,
    sender_photo: me?.photo_url || null,
    type: "comment",
    message: `${name} ha commentato il tuo post`,
    reference_id: post.id,
    reference_type: "post",
  });
}

export function notifyFollow({ followingId, me }) {
  if (!followingId || followingId === me?.id) return;
  const name = senderName(me);
  return insertNotif({
    recipient_id: followingId,
    sender_name: name,
    sender_photo: me?.photo_url || null,
    type: "follow",
    message: `${name} ha iniziato a seguirti`,
    reference_id: me?.id || null,
    reference_type: "profile",
  });
}
