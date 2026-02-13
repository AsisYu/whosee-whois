import { afterEach, describe, expect, it, vi } from 'vitest'
import { dnsService } from '@/lib/services/dns-service'
import { DNS_RECORD_TYPES, type DnsResponse } from '@/lib/types/api'

const mockPayload: DnsResponse = {
  success: true,
  data: {
    domain: 'example.com',
    requestedTypes: ['A', 'MX'],
    resolvedTypes: ['A', 'MX'],
    records: {
      A: [
        { type: 'A', name: 'example.com', ttl: 300, value: '93.184.216.34' },
        { type: 'A', name: 'example.com', ttl: 300, value: '93.184.216.35' },
      ],
      MX: [
        { type: 'MX', name: 'example.com', ttl: 3600, value: 'mail.example.com', priority: 10 },
      ],
    },
  },
  meta: {
    timestamp: '2024-01-02T03:04:05.000Z',
    cached: false,
    cachedAt: null,
    processing: 50,
  },
}

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })

describe('dnsService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('normalizes domains and returns parsed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockPayload))
    vi.stubGlobal('fetch', fetchMock)

    const result = await dnsService.query(' Example.COM ', ['A', 'MX'])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dns/example.com?type=A%2CMX',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      })
    )
    expect(result).toEqual(mockPayload)
  })

  it('queries all types when types array is empty or omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockPayload))
    vi.stubGlobal('fetch', fetchMock)

    await dnsService.query('example.com')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dns/example.com',
      expect.objectContaining({
        method: 'GET',
      })
    )
  })

  it('deduplicates requested types', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockPayload))
    vi.stubGlobal('fetch', fetchMock)

    await dnsService.query('example.com', ['A', 'A', 'MX', 'A'])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dns/example.com?type=A%2CMX',
      expect.objectContaining({
        method: 'GET',
      })
    )
  })

  it('rejects invalid record types', async () => {
    await expect(dnsService.query('example.com', ['A', 'INVALID' as any, 'MX'])).rejects.toMatchObject({
      message: 'Unsupported DNS record type(s): INVALID',
      code: 'INVALID_TYPE',
    })
  })

  it('throws when domain is missing', async () => {
    await expect(dnsService.query('   ')).rejects.toMatchObject({
      message: 'Domain value is required',
      code: 'INVALID_DOMAIN',
    })
  })

  it('wraps network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    await expect(dnsService.query('example.com', ['A'])).rejects.toMatchObject({
      message: 'Network error: boom',
      code: 'NETWORK_ERROR',
    })
  })

  it('maps non-OK responses to structured errors', async () => {
    const body = { error: 'DNS_LOOKUP_FAILED', message: 'Invalid domain' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body, { status: 422 })))

    await expect(dnsService.query('example.com', ['A'])).rejects.toMatchObject({
      message: 'Invalid domain',
      code: 'DNS_LOOKUP_FAILED',
      status: 422,
    })
  })

  it('rejects invalid response structure', async () => {
    const invalidPayload = { success: true, data: null }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(invalidPayload)))

    await expect(dnsService.query('example.com', ['A'])).rejects.toThrow('Malformed DNS response payload')
  })

  it('supports AbortSignal for request cancellation', async () => {
    const abortController = new AbortController()
    const fetchMock = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      throw error
    })
    vi.stubGlobal('fetch', fetchMock)

    abortController.abort()

    await expect(dnsService.query('example.com', ['A'], abortController.signal)).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dns/example.com?type=A',
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

    await expect(dnsService.query('example.com', ['A'])).rejects.toMatchObject({
      message: 'Failed to query DNS records',
      code: 'DNS_LOOKUP_FAILED',
      status: 502,
    })
  })

  it('constructs URL correctly when all types are requested', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockPayload))
    vi.stubGlobal('fetch', fetchMock)

    await dnsService.query('example.com', [...DNS_RECORD_TYPES])

    // When all types requested, no type parameter should be added
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dns/example.com',
      expect.objectContaining({
        method: 'GET',
      })
    )
  })
})
