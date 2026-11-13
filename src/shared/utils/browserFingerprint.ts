const STORAGE_KEY = 'sp_browser_fingerprint';
const RESET_KEY_STORAGE = 'sp_password_reset_key';

function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    `${new Date().getTimezoneOffset()}`,
    navigator.hardwareConcurrency?.toString() ?? '',
    (navigator as unknown as { deviceMemory?: number }).deviceMemory?.toString() ?? '',
    navigator.platform ?? '',
  ];
  const raw = components.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}_${raw.length.toString(36)}`;
}

export function getBrowserFingerprint(): string {
  try {
    let fp = localStorage.getItem(STORAGE_KEY);
    if (!fp) {
      fp = generateFingerprint();
      localStorage.setItem(STORAGE_KEY, fp);
    }
    return fp;
  } catch {
    return generateFingerprint();
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates (or reuses) this browser's reset key for a pending request.
 * The raw key stays here and never leaves the device; only its hash is sent
 * to the backend when creating a request.
 */
export async function getOrCreateResetKey(): Promise<{ rawKey: string; resetKeyHash: string }> {
  let rawKey = localStorage.getItem(RESET_KEY_STORAGE);
  if (!rawKey) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    rawKey = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(RESET_KEY_STORAGE, rawKey);
  }
  return { rawKey, resetKeyHash: await sha256Hex(rawKey) };
}

export function getResetKey(): string | null {
  try {
    return localStorage.getItem(RESET_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function clearResetKey(): void {
  try {
    localStorage.removeItem(RESET_KEY_STORAGE);
  } catch {
    // storage unavailable — nothing to clear
  }
}
