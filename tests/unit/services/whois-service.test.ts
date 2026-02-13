import { afterEach, describe, expect, it, vi } from 'vitest'
import { whoisService } from '@/lib/services/whois-service'
import type { WhoisResponse } from '@/lib/types/api'

const mockPayload: WhoisResponse = {
  success: true,
  data: {
    available: false,
    domain: 'example.com',
    registrar: 'Whosee Registrar',
    creationDate: '2020-01-01T00:00:00.000Z',
    expiryDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2024-01-01T00:00:00.000Z',
    status: ['ok'],
    nameServers: ['ns1.example.com'],
    statusCode: 200,
    statusMessage: 'OK',
    sourceProvider: 'mock',
  },
  meta: {
    timestamp: '2024-01-02T03:04:05.000Z',
    cached: false,
    cachedAt: null,
    processing: 90,
  },
}

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })

describe('whoisService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('normalizes domains and returns parsed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockPayload))
    vi.stubGlobal('fetch', fetchMock)

    const result = await whoisService.query(' Example.COM ')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/whois/example.com',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      })
    )
    expect(result).toEqual(mockPayload)
  })

  it('throws when domain is missing', async () => {
    await expect(whoisService.query('   ')).rejects.toThrow('Domain value is required')
  })

  it('wraps network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    await expect(whoisService.query('example.com')).rejects.toMatchObject({
      message: 'Network error: boom',
      code: 'REQUEST_FAILED',
    })
  })

  it('maps non-OK responses to structured errors', async () => {
    const body = { error: 'WHOIS_LOOKUP_FAILED', message: 'Bad domain' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body, { status: 422 })))

    await expect(whoisService.query('example.com')).rejects.toMatchObject({
      message: 'Bad domain',
      code: 'WHOIS_LOOKUP_FAILED',
      status: 422,
    })
  })

  it('rejects invalid response structure', async () => {
    const invalidPayload = { success: true, data: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(invalidPayload)))

    await expect(whoisService.query('example.com')).rejects.toThrow('Malformed WHOIS response payload')
  })

  it('supports AbortSignal for request cancellation', async () => {
    const abortController = new AbortController()
    const fetchMock = vi.fn().mockImplementation(() => {
      // Simulate abort during fetch
      throw new DOMException('The operation was aborted', 'AbortError')
    })
    vi.stubGlobal('fetch', fetchMock)

    // Abort the request
    abortController.abort()

    await expect(whoisService.query('example.com', abortController.signal)).rejects.toMatchObject({
      code: 'REQUEST_FAILED',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/whois/example.com',
      expect.objectContaining({
        signal: abortController.signal,
      })
    )
  })

  it('handles non-JSON error responses', async () => {
    const htmlError = '<html><body>Bad Gateway</body></html>'
    const response = new Response(htmlError, {
      status: 502,
      headers: { 'content-type': 'text/html' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(whoisService.query('example.com')).rejects.toMatchObject({
      message: 'Failed to query WHOIS data',
      code: 'WHOIS_LOOKUP_FAILED',
      status: 502,
    })
  })
})
