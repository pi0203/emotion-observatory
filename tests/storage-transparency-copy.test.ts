// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";

/**
 * PUBLISHING_CHECKLIST §10: Storage, transmission, and sharing copy alignment.
 *
 * Ensures all user-facing wording across Korean and English accurately reflects
 * the local-first reality (tests/no-network.test.ts):
 * 1. Entries are kept only in the browser (localStorage).
 * 2. Nothing is sent to any remote server or AI.
 * 3. Browser storage is unencrypted.
 * 4. Exporting files and setting passphrases behaves locally without leaks.
 * 5. README and SAFETY.md remain consistent with screen copy.
 */
describe("PUBLISHING_CHECKLIST §10: storage, transmission, and sharing copy alignment", () => {
  describe("landing storage note", () => {
    it("Korean landing note explicitly states browser-only, unencrypted, and shared-device caveats", () => {
      const note = ko.landing.storageNote;
      expect(note).toContain("이 브라우저에만 저장");
      expect(note).toContain("암호화되지 않습니다");
      expect(note).toContain("같은 기기와 브라우저를 쓰는 사람은 볼 수 있으니");
      expect(note).toContain("공용 기기에서는 주의");
      expect(note).toContain("브라우저 데이터를 지우면 함께 사라집니다");
    });

    it("English landing note explicitly states browser-only, unencrypted, and shared-device caveats", () => {
      const note = en.landing.storageNote;
      expect(note).toContain("only in this browser");
      expect(note).toContain("not encrypted");
      expect(note).toContain("same device and browser can see them");
      expect(note).toContain("shared device");
      expect(note).toContain("Clearing the browser’s data removes them");
    });
  });

  describe("FAQ on storage and data transmission", () => {
    it("Korean FAQ confirms serverless storage, maker invisibility, and no AI transmission", () => {
      const faq = ko.about.faq;
      const whereAnswer = faq.storage.a;
      expect(whereAnswer).toContain("지금 쓰는 브라우저 안에만 저장");
      expect(whereAnswer).toContain("서버로 보내지 않습니다");
      expect(whereAnswer).toContain("암호화된 저장소는 아닙니다");

      const makerAnswer = faq.maker.a;
      expect(makerAnswer).toContain("어디에도 보내지 않아서 만든 사람도 볼 수 없습니다");
      expect(makerAnswer).toContain("방문 통계, 광고, 추적 쿠키도 쓰지 않습니다");

      const aiAnswer = faq.ai.a;
      expect(aiAnswer).toContain("적은 내용을 AI에 보내지 않고");
    });

    it("English FAQ confirms serverless storage, maker invisibility, and no AI transmission", () => {
      const faq = en.about.faq;
      const whereAnswer = faq.storage.a;
      expect(whereAnswer).toContain("Only in the browser you are using");
      expect(whereAnswer).toContain("not sent to a server");
      expect(whereAnswer).toContain("storage is not encrypted");

      const makerAnswer = faq.maker.a;
      expect(makerAnswer).toContain("sends what you write nowhere, so the maker cannot see it either");
      expect(makerAnswer).toContain("no visitor analytics, ads, or tracking cookies");

      const aiAnswer = faq.ai.a;
      expect(aiAnswer).toContain("What you write is not sent to an AI");
    });
  });

  describe("export, import, and passphrase protection copy", () => {
    it("Korean export & passphrase notes explain local encryption and unrecoverable passphrase", () => {
      expect(ko.recordTransfer.exportNote).toContain("암호화되지 않습니다");
      expect(ko.recordTransfer.exportShareNote).toContain("다른 사람 이야기");
      expect(ko.recordTransfer.lock.warning).toContain("암호를 잊으면 이 파일은 누구도 열 수 없습니다");
      expect(ko.recordTransfer.lock.warning).toContain("만든 사람도 열 수 없습니다");
      expect(ko.recordTransfer.lock.warning).toContain("어디에도 저장되지 않습니다");
      expect(ko.recordTransfer.deleteAllConfirmBody).toContain("이 기기에서 지웁니다");
    });

    it("English export & passphrase notes explain local encryption and unrecoverable passphrase", () => {
      expect(en.recordTransfer.exportNote).toContain("is not encrypted");
      expect(en.recordTransfer.exportShareNote).toContain("mention other people");
      expect(en.recordTransfer.lock.warning).toContain("no one can open this file, not even the app’s maker");
      expect(en.recordTransfer.lock.warning).toContain("passphrase is not stored anywhere");
      expect(en.recordTransfer.deleteAllConfirmBody).toContain("from this device");
    });
  });

  describe("repository documentation consistency (README.md & SAFETY.md)", () => {
    it("README.md makes the unencrypted localStorage limitation explicit upfront", () => {
      const readme = readFileSync("README.md", "utf8");
      expect(readme).toContain("기록은 이 기기의 localStorage에만 저장되며, 암호화된 저장소가 아닙니다.");
    });

    it("SAFETY.md clarifies that localStorage is not secure medical storage and data stays on device", () => {
      const safety = readFileSync("SAFETY.md", "utf8");
      expect(safety).toContain("localStorage는 암호화된 저장소나 안전한 의료정보 저장소가 아니며");
      expect(safety).toContain("기록은 사용자의 기기에만 있고");
      expect(safety).toContain("브라우저 저장소의 기록 자체는 여전히 암호화되지 않는다");
    });
  });
});
