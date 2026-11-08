import crypto from 'crypto';

export interface NexconnTokenResponse {
  success: boolean;
  code?: number | string;
  appKey?: string;
  userId?: string;
  token?: string;
  expiresIn?: number;
  message?: string;
  requiresCredentials?: boolean;
}

export interface NexconnConfigStatus {
  isConfigured: boolean;
  appKeyConfigured: boolean;
  appSecretConfigured: boolean;
  apiUrl: string;
  areaCode: number;
  notes: string;
}

/**
 * Validates Nexconn environment configuration
 */
export function getNexconnConfigStatus(): NexconnConfigStatus {
  const appKey = process.env.NEXCONN_APP_KEY || '';
  const appSecret = process.env.NEXCONN_APP_SECRET || '';
  const apiUrl = process.env.NEXCONN_API_URL || 'https://api-sg.ronghub.com';

  const isConfigured = Boolean(appKey.trim() && appSecret.trim());

  return {
    isConfigured,
    appKeyConfigured: Boolean(appKey.trim()),
    appSecretConfigured: Boolean(appSecret.trim()),
    apiUrl,
    areaCode: 2, // Singapore data center
    notes: isConfigured
      ? 'Nexconn credentials provided via environment variables.'
      : 'Nexconn credentials missing: Set NEXCONN_APP_KEY and NEXCONN_APP_SECRET in .env to connect to live Nexconn Cloud Edge.',
  };
}

/**
 * Requests an authentic user token from the official Nexconn / RongCloud Server API
 * Uses SHA1 signature algorithm: SHA1(App-Secret + Nonce + Timestamp)
 */
export async function requestNexconnUserToken(params: {
  userId: string;
  name: string;
  portraitUri?: string;
}): Promise<NexconnTokenResponse> {
  const appKey = process.env.NEXCONN_APP_KEY?.trim();
  const appSecret = process.env.NEXCONN_APP_SECRET?.trim();
  const apiUrl = process.env.NEXCONN_API_URL?.trim() || 'https://api-sg.ronghub.com';

  // Strict check: Never fabricate fake tokens!
  if (!appKey || !appSecret) {
    return {
      success: false,
      code: 'NEXCONN_CREDENTIALS_REQUIRED',
      requiresCredentials: true,
      message:
        'Live Nexconn credentials not configured. Please supply NEXCONN_APP_KEY and NEXCONN_APP_SECRET to issue genuine tokens from the Nexconn Cloud Edge.',
    };
  }

  const nonce = crypto.randomInt(100000, 999999).toString();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Signature calculation: SHA1(App-Secret + Nonce + Timestamp)
  const signature = crypto
    .createHash('sha1')
    .update(appSecret + nonce + timestamp)
    .digest('hex');

  const formData = new URLSearchParams();
  formData.append('userId', params.userId);
  formData.append('name', params.name || 'User');
  formData.append(
    'portraitUri',
    params.portraitUri ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

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
      return {
        success: true,
        appKey,
        userId: params.userId,
        token: data.token,
        expiresIn: 86400,
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
