import type { JwtPayload, Role } from "@vonos/types";

interface DecodedToken extends JwtPayload {
  exp?: number;
}

function decodePart(value: string): unknown {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  return JSON.parse(json) as unknown;
}

export function decodeAccessToken(token: string): DecodedToken | null {
  try {
    const [, body] = token.split(".");
    if (!body) return null;
    const decoded = decodePart(body) as DecodedToken;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function payloadToAuth(payload: JwtPayload) {
  return {
    userId: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role as Role,
  };
}
