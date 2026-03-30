import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export default function PollCard({ poll, currentUser, onUpdate }) {
  const [voting, setVoting] = useState(false);

  if (!poll) return null;

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const userVotedOption = poll.options?.find((o) => o.voters?.includes(currentUser?.email));
  const hasVoted = !!userVotedOption;
  const showResults = hasVoted || isExpired || poll.created_by === currentUser?.email;

  const handleVote = async (optionId) => {
    if (!currentUser) return toast.error("Fai login per votare");
    if (hasVoted || isExpired || voting) return;
    setVoting(true);

    try {
      const newOptions = poll.options.map((o) => {
        if (o.id === optionId) {
          return { ...o, votes_count: (o.votes_count || 0) + 1, voters: [...(o.voters || []), currentUser.email] };
        }
        return o;
      });
      const newTotal = (poll.total_votes || 0) + 1;

      await base44.entities.Poll.update(poll.id, { options: newOptions, total_votes: newTotal });
      onUpdate?.({ ...poll, options: newOptions, total_votes: newTotal });
    } catch (err) {
      toast.error("Errore nel voto. Riprova.");
      console.error(err);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#2D6A4F]/5 to-transparent border border-[#2D6A4F]/20 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1">
          <BarChart2 className="w-4 h-4 text-[#2D6A4F] mt-0.5 flex-shrink-0" />
          <p className="font-bold text-sm text-gray-900 dark:text-white">{poll.question}</p>
        </div>
        {isExpired && (
          <span className="flex items-center gap-1 text-[10px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-semibold flex-shrink-0">
            <Clock className="w-3 h-3" />
            Chiusa
          </span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options?.map((option) => {
          const pct = poll.total_votes ? Math.round(((option.votes_count || 0) / poll.total_votes) * 100) : 0;
          const isUserChoice = option.id === userVotedOption?.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={showResults || voting || isExpired}
              className={`w-full text-left relative overflow-hidden rounded-xl border transition-all ${
                !showResults && !isExpired ? "hover:border-[#2D6A4F]/40 cursor-pointer" : ""
              }`}
              style={{ borderColor: isUserChoice ? "#2D6A4F" : "rgb(209, 213, 219)" }}
            >
              {showResults && (
                <div
                  className="absolute inset-0 rounded-xl transition-all duration-500"
                  style={{ width: `${pct}%`, background: isUserChoice ? "rgba(45,106,79,0.25)" : "rgba(45,106,79,0.08)" }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[#0F0F0F]">
                <span className={`text-sm font-medium ${
                  isUserChoice ? "text-[#2D6A4F]" : "text-gray-700 dark:text-gray-300"
                } ${!showResults && !isExpired ? "group-hover:text-[#2D6A4F]" : ""}`}>
                  {isUserChoice && "✓ "}{option.text}
                </span>
                {showResults && (
                  <span className={`text-xs font-bold ${isUserChoice ? "text-[#2D6A4F]" : "text-gray-500"}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-[10px]">
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          {poll.total_votes || 0} vot{poll.total_votes === 1 ? "o" : "i"}
        </p>
        {poll.expires_at && !isExpired && (
          <p className="text-gray-400">
            Scade {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true, locale: it })}
          </p>
        )}
      </div>
    </div>
  );
}