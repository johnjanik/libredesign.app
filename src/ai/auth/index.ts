/**
 * Authentication Module
 *
 * OAuth and authentication services for AI providers.
 */

export {
  AnthropicOAuthClient,
  getOAuthClient,
  createOAuthClient,
} from './oauth-client';

export type {
  OAuthConfig,
  OAuthTokens,
  AuthState,
} from './oauth-client';
