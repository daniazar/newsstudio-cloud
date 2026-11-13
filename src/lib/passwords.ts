import fs from "fs";
import path from "path";
import crypto from "crypto";

const REGISTRY_FILE = path.join(process.cwd(), "prisma", "users_registry.json");

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

/**
 * Hashes a password using PBKDF2 with a random 16-byte cryptographically secure salt.
 * Format: pbkdf2:iterations:saltHex:hashHex
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verifies a password against a stored hash. Supports PBKDF2 format
 * and transparently validates legacy unsalted SHA-256 hashes if encountered.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], "hex");
    const expectedHash = Buffer.from(parts[3], "hex");

    const computed = crypto.pbkdf2Sync(password, salt, iterations, expectedHash.length, PBKDF2_DIGEST);
    if (computed.length !== expectedHash.length) return false;
    return crypto.timingSafeEqual(computed, expectedHash);
  }

  // Legacy unsalted SHA-256 fallback
  if (storedHash.length === 64 && /^[0-9a-fA-F]+$/.test(storedHash)) {
    const legacyHash = crypto.createHash("sha256").update(password, "utf8").digest("hex");
    const legacyBuf = Buffer.from(legacyHash, "hex");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (legacyBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(legacyBuf, storedBuf);
  }

  return false;
}

export interface RegistryUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  role: "admin" | "editor";
  createdAt: string;
}

/**
 * Initializes the default registry if it doesn't exist yet with randomly generated initial passwords.
 */
function initializeDefaultRegistry(): RegistryUser[] {
  const defaults: RegistryUser[] = [
    {
      id: "admin-id",
      email: "admin@newsstudio.com",
      name: "Admin User",
      passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
      isActive: true,
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    const dir = path.dirname(REGISTRY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(defaults, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to initialize default user registry:", e);
  }
  
  return defaults;
}

/**
 * Retrieves all registered users from the store.
 */
export function getAllRegistryUsers(): RegistryUser[] {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return initializeDefaultRegistry();
    }
    const data = fs.readFileSync(REGISTRY_FILE, "utf-8");
    return JSON.parse(data) as RegistryUser[];
  } catch (e) {
    console.error("Failed to read user registry:", e);
    return [];
  }
}

/**
 * Find user by email in registry.
 */
export function findRegistryUserByEmail(email: string): RegistryUser | null {
  const users = getAllRegistryUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Saves/updates a user inside the registry.
 */
export function saveRegistryUser(user: RegistryUser): void {
  try {
    const users = getAllRegistryUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save registry user:", e);
  }
}

/**
 * Deletes a user from the registry by email.
 */
export function deleteRegistryUser(email: string): boolean {
  try {
    const users = getAllRegistryUsers();
    const filtered = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    
    if (filtered.length === users.length) {
      return false; // User not found
    }
    
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Failed to delete registry user:", e);
    return false;
  }
}

/**
 * Legacy support: Retrieves the custom password hash for a user.
 */
export function getCustomPasswordHash(email: string): string | null {
  const user = findRegistryUserByEmail(email);
  return user ? user.passwordHash : null;
}

/**
 * Legacy support: Saves a custom password hash for a user.
 */
export function saveCustomPasswordHash(email: string, hash: string): void {
  const user = findRegistryUserByEmail(email);
  if (user) {
    user.passwordHash = hash;
    saveRegistryUser(user);
  }
}
