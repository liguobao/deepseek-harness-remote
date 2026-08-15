/**
 * Version of the `@dsh-remote/plugin` distribution.
 *
 * This is reported to the Server during device registration (`clientVersion`
 * in the Device Descriptor) and again in the WebSocket `hello` frame, so the
 * Server can surface the plugin version in its device list and diagnostics.
 * Keep it in sync with `packages/plugin/package.json` (`version`).
 */
export const PLUGIN_VERSION = '0.2.11'
