import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/v1/dns/[domain]/route'
import { DNS_RECORD_TYPES, type DnsResponse } from '@/lib/types/api'
import { ApiError } from '@/lib/types/api'
import { acquireToken } from '@/lib/auth/token-manager.server'
import { httpRequest } from '@/lib/api/client'
import { getBackendApiKey, getBackendUrl } from '@/lib/config/env.server'

vi.mock('@/lib/auth/token-manager.server', () => ({
  acquireToken: vi.fn(),
}))
vi.mock('@/lib/api/client', () => ({
  httpRequest: vi.fn(),
}))
vi.mock('@/lib/config/env.server', () => ({
  getBackendUrl: vi.fn(),
  getBackendApiKey: vi.fn(),
}))

const acquireTokenMock = vi.mocked(acquireToken)
const httpRequestMock = vi.mocked(httpRequest)
const getBackendUrlMock = vi.mocked(getBackendUrl)
const getBackendApiKeyMock = vi.mocked(getBackendApiKey)

const sampleResponse: DnsResponse = {
  success: true,
  data: {
    domain: 'example.com',
    requestedTypes: ['A', 'MX'],
    resolvedTypes: ['A', 'MX'],
    records: {
      A: [{ type: 'A', name: 'example.com', ttl: 300, value: '93.184.216.34' }],
      MX: [{ type: 'MX', name: 'example.com', ttl: 3600, value: 'mail.example.com', priority: 10 }],
    },
  },
  meta: {
    timestamp: '2024-01-02T03:04:05.000Z',
    cached: false,
    cachedAt: null,
    processing: 50,
  },
}

// Mock NextRequest with search params
function createMockRequest(searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/v1/dns/example.com')
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return {
    nextUrl: url,
  } as any
}

describe('GET /api/v1/dns/[domain]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    acquireTokenMock.mockResolvedValue('token-123')
    getBackendUrlMock.mockReturnValue('https://backend.example')
    getBackendApiKeyMock.mockReturnValue('api-key')
    httpRequestMock.mockResolvedValue({ data: sampleResponse, status: 200 })
  })

  it('returns DNS data when backend succeeds', async () => {
    const req = createMockRequest({ type: 'A,MX' })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toEqual(sampleResponse)

    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com?type=A%2CMX',
        headers: expect.objectContaining({ 'X-API-KEY': 'api-key' }),
        authToken: 'token-123',
      })
    )
  })

  it('queries all types when no type parameter provided', async () => {
    const req = createMockRequest()
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com',
      })
    )
  })

  it('normalizes type parameter to uppercase', async () => {
    const req = createMockRequest({ type: 'a,mx,cname' })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    // Types are normalized and sorted in deterministic order (per DNS_RECORD_TYPES)
    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com?type=A%2CCNAME%2CMX',
      })
    )
  })

  it('deduplicates type parameter', async () => {
    const req = createMockRequest({ type: 'A,A,MX,A' })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com?type=A%2CMX',
      })
    )
  })

  it('rejects invalid record types', async () => {
    const req = createMockRequest({ type: 'A,INVALID,MX' })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_TYPE',
      message: expect.stringContaining('INVALID'),
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('treats empty type parameter as all types', async () => {
    const req = createMockRequest({ type: '' })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    // Empty type should default to all types
    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com',
      })
    )
  })

  it('decodes URL-encoded domains', async () => {
    const req = createMockRequest({ type: 'A' })
    const res = await GET(req, { params: { domain: 'example%2Ecom' } })
    expect(res.status).toBe(200)

    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com?type=A',
      })
    )
  })

  it('rejects invalid domain format', async () => {
    const req = createMockRequest()
    const res = await GET(req, { params: { domain: '!!!' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
      message: 'Domain format is invalid',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('rejects domains with spaces', async () => {
    const req = createMockRequest()
    const res = await GET(req, { params: { domain: 'example .com' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('rejects domains without TLD', async () => {
    const req = createMockRequest()
    const res = await GET(req, { params: { domain: 'example' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('handles malformed URL encoding', async () => {
    const req = createMockRequest()
    const res = await GET(req, { params: { domain: '%E0%A4%' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
      message: 'Domain parameter is invalid or malformed',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('maps ApiError to structured response', async () => {
    httpRequestMock.mockRejectedValue(
      new ApiError({ status: 502, code: 'DNS_LOOKUP_FAILED', message: 'upstream boom' })
    )

    const req = createMockRequest({ type: 'A' })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(502)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'DNS_LOOKUP_FAILED',
      message: 'upstream boom',
    })
  })

  it('handles token acquisition failure', async () => {
    acquireTokenMock.mockRejectedValue(new Error('Token service unavailable'))

    const req = createMockRequest()
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(500) // ApiError.fromError default status

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'DNS_LOOKUP_FAILED', // Normalized to DNS error code
      message: 'Token service unavailable',
    })
  })

  it('handles generic errors', async () => {
    httpRequestMock.mockRejectedValue(new Error('Unexpected error'))

    const req = createMockRequest()
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(500) // ApiError.fromError default status

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'DNS_LOOKUP_FAILED', // Normalized to DNS error code
      message: 'Unexpected error',
    })
  })

  it('handles missing domain parameter', async () => {
    const req = createMockRequest()
    const res = await GET(req, { params: {} })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('omits type parameter when all types are requested', async () => {
    const req = createMockRequest({ type: DNS_RECORD_TYPES.join(',') })
    const res = await GET(req, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    // When all types are requested, backend URL should not have type parameter
    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/dns/example.com',
      })
    )
  })
})
