import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const REACTIONS = [
  { emoji: "❤️", label: "Amo" },
  { emoji: "😂", label: "Ahahah" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Triste" },
  { emoji: "👏", label: "Bravissimo" },
  { emoji: "🔥", label: "Fantastico" },
];

export default function ReactionButton({ postId, currentUser, onReactionsChange }) {
  const [reactions, setReactions] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [animatingEmoji, setAnimatingEmoji] = useState(null);
  const longPressTimer = useRef(null);
  const buttonRef = useRef(null);
  const selectorRef = useRef(null);

  // Load reactions on mount
  useEffect(() => {
    loadReactions();
  }, [postId]);

  // Close selector on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setShowSelector(false);
      }
    };
    if (showSelector) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSelector]);

  const loadReactions = async () => {
    const data = await base44.entities.PostReaction.filter({ post_id: postId }, "-created_date", 100).catch(() => []);
    setReactions(data);
    const userRx = data.find((r) => r.user_email === currentUser?.email);
    setUserReaction(userRx || null);
  };

  const handleReact = async (emoji) => {
    if (!currentUser) return toast.error("Fai login per reagire");
    setLoading(true);

    // Animate emoji
    setAnimatingEmoji(emoji);
    setTimeout(() => setAnimatingEmoji(null), 600);

    try {
      // If user already reacted, delete old reaction
      if (userReaction) {
        await base44.entities.PostReaction.delete(userReaction.id);
      }

      // If same emoji, just remove (toggle off)
      if (userReaction?.reaction === emoji) {
        setUserReaction(null);
        setReactions(reactions.filter((r) => r.id !== userReaction.id));
        setShowSelector(false);
        setLoading(false);
        onReactionsChange?.();
        return;
      }

      // Create new reaction
      const newRx = await base44.entities.PostReaction.create({
        post_id: postId,
        user_email: currentUser.email,
        reaction: emoji,
      });

      setUserReaction(newRx);
      setReactions([...reactions.filter((r) => r.user_email !== currentUser.email), newRx]);
      setShowSelector(false);
      onReactionsChange?.();
    } catch (error) {
      console.error("Reaction error:", error);
      toast.error("Errore nella reazione");
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      setShowSelector(true);
    }, 500);
  };

  const handleMouseUp = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleClick = () => {
    // Quick tap without long press
    if (showSelector) {
      setShowSelector(false);
    } else {
      handleReact("❤️");
    }
  };

  // Count reactions
  const reactionCounts = REACTIONS.reduce((acc, rx) => {
    const count = reactions.filter((r) => r.reaction === rx.emoji).length;
    if (count > 0) acc[rx.emoji] = count;
    return acc;
  }, {});

  const totalReactions = reactions.length;
  const hasReactions = totalReactions > 0;

  return (
    <div className="relative">
      {/* Main button with reactions preview */}
      <div
        ref={buttonRef}
        className="flex items-center gap-1.5 relative"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        <button
          onClick={handleClick}
          disabled={loading}
          className={`flex items-center gap-1 text-sm font-medium transition relative ${
            userReaction
              ? "text-[#2D6A4F]"
              : "text-gray-500 dark:text-gray-400 hover:text-[#2D6A4F]"
          } disabled:opacity-50`}
        >
          <span className={`text-lg ${userReaction ? "scale-110" : ""} transition-transform`}>
            {userReaction?.reaction || "❤️"}
          </span>

          {/* Animated emoji */}
          {animatingEmoji && (
            <span className="absolute top-0 left-2 text-lg animate-float pointer-events-none">
              {animatingEmoji}
            </span>
          )}

          {hasReactions && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {totalReactions}
            </span>
          )}
        </button>

        {/* Reaction previews */}
        {hasReactions && (
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="flex items-center gap-0.5 px-2 py-1 bg-gray-100 dark:bg-[#111] rounded-full hover:bg-gray-200 dark:hover:bg-[#1A1A1A] transition"
          >
            {Object.entries(reactionCounts).slice(0, 3).map(([emoji, count]) => (
              <span key={emoji} className="text-xs leading-none">
                {emoji}
              </span>
            ))}
            {Object.keys(reactionCounts).length > 3 && (
              <span className="text-[10px] text-gray-500 ml-0.5">+{Object.keys(reactionCounts).length - 3}</span>
            )}
          </button>
        )}
      </div>

      {/* Reaction selector */}
      {showSelector && (
        <div
          ref={selectorRef}
          className="absolute bottom-12 left-0 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl shadow-lg p-3 z-50 flex gap-2 animate-in fade-in slide-in-from-bottom-2"
        >
          {REACTIONS.map(({ emoji, label }) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={loading}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition hover:bg-gray-100 dark:hover:bg-[#111] ${
                userReaction?.reaction === emoji ? "bg-[#2D6A4F]/10" : ""
              } disabled:opacity-50`}
              title={label}
            >
              <span className="text-2xl hover:scale-125 transition-transform">
                {emoji}
              </span>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                {label}
              </span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes float {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px);
          }
        }
        .animate-float {
          animation: float 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}