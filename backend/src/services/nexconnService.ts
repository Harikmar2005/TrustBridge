import crypto from 'crypto';
import { NexconnTokenResponse, NexconnConfigStatus } from '../../../shared/types';
import { config } from '../config/env';

/**
 * Validates Nexconn environment configuration
 */
export function getNexconnConfigStatus(): NexconnConfigStatus {
  const appKey = (process.env.NEXCONN_APP_KEY || config.nexconnAppKey)?.trim() || '';
  const appSecret = (process.env.NEXCONN_APP_SECRET || config.nexconnAppSecret)?.trim() || '';
  const apiUrl = (process.env.NEXCONN_API_URL || config.nexconnApiUrl || 'https://api-sg.ronghub.com').trim().replace(/\/+$/, '');

  const isConfigured = Boolean(appKey && appSecret);

  return {
    isConfigured,
    appKeyConfigured: Boolean(appKey),
    appSecretConfigured: Boolean(appSecret),
    apiUrl,
    areaCode: 2, // Singapore data center (AreaCode.SG)
    status: isConfigured ? 'CONFIGURED' : 'CREDENTIALS_REQUIRED',
    notes: isConfigured
      ? 'Nexconn credentials provided via backend environment variables.'
      : 'Nexconn credentials missing: Set NEXCONN_APP_KEY and NEXCONN_APP_SECRET in .env to connect to live Nexconn Cloud Edge.',
  };
}

// Token cache to minimize unnecessary roundtrips to Nexconn Server while token is valid
interface CachedTokenEntry {
  appKey: string;
  token: string;
  userId: string;
  expiresAt: number; // Unix timestamp ms
}

const tokenCache = new Map<string, CachedTokenEntry>();

/**
 * Clears cached Nexconn token for a specific user or all users
 */
export function clearNexconnTokenCache(userId?: string): void {
  if (userId) {
    tokenCache.delete(userId);
  } else {
    tokenCache.clear();
  }
}

/**
 * Requests an authentic user token from the official Nexconn / RongCloud Server API
 * Uses SHA1 signature algorithm: SHA1(App-Secret + Nonce + Timestamp)
 * Features built-in in-memory caching with TTL (valid for 24h, refreshed 5 min prior)
 */
export async function requestNexconnUserToken(params: {
  userId: string;
  name: string;
  portraitUri?: string;
  forceRefresh?: boolean;
}): Promise<NexconnTokenResponse> {
  const appKey = (process.env.NEXCONN_APP_KEY || config.nexconnAppKey)?.trim();
  const appSecret = (process.env.NEXCONN_APP_SECRET || config.nexconnAppSecret)?.trim();
  const rawApiUrl = (process.env.NEXCONN_API_URL || config.nexconnApiUrl || 'https://api-sg.ronghub.com').trim();
  const apiUrl = rawApiUrl.replace(/\/+$/, '');

  // Strict check: Never fabricate fake tokens!
  if (!appKey || !appSecret) {
    return {
      success: false,
      code: 'NEXCONN_CREDENTIALS_REQUIRED',
      requiresCredentials: true,
      message:
        'Live Nexconn credentials not configured. Please supply NEXCONN_APP_KEY and NEXCONN_APP_SECRET in .env to issue genuine tokens from the Nexconn Cloud Edge.',
    };
  }

  // Check valid cache unless forced refresh requested
  if (!params.forceRefresh) {
    const cached = tokenCache.get(params.userId.trim());
    const fiveMinutes = 5 * 60 * 1000;
    if (cached && cached.appKey === appKey && cached.expiresAt > Date.now() + fiveMinutes) {
      return {
        success: true,
        appKey: cached.appKey,
        userId: cached.userId,
        token: cached.token,
        expiresIn: Math.max(60, Math.floor((cached.expiresAt - Date.now()) / 1000)),
      };
    }
  }

  const nonce = crypto.randomInt(100000, 999999).toString();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Signature calculation: SHA1(App-Secret + Nonce + Timestamp)
  const signature = crypto
    .createHash('sha1')
    .update(appSecret + nonce + timestamp)
    .digest('hex');

  const formData = new URLSearchParams();
  formData.append('userId', params.userId.trim());
  formData.append('name', (params.name || 'User').trim());
  if (params.portraitUri) {
    formData.append('portraitUri', params.portraitUri.trim());
  }

  try {
    const res = await fetch(`${apiUrl}/user/getToken.json`, {
      method: 'POST',
      headers: {
        'App-Key': appKey,
        Nonce: nonce,
        Timestamp: timestamp,
        Signature: signature,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data: any = await res.json();

    if (res.ok && data.code === 200 && data.token) {
      const expiresInSeconds = 86400; // 24 hours standard
      tokenCache.set(params.userId.trim(), {
        appKey,
        token: data.token,
        userId: params.userId.trim(),
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });

      return {
        success: true,
        appKey,
        userId: params.userId,
        token: data.token,
        expiresIn: expiresInSeconds,
      };
    } else {
      return {
        success: false,
        code: data.code || res.status,
        message: data.errorMessage || data.msg || 'Nexconn API rejected token issuance request.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      code: 'NEXCONN_NETWORK_ERROR',
      message: `Failed to reach Nexconn API: ${err.message}`,
    };
  }
}
