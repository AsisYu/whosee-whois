/**
 * Sanitization Utilities
 * XSS prevention using DOMPurify
 * Implements FR-027: Sanitize all backend data before display
 */

import DOMPurify from 'dompurify'

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize plain text (removes all HTML tags)
 * @param dirty - Potentially unsafe string
 * @returns Plain text with all HTML stripped
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize URL to prevent javascript: and data: URL attacks
 * @param url - Potentially unsafe URL
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })

  // Only allow http(s) protocols
  try {
    const parsed = new URL(sanitized)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return sanitized
    }
  } catch {
    // Invalid URL
  }

  return ''
}

/**
 * Sanitize object by recursively sanitizing all string values
 * @param obj - Object with potentially unsafe string values
 * @returns New object with all strings sanitized
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value)
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeText(item)
          : item && typeof item === 'object'
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      )
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

/**
 * Sanitize WHOIS raw text (preserve formatting but remove scripts)
 * @param rawText - Raw WHOIS text from backend
 * @returns Sanitized text safe for display
 */
export function sanitizeWhoisRawText(rawText: string): string {
  // Allow <pre> tag for formatting but nothing else
  return DOMPurify.sanitize(rawText, {
    ALLOWED_TAGS: ['pre', 'br'],
    ALLOWED_ATTR: [],
  })
}
