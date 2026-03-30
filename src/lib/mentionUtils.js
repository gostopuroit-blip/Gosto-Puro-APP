// Extract all mentions from text
export function extractMentions(text) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Extract emails from mentioned user names (requires user lookup)
export async function extractMentionEmails(text, base44) {
  const mentionNames = extractMentions(text);
  if (mentionNames.length === 0) return [];

  try {
    const users = await base44.entities.User.list("-created_date", 100);
    const emails = [];

    mentionNames.forEach((name) => {
      const user = users.find(
        (u) => u.full_name && u.full_name.toLowerCase() === name.toLowerCase()
      );
      if (user) emails.push(user.email);
    });

    return [...new Set(emails)]; // Remove duplicates
  } catch {
    return [];
  }
}