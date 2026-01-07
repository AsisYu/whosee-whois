/**
 * Server-side Environment Configuration
 * Uses Zod for validation and caching
 *
 * ⚠️ WARNING: This module must NEVER be imported in client-side code!
 * Use .server.ts suffix to prevent accidental client-side imports.
 */

import { z } from 'zod'

/**
 * Server environment variable schema
 */
const serverEnvSchema = z.object({
  BACKEND_URL: z.string().url('BACKEND_URL must be a valid URL'),
  BACKEND_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedEnv: ServerEnv | null = null

/**
 * Load and validate environment variables
 * Results are cached after first successful load
 *
 * @throws {Error} If validation fails with detailed error messages
 */
function loadEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv
  }

  const result = serverEnvSchema.safeParse({
    BACKEND_URL: process.env.BACKEND_URL,
    BACKEND_API_KEY: process.env.BACKEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.') || 'root'
        return `${path}: ${issue.message}`
      })
      .join('; ')

    throw new Error(`Invalid server environment variables: ${issues}`)
  }

  cachedEnv = result.data
  return cachedEnv
}

/**
 * Normalize URL by removing trailing slash
 */
function normalizeUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/**
 * Get backend service URL
 * @returns Normalized backend URL (no trailing slash)
 */
export function getBackendUrl(): string {
  return normalizeUrl(loadEnv().BACKEND_URL)
}

/**
 * Get backend API key (if configured)
 * @returns API key or undefined
 */
export function getBackendApiKey(): string | undefined {
  return loadEnv().BACKEND_API_KEY
}

/**
 * Get current NODE_ENV
 */
export function getNodeEnv(): ServerEnv['NODE_ENV'] {
  return loadEnv().NODE_ENV
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getNodeEnv() === 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getNodeEnv() === 'production'
}
