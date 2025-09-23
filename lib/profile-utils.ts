/**
 * Utility functions for handling profile images and avatars
 */

export const DEFAULT_PROFILE_IMAGE = "/Binda-icon.png";

/**
 * Get the profile image URL with fallback to default
 * @param imageUrl - The user's profile image URL (can be null/undefined)
 * @param fallback - Custom fallback image (defaults to Binda icon)
 * @returns The image URL to use
 */
export function getProfileImageUrl(
  imageUrl?: string | null, 
  fallback: string = DEFAULT_PROFILE_IMAGE
): string {
  return imageUrl || fallback;
}

/**
 * Get user initials for avatar fallback
 * @param name - User's full name or email
 * @returns Initials string (max 2 characters)
 */
export function getUserInitials(name?: string | null): string {
  if (!name) return 'U';
  
  // If it's an email, use the part before @
  const displayName = name.includes('@') ? name.split('@')[0] : name;
  
  // Split by spaces and get first letter of each word
  const words = displayName.trim().split(/\s+/);
  const initials = words
    .slice(0, 2) // Take max 2 words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return initials || 'U';
}

/**
 * Get display name from user data
 * @param user - User object with metadata
 * @returns Display name string
 */
export function getDisplayName(user: any): string {
  return user?.user_metadata?.full_name || 
         user?.user_metadata?.name || 
         user?.email?.split('@')[0] || 
         'User';
}
