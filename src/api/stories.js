import { supabase } from "@/lib/supabase";

// PODE_POSTAR_STORY: por enquanto TODOS os usuários logados.
// Para restringir a admin/expert, troque por: me?.role==="admin" || me?.is_expert===true
export function canPostStory() {
  return true;
}

// Busca stories ativos agrupados por autor (+ estado visto/não-visto)
export async function fetchStories() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: stories } = await supabase
    .from("feed_stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  const list = stories || [];
  let seen = new Set();
  let reactions = new Map(); // story_id -> emoji escolhido pelo usuário
  if (user && list.length) {
    const ids = list.map((s) => s.id);
    const [{ data: views }, { data: likes }] = await Promise.all([
      supabase.from("feed_story_views").select("story_id").eq("user_id", user.id).in("story_id", ids),
      supabase.from("feed_story_likes").select("story_id, emoji").eq("user_id", user.id).in("story_id", ids),
    ]);
    seen = new Set((views || []).map((v) => v.story_id));
    reactions = new Map((likes || []).map((l) => [l.story_id, l.emoji || "❤️"]));
  }

  const groups = new Map();
  for (const s of list) {
    if (!groups.has(s.author_id)) {
      groups.set(s.author_id, {
        author_id: s.author_id,
        author_name: s.author_name,
        author_photo: s.author_photo,
        author_role: s.author_role,
        stories: [],
      });
    }
    groups.get(s.author_id).stories.push({ ...s, seen: seen.has(s.id), reaction: reactions.get(s.id) || null });
  }

  const arr = [...groups.values()].map((g) => ({ ...g, allSeen: g.stories.every((s) => s.seen) }));
  arr.sort(
    (a, b) =>
      (a.allSeen ? 1 : 0) - (b.allSeen ? 1 : 0) ||
      new Date(b.stories[b.stories.length - 1].created_at) - new Date(a.stories[a.stories.length - 1].created_at)
  );
  return { groups: arr, myId: user?.id || null };
}

export async function createStory({ file, me }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  const isVideo = file.type.startsWith("video/");
  const ext = (file.name?.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("stories")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("stories").getPublicUrl(path);

  const row = {
    author_id: user.id,
    author_name: me?.display_name || me?.email?.split("@")[0] || "Utente",
    author_photo: me?.photo_url || null,
    author_role: me?.role === "admin" ? "admin" : me?.is_expert ? "expert" : "user",
    media_url: pub.publicUrl,
    media_path: path,
    media_type: isVideo ? "video" : "image",
  };
  const { data, error } = await supabase.from("feed_stories").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStory(story) {
  await supabase.from("feed_stories").delete().eq("id", story.id);
  if (story.media_path) await supabase.storage.from("stories").remove([story.media_path]);
}

// Define (ou troca) a reação de emoji do usuário na story. É um upsert na PK
// (story_id,user_id): trocar o emoji NÃO mexe no like_count (o trigger só conta
// INSERT/DELETE) — continua sendo 1 reação. Novo = conta +1.
export async function setStoryReaction(storyId, emoji) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  const { error } = await supabase
    .from("feed_story_likes")
    .upsert({ story_id: storyId, user_id: user.id, emoji }, { onConflict: "story_id,user_id" });
  if (error) throw error;
}

// Remove a reação do usuário (conta -1 via trigger).
export async function removeStoryReaction(storyId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("feed_story_likes").delete().eq("story_id", storyId).eq("user_id", user.id);
}

export async function markSeen(storyId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("feed_story_views")
    .upsert({ story_id: storyId, user_id: user.id }, { onConflict: "story_id,user_id", ignoreDuplicates: true });
}

// Dispara a limpeza dos expirados (throttle: no máx. 1x/30min por dispositivo)
export async function triggerStoryCleanup() {
  try {
    const last = Number(localStorage.getItem("gp_story_cleanup") || 0);
    if (Date.now() - last < 30 * 60 * 1000) return;
    localStorage.setItem("gp_story_cleanup", String(Date.now()));
    await supabase.functions.invoke("cleanup-stories", { body: {} });
  } catch {
    // silencioso
  }
}
