// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The screens promise that nothing written leaves the device. This keeps that
 * promise checkable: no source file under app/ or lib/ may use a browser API
 * that sends data over the network, and the response headers keep
 * connect-src to this origin, so even an injected script cannot post records
 * elsewhere (docs/SECURITY_HEADERS.md).
 */
const SENDERS = [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /new\s+WebSocket/, /new\s+EventSource/, /navigator\.share/];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe("nothing written leaves the device", () => {
  it("no app or lib source uses a network-sending API", () => {
    const offenders: string[] = [];
    for (const file of [...sourceFiles("app"), ...sourceFiles("lib")]) {
      const text = readFileSync(file, "utf8");
      for (const pattern of SENDERS) if (pattern.test(text)) offenders.push(`${file}: ${pattern}`);
    }
    expect(offenders).toEqual([]);
  });

  it("the production policy only lets the page connect to its own origin", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toMatch(/`connect-src 'self'\$\{isDev \? " ws: wss:" : ""\}`/);
    expect(config).toMatch(/"default-src 'self'"/);
  });
});
