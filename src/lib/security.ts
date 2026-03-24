import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 * Replaces the old SHA256+salt scheme.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a stored bcrypt hash.
 * Also handles the legacy SHA256 format from the Python app during migration.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) return false;

  // Detect bcrypt hash (starts with $2b$ or $2a$)
  if (storedHash.startsWith("$2b$") || storedHash.startsWith("$2a$")) {
    return bcrypt.compare(password, storedHash);
  }

  // Legacy: Python app used salt$sha256hash (97-char format)
  // Allow login once, then the API should re-hash with bcrypt on success
  if (storedHash.includes("$") && storedHash.length === 97) {
    const [salt, expectedHash] = storedHash.split("$", 2);
    const crypto = await import("crypto");
    const actualHash = crypto
      .createHash("sha256")
      .update(`${salt}${password}`)
      .digest("hex");
    return actualHash === expectedHash;
  }

  // Plaintext fallback (migration path only)
  return password === storedHash;
}

/**
 * Check if a stored hash is already in bcrypt format.
 */
export function isBcryptHash(value: string): boolean {
  return value.startsWith("$2b$") || value.startsWith("$2a$");
}

/**
 * Validate password strength.
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password) return { valid: false, error: "Password is required." };
  if (password.length < 6)
    return {
      valid: false,
      error: "Password must be at least 6 characters.",
    };
  return { valid: true };
}
