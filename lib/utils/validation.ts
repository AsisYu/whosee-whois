/**
 * Validation Utilities
 * Shared validation functions for client and server
 */

/**
 * Validate domain name format
 * Checks each label individually for proper formatting
 *
 * @param domain - The domain name to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidDomain('example.com') // true
 * isValidDomain('example .com') // false (contains whitespace)
 * isValidDomain('-example.com') // false (label starts with hyphen)
 * isValidDomain('example') // false (no TLD)
 * ```
 */
export function isValidDomain(domain: string): boolean {
  // Reject empty or whitespace-containing strings
  if (!domain || /\s/.test(domain)) {
    return false
  }

  // Basic structure: must have at least one dot
  if (!domain.includes('.')) {
    return false
  }

  // Split into labels and validate each
  const labels = domain.split('.')

  // Must have at least 2 labels (e.g., example.com)
  if (labels.length < 2) {
    return false
  }

  // Validate each label
  for (const label of labels) {
    // Label must be 1-63 characters
    if (label.length === 0 || label.length > 63) {
      return false
    }

    // Label cannot start or end with hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      return false
    }

    // Label must only contain alphanumeric and hyphens
    if (!/^[a-z0-9-]+$/i.test(label)) {
      return false
    }
  }

  return true
}
