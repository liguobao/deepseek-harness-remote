import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { RpcError } from '../src/rpc-router.js'
import { safeErrorCode } from '../src/safe-error.js'

describe('safeErrorCode', () => {
  it('returns stable codes without reading error messages', () => {
    expect(safeErrorCode(new RpcError('METHOD_NOT_ALLOWED', 'prompt=secret'))).toBe('METHOD_NOT_ALLOWED')
    expect(safeErrorCode(Object.assign(new Error('prompt=secret'), { code: 'ENOENT' }))).toBe('INTERNAL_ERROR')
  })

  it('classifies schema and unknown errors', () => {
    const schemaError = z.string().safeParse(1)
    expect(schemaError.success).toBe(false)
    if (schemaError.success) throw new Error('Expected schema validation to fail.')

    expect(safeErrorCode(schemaError.error)).toBe('INVALID_MESSAGE')
    expect(safeErrorCode(new Error('prompt=secret'))).toBe('INTERNAL_ERROR')
    expect(safeErrorCode('prompt=secret')).toBe('INTERNAL_ERROR')
  })
})
