import { supabase } from "@/lib/supabase";
import { deletePost } from "./feed";
import { deleteStory } from "./stories";

// Denúncia de conteúdo (post, comentário ou story). 1 por usuário por item.
export async function reportContent({ type, id, authorId, snapshot, mediaUrl, reason }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  const row = {
    reporter_id: user.id,
    target_type: type,
    target_id: id,
    target_author_id: authorId || null,
    snapshot: (snapshot || "").slice(0, 200) || null,
    media_url: mediaUrl || null,
    reason: reason || null,
  };
  const { error } = await supabase
    .from("feed_reports")
    .upsert(row, { onConflict: "reporter_id,target_type,target_id", ignoreDuplicates: true });
  if (error) throw error;
}

// --- Admin ---
export async function fetchReports() {
  const { data, error } = await supabase
    .from("feed_reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function dismissReport(id) {
  const { error } = await supabase.from("feed_reports").update({ status: "dismissed" }).eq("id", id);
  if (error) throw error;
}

// Apaga o conteúdo denunciado e marca todas as denúncias desse alvo como resolvidas
export async function resolveByDeleting(report) {
  if (report.target_type === "post") {
    await deletePost(report.target_id);
  } else if (report.target_type === "comment") {
    await supabase.from("feed_comments").delete().eq("id", report.target_id);
  } else if (report.target_type === "story") {
    const { data: s } = await supabase
      .from("feed_stories")
      .select("id, media_path")
      .eq("id", report.target_id)
      .maybeSingle();
    if (s) await deleteStory(s);
    else await supabase.from("feed_stories").delete().eq("id", report.target_id);
  }
  await supabase
    .from("feed_reports")
    .update({ status: "reviewed" })
    .eq("target_type", report.target_type)
    .eq("target_id", report.target_id);
}
