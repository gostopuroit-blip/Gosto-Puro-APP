/**
 * Check if a name is corrupted (non-latin chars, invalid patterns)
 */
function isCorruptedName(name) {
  if (!name || typeof name !== 'string') return true;
  if (name.trim().length < 2) return true;
  // Allow only latin letters, numbers, spaces, hyphens, and common italian accents
  return !/^[\w\s\-àèéìòùÀÈÉÌÒÙ'.,()&]+$/i.test(name);
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
 * Get photo URL with fallback
 * If photo_url is missing, return null (UserAvatar will generate initials avatar)
 */
export function getPhotoUrl(photoUrl) {
  return photoUrl || null;
}