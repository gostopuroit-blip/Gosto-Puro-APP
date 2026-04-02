import { useState, useEffect, useRef } from "react";

export default function MentionAutocomplete({ value, onChange, onMentionSelect, currentUser, contactList = [] }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  // Extract last @mention being typed
  const getLastMention = (text, pos) => {
    const textBeforeCursor = text.substring(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex === -1) return null;
    const beforeAt = textBeforeCursor.substring(0, atIndex);
    if (beforeAt.length > 0 && /\w/.test(beforeAt[beforeAt.length - 1])) return null;
    const mention = textBeforeCursor.substring(atIndex + 1);
    if (mention.includes(" ") || mention.includes("#")) return null;
    return { mention, atIndex, endIndex: pos };
  };

  // Filter contactList locally — no extra API calls
  useEffect(() => {
    const currentMention = getLastMention(value, cursorPos);
    if (!currentMention || currentMention.mention.length < 1) {
      setShowSuggestions(false);
      return;
    }
    const q = currentMention.mention.toLowerCase();
    const filtered = contactList.filter(u => u.name.toLowerCase().includes(q)).slice(0, 6);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [value, cursorPos, contactList]);

  const handleSelectMention = (contact) => {
    const currentMention = getLastMention(value, cursorPos);
    if (!currentMention) return;

    const before = value.substring(0, currentMention.atIndex);
    const after = value.substring(currentMention.endIndex);
    const newValue = `${before}@${contact.name} ${after}`;

    onChange(newValue);
    setShowSuggestions(false);
    onMentionSelect?.(contact);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = before.length + contact.name.length + 2;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        rows={4}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => setCursorPos(e.target.selectionStart || 0)}
        placeholder="Scrivi un post... Digita @ per menzionare o # per hashtag"
        className="w-full text-sm bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none resize-none"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-xl shadow-lg max-h-40 overflow-y-auto z-10">
          {suggestions.map((contact) => (
            <button
              key={contact.email}
              onClick={() => handleSelectMention(contact)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] flex items-center gap-2 transition"
            >
              <div className="w-6 h-6 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{contact.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}