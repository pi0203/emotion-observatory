"use client";

/**
 * 바탕: DesignBookmark Motion "Letter limit"의 고리(채움 스프링 280/22, 색은 제한 10% 안에서 바뀜)만
 * 옮겨 새로 지었다(코드는 복사하지 않음). 원본의 넘친 글자를 던져 쌓는 움직임은 넣지 않았다.
 *
 * 글자 수 제한이 있는 입력칸 오른쪽에 작은 고리가 쓰는 만큼 찬다. 제한 10% 안에서는
 * 붉은 경고색 대신 본문 색으로 진해진다(docs/design.md §3). 고리는 화면 읽기에서 숨긴다.
 * 입력칸이 비어 있으면 보이지 않는다.
 */
import type { ReactNode } from "react";
import styles from "./limit-ring.module.css";

const R = 8;
const NEAR_SHARE = 0.1;

export function LimitField({ length, max, children, textarea = false }: { length: number; max: number; children: ReactNode; textarea?: boolean }) {
  const share = Math.min(1, length / max);
  const near = max - length <= max * NEAR_SHARE;
  return <div className={`${styles.field} ${textarea ? styles.area : ""}`}>
    {children}
    {length > 0 && <svg className={`${styles.ring} ${near ? styles.near : ""}`} viewBox="0 0 20 20" aria-hidden="true" data-limit-ring={near ? "near" : "filling"}>
      <circle className={styles.track} cx="10" cy="10" r={R} />
      <circle className={styles.fill} cx="10" cy="10" r={R} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - share} />
    </svg>}
  </div>;
}
