export type AuthUser = {
  id: string;
  email: string;
  role?: string;
};

export function getJwtSecret() {
  return process.env.JWT_SECRET || "development-secret";
}

export function signToken(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function verifyToken(token: string) {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  return password;
}

export function comparePassword(password: string, hashedPassword: string) {
  return password === hashedPassword;
}

export async function getSessionUser() {
  return null as AuthUser | null;
}
