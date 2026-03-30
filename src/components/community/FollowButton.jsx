import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FollowButton({ targetEmail, currentUser, onFollowChange }) {
  const [followRecord, setFollowRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.email === targetEmail) {
      setLoading(false);
      return;
    }
    base44.entities.UserFollow.filter({
      follower_email: currentUser.email,
      following_email: targetEmail,
    }, "-created_date", 1).then((data) => {
      setFollowRecord(data[0] || null);
      setLoading(false);
    });
  }, [currentUser, targetEmail]);

  if (!currentUser || currentUser.email === targetEmail) return null;

  const isFollowing = !!followRecord;

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    if (isFollowing) {
      await base44.entities.UserFollow.delete(followRecord.id);
      setFollowRecord(null);
      toast.success("Non stai più seguendo");
      onFollowChange?.(false);
    } else {
      const rec = await base44.entities.UserFollow.create({
        follower_email: currentUser.email,
        following_email: targetEmail,
      });
      setFollowRecord(rec);
      toast.success("Stai seguendo!");
      onFollowChange?.(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
        isFollowing
          ? "bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#333]"
          : "bg-[#2D6A4F] text-white"
      } disabled:opacity-60`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isFollowing ? (
        <><UserCheck className="w-3.5 h-3.5" /> Seguito</>
      ) : (
        <><UserPlus className="w-3.5 h-3.5" /> Segui</>
      )}
    </button>
  );
}