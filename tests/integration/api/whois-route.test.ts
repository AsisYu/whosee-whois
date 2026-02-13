import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/v1/whois/[domain]/route'
import type { WhoisResponse } from '@/lib/types/api'
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

const sampleResponse: WhoisResponse = {
  success: true,
  data: {
    available: true,
    domain: 'example.com',
    registrar: null,
    creationDate: null,
    expiryDate: null,
    updatedDate: null,
    status: [],
    nameServers: [],
    statusCode: 200,
    statusMessage: 'OK',
    sourceProvider: 'mock',
  },
  meta: {
    timestamp: '2024-01-02T03:04:05.000Z',
    cached: false,
    cachedAt: null,
    processing: 10,
  },
}

describe('GET /api/v1/whois/[domain]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    acquireTokenMock.mockResolvedValue('token-123')
    getBackendUrlMock.mockReturnValue('https://backend.example')
    getBackendApiKeyMock.mockReturnValue('api-key')
    httpRequestMock.mockResolvedValue({ data: sampleResponse, status: 200 })
  })

  it('returns WHOIS data when backend succeeds', async () => {
    const res = await GET({} as any, { params: { domain: 'example.com' } })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toEqual(sampleResponse)

    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/whois/example.com',
        headers: expect.objectContaining({ 'X-API-KEY': 'api-key' }),
        authToken: 'token-123',
      })
    )
  })

  it('decodes URL-encoded domains', async () => {
    const res = await GET({} as any, { params: { domain: 'example%2Ecom' } })
    expect(res.status).toBe(200)

    expect(httpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://backend.example/api/v1/whois/example.com',
      })
    )
  })

  it('rejects invalid domain format', async () => {
    const res = await GET({} as any, { params: { domain: '!!!' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
      message: 'Domain format is invalid',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('rejects domains with spaces', async () => {
    const res = await GET({} as any, { params: { domain: 'example .com' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('rejects domains without TLD', async () => {
    const res = await GET({} as any, { params: { domain: 'example' } })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })

  it('handles malformed URL encoding', async () => {
    const res = await GET({} as any, { params: { domain: '%E0%A4%' } })
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
      new ApiError({ status: 502, code: 'WHOIS_LOOKUP_FAILED', message: 'upstream boom' })
    )

    const res = await GET({} as any, { params: { domain: 'example.com' } })
    expect(res.status).toBe(502)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'WHOIS_LOOKUP_FAILED',
      message: 'upstream boom',
    })
  })

  it('handles token acquisition failure', async () => {
    acquireTokenMock.mockRejectedValue(new Error('Token service unavailable'))

    const res = await GET({} as any, { params: { domain: 'example.com' } })
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'UNKNOWN_ERROR',
      message: 'Token service unavailable',
    })
  })

  it('handles generic errors', async () => {
    httpRequestMock.mockRejectedValue(new Error('Unexpected error'))

    const res = await GET({} as any, { params: { domain: 'example.com' } })
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'UNKNOWN_ERROR',
      message: 'Unexpected error',
    })
  })

  it('handles missing domain parameter', async () => {
    const res = await GET({} as any, { params: {} })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toMatchObject({
      error: 'INVALID_DOMAIN',
    })
    expect(httpRequestMock).not.toHaveBeenCalled()
  })
})
