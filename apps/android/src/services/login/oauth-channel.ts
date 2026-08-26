import { strings as zhCN } from '../../locales/i18n'
import { createOAuthRedirectChannel } from './oauth-redirect-channel'

export const oauthLoginChannel = createOAuthRedirectChannel({
  method: 'oauth',
  checkConfigured: publicApi => publicApi.oauthStatus(),
  startPath: '/api/v1/auth/oauth/start',
  unsupportedError: zhCN.runtime.zhihuUnsupported,
})

export const githubOAuthLoginChannel = createOAuthRedirectChannel({
  method: 'github-oauth',
  checkConfigured: publicApi => publicApi.oauthGithubStatus(),
  startPath: '/api/v1/auth/oauth/github/start',
  unsupportedError: zhCN.runtime.githubUnsupported,
})
