/**
 * Get display name with fallback to email username
 * @param {string} displayName - The display_name field from user/post
 * @param {string} email - The email field from user/post
 * @returns {string} Display name or email username fallback
 */
export const getDisplayName = (displayName, email) => {
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }
  if (email) {
    return email.split('@')[0];
  }
  return 'Utente';
};

/**
 * Get photo URL or null if empty
 * @param {string} photoUrl - The photo_url field from user/post
 * @returns {string|null} Photo URL or null
 */
export const getPhotoUrl = (photoUrl) => {
  if (photoUrl && photoUrl.trim()) {
    return photoUrl;
  }
  return null;
};