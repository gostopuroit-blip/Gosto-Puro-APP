import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import FollowButton from "./FollowButton";

export default function SuggestedUsers({ currentUser, followedEmails, onFollowChange }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    // Get users who have posts (experts/admins or active posters)
    base44.entities.CommunityPost.filter({ status: "active" }, "-created_date", 100)
      .then((posts) => {
        // Count posts per user
        const map = {};
        posts.forEach((p) => {
          const key = p.created_by;
          if (!key || key === currentUser.email) return;
          if (!map[key]) map[key] = { email: key, name: p.user_name, photo: p.user_photo, is_expert: p.is_expert, count: 0 };
          map[key].count++;
        });
        // Sort by post count, pick top 6 not already followed
        const sorted = Object.values(map)
          .filter((u) => !followedEmails.has(u.email))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setUsers(sorted);
      });
  }, [currentUser, followedEmails]);

  if (users.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4 mb-4">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Suggeriti per te</p>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.email} className="flex items-center gap-3">
            <Link to={`/ExpertProfile?id=${u.email}`} className="flex items-center gap-2 flex-1 min-w-0">
              {u.photo ? (
                <img src={u.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(u.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{u.name || "Utente"}</p>
                  {u.is_expert && <BadgeCheck className="w-3.5 h-3.5 text-[#2D6A4F] flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-gray-400">{u.count} post</p>
              </div>
            </Link>
            <FollowButton
              targetEmail={u.email}
              currentUser={currentUser}
              onFollowChange={(following) => onFollowChange(u.email, following)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}