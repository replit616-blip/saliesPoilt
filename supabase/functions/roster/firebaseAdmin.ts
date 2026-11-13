/**
 * Calls the Firebase Auth REST API with the project's service credential to
 * update a user's real password without a prior client session. The secret
 * is read from the function's environment and never logged.
 */
const FIREBASE_PROJECT_ID = "salespilot-e581d";

interface FirebaseServiceAccountLike {
  client_email?: string;
  private_key?: string;
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const keyJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!keyJson) throw new Error("missing_firebase_service_account");
  const key = JSON.parse(keyJson) as FirebaseServiceAccountLike;
  if (!key.client_email || !key.private_key) throw new Error("invalid_firebase_service_account");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claims}`;
  const keyData = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(key.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyData, new TextEncoder().encode(unsigned));
  const signedJwt = `${unsigned}.${b64url(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });
  if (!res.ok) throw new Error("firebase_token_exchange_failed");
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("firebase_token_exchange_failed");
  return body.access_token;
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN[\s\S]+?-----/g, "").replace(/\s+/g, "");
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Sets the real Firebase Auth password for the given uid. */
export async function updateFirebasePassword(uid: string, newPassword: string): Promise<void> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${Deno.env.get("FIREBASE_API_KEY") ?? ""}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ localId: uid, password: newPassword, revokeRefreshTokens: true }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("firebase password update failed", res.status, sanitizeErrorDetail(detail));
    throw new Error("firebase_password_update_failed");
  }
}

function sanitizeErrorDetail(detail: string): string {
  // Keep only non-sensitive parts: status shape, never tokens or passwords.
  return detail.slice(0, 200).replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]");
}
