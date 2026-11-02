"use client";

import { useState, useSyncExternalStore } from "react";
import { koOnly } from "../lib/i18n/messages.ko";
import { changeEmail, deleteAccount, getAccountState, importLocal, keepLocal, sendCode, setPassphrase, signOut, subscribeAccount, unlock, verifyCode } from "../lib/account";

const copy = koOnly.account;

/**
 * 「다른 기기에서도 보기」 at the foot of the records screen (owner's decision
 * 2026-11-02, preview only). Korean only, and drawn only where the login values
 * are set (app/emotion-app.tsx). The order: what is sent and two agreements →
 * email → 6-digit code (or the email's link) → a 기록 암호, set or typed → whether
 * this device's records go to the account. Nothing is sent before the two boxes
 * are ticked; a guest who never opens this sends nothing at all.
 */
export function AccountPanel() {
  const account = useSyncExternalStore(subscribeAccount, getAccountState, getAccountState);
  const [open, setOpen] = useState(false);
  const [agreeAccount, setAgreeAccount] = useState(false);
  const [agreeRecords, setAgreeRecords] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [first, setFirst] = useState("");
  const [again, setAgain] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { phase, busy, note } = account;
  if (phase === "off") return null;

  const noteLine = note && <p className="step-note" role={note === "deleted" || note === "signed-out" ? "status" : "alert"}>{copy.notes[note]}</p>;
  const clearSecrets = () => { setFirst(""); setAgain(""); };

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
  } else if (phase === "locked" && !account.hasVault) {
    body = <div role="group" aria-labelledby="account-set-title">
      <p className="synthesis-question" id="account-set-title">{copy.setTitle}</p>
      <p className="small-note">{copy.setIntro}</p>
      <p className="small-note"><strong>{copy.forgetWarning}</strong></p>
      <label className="lock-label" htmlFor="account-passphrase">{copy.passphrase}</label>
      <input id="account-passphrase" className="text-input" type="password" autoComplete="new-password" maxLength={200} value={first} onChange={(event) => setFirst(event.target.value)} />
      <label className="lock-label" htmlFor="account-passphrase-again">{copy.passphraseAgain}</label>
      <input id="account-passphrase-again" className="text-input" type="password" autoComplete="new-password" maxLength={200} value={again} onChange={(event) => setAgain(event.target.value)} />
      <div className="quick-option-row">
        <button className="secondary-button" disabled={!first || !again || busy} onClick={() => void setPassphrase(first, again).then(clearSecrets)}>{copy.setConfirm}</button>
        <button className="quiet-button" disabled={busy} onClick={() => void signOut()}>{copy.signOut}</button>
      </div>
    </div>;
  } else if (phase === "locked") {
    body = <div role="group" aria-labelledby="account-unlock-title">
      <p className="synthesis-question" id="account-unlock-title">{copy.unlockTitle}</p>
      <p className="small-note">{copy.unlockIntro}</p>
      <p className="small-note"><strong>{copy.forgetWarning}</strong></p>
      <label className="lock-label" htmlFor="account-unlock">{copy.unlockLabel}</label>
      <input id="account-unlock" className="text-input" type="password" autoComplete="current-password" maxLength={200} value={first} onChange={(event) => setFirst(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && first) void unlock(first).then(clearSecrets); }} />
      <div className="quick-option-row">
        <button className="secondary-button" disabled={!first || busy} onClick={() => void unlock(first).then(clearSecrets)}>{copy.unlockConfirm}</button>
        <button className="quiet-button" disabled={busy} onClick={() => void signOut()}>{copy.signOut}</button>
      </div>
    </div>;
  } else {
    body = <>
      <p className="small-note">{copy.signedInAs.replace("{email}", account.email ?? "")} {copy.syncOn}</p>
      {account.askImport.length > 0 && <div role="group" aria-labelledby="account-import-question">
        <p className="synthesis-question" id="account-import-question">{copy.importQuestion.replace("{count}", String(account.askImport.length))}</p>
        <p className="small-note">{copy.importNote}</p>
        <div className="quick-option-row">
          <button className="secondary-button" disabled={busy} onClick={() => void importLocal()}>{copy.importConfirm}</button>
          <button className="quiet-button" disabled={busy} onClick={keepLocal}>{copy.importKeep}</button>
        </div>
      </div>}
      {!confirmingDelete
        ? <div className="quick-option-row">
            <button className="quiet-button" disabled={busy} onClick={() => void signOut()}>{copy.signOut}</button>
            <button className="quiet-button" disabled={busy} onClick={() => setConfirmingDelete(true)}>{copy.deleteAccount}</button>
          </div>
        : <div role="group" aria-labelledby="account-delete-title">
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
    <p className="tier-label" id="account-title">{copy.title}</p>
    {body}
    {busy && <p className="small-note" role="status">{copy.working}</p>}
    {noteLine}
  </section>;
}
