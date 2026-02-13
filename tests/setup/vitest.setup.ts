import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { mswServer } from '../mocks/server'

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  mswServer.resetHandlers()
})

afterAll(() => {
  mswServer.close()
})
