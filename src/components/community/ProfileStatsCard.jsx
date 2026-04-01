import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ProfileStatsCard({ userEmail, postCount, onPostClick, onFollowerClick, onFollowingClick, followerCount, followingCount }) {
  // If postCount is passed directly, use it; otherwise fetch
  const [fetchedPosts, setFetchedPosts] = useState(postCount ?? null);

  useEffect(() => {
    if (postCount !== undefined) return; // skip fetch if passed directly
    base44.entities.CommunityPost.filter({ user_email: userEmail }, "-created_date", 500)
      .then((data) => setFetchedPosts(data.length))
      .catch(() => setFetchedPosts(0));
  }, [userEmail, postCount]);

  const displayPosts = postCount ?? fetchedPosts ?? 0;

  return (
    <div className="flex items-center justify-between">
      {/* Post - não clicável */}
      <div className="flex flex-col items-center">
        <p className="text-base mb-0.5">📝</p>
        <p className="text-lg font-bold text-[#2D6A4F] dark:text-[#40916C]">{displayPosts}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Post</p>
      </div>

      {/* Separator */}
      <div className="h-10 w-px bg-gray-200 dark:bg-[#2A2A2A]"></div>

      {/* Follower - clicável */}
      <button onClick={onFollowerClick} className="flex flex-col items-center cursor-pointer hover:opacity-70 transition">
        <p className="text-base mb-0.5">👥</p>
        <p className="text-lg font-bold text-[#2D6A4F] dark:text-[#40916C]">{followerCount || 0}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Follower</p>
      </button>

      {/* Separator */}
      <div className="h-10 w-px bg-gray-200 dark:bg-[#2A2A2A]"></div>

      {/* Seguiti - clicável */}
      <button onClick={onFollowingClick} className="flex flex-col items-center cursor-pointer hover:opacity-70 transition">
        <p className="text-base mb-0.5">👤</p>
        <p className="text-lg font-bold text-[#2D6A4F] dark:text-[#40916C]">{followingCount || 0}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Seguiti</p>
      </button>
    </div>
  );
}