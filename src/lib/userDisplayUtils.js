/**
 * Check if a name is corrupted (non-latin chars, invalid patterns)
 */
function isCorruptedName(name) {
  if (!name || typeof name !== 'string') return true;
  if (name.trim().length < 2) return true;
  // Allow only latin/extended-latin letters, numbers, spaces, and common punctuation
  return !/^[\x00-\x7F\u00C0-\u024F\s]+$/.test(name);
}

/**
 * Get display name with fallback
 * If display_name is missing, empty, or corrupted, default to email username (before @)
 */
export function getDisplayName(displayName, email) {
  if (displayName && !isCorruptedName(displayName)) {
    return displayName.trim();
  }
  if (email) {
    return email.split("@")[0];
  }
  return "Utente";
}

/**
 * Get display name from a user object with fallback
 */
export function getUserName(user) {
  const name = user?.full_name || user?.display_name;
  if (name && !isCorruptedName(name)) {
    return name.trim();
  }
  if (user?.email) {
    return user.email.split("@")[0];
  }
  return "Utente";
}

/**
 * Get photo URL with fallback
 * If photo_url is missing, return null (UserAvatar will generate initials avatar)
 */
export function getPhotoUrl(photoUrl) {
  return photoUrl || null;
}