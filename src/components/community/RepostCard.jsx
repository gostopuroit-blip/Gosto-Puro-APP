import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Repeat2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import CommunityPostCard from "./CommunityPostCard";

export default function RepostCard({ 
  repost, 
  currentUser, 
  onUpdate, 
  followedEmails, 
  onFollowChange, 
  onHashtagFilter 
}) {
  const [originalPost, setOriginalPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOriginalPost = async () => {
      try {
        const post = await base44.entities.CommunityPost.read(repost.original_post_id);
        setOriginalPost(post);
      } catch (error) {
        console.error("Erro ao carregar post original:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOriginalPost();
  }, [repost.original_post_id]);

  if (loading || !originalPost) {
    return null;
  }

  // Get reposter info (from the PostShare record)
  const reposterInitials = (repost.sharer_email?.split("@")[0] || "U").charAt(0).toUpperCase();

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl">
      {/* Repost header */}
      <div className="bg-gray-50 dark:bg-[#111] border-b border-gray-100 dark:border-[#2A2A2A] px-4 py-3 flex items-center gap-2">
        <Repeat2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          🔁 <span className="font-bold">{repost.sharer_email?.split("@")[0] || "Utente"}</span> repostou
        </p>
        <p className="text-xs text-gray-400 ml-auto">
          {formatDistanceToNow(new Date(repost.created_date), { addSuffix: true, locale: ptBR })}
        </p>
      </div>

      {/* Optional caption from reposter */}
      {repost.caption && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-[#111] border-b border-gray-100 dark:border-[#2A2A2A]">
          <p className="text-sm text-gray-700 dark:text-gray-300">{repost.caption}</p>
        </div>
      )}

      {/* Original post embedded */}
      <div className="p-4">
        <CommunityPostCard
          post={originalPost}
          currentUser={currentUser}
          onUpdate={onUpdate}
          followedEmails={followedEmails}
          onFollowChange={onFollowChange}
          onHashtagFilter={onHashtagFilter}
        />
      </div>
    </div>
  );
}