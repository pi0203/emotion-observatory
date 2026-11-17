"use client";

/**
 * 바탕: DesignBookmark Motion "Tag input"의 스프링 값(폭 340/26, 크기 420/16, 투명도 300/26)과
 * 들어오고 나가는 순서만 옮겨, CSS 애니메이션으로 새로 지었다(코드는 복사하지 않음).
 *
 * 「내 말로 적기」로 더한 말의 묶음 표시가 처음 나타날 때 작게 부풀며 들어오고, 목록에서
 * 빠질 때는 줄어들며 사라진다. 화면을 처음 열 때 이미 있던 말은 그대로 보이고,
 * 사람이 더하거나 지울 때만 움직인다. 움직임 줄이기면 바로 바뀐다.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./tag-motion.module.css";

export const tagEnter = styles.enter;
export const tagLeave = styles.leave;
const LEAVE_MS = 300;

/** Which labels just joined (to animate in) and which just left (a short-lived ghost, to animate out). */
export function useTagMotion(labels: string[]) {
  const seen = useRef<string[]>(labels);
  const [entering, setEntering] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<{ label: string; index: number }[]>([]);

  useEffect(() => {
    const before = seen.current;
    const joined = labels.filter((label) => !before.includes(label));
    const left = before.map((label, index) => ({ label, index })).filter((item) => !labels.includes(item.label));
    seen.current = labels;
    if (joined.length > 0) setEntering((current) => [...current.filter((label) => labels.includes(label)), ...joined]);
    if (left.length > 0) {
      setLeaving((current) => [...current, ...left]);
      window.setTimeout(() => setLeaving((current) => current.filter((item) => !left.includes(item))), LEAVE_MS);
    }
  }, [labels.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entering, leaving, done: (label: string) => setEntering((current) => current.filter((item) => item !== label)) };
}
