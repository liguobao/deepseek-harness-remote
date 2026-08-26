import type { LoginMethod } from '../../types'
import type { RemoteServerApi } from '../api'
import { serverSession } from '../server-session'
import type { RedirectLoginChannel } from './types'

export const oauthReturnTo = 'dshremote://oauth'

export function createOAuthRedirectChannel(options: {
  method: LoginMethod
  checkConfigured: (publicApi: RemoteServerApi) => Promise<{ configured: boolean }>
  startPath: string
  unsupportedError: string
}): RedirectLoginChannel {
  return {
    method: options.method,
    prepareBusyAction: 'oauth',
    completeBusyAction: 'server',

    async prepareRedirect({ baseUrl, publicApi }) {
      const { configured } = await options.checkConfigured(publicApi)
      if (!configured) throw new Error(options.unsupportedError)
      return `${baseUrl}${options.startPath}?return_to=${encodeURIComponent(oauthReturnTo)}`
    },

    async completeSignIn({ baseUrl, identity, publicApi }, accountToken) {
      const profile = await publicApi.accountMe(accountToken)
      const { credentials } = await serverSession.registerWithAccountToken(
        baseUrl,
        identity,
        accountToken,
        profile.account,
      )
      return {
        account: credentials.account ?? profile.account,
        loginMethod: options.method,
      }
    },
  }
}
