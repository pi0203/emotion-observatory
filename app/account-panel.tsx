"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { koOnly } from "../lib/i18n/messages.ko";
import { changeEmail, clearArrived, deleteAccount, getAccountState, importLocal, keepLocal, sendCode, signOut, subscribeAccount, verifyCode } from "../lib/account";

const copy = koOnly.account;

/**
 * 「다른 기기에서도 보기」 at the foot of the records screen (owner's decision
 * 2026-11-02, changed the same day: no 기록 암호; preview only). Korean only,
 * and drawn only where the login values are set (app/emotion-app.tsx). The
 * order: what is sent and two agreements → email → 6-digit code (or the
 * email's link) → signed in, the account's records shown, and whether this
 * device's records go to the account. Nothing is sent before the two boxes are
 * ticked; a guest who never opens this sends nothing at all.
 */
export function AccountPanel() {
  const account = useSyncExternalStore(subscribeAccount, getAccountState, getAccountState);
  const [open, setOpen] = useState(false);
  const [agreeAccount, setAgreeAccount] = useState(false);
  const [agreeRecords, setAgreeRecords] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const title = useRef<HTMLParagraphElement>(null);
  const { phase, busy, note } = account;
  // just signed in: bring this section into view with its title focused, once
  useEffect(() => {
    if (!account.arrived || phase !== "signed-in") return;
    title.current?.scrollIntoView?.({ block: "start" });
    title.current?.focus();
    clearArrived();
  }, [account.arrived, phase]);
  if (phase === "off") return null;

  const noteLine = note && <p className="step-note" role={note === "deleted" || note === "signed-out" ? "status" : "alert"}>{copy.notes[note]}</p>;

  let body: React.ReactNode;
  if (phase === "signed-out" && !open) {
    body = <div className="quick-option-row"><button className="secondary-button" onClick={() => setOpen(true)}>{copy.open}</button></div>;
  } else if (phase === "signed-out") {
    const agreed = agreeAccount && agreeRecords;
    body = <>
      <p className="small-note">{copy.consentLead}</p>
      <ul className="small-note">{copy.consentPoints.map((point) => <li key={point}>{point}</li>)}</ul>
      <label className="check-row"><input type="checkbox" checked={agreeAccount} onChange={(event) => setAgreeAccount(event.target.checked)} /> {copy.consentAccount}</label>
      <label className="check-row"><input type="checkbox" checked={agreeRecords} onChange={(event) => setAgreeRecords(event.target.checked)} /> {copy.consentRecords}</label>
      <label className="lock-label" htmlFor="account-email">{copy.emailLabel}</label>
      <input id="account-email" className="text-input" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
      <div className="quick-option-row">
        <button className="secondary-button" disabled={!agreed || !email.trim() || busy} onClick={() => void sendCode(email)}>{copy.sendCode}</button>
        <button className="quiet-button" onClick={() => setOpen(false)}>{copy.continueAsGuest}</button>
      </div>
    </>;
  } else if (phase === "code-sent") {
    body = <>
      <p className="small-note">{copy.codeSent.replace("{email}", account.email ?? "")}</p>
      <p className="small-note">{copy.codeLinkHint}</p>
      <label className="lock-label" htmlFor="account-code">{copy.codeLabel}</label>
      <input id="account-code" className="text-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void verifyCode(code); }} />
      <div className="quick-option-row">
        <button className="secondary-button" disabled={!code || busy} onClick={() => void verifyCode(code)}>{copy.verify}</button>
        <button className="quiet-button" disabled={busy} onClick={() => void sendCode(account.email ?? "")}>{copy.resend}</button>
        <button className="quiet-button" onClick={() => { setCode(""); changeEmail(); }}>{copy.changeEmail}</button>
      </div>
    </>;
  } else {
    body = <>
      <p className="small-note" role="status">{copy.arrived}</p>
      <p className="small-note">{account.email ? `${copy.signedInAs.replace("{email}", account.email)} ` : ""}{copy.syncOn}</p>
      {account.askImport.length > 0 && <div role="group" aria-labelledby="account-import-question">
        <p className="synthesis-question" id="account-import-question">{copy.importQuestion.replace("{count}", String(account.askImport.length))}</p>
        <p className="small-note">{copy.importNote}</p>
        <div className="quick-option-row">
          <button className="secondary-button" disabled={busy} onClick={() => void importLocal()}>{copy.importConfirm}</button>
          <button className="quiet-button" disabled={busy} onClick={keepLocal}>{copy.importKeep}</button>
        </div>
      </div>}
      {confirmingDelete && <div role="group" aria-labelledby="account-delete-title">
        <p className="synthesis-question" id="account-delete-title">{copy.deleteConfirmTitle}</p>
        <p className="small-note">{copy.deleteConfirmBody}</p>
        <div className="quick-option-row">
          <button className="secondary-button" disabled={busy} onClick={() => { setConfirmingDelete(false); void deleteAccount(); }}>{copy.deleteConfirm}</button>
          <button className="quiet-button" onClick={() => setConfirmingDelete(false)}>{copy.deleteCancel}</button>
        </div>
      </div>}
    </>;
  }

  return <section className="synthesis" aria-labelledby="account-title">
    <p className="tier-label" id="account-title" ref={title} tabIndex={-1}>{copy.title}</p>
    {body}
    {busy && <p className="small-note" role="status">{copy.working}</p>}
    {noteLine}
    {/* 로그아웃 and 계정 지우기 on their own line at the very end, away from the step's buttons (2026-11-02) */}
    {phase === "signed-in" && !confirmingDelete && <div className="quick-option-row account-sign-out">
      <button className="quiet-button" disabled={busy} onClick={() => void signOut()}>{copy.signOut}</button>
      <button className="quiet-button" disabled={busy} onClick={() => setConfirmingDelete(true)}>{copy.deleteAccount}</button>
    </div>}
  </section>;
}
