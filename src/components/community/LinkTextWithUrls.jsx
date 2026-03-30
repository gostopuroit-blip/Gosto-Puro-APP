export default function LinkTextWithUrls({ text }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={idx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2D6A4F] dark:text-[#40916C] font-medium hover:underline break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}