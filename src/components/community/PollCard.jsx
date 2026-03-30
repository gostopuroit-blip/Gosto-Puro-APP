import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart2 } from "lucide-react";
import { toast } from "sonner";

export default function PollCard({ poll, currentUser, onUpdate }) {
  const [voting, setVoting] = useState(false);

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const userVotedOption = poll.options?.find((o) => o.voters?.includes(currentUser?.email));
  const hasVoted = !!userVotedOption;
  const showResults = hasVoted || isExpired || poll.user_email === currentUser?.email;

  const handleVote = async (optionId) => {
    if (!currentUser) return toast.error("Fai login per votare");
    if (hasVoted || isExpired || voting) return;
    setVoting(true);

    const newOptions = poll.options.map((o) => {
      if (o.id === optionId) {
        return { ...o, votes_count: (o.votes_count || 0) + 1, voters: [...(o.voters || []), currentUser.email] };
      }
      return o;
    });
    const newTotal = (poll.total_votes || 0) + 1;

    await base44.entities.Poll.update(poll.id, { options: newOptions, total_votes: newTotal });
    onUpdate?.({ ...poll, options: newOptions, total_votes: newTotal });
    setVoting(false);
  };

  return (
    <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-[#2D6A4F]" />
        <p className="font-bold text-sm text-gray-900 dark:text-white">{poll.question}</p>
      </div>

      <div className="space-y-2">
        {poll.options?.map((option) => {
          const pct = poll.total_votes ? Math.round(((option.votes_count || 0) / poll.total_votes) * 100) : 0;
          const isUserChoice = option.id === userVotedOption?.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={showResults || voting}
              className="w-full text-left relative overflow-hidden rounded-xl border transition-all"
              style={{ borderColor: isUserChoice ? "#2D6A4F" : "transparent" }}
            >
              {showResults && (
                <div
                  className="absolute inset-0 rounded-xl transition-all duration-500"
                  style={{ width: `${pct}%`, background: isUserChoice ? "rgba(45,106,79,0.15)" : "rgba(0,0,0,0.04)" }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-[#111] rounded-xl">
                <span className={`text-sm font-medium ${isUserChoice ? "text-[#2D6A4F]" : "text-gray-700 dark:text-gray-300"}`}>
                  {isUserChoice && "✓ "}{option.text}
                </span>
                {showResults && (
                  <span className={`text-xs font-bold ${isUserChoice ? "text-[#2D6A4F]" : "text-gray-400"}`}>{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 mt-2">
        {poll.total_votes || 0} vot{poll.total_votes === 1 ? "o" : "i"}
        {isExpired ? " · Chiuso" : ""}
      </p>
    </div>
  );
}