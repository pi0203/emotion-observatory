import { readdirSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(__dirname, "../..");

/** app/(ko)/page.tsx and every .ts/.tsx file under lib/, as paths relative to the repository root. */
export const appSourceFiles = (): string[] => {
  const walk = (dir: string): string[] =>
    readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(relative);
      return /\.tsx?$/.test(entry.name) ? [relative] : [];
    });
  return ["app/(ko)/page.tsx", ...walk("lib")];
};

/** The message dictionaries are the one place where Korean text belongs. */
export const isMessageFile = (file: string) => /^lib\/i18n\/messages\.[a-z]+\.ts$/.test(file);
