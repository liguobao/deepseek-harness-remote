import { describe, expect, it } from 'vitest'
import {
  acceptNegotiatedCapabilities,
  browserAuthorizationExchangeRequestSchema,
  browserAuthorizationExchangeResponseSchema,
  deviceRefreshRequestSchema,
  deviceRegistrationRequestSchema,
  deviceTokenPairSchema,
  hostRegistrationCodeRequestSchema,
  parseControlFrame,
  selectCapabilities,
  selectProtocolVersion,
} from '../src/index.js'
import { loadProtocolFixtures, type ProtocolFixtureCase } from './conformance-fixture-loader.js'

const suites = await loadProtocolFixtures()

describe.each(suites)('$name conformance fixtures', suite => {
  it.each(suite.cases)('$name', testCase => {
    const execute = () => executeFixture(testCase)
    if (!testCase.expect.accepted) {
      expect(execute).toThrow()
      return
    }
    const result = execute()
    if ('selected' in testCase.expect) expect(result ?? null).toEqual(testCase.expect.selected)
    if ('value' in testCase.expect) expect(result).toEqual(testCase.expect.value)
  })
})

function executeFixture(testCase: ProtocolFixtureCase): unknown {
  const input = fixtureInput(testCase)
  if (testCase.operation === 'parseControlFrame') return parseControlFrame(testCase.input)
  if (testCase.operation === 'parseDeviceRegistrationRequest') return deviceRegistrationRequestSchema.parse(testCase.input)
  if (testCase.operation === 'parseHostRegistrationCodeRequest') return hostRegistrationCodeRequestSchema.parse(testCase.input)
  if (testCase.operation === 'parseDeviceRefreshRequest') return deviceRefreshRequestSchema.parse(testCase.input)
  if (testCase.operation === 'parseDeviceTokenPair') return deviceTokenPairSchema.parse(testCase.input)
  if (testCase.operation === 'parseBrowserAuthorizationExchangeRequest') {
    return browserAuthorizationExchangeRequestSchema.parse(testCase.input)
  }
  if (testCase.operation === 'parseBrowserAuthorizationExchangeResponse') {
    return browserAuthorizationExchangeResponseSchema.parse(testCase.input)
  }
  if (testCase.operation === 'selectProtocolVersion') {
    return selectProtocolVersion(numberList(input.offered, 'offered'), numberList(input.supported, 'supported'))
  }
  if (testCase.operation === 'selectCapabilities') {
    return selectCapabilities(stringList(input.offered, 'offered'), stringList(input.supported, 'supported'))
  }
  const negotiated = 'negotiated' in input ? stringList(input.negotiated, 'negotiated') : undefined
  return acceptNegotiatedCapabilities(stringList(input.offered, 'offered'), negotiated)
}

function fixtureInput(testCase: ProtocolFixtureCase): Record<string, unknown> {
  if (typeof testCase.input !== 'object' || testCase.input === null || Array.isArray(testCase.input)) {
    throw new Error(`Fixture input must be an object: ${testCase.name}`)
  }
  return testCase.input as Record<string, unknown>
}

function numberList(value: unknown, name: string): number[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'number')) {
    throw new Error(`Fixture ${name} must be a number array.`)
  }
  return value
}

function stringList(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`Fixture ${name} must be a string array.`)
  }
  return value
}
