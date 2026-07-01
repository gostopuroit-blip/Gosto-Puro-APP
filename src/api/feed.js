import { supabase } from "@/lib/supabase";

const PAGE = 8;

// Nome/foto do autor para denormalizar no post/comentário
function authorFields(me) {
  return {
    author_name: me?.display_name || me?.email?.split("@")[0] || "Gosto Puro",
    author_photo: me?.photo_url || null,
  };
}

// Feed paginado + estado (liked/saved) do usuário atual.
// Ordenado pela função inteligente gp_feed_for_user (interesse + engajamento + recência).
export async function fetchFeed({ page = 0 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  const from = page * PAGE;

  let list = [];
  const { data: ranked, error: rankErr } = await supabase.rpc("gp_feed_for_user", {
    p_limit: PAGE,
    p_offset: from,
  });
  if (!rankErr && Array.isArray(ranked)) {
    list = ranked;
  } else {
    // Fallback: cronológico simples se a RPC falhar
    const { data: posts, error } = await supabase
      .from("feed_posts")
      .select("*")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    list = posts || [];
  }

  if (!user || list.length === 0) {
    return { posts: list.map((p) => ({ ...p, liked: false, saved: false })), hasMore: list.length === PAGE };
  }

  const ids = list.map((p) => p.id);
  const [{ data: likes }, { data: saves }] = await Promise.all([
    supabase.from("feed_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
    supabase.from("feed_saves").select("post_id").eq("user_id", user.id).in("post_id", ids),
  ]);
  const likedSet = new Set((likes || []).map((l) => l.post_id));
  const savedSet = new Set((saves || []).map((s) => s.post_id));
  return {
    posts: list.map((p) => ({ ...p, liked: likedSet.has(p.id), saved: savedSet.has(p.id) })),
    hasMore: list.length === PAGE,
  };
}

export async function toggleLike(postId, currentlyLiked) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  if (currentlyLiked) {
    await supabase.from("feed_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("feed_likes").insert({ post_id: postId, user_id: user.id });
  }
}

export async function toggleSave(postId, currentlySaved) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  if (currentlySaved) {
    await supabase.from("feed_saves").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("feed_saves").insert({ post_id: postId, user_id: user.id });
  }
}

export async function fetchComments(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("feed_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = data || [];
  if (!user || list.length === 0) return list.map((c) => ({ ...c, liked: false }));
  const { data: myLikes } = await supabase
    .from("feed_comment_likes")
    .select("comment_id")
    .eq("user_id", user.id)
    .in("comment_id", list.map((c) => c.id));
  const likedSet = new Set((myLikes || []).map((l) => l.comment_id));
  return list.map((c) => ({ ...c, liked: likedSet.has(c.id) }));
}

export async function addComment(postId, body, me, parentId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  const row = { post_id: postId, user_id: user.id, body: body.trim(), parent_id: parentId, ...authorFields(me) };
  const { data, error } = await supabase.from("feed_comments").insert(row).select().single();
  if (error) throw error;
  return { ...data, liked: false };
}

export async function toggleCommentLike(commentId, currentlyLiked) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  if (currentlyLiked) {
    await supabase.from("feed_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
  } else {
    await supabase.from("feed_comment_likes").insert({ comment_id: commentId, user_id: user.id });
  }
}

export async function deleteComment(id) {
  const { error } = await supabase.from("feed_comments").delete().eq("id", id);
  if (error) throw error;
}

// Registra 1 view por usuário por post (alimenta view_count + ranking)
export async function recordView(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("feed_views")
    .upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
}

// Posts que o usuário salvou (para a pasta "Feed Gosto Puro" em Cartelle)
export async function fetchSavedPosts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: saves } = await supabase
    .from("feed_saves")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const ids = (saves || []).map((s) => s.post_id);
  if (ids.length === 0) return [];
  const [{ data: posts }, { data: likes }] = await Promise.all([
    supabase.from("feed_posts").select("*").in("id", ids),
    supabase.from("feed_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
  ]);
  const likedSet = new Set((likes || []).map((l) => l.post_id));
  const order = new Map(ids.map((id, idx) => [id, idx]));
  return (posts || [])
    .map((p) => ({ ...p, saved: true, liked: likedSet.has(p.id) }))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function createPost({ media, caption, me, tags = [], cta = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  const arr = Array.isArray(media) ? media : [];
  const hasVideo = arr.some((m) => m.type === "video");
  const kind = hasVideo ? "video" : arr.length > 1 ? "carousel" : "image";
  const row = {
    author_id: user.id,
    author_role: me?.role === "admin" ? "admin" : "expert",
    kind,
    media: arr,
    caption: caption || "",
    tags: Array.isArray(tags) ? tags : [],
    cta_label: cta?.label?.trim() || null,
    cta_url: cta?.url?.trim() || null,
    cta_image: cta?.image || null,
    is_published: true,
    ...authorFields(me),
  };
  const { data, error } = await supabase.from("feed_posts").insert(row).select().single();
  if (error) throw error;
  return { ...data, liked: false, saved: false };
}

export async function deletePost(id) {
  const { error } = await supabase.from("feed_posts").delete().eq("id", id);
  if (error) throw error;
}

// --- Perfil de criador (admin/expert) ---
export async function fetchCreatorProfile(authorId) {
  const { data, error } = await supabase.rpc("gp_creator_profile", { p_author: authorId });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function fetchCreatorPosts(authorId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: posts, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("author_id", authorId)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = posts || [];
  if (!user || list.length === 0) return list.map((p) => ({ ...p, liked: false, saved: false }));
  const ids = list.map((p) => p.id);
  const [{ data: likes }, { data: saves }] = await Promise.all([
    supabase.from("feed_likes").select("post_id").eq("user_id", user.id).in("post_id", ids),
    supabase.from("feed_saves").select("post_id").eq("user_id", user.id).in("post_id", ids),
  ]);
  const likedSet = new Set((likes || []).map((l) => l.post_id));
  const savedSet = new Set((saves || []).map((s) => s.post_id));
  return list.map((p) => ({ ...p, liked: likedSet.has(p.id), saved: savedSet.has(p.id) }));
}
