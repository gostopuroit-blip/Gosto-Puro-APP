import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ProfileStatsCard({ userEmail }) {
  const [stats, setStats] = useState({
    posts: 0,
    totalLikes: 0,
    totalComments: 0,
    followers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userEmail]);

  const loadStats = async () => {
    try {
      const [postsData, followersData] = await Promise.all([
        base44.entities.CommunityPost.filter(
          { user_email: userEmail, status: "active" },
          "-created_date",
          500
        ),
        base44.entities.UserFollow.filter(
          { following_email: userEmail },
          "-created_date",
          1000
        ),
      ]);

      const totalLikes = postsData.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const totalComments = postsData.reduce((sum, p) => sum + (p.comments_count || 0), 0);

      setStats({
        posts: postsData.length,
        totalLikes,
        totalComments,
        followers: followersData.length,
      });
    } catch {
      setStats({ posts: 0, totalLikes: 0, totalComments: 0, followers: 0 });
    } finally {
      setLoading(false);
    }
  };

  const StatItem = ({ icon, value, label }) => (
    <div className="flex-1 flex flex-col items-center">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{icon}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{label}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatItem icon="📝" value={stats.posts} label="Post" />
      <StatItem icon="💬" value={stats.totalComments} label="Commenti" />
      <StatItem icon="👥" value={stats.followers} label="Follower" />
    </div>
  );
}