#!/usr/bin/env node
/**
 * Reports how much of our vocabulary a local Korean affective-norm table covers.
 *
 *   node scripts/audit-norms.mjs ~/Downloads/VA_KOR_annot.csv
 *
 * The table stays where you downloaded it. Nothing is copied into this
 * repository and nothing is written into data/. Deciding whether a source may
 * be used is a separate step that happens after reading this report — see
 * PROJECT_CONTEXT.md, Decision C, and docs/NORMS.md.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const path = process.argv[2];
if (!path) {
  console.error("사용법: node scripts/audit-norms.mjs <norm 표 경로.csv|.tsv>");
  process.exit(1);
}

const { parseDelimited, toNormRows, auditCoverage } = await import("../lib/norm-audit.ts").catch(async () => {
  // run the TypeScript through a loader only if one is available
  try {
    register("tsx/esm", pathToFileURL("./"));
    return await import("../lib/norm-audit.ts");
  } catch {
    console.error("TypeScript 로더가 필요합니다:  npx tsx scripts/audit-norms.mjs <경로>");
    process.exit(1);
  }
});

const vocabulary = createRequire(import.meta.url)("../data/emotions.ko.json").items;
const report = auditCoverage(toNormRows(parseDelimited(readFileSync(path, "utf8"))), vocabulary);
const pct = (value) => `${Math.round(value * 100)}%`;

console.log(`\n파일: ${path}`);
console.log(`어휘 ${report.totalWords}개 중 ${report.matched.length}개 매칭  (${pct(report.coverage)})\n`);

if (report.bySource.length) {
  console.log("출처별 (한 단어가 여러 출처에 있을 수 있음)");
  for (const { source, words } of report.bySource) console.log(`  ${String(words).padStart(3)}개  ${source}`);
  console.log();
}

const viaAlias = report.matched.filter((m) => m.via !== m.label);
if (viaAlias.length) {
  console.log("alias로 매칭된 것 (라벨 자체는 표에 없음)");
  for (const m of viaAlias) console.log(`  ${m.label}  ←  ${m.via}`);
  console.log();
}

if (report.disagreements.length) {
  console.log("여러 출처가 같은 단어를 다르게 평정한 경우 (척도가 서로 다를 수 있음)");
  for (const d of report.disagreements.slice(0, 10)) {
    console.log(`  ${d.label.padEnd(6)} valence 차 ${d.valenceSpread.toFixed(2)}  arousal 차 ${d.arousalSpread.toFixed(2)}  [${d.sources.join(", ")}]`);
  }
  console.log();
}

if (report.widestSD.length) {
  console.log("표가 스스로 불확실하다고 표시한 단어 (SD 상위)");
  for (const w of report.widestSD) console.log(`  ${w.label.padEnd(6)} SD_v ${w.valenceSD ?? "-"}  SD_a ${w.arousalSD ?? "-"}`);
  console.log();
}

console.log(`매칭되지 않은 ${report.unmatched.length}개`);
console.log("  " + (report.unmatched.join(" · ") || "(없음)"));
console.log("\n이 보고서는 사용 가능 여부를 판단하지 않습니다. 원자료의 재배포 조건과");
console.log("평정 척도의 비교가능성을 확인하기 전에는 어떤 값도 data/에 넣지 마세요.\n");
