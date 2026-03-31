import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, HelpCircle, Clock } from "lucide-react";

export default function QuizCard({ post, currentUser }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.entities.Quiz.filter({ post_id: post.id }, "-created_date", 1)
      .then((data) => {
        if (data[0]) {
          setQuiz(data[0]);
          // Check if current user already answered
          const userAnswer = data[0].options?.find((o) =>
            o.voters?.includes(currentUser?.email)
          );
          if (userAnswer) {
            setSelectedOption(userAnswer.id);
            setAnswered(true);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [post.id, currentUser?.email]);

  if (loading) return <div className="py-2 text-xs text-gray-400">Caricamento quiz...</div>;
  if (!quiz) return null;

  const isClosed = quiz.status === "closed" || (quiz.expires_at && new Date(quiz.expires_at) < new Date());
  const correctOption = quiz.options?.find((o) => o.is_correct);
  const selectedOpt = quiz.options?.find((o) => o.id === selectedOption);
  const isCorrect = selectedOpt?.is_correct;

  const correctPct = quiz.total_answers > 0
    ? Math.round((quiz.correct_answers / quiz.total_answers) * 100)
    : 0;

  const handleAnswer = async (optionId) => {
    if (answered || isClosed || submitting || !currentUser) return;
    setSubmitting(true);
    setSelectedOption(optionId);

    const chosen = quiz.options.find((o) => o.id === optionId);
    const updatedOptions = quiz.options.map((o) =>
      o.id === optionId
        ? { ...o, votes_count: (o.votes_count || 0) + 1, voters: [...(o.voters || []), currentUser.email] }
        : o
    );

    const newTotal = (quiz.total_answers || 0) + 1;
    const newCorrect = chosen?.is_correct ? (quiz.correct_answers || 0) + 1 : (quiz.correct_answers || 0);

    await base44.entities.Quiz.update(quiz.id, {
      options: updatedOptions,
      total_answers: newTotal,
      correct_answers: newCorrect,
    });

    setQuiz({ ...quiz, options: updatedOptions, total_answers: newTotal, correct_answers: newCorrect });
    setAnswered(true);
    setSubmitting(false);
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Question */}
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">{quiz.question}</p>
      </div>

      {/* Closed label */}
      {isClosed && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-semibold">Quiz chiuso</span>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {quiz.options?.map((option) => {
          const isSelected = selectedOption === option.id;
          const showResult = answered || isClosed;
          const votesPct = quiz.total_answers > 0
            ? Math.round(((option.votes_count || 0) / quiz.total_answers) * 100)
            : 0;

          let btnStyle = "border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#111] text-gray-700 dark:text-gray-300";
          if (showResult) {
            if (option.is_correct) {
              btnStyle = "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300";
            } else if (isSelected && !option.is_correct) {
              btnStyle = "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300";
            } else {
              btnStyle = "border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#111] text-gray-500 dark:text-gray-400";
            }
          } else if (isSelected) {
            btnStyle = "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleAnswer(option.id)}
              disabled={answered || isClosed || submitting || !currentUser}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all relative overflow-hidden disabled:cursor-default ${btnStyle}`}
            >
              {/* Progress bar behind */}
              {showResult && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl ${
                    option.is_correct ? "bg-green-200/50 dark:bg-green-900/30" : "bg-gray-200/50 dark:bg-gray-700/20"
                  }`}
                  style={{ width: `${votesPct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span>{option.text}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {showResult && (
                    <span className="text-xs font-semibold opacity-70">{votesPct}%</span>
                  )}
                  {showResult && option.is_correct && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {showResult && isSelected && !option.is_correct && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback after answering */}
      {answered && (
        <div className={`rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center gap-2 ${
          isCorrect
            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
            : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
        }`}>
          {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {isCorrect
            ? `Hai risposto correttamente! ${correctPct}% degli utenti ha risposto giusto`
            : `Risposta errata. La risposta corretta era: "${correctOption?.text}"`}
        </div>
      )}

      {/* Stats (shown when answered/closed) */}
      {(answered || isClosed) && quiz.total_answers > 0 && (
        <p className="text-xs text-gray-400">
          {quiz.total_answers} {quiz.total_answers === 1 ? "risposta" : "risposte"} totali
        </p>
      )}

      {/* Explanation */}
      {(answered || isClosed) && quiz.explanation && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2.5">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 Spiegazione</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}