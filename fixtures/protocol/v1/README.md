# Protocol v1 Conformance Fixtures

These fixtures define stable protocol examples for all implementations.

`manifest.json` lists each fixture suite. Consumers must reject unknown fixture format versions.

Each case has a unique name, an operation, an input, and an expected result.

An accepted case can include `value`. Consumers must compare that value after normalization.

A rejected case does not define an implementation-specific error message.

All identifiers, timestamps, keys, and tokens are synthetic. Do not add production data.

Fixture files must remain valid JSON. Do not use comments or language-specific numeric values.

## Operations

- `parseControlFrame` validates one Control frame.
- `selectProtocolVersion` selects the highest common protocol version.
- `selectCapabilities` selects supported capabilities in supported-list order.
- `acceptNegotiatedCapabilities` validates the Server capability selection.

`selected: null` represents no common protocol version.

An omitted `negotiated` field represents a legacy Server without a capability list.
