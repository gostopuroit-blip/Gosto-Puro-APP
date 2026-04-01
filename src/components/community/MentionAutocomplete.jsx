import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function MentionAutocomplete({ value, onChange, onMentionSelect, currentUser }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  // Extract last @mention being typed
  const getLastMention = (text, pos) => {
    const textBeforeCursor = text.substring(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex === -1) return null;
    
    // Check if @ is not part of an existing mention
    const beforeAt = textBeforeCursor.substring(0, atIndex);
    if (beforeAt.length > 0 && beforeAt[beforeAt.length - 1].match(/\w/)) {
      return null;
    }
    
    const mention = textBeforeCursor.substring(atIndex + 1);
    if (mention.includes(" ")) return null;
    
    return { mention, atIndex, endIndex: pos };
  };

  // Load user suggestions
  useEffect(() => {
    const currentMention = getLastMention(value, cursorPos);
    
    if (!currentMention || currentMention.mention.length < 1) {
      setShowSuggestions(false);
      return;
    }

    const loadUsers = async () => {
      try {
        const q = currentMention.mention.toLowerCase();
        // Fetch who the current user follows and who follows them
        let userEmails = new Set();
        const myEmail = currentUser?.email || null;
        const [followingData, followersData] = await Promise.all([
          myEmail ? base44.entities.UserFollow.filter({ follower_email: myEmail }, "-created_date", 500).catch(() => []) : Promise.resolve([]),
          myEmail ? base44.entities.UserFollow.filter({ following_email: myEmail }, "-created_date", 500).catch(() => []) : Promise.resolve([]),
        ]);
        followingData.forEach((f) => userEmails.add(f.following_email));
        followersData.forEach((f) => userEmails.add(f.follower_email));

        // Get all users and filter
        const allUsers = await base44.entities.User.list("-created_date", 300);
        let pool = userEmails.size > 0
          ? allUsers.filter((u) => userEmails.has(u.email))
          : allUsers;
        
        const filtered = pool.filter(
          (u) =>
            (u.full_name && u.full_name.toLowerCase().includes(q)) ||
            (u.display_name && u.display_name.toLowerCase().includes(q))
        );
        // Fallback: se nenhum resultado na rede social, busca em todos
        const finalList = filtered.length > 0 ? filtered : allUsers.filter(
          (u) =>
            (u.full_name && u.full_name.toLowerCase().includes(q)) ||
            (u.display_name && u.display_name.toLowerCase().includes(q))
        );
        setSuggestions(finalList.slice(0, 6));
        setShowSuggestions(finalList.length > 0);
      } catch {
        setSuggestions([]);
      }
    };

    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [value, cursorPos]);

  const handleSelectMention = (user) => {
    const currentMention = getLastMention(value, cursorPos);
    if (!currentMention) return;

    const displayName = user.display_name || user.full_name;
    const before = value.substring(0, currentMention.atIndex);
    const after = value.substring(currentMention.endIndex);
    const newValue = `${before}@${displayName} ${after}`;

    onChange(newValue);
    setShowSuggestions(false);
    onMentionSelect?.(user);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = before.length + displayName.length + 2;
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
          {suggestions.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectMention(user)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] flex items-center gap-2 transition"
            >
              {user.photo_url ? (
                <img src={user.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-xs font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user.display_name || user.full_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}