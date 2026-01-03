/**
 * OAuth Client for Anthropic/Claude Authentication
 *
 * Implements OAuth 2.0 with PKCE for secure browser-based authentication.
 * Similar to Claude Code CLI authentication flow.
 */

// =============================================================================
// Types
// =============================================================================

export interface OAuthConfig {
  /** OAuth client ID */
  clientId: string;
  /** Authorization endpoint */
  authorizationEndpoint: string;
  /** Token endpoint */
  tokenEndpoint: string;
  /** Redirect URI */
  redirectUri: string;
  /** Scopes to request */
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  tokens?: OAuthTokens | undefined;
  error?: string | undefined;
}

// =============================================================================
// Constants
// =============================================================================

const ANTHROPIC_OAUTH_CONFIG: OAuthConfig = {
  clientId: 'designlibre-app',
  authorizationEndpoint: 'https://console.anthropic.com/oauth/authorize',
  tokenEndpoint: 'https://console.anthropic.com/oauth/token',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
  scopes: ['api:read', 'api:write'],
};

const TOKEN_STORAGE_KEY = 'designlibre:auth:anthropic';
const STATE_STORAGE_KEY = 'designlibre:auth:state';
const VERIFIER_STORAGE_KEY = 'designlibre:auth:verifier';

// =============================================================================
// PKCE Helpers
// =============================================================================

/**
 * Generate a random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier(): string {
  return generateRandomString(128);
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// =============================================================================
// OAuth Client
// =============================================================================

/**
 * OAuth client for Anthropic authentication
 */
export class AnthropicOAuthClient {
  private config: OAuthConfig;
  private authWindow: Window | null = null;

  constructor(config: Partial<OAuthConfig> = {}) {
    this.config = { ...ANTHROPIC_OAUTH_CONFIG, ...config };
  }

  /**
   * Start OAuth authentication flow
   */
  async startAuth(): Promise<void> {
    // Generate PKCE values
    const state = generateRandomString(32);
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    // Store for callback
    sessionStorage.setItem(STATE_STORAGE_KEY, state);
    sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;

    // Open auth window
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    this.authWindow = window.open(
      authUrl,
      'Claude Authentication',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    // Start polling for callback
    return this.waitForCallback();
  }

  /**
   * Wait for OAuth callback
   */
  private waitForCallback(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (this.authWindow?.closed) {
          clearInterval(checkClosed);

          // Check if we got tokens
          const tokens = this.getStoredTokens();
          if (tokens) {
            resolve();
          } else {
            reject(new Error('Authentication cancelled'));
          }
        }
      }, 500);

      // Listen for message from callback page
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'oauth_callback') {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);

          try {
            const { code, state } = event.data;
            await this.handleCallback(code, state);
            this.authWindow?.close();
            resolve();
          } catch (error) {
            this.authWindow?.close();
            reject(error);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        this.authWindow?.close();
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    // Verify state
    const storedState = sessionStorage.getItem(STATE_STORAGE_KEY);
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Get verifier
    const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
    if (!verifier) {
      throw new Error('Missing code verifier');
    }

    // Exchange code for tokens
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code,
        redirect_uri: this.config.redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
    };
    if (data.expires_in) {
      tokens.expiresAt = Date.now() + data.expires_in * 1000;
    }

    // Store tokens
    this.storeTokens(tokens);

    // Clean up
    sessionStorage.removeItem(STATE_STORAGE_KEY);
    sessionStorage.removeItem(VERIFIER_STORAGE_KEY);

    return tokens;
  }

  /**
   * Refresh access token
   */
  async refreshTokens(): Promise<OAuthTokens | null> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refreshToken) {
      return null;
    }

    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          refresh_token: tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      const newTokens: OAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
        tokenType: data.token_type || 'Bearer',
      };
      if (data.expires_in) {
        newTokens.expiresAt = Date.now() + data.expires_in * 1000;
      }

      this.storeTokens(newTokens);
      return newTokens;
    } catch {
      this.clearTokens();
      return null;
    }
  }

  /**
   * Get valid access token (refreshing if needed)
   */
  async getAccessToken(): Promise<string | null> {
    let tokens = this.getStoredTokens();
    if (!tokens) return null;

    // Check if expired (with 60s buffer)
    if (tokens.expiresAt && tokens.expiresAt < Date.now() + 60000) {
      tokens = await this.refreshTokens();
    }

    return tokens?.accessToken || null;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return !!tokens?.accessToken;
  }

  /**
   * Get authentication state
   */
  getAuthState(): AuthState {
    const tokens = this.getStoredTokens();
    return {
      isAuthenticated: !!tokens?.accessToken,
      tokens: tokens ?? undefined,
    };
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.clearTokens();
  }

  // =========================================================================
  // Token Storage
  // =========================================================================

  private storeTokens(tokens: OAuthTokens): void {
    // Simple encryption (same as API keys)
    const encrypted = btoa(JSON.stringify(tokens));
    localStorage.setItem(TOKEN_STORAGE_KEY, encrypted);
  }

  getStoredTokens(): OAuthTokens | null {
    const encrypted = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!encrypted) return null;

    try {
      return JSON.parse(atob(encrypted));
    } catch {
      return null;
    }
  }

  private clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let oauthClient: AnthropicOAuthClient | null = null;

export function getOAuthClient(): AnthropicOAuthClient {
  if (!oauthClient) {
    oauthClient = new AnthropicOAuthClient();
  }
  return oauthClient;
}

export function createOAuthClient(config?: Partial<OAuthConfig>): AnthropicOAuthClient {
  return new AnthropicOAuthClient(config);
}
