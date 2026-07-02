import { useState, useEffect } from "react";
import { X, Loader2, BadgeCheck, Grid3x3, Film, UserPlus, UserCheck, Pencil } from "lucide-react";
import { fetchCreatorProfile, fetchCreatorPosts, toggleFollow, updateMyBio } from "@/api/feed";
import PostCard from "./PostCard";

export default function CreatorProfileSheet({ authorId, me, onClose }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editBio, setEditBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const load = () => {
    Promise.all([fetchCreatorProfile(authorId), fetchCreatorPosts(authorId)])
      .then(([p, ps]) => {
        setProfile(p);
        setPosts(ps);
        setFollowing(!!p?.is_following);
        setFollowerCount(Number(p?.follower_count || 0));
        setFollowingCount(Number(p?.following_count || 0));
        setBioText(p?.bio || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [authorId]);

  const cover = (p) => (Array.isArray(p.media) ? p.media[0] : null);
  const name = profile?.display_name || posts[0]?.author_name || "Gosto Puro";
  const photo = profile?.photo_url || posts[0]?.author_photo || null;
  const role = profile?.role === "admin" ? "admin" : "expert";
  const roleLabel = role === "admin" ? "Gosto Puro" : "Expert";
  const isOwn = authorId === me?.id;

  const onDeleted = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));

  const onToggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    setFollowerCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await toggleFollow(authorId, following);
    } catch {
      setFollowing(!next);
      setFollowerCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const saveBio = async () => {
    setSavingBio(true);
    try {
      await updateMyBio(bioText);
      setProfile((p) => ({ ...p, bio: bioText }));
      setEditBio(false);
    } catch {
      // silencioso
    } finally {
      setSavingBio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] bg-white dark:bg-[#0F0F0F] overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur border-b border-gray-100 dark:border-[#222] flex items-center gap-3 px-4 py-3">
        <button onClick={onClose} className="text-gray-500 dark:text-gray-300"><X className="w-6 h-6" /></button>
        <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
          {name} <BadgeCheck className={`w-4 h-4 ${role === "admin" ? "text-[#D4A846]" : "text-[#2D6A4F]"}`} />
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#2D6A4F] animate-spin" /></div>
      ) : (
        <>
          {/* Cabeçalho do perfil */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-4">
              {photo ? (
                <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 flex justify-around text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{posts.length}</p>
                  <p className="text-[11px] text-gray-500">post</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{followerCount}</p>
                  <p className="text-[11px] text-gray-500">seguaci</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{followingCount}</p>
                  <p className="text-[11px] text-gray-500">seguiti</p>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                {name}
                <BadgeCheck className={`w-4 h-4 ${role === "admin" ? "text-[#D4A846]" : "text-[#2D6A4F]"}`} />
              </p>
              <p className="text-xs text-[#2D6A4F] font-semibold">{roleLabel}</p>

              {editBio ? (
                <div className="mt-2">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="Scrivi una breve descrizione del profilo..."
                    className="w-full bg-gray-50 dark:bg-[#1A1A1A] rounded-xl px-3 py-2 text-sm outline-none border border-gray-200 dark:border-[#333]"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={saveBio}
                      disabled={savingBio}
                      className="text-sm font-bold text-white bg-[#2D6A4F] px-4 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {savingBio ? "..." : "Salva"}
                    </button>
                    <button
                      onClick={() => { setEditBio(false); setBioText(profile?.bio || ""); }}
                      className="text-sm text-gray-500 px-3 py-1.5"
                    >
                      Annulla
                    </button>
                    <span className="ml-auto text-[11px] text-gray-400">{bioText.length}/200</span>
                  </div>
                </div>
              ) : (
                profile?.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{profile.bio}</p>
                )
              )}
            </div>

            {/* Ação: seguir (outros) ou modificar bio (você) */}
            {!editBio && (
              isOwn ? (
                <button
                  onClick={() => setEditBio(true)}
                  className="mt-3 w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 font-semibold text-sm py-2 rounded-xl"
                >
                  <Pencil className="w-4 h-4" /> {profile?.bio ? "Modifica bio" : "Aggiungi una bio"}
                </button>
              ) : (
                <button
                  onClick={onToggleFollow}
                  className={`mt-3 w-full flex items-center justify-center gap-2 font-bold text-sm py-2.5 rounded-xl transition ${
                    following
                      ? "bg-gray-100 dark:bg-[#242424] text-gray-700 dark:text-gray-200"
                      : "bg-[#2D6A4F] text-white"
                  }`}
                >
                  {following ? <><UserCheck className="w-4 h-4" /> Segui già</> : <><UserPlus className="w-4 h-4" /> Segui</>}
                </button>
              )
            )}
          </div>

          {/* Grade de posts */}
          <div className="flex items-center justify-center gap-1.5 py-2 border-y border-gray-100 dark:border-[#222] text-gray-500">
            <Grid3x3 className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wide">Post</span>
          </div>

          {posts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-16">Ancora nessun post.</p>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {posts.map((p) => {
                const c = cover(p);
                return (
                  <button key={p.id} onClick={() => setActive(p)} className="relative aspect-square bg-gray-100 dark:bg-[#1A1A1A] overflow-hidden">
                    {c?.type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        <Film className="w-6 h-6 text-white/70" />
                      </div>
                    ) : (
                      <img src={c?.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {Array.isArray(p.media) && p.media.length > 1 && (
                      <span className="absolute top-1 right-1 bg-black/55 text-white text-[9px] font-bold px-1 rounded">{p.media.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Post aberto */}
      {active && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center" onClick={() => setActive(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActive(null)} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
            <PostCard post={active} me={me} disableProfile onDeleted={(id) => { onDeleted(id); setActive(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
