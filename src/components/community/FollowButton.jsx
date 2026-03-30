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
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
        isFollowing
          ? "bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/20"
          : "bg-[#2D6A4F] text-white hover:bg-[#235c43]"
      } disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isFollowing ? (
        <><UserCheck className="w-3 h-3" /> Seguito</>
      ) : (
        <><UserPlus className="w-3 h-3" /> Segui</>
      )}
    </button>
  );
}