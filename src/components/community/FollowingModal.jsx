import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, UserPlus, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getDisplayName, getPhotoUrl } from "@/lib/userDisplayUtils";

export default function FollowingModal({ expertEmail, onClose, currentUser }) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    const loadFollowing = async () => {
      try {
        // Fetch all users that expert is following
        const followData = await base44.entities.UserFollow.filter(
          { follower_email: expertEmail },
          "-created_date",
          1000
        );

        // Get user details for each followed user
        const followedEmails = followData.map((f) => f.following_email);
        const users = await base44.entities.User.list();
        const followedUsers = users.filter((u) => followedEmails.includes(u.email));

        setFollowing(
          followedUsers.map((u) => ({
            email: u.email,
            name: u.full_name || u.email.split("@")[0],
            photo: u.photo_url || null,
          }))
        );

        // Check which users the current user is following
        if (currentUser?.email) {
          const followingData = await base44.entities.UserFollow.filter(
            { follower_email: currentUser.email },
            "-created_date",
            1000
          );
          const followingMap = {};
          followingData.forEach((f) => {
            followingMap[f.following_email] = true;
          });
          setFollowingMap(followingMap);
        }
      } catch (error) {
        toast.error("Errore nel caricamento dei seguiti");
      } finally {
        setLoading(false);
      }
    };

    loadFollowing();
  }, [expertEmail, currentUser?.email]);

  const handleFollowToggle = async (targetEmail) => {
    if (!currentUser) {
      toast.error("Fai login per seguire");
      return;
    }

    try {
      if (followingMap[targetEmail]) {
        // Unfollow
        const record = await base44.entities.UserFollow.filter(
          {
            follower_email: currentUser.email,
            following_email: targetEmail,
          },
          "-created_date",
          1
        );
        if (record[0]) {
          await base44.entities.UserFollow.delete(record[0].id);
          setFollowingMap((prev) => ({ ...prev, [targetEmail]: false }));
          toast.success("Non stai più seguendo");
        }
      } else {
        // Follow
        await base44.entities.UserFollow.create({
          follower_email: currentUser.email,
          following_email: targetEmail,
        });
        setFollowingMap((prev) => ({ ...prev, [targetEmail]: true }));
        toast.success("Stai seguendo!");
      }
    } catch (error) {
      toast.error("Errore nell'operazione");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4 pb-28 overflow-y-auto">
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl w-full max-w-md shadow-xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2A2A2A] flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Seguiti</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="w-6 h-6 text-[#2D6A4F] animate-spin" />
          </div>
        ) : following.length === 0 ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <p className="text-gray-400 text-sm">Non segue nessuno ancora</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1 p-4">
            {following.map((user) => (
              <div key={user.email} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition">
                {user.photo ? (
                  <img src={user.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <Link
                  to={`/ExpertProfile?id=${user.email}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:underline">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </Link>

                {currentUser?.email !== user.email && (
                  <button
                    onClick={() => handleFollowToggle(user.email)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                      followingMap[user.email]
                        ? "bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/20"
                        : "bg-[#2D6A4F] text-white hover:bg-[#235c43]"
                    }`}
                  >
                    {followingMap[user.email] ? (
                      <UserCheck className="w-3 h-3" />
                    ) : (
                      <UserPlus className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}