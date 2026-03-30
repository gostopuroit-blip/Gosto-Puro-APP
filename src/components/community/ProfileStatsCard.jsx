import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ProfileStatsCard({ userEmail, onPostClick, onFollowerClick, onFollowingClick, followerCount, followingCount }) {
  const [stats, setStats] = useState({
    posts: 0,
    totalLikes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userEmail]);

  const loadStats = async () => {
    try {
      const postsData = await base44.entities.CommunityPost.filter(
        { user_email: userEmail, status: "active" },
        "-created_date",
        500
      );

      const totalLikes = postsData.reduce((sum, p) => sum + (p.likes_count || 0), 0);

      setStats({
        posts: postsData.length,
        totalLikes,
      });
    } catch {
      setStats({ posts: 0, totalLikes: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      {/* Post - não clicável */}
      <div className="flex flex-col items-center">
        <p className="text-base mb-0.5">📝</p>
        <p className="text-lg font-bold text-[#2D6A4F] dark:text-[#40916C]">{stats.posts}</p>
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