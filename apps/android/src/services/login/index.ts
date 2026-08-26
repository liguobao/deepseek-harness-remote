export { loginFlow, LoginFlow } from './login-flow'
export { githubOAuthLoginChannel, oauthLoginChannel } from './oauth-channel'
export { passwordLoginChannel, type PasswordLoginInput } from './password-channel'
export type {
  ImmediateLoginChannel,
  LoginChannelContext,
  LoginOutcome,
  RedirectLoginChannel,
} from './types'

import type { RedirectLoginMethod } from '../../types'
import { githubOAuthLoginChannel, oauthLoginChannel } from './oauth-channel'
import type { RedirectLoginChannel } from './types'

export const redirectLoginChannels: Record<RedirectLoginMethod, RedirectLoginChannel> = {
  oauth: oauthLoginChannel,
  'github-oauth': githubOAuthLoginChannel,
}

export function redirectLoginChannelFor(method: RedirectLoginMethod | undefined): RedirectLoginChannel {
  return method === 'github-oauth' ? githubOAuthLoginChannel : oauthLoginChannel
}
