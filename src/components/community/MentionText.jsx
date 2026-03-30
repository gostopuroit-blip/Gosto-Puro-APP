import { useNavigate } from "react-router-dom";

export default function MentionText({ text }) {
  const navigate = useNavigate();

  // Regex to find mentions: @word
  const mentionRegex = /(@\w+)/g;
  const parts = text.split(mentionRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.match(mentionRegex)) {
          const mentionName = part.substring(1); // Remove @
          return (
            <button
              key={idx}
              onClick={() => {
                // Search for user with this name and navigate to profile
                // For now, try to navigate with the name
                navigate(`/ExpertProfile?id=${mentionName.toLowerCase()}`);
              }}
              className="text-[#2D6A4F] dark:text-[#40916C] font-semibold hover:underline"
            >
              {part}
            </button>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}