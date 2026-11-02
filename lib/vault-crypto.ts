import type { EmotionSession } from "./session-types";
import { deriveKey, fromBase64, KDF_ITERATIONS, MIN_PASSPHRASE_LENGTH, toBase64 } from "./record-crypto";

/**
 * Locking records before they go to an account (owner's decision 2026-11-02).
 *
 * The same lock as a locked export (lib/record-crypto.ts): PBKDF2 (SHA-256)
 * turns the person's 기록 암호 into an AES-GCM key, in this browser. Each record
 * is sealed with its own fresh iv. The server keeps only:
 * - the salt and iteration count (`kdf`), so another device can make the same key;
 * - `check_blob`, a fixed short text sealed with the key, only to tell a wrong
 *   기록 암호 from a right one;
 * - one sealed blob per record.
 *
 * The 기록 암호 and the key live in memory only (lib/account.ts). They are never
 * written to localStorage, sessionStorage or the server. A forgotten 기록 암호
 * cannot be recovered by anyone, the maker included.
 */

export { MIN_PASSPHRASE_LENGTH };

export type VaultKdf = { salt: string; iterations: number };
export type VaultRow = { kdf: VaultKdf; check_blob: string };
/** What a sealed text looks like on the server: base64 iv and data, nothing readable. */
type Sealed = { v: 1; iv: string; data: string };

/** The fixed text sealed into check_blob. It says nothing about the person. */
const CHECK_TEXT = "emotion-observatory-vault-check-v1";

const seal = async (key: CryptoKey, text: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(text) as BufferSource));
  return JSON.stringify({ v: 1, iv: toBase64(iv), data: toBase64(sealed) } satisfies Sealed);
};

const open = async (key: CryptoKey, blob: string): Promise<string | null> => {
  try {
    const value = JSON.parse(blob) as Sealed;
    if (value?.v !== 1 || typeof value.iv !== "string" || typeof value.data !== "string") return null;
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(value.iv) as BufferSource }, key, fromBase64(value.data) as BufferSource);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
};

const keyFor = (passphrase: string, kdf: VaultKdf) => deriveKey(passphrase, fromBase64(kdf.salt), kdf.iterations, ["encrypt", "decrypt"]);

/** A new vault for a first 기록 암호: the row to store and the key to keep in memory. */
export const createVault = async (passphrase: string, iterations: number = KDF_ITERATIONS): Promise<{ row: VaultRow; key: CryptoKey }> => {
  const kdf: VaultKdf = { salt: toBase64(crypto.getRandomValues(new Uint8Array(16))), iterations };
  const key = await keyFor(passphrase, kdf);
  return { row: { kdf, check_blob: await seal(key, CHECK_TEXT) }, key };
};

export type OpenVaultResult = { ok: true; key: CryptoKey } | { ok: false; error: "wrong-passphrase" | "damaged" };

/** The key for a vault made on another device, or "wrong-passphrase". */
export const openVault = async (row: VaultRow, passphrase: string): Promise<OpenVaultResult> => {
  const iterations = row?.kdf?.iterations;
  if (typeof row?.kdf?.salt !== "string" || !Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000 || typeof row.check_blob !== "string") {
    return { ok: false, error: "damaged" };
  }
  const key = await keyFor(passphrase, row.kdf);
  return (await open(key, row.check_blob)) === CHECK_TEXT ? { ok: true, key } : { ok: false, error: "wrong-passphrase" };
};

export const lockRecord = (key: CryptoKey, session: EmotionSession): Promise<string> => seal(key, JSON.stringify(session));

/** The record a blob held, or null when it does not open with this key or is not a record. */
export const unlockRecord = async (key: CryptoKey, blob: string): Promise<EmotionSession | null> => {
  const text = await open(key, blob);
  if (text === null) return null;
  try {
    const value = JSON.parse(text) as EmotionSession;
    return value && typeof value.id === "string" ? value : null;
  } catch {
    return null;
  }
};

/**
 * When a record last changed: the latest ISO time anywhere in it (createdAt,
 * completedAt, a follow-up's or a later name's `at`). Records carry no
 * updatedAt of their own, and every change a person makes after finishing
 * stamps a time, so this is what 「updated_at이 새것」 compares.
 */
export const lastTouched = (session: EmotionSession): string => {
  let latest = session.createdAt ?? "";
  const walk = (value: unknown) => {
    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}T/.test(value) && value > latest) latest = value;
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(session);
  return latest;
};
