/**
 * Check if a name is corrupted (non-latin/european chars)
 * Allows U+0000–U+024F (Basic Latin + Latin Extended) and whitespace
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.trim().length === 0) return false;
  return !/[^\u0000-\u024F\s]/.test(name);
}

/**
 * Get display name with fallback (for post/comment author fields)
 */
export function getDisplayName(displayName, email) {
  if (displayName && isValidName(displayName)) {
    return displayName.trim();
  }
  if (email) {
    return email.split("@")[0];
  }
  return "Utente";
}

/**
 * Get display name from a user object with fallback
 * Uses display_name first, then email prefix
 */
export function getUserName(user) {
  const name = user?.display_name;
  if (name && name.trim().length > 0 && isValidName(name)) {
    return name.trim();
  }
  if (user?.email) return user.email.split("@")[0];
  return "Utente";
}

/**
 * Get photo URL with fallback
 * If photo_url is missing, return null (UserAvatar will generate initials avatar)
 */
export function getPhotoUrl(photoUrl) {
  return photoUrl || null;
}