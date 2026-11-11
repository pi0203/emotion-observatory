"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { koOnly } from "../lib/i18n/messages.ko";
import { clearArrived, deleteAccount, getAccountState, importLocal, keepLocal, signInWith, signOut, subscribeAccount } from "../lib/account";
import { loginProviders, type LoginProvider } from "../lib/supabase-config";
import { AppleMark, GoogleMark, KakaoMark, NaverMark } from "./login-logos";

const copy = koOnly.account;

const MARKS: Record<LoginProvider, () => React.ReactElement> = { google: GoogleMark, kakao: KakaoMark, naver: NaverMark, apple: AppleMark };

/** The privacy policy page (on main since 2026-11-02, data/privacy.ko.json there). */
const PRIVACY_PATH = "/privacy";

/**
 * 「다른 기기에서도 보기」 at the foot of the records screen (owner's decision
 * 2026-11-02, changed the same day: no 기록 암호; preview only). Korean only,
 * and drawn only where the login values are set (app/emotion-app.tsx). The
 * order: what is sent, the privacy policy link and three agreements → a button
 * (Google, Kakao, Naver, Apple; only those set up are drawn; no email login
 * since 2026-11-02) → back from the provider, signed in, the account's records
 * shown, and whether this device's records go to the account. Nothing is sent
 * before the three boxes are ticked; a guest who never opens this sends nothing.
 */
export function AccountPanel() {
  const account = useSyncExternalStore(subscribeAccount, getAccountState, getAccountState);
  const [open, setOpen] = useState(false);
  const [agreeAccount, setAgreeAccount] = useState(false);
  const [agreeRecords, setAgreeRecords] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
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
    const agreed = agreeAccount && agreeRecords && agreeAge;
    body = <>
      <p className="small-note">{copy.consentLead}</p>
      <ul className="small-note">{copy.consentPoints.map((point) => <li key={point}>{point}</li>)}</ul>
      <p className="small-note"><a href={PRIVACY_PATH}>{copy.privacyLink}</a></p>
      <label className="check-row"><input type="checkbox" checked={agreeAccount} onChange={(event) => setAgreeAccount(event.target.checked)} /> {copy.consentAccount}</label>
      <label className="check-row"><input type="checkbox" checked={agreeRecords} onChange={(event) => setAgreeRecords(event.target.checked)} /> {copy.consentRecords}</label>
      <label className="check-row"><input type="checkbox" checked={agreeAge} onChange={(event) => setAgreeAge(event.target.checked)} /> {copy.consentAge}</label>
      {!agreed && <p className="small-note">{copy.agreeFirst}</p>}
      <div className="login-buttons">
        {loginProviders().map((provider) => <button key={provider} className={`login-button login-${provider}`} disabled={!agreed || busy} onClick={() => void signInWith(provider)}>{MARKS[provider]()}<span>{copy.providers[provider]}</span></button>)}
      </div>
      <div className="quick-option-row">
        <button className="quiet-button" onClick={() => setOpen(false)}>{copy.continueAsGuest}</button>
      </div>
    </>;
  } else {
    body = <>
      {/* with no email (Naver), the way of signing in names the account and says it in one line;
          「로그인했어요.」 alone is not shown after a return that failed: the login is an earlier one (2026-11-02) */}
      {!account.email && account.provider
        ? <p className="small-note" role="status">{copy.signedInWith.replace("{provider}", copy.providerNames[account.provider])}</p>
        : note !== "attempt-failed" && <p className="small-note" role="status">{copy.arrived}</p>}
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
