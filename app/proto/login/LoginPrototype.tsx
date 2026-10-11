"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./login.module.css";

/**
 * Mock-up of the login window for the class channel (A). It makes no network
 * request, no OAuth call, sets no cookie and writes no storage: every button
 * only changes what this page shows. Google's logo and official sign-in button
 * are not used, because they come with brand rules; the button is plain text.
 */

type Dialog = "before" | "records" | "cancelled";
type Detail = "short" | "long";

/** Fake rows for the mock-up only. Dates and stages are examples, not anyone's use. */
const EXAMPLE_ROWS = [
  { date: "2026-10-06", stages: "빠른 확인" },
  { date: "2026-10-08", stages: "빠른 확인, 표현 사이의 차이" },
  { date: "2026-10-10", stages: "빠른 확인, 깊은 성찰" },
];

const OPENERS: { dialog: Dialog; label: string }[] = [
  { dialog: "before", label: "로그인 전 창 열기" },
  { dialog: "records", label: "내 이용 기록 창 열기" },
  { dialog: "cancelled", label: "로그인 취소 상태 열기" },
];

export default function LoginPrototype() {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [detail, setDetail] = useState<Detail>("short");
  const [pageNote, setPageNote] = useState("");
  const opener = useRef<HTMLElement | null>(null);

  const open = (next: Dialog) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPageNote("");
    setDialog(next);
  };
  const close = (note = "") => {
    setDialog(null);
    setPageNote(note);
  };

  // focus goes back to whatever opened the window, once the window is gone
  useEffect(() => {
    if (dialog === null) opener.current?.focus();
  }, [dialog]);

  return (
    <div className={styles.root}>
      <div className={styles.page} inert={dialog !== null} aria-hidden={dialog !== null ? true : undefined}>
        <p className={styles.badge}>시안 · 개발 중에만 열림</p>
        <h1 className={styles.title}>로그인 창 모양 시안</h1>
        <p className={styles.lede}>
          수업 채널(A)의 로그인 창이 어떻게 보일지 보는 화면입니다. 실제 로그인은 연결되어 있지 않고, 어떤 버튼을 눌러도 정보를 보내거나 저장하지 않습니다.
        </p>

        <section className={styles.controls} aria-labelledby="proto-controls-title">
          <h2 id="proto-controls-title" className={styles.controlsTitle}>시안 조절 (시안 전용)</h2>
          <div className={styles.controlRow} role="group" aria-label="열어 볼 창">
            {OPENERS.map((item) => (
              <button key={item.dialog} type="button" className={styles.secondary} onClick={() => open(item.dialog)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.controlRow} role="group" aria-label="안내 문구 길이">
            <span className={styles.controlLabel}>안내 문구</span>
            {(["short", "long"] as const).map((value) => (
              <button key={value} type="button" className={styles.toggle} aria-pressed={detail === value} onClick={() => setDetail(value)}>
                {value === "short" ? "짧게" : "자세히"}
                {detail === value && <span className={styles.toggleMark}> (선택됨)</span>}
              </button>
            ))}
          </div>
        </section>

        {pageNote && <p className={styles.pageNote} role="status">{pageNote}</p>}
      </div>

      {dialog === "before" && <BeforeLogin detail={detail} onClose={() => close()} />}
      {dialog === "records" && <MyRecords onClose={() => close()} onLogout={() => close("시안: 로그아웃한 상태로 바뀌었습니다. 실제 계정은 없습니다.")} />}
      {dialog === "cancelled" && <Cancelled onClose={() => close()} />}
    </div>
  );
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";

/**
 * A modal window: focus moves into it, Tab and Shift+Tab stay inside, Esc
 * closes it. The page behind is made inert by the caller.
 */
function Modal({ titleId, onClose, children, describedBy }: { titleId: string; onClose: () => void; children: ReactNode; describedBy?: string }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => !item.closest("[inert]"));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.backdrop}>
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={describedBy} tabIndex={-1} onKeyDown={onKeyDown}>
        {children}
      </div>
    </div>
  );
}

function CloseX({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className={styles.closeX} aria-label="닫기" onClick={onClose}>
      <span aria-hidden="true">×</span>
    </button>
  );
}

function BeforeLogin({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const titleId = useId();
  const leadId = useId();
  const [tried, setTried] = useState(false);
  return (
    <Modal titleId={titleId} describedBy={leadId} onClose={onClose}>
      <div className={styles.panelHead}>
        <h2 id={titleId} className={styles.panelTitle}>수업 참여 기록 남기기(선택)</h2>
        <CloseX onClose={onClose} />
      </div>
      <p id={leadId} className={styles.firstLine}>로그인하지 않아도 모든 기능을 똑같이 쓸 수 있습니다.</p>
      <ul className={styles.facts}>
        <li>로그인하면 이용 날짜와 사용한 단계(빠른 확인, 표현 사이의 차이, 깊은 성찰 중 어디까지)가 본인과 수업 운영자에게 보입니다.</li>
        <li>감정 단어, 몸 감각, 상황, 직접 쓴 글은 서버로 보내지 않습니다.</li>
        <li>Google이 이 계정으로 이 앱에 로그인했다는 사실을 알게 됩니다.</li>
      </ul>
      {/* key: switching 짧게 and 자세히 re-mounts it, so its open state follows the switch */}
      <details key={detail} className={styles.more} open={detail === "long"}>
        <summary>자세히</summary>
        <dl className={styles.undecided}>
          <div><dt>언제 지워지는지</dt><dd>아직 정해지지 않음</dd></div>
          <div><dt>어떻게 지우는지</dt><dd>아직 정해지지 않음</dd></div>
          <div><dt>수업 운영자가 누구인지</dt><dd>아직 정해지지 않음</dd></div>
        </dl>
      </details>
      {tried && <p className={styles.protoNote} role="status">시안입니다. 실제 로그인은 일어나지 않았고, 아무 정보도 보내지 않았습니다.</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => setTried(true)}>Google 계정으로 계속하기</button>
        <button type="button" className={styles.secondary} onClick={onClose}>지금은 하지 않기</button>
      </div>
    </Modal>
  );
}

/** What 11-6 asks for, shown: the person can see their own use record and erase it. */
function MyRecords({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const titleId = useId();
  const [rows, setRows] = useState(EXAMPLE_ROWS);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  return (
    <Modal titleId={titleId} onClose={onClose}>
      <div className={styles.panelHead}>
        <h2 id={titleId} className={styles.panelTitle}>내 이용 기록</h2>
        <CloseX onClose={onClose} />
      </div>
      <p className={styles.exampleLabel}>예시입니다</p>
      <p className={styles.soft}>아래 날짜와 단계는 시안을 위한 가짜 예시입니다. 이 표는 본인과 수업 운영자가 볼 수 있습니다.</p>
      {rows.length > 0 ? (
        <table className={styles.table}>
          <caption className={styles.caption}>날짜별로 사용한 단계 (예시)</caption>
          <thead>
            <tr><th scope="col">날짜</th><th scope="col">사용한 단계</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.stages}</td></tr>)}
          </tbody>
        </table>
      ) : (
        <p className={styles.firstLine}>남아 있는 이용 기록이 없습니다.</p>
      )}
      {note && <p className={styles.protoNote} role="status">{note}</p>}
      {confirming ? (
        <div className={styles.confirm} role="group" aria-labelledby="confirm-erase">
          <p id="confirm-erase" className={styles.firstLine}>내 이용 기록을 모두 지울까요?</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => { setRows([]); setConfirming(false); setNote("시안: 예시 기록을 이 화면에서만 지웠습니다."); }}>모두 지우기</button>
            <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>취소</button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={rows.length === 0} onClick={() => setConfirming(true)}>내 이용 기록 모두 지우기</button>
          <button type="button" className={styles.secondary} onClick={onLogout}>로그아웃</button>
        </div>
      )}
    </Modal>
  );
}

function Cancelled({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  return (
    <Modal titleId={titleId} onClose={onClose}>
      <p className={styles.noticeTag}>알림</p>
      <p id={titleId} className={styles.firstLine}>로그인하지 않았습니다. 앱은 그대로 쓸 수 있습니다.</p>
      <div className={styles.actionsSingle}>
        <button type="button" className={styles.secondary} onClick={onClose}>닫기</button>
      </div>
    </Modal>
  );
}
