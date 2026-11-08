export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in environment variables");
  }

  return secret;
}
