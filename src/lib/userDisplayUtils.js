/**
 * Get display name with fallback
 * If display_name is missing or empty, default to email username (before @)
 */
export function getDisplayName(displayName, email) {
  if (displayName && displayName.trim()) {
    return displayName;
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