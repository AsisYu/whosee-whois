import { http, HttpResponse } from 'msw'
import type { WhoisResponse } from '@/lib/types/api'

const baseWhois: WhoisResponse = {
  success: true,
  data: {
    available: false,
    domain: 'example.com',
    registrar: 'Whosee Registrar',
    creationDate: '2020-01-01T00:00:00.000Z',
    expiryDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2024-01-01T00:00:00.000Z',
    status: ['clientTransferProhibited'],
    nameServers: ['ns1.example.com', 'ns2.example.com'],
    statusCode: 200,
    statusMessage: 'OK',
    sourceProvider: 'mock',
  },
  meta: {
    timestamp: '2024-01-02T03:04:05.000Z',
    cached: false,
    cachedAt: null,
    processing: 120,
  },
}

export const whoisHandlers = [
  http.get('*/api/v1/whois/:domain', ({ params }) => {
    const domain = String(params.domain ?? 'example.com')

    return HttpResponse.json({
      ...baseWhois,
      data: {
        ...baseWhois.data,
        domain,
      },
    })
  }),
]

export const handlers = [...whoisHandlers]
