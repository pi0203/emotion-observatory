import type { ExportFile } from "./record-transfer";

/**
 * Locking an exported records file with a passphrase the person chooses
 * (2026-10-19, owner's decision). The file leaves the browser as a download
 * and may sit in a downloads folder, a cloud drive or a chat; locked, it reads
 * as noise to anyone without the passphrase.
 *
 * Everything happens in this browser with the standard Web Crypto API:
 * PBKDF2 (SHA-256) turns the passphrase into a key, AES-GCM locks the same
 * JSON an unlocked export would hold. The passphrase is never stored or sent.
 * A forgotten passphrase cannot be recovered by anyone, the maker included;
 * the screen says so before the file is made.
 *
 * Only the export is locked. The records in this browser's storage stay as
 * they are (SAFETY.md: localStorage is not encrypted storage).
 */

export const LOCKED_FORMAT = "emotion-observatory-records-locked";
export const LOCKED_FORMAT_VERSION = 1;
/** OWASP's 2023 figure for PBKDF2-HMAC-SHA256. Tests pass a smaller number. */
export const KDF_ITERATIONS = 600_000;
export const MIN_PASSPHRASE_LENGTH = 8;

export type LockedFile = {
  format: typeof LOCKED_FORMAT;
  formatVersion: typeof LOCKED_FORMAT_VERSION;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  /** base64 of the encrypted UTF-8 JSON of an ExportFile */
  data: string;
};

export const toBase64 = (bytes: Uint8Array) => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
export const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** Also used by lib/vault-crypto.ts for the records sent to an account (2026-11-02). */
export const deriveKey = async (passphrase: string, salt: Uint8Array, iterations: number, usage: KeyUsage | KeyUsage[]) => {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, material, { name: "AES-GCM", length: 256 }, false, Array.isArray(usage) ? usage : [usage]);
};

export const lockExport = async (file: ExportFile, passphrase: string, iterations: number = KDF_ITERATIONS): Promise<LockedFile> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations, "encrypt");
  const plain = new TextEncoder().encode(JSON.stringify(file));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain as BufferSource));
  return {
    format: LOCKED_FORMAT,
    formatVersion: LOCKED_FORMAT_VERSION,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt: toBase64(salt) },
    cipher: { name: "AES-GCM", iv: toBase64(iv) },
    data: toBase64(sealed),
  };
};

/** True when the text is a locked export, whatever its passphrase. */
export const isLockedText = (text: string): boolean => {
  try {
    const value = JSON.parse(text) as Partial<LockedFile> | null;
    return Boolean(value && typeof value === "object" && value.format === LOCKED_FORMAT);
  } catch {
    return false;
  }
};

export type UnlockResult = { ok: true; text: string } | { ok: false; error: "wrong-passphrase" | "damaged" | "unsupported-version" };

/**
 * Gives back the JSON text an unlocked export would have held, for the usual
 * import checks. A wrong passphrase and a damaged file look the same to
 * AES-GCM, so both read as "wrong-passphrase"; a file whose fields are missing
 * reads as "damaged".
 */
export const unlockExport = async (text: string, passphrase: string): Promise<UnlockResult> => {
  let value: LockedFile;
  try {
    value = JSON.parse(text) as LockedFile;
  } catch {
    return { ok: false, error: "damaged" };
  }
  if (value?.format !== LOCKED_FORMAT) return { ok: false, error: "damaged" };
  if (value.formatVersion !== LOCKED_FORMAT_VERSION) return { ok: false, error: "unsupported-version" };
  const iterations = value.kdf?.iterations;
  if (value.kdf?.name !== "PBKDF2" || value.kdf.hash !== "SHA-256" || !Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000
    || value.cipher?.name !== "AES-GCM" || typeof value.kdf.salt !== "string" || typeof value.cipher.iv !== "string" || typeof value.data !== "string") {
    return { ok: false, error: "damaged" };
  }
  try {
    const key = await deriveKey(passphrase, fromBase64(value.kdf.salt), iterations, "decrypt");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(value.cipher.iv) as BufferSource }, key, fromBase64(value.data) as BufferSource);
    return { ok: true, text: new TextDecoder().decode(plain) };
  } catch {
    return { ok: false, error: "wrong-passphrase" };
  }
};

export const lockedFileName = (name: string) => name.replace(/\.json$/, "-locked.json");
