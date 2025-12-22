import { createHash } from 'crypto'

/**
 * Convert Google ID (string) to a consistent UUID
 * This creates a deterministic UUID from the Google ID
 */
export function googleIdToUUID(googleId: string): string {
  // Create SHA256 hash of Google ID
  const hash = createHash('sha256').update(googleId).digest('hex')
  
  // Convert to UUID format (version 4)
  // Take first 32 characters and format as UUID
  const hex = hash.substring(0, 32)
  const uuid = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    // Set version to 4 (random UUID)
    '4' + hex.substring(13, 16),
    // Set variant to RFC 4122
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.substring(18, 20),
    hex.substring(20, 32)
  ].join('-')
  
  return uuid
}

/**
 * Get UUID from session user ID
 */
export function getUserUUID(sessionUserId: string): string {
  return googleIdToUUID(sessionUserId)
}
