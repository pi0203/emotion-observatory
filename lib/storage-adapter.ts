import type { EmotionSession } from "./session-types";
import * as local from "./storage";

/**
 * 저장 경로의 단일 진입점 (로그인 방향 A, Phase 0: storage seam).
 *
 * 지금 구현은 기존 localStorage 방식 하나뿐이다. 저장 키와 저장 형식은
 * lib/storage.ts 그대로이며, 이 파일은 그 함수들을 인터페이스 뒤로 묶기만 한다.
 * 네트워크 호출은 없고, 사용자에게 보이는 동작은 바뀌지 않는다.
 *
 * 일부러 동기 인터페이스다. 서버 저장은 비동기가 될 수 있지만, 그 변경은
 * 호출 지점(page.tsx)과 중단 화면의 reload 순서에 영향을 주므로 Phase 2에서
 * 별도 결정 후 다룬다 (docs/LOGIN_DECISIONS.md 참고).
 *
 * 메서드는 this를 쓰지 않는다. 구조 분해해서 써도 안전하다.
 */
export interface StorageAdapter {
  loadDraft(): EmotionSession | null;
  /** False when the browser refused the write (quota full, storage blocked). */
  saveDraft(session: EmotionSession): boolean;
  removeDraft(): void;

  loadCompleted(): EmotionSession[];
  /** id 기준 upsert. 같은 id로 다시 저장하면 새 기록이 아니라 갱신이다. */
  saveCompleted(session: EmotionSession): boolean;
  dropCompleted(id: string): void;

  /** status가 draft면 초안 저장 후 완료 목록에서 제거, 아니면 완료 저장 후 초안 제거. */
  persistSession(session: EmotionSession): boolean;

  /** 이 기기의 기록을 모두 지운다: 완료(중단 포함) 목록과 작성 중인 초안. 되돌릴 수 없다. */
  clearAll(): void;
}

export const localStorageAdapter: StorageAdapter = {
  loadDraft: () => local.loadDraft(),
  saveDraft: (session) => local.saveDraft(session),
  removeDraft: () => local.removeDraft(),
  loadCompleted: () => local.loadCompleted(),
  saveCompleted: (session) => local.saveCompleted(session),
  dropCompleted: (id) => local.dropCompleted(id),
  persistSession: (session) => local.persistSession(session),
  // 키를 직접 지운다: 읽을 수 없게 깨진 저장값도 남지 않는다
  clearAll: () => local.clearAllRecords(),
};

/** 지금은 항상 localStorage 어댑터. 계정 저장소는 이 함수 뒤에 나중에 붙인다. */
export const getStorageAdapter = (): StorageAdapter => localStorageAdapter;
