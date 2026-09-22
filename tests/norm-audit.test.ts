import { describe, expect, it } from "vitest";
import { auditCoverage, parseDelimited, toNormRows } from "../lib/norm-audit";

const csv = `word,valence,arousal,valence_sd,arousal_sd,source
긴장,-1.8,1.9,0.7,0.6,Min(2005)
긴장,-1.2,2.1,0.4,0.5,Lee(2016)
"설렘",1.9,2.0,0.5,0.8,Min(2005)
섭섭함,-1.5,-0.3,1.4,0.9,Ko(2013)
없는말,0.1,0.2,,,Kim(2022)
`;

const vocabulary = [
  { label: "긴장" },
  { label: "설렘" },
  { label: "서운함", aliases: ["섭섭함"] },
  { label: "경외감" },
];

describe("reading a norm table", () => {
  it("reads quoted fields and both comma and tab tables", () => {
    expect(parseDelimited(csv)).toHaveLength(5);
    expect(parseDelimited(csv)[2].word).toBe("설렘");
    const tsv = "word\tvalence\tarousal\n긴장\t-1.8\t1.9\n";
    expect(parseDelimited(tsv)[0]).toMatchObject({ word: "긴장", valence: "-1.8" });
  });

  it("finds the columns whatever they are called", () => {
    const rows = toNormRows(parseDelimited(csv));
    expect(rows[0]).toMatchObject({ word: "긴장", valence: -1.8, arousal: 1.9, valenceSD: 0.7, source: "Min(2005)" });
  });

  it("returns nothing rather than guessing when there is no word column", () => {
    expect(toNormRows(parseDelimited("a,b\n1,2\n"))).toEqual([]);
  });
});

describe("auditing coverage", () => {
  const report = auditCoverage(toNormRows(parseDelimited(csv)), vocabulary);

  it("counts how much of our vocabulary the table reaches", () => {
    expect(report.totalWords).toBe(4);
    expect(report.matched.map((match) => match.label)).toEqual(["긴장", "설렘", "서운함"]);
    expect(report.unmatched).toEqual(["경외감"]);
    expect(report.coverage).toBeCloseTo(0.75, 5);
  });

  it("records which string matched, so an alias match is visible", () => {
    expect(report.matched.find((match) => match.label === "서운함")?.via).toBe("섭섭함");
  });

  it("keeps the sources apart instead of merging them", () => {
    expect(report.bySource).toEqual(
      expect.arrayContaining([
        { source: "Min(2005)", words: 2 },
        { source: "Lee(2016)", words: 1 },
        { source: "Ko(2013)", words: 1 },
      ]),
    );
  });

  it("surfaces words two sources rate differently", () => {
    const tension = report.disagreements.find((entry) => entry.label === "긴장");
    expect(tension?.sources).toEqual(["Min(2005)", "Lee(2016)"]);
    expect(tension?.valenceSpread).toBeCloseTo(0.6, 5);
  });

  it("surfaces the ratings the table itself calls uncertain", () => {
    expect(report.widestSD[0].label).toBe("서운함");
  });

  it("ignores words in the table that we do not use", () => {
    expect(report.matched.map((match) => match.label)).not.toContain("없는말");
  });
});
