// Extract emails from mentioned user names (requires user lookup)
export async function extractMentionEmails(text, base44) {
  // Match @Name or @Name Surname (up to two words after @)
  const mentionRegex = /@([\wÀ-ÿ]+(?:\s[\wÀ-ÿ]+)?)/g;
  const mentionNames = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentionNames.push(match[1].trim());
  }
  if (mentionNames.length === 0) return [];

  try {
    const users = await base44.entities.User.list("-created_date", 100);
    const emails = [];

    mentionNames.forEach((name) => {
      const user = users.find((u) => {
        const dn = (u.display_name || u.full_name || "").toLowerCase();
        return dn === name.toLowerCase();
      });
      if (user) emails.push(user.email);
    });

    return [...new Set(emails)];
  } catch {
    return [];
  }
}