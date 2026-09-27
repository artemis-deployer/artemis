"use client";

import { useState } from "react";
import {
  createShieldRecoveryPhrase,
  decryptShieldBackup,
  encryptShieldBackup,
  validateShieldRecoveryPhrase,
} from "@/lib/shielded-client";

type Props = {
  onReady: (phrase: string) => void;
};

export function ShieldNoteBackup({ onReady }: Props) {
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState("");

  async function exportBackup() {
    setStatus("");
    try {
      const backup = await encryptShieldBackup(phrase, password);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "artemis-shield-recovery.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setPassword("");
      setStatus("Encrypted recovery file downloaded. Store it offline and keep the password separately.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "backup_export_failed");
    }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    setStatus("");
    try {
      const backup = JSON.parse(await file.text()) as unknown;
      setPhrase(await decryptShieldBackup(backup, recoveryPassword));
      setRecoveryPassword("");
      setConfirmed(false);
      setStatus("Encrypted recovery file opened locally. Artemis did not receive it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "backup_import_failed");
    }
  }

  function acceptRecovery() {
    if (!confirmed || !phrase.trim()) return;
    if (!validateShieldRecoveryPhrase(phrase)) {
      setStatus("shield_recovery_phrase_invalid");
      return;
    }
    onReady(phrase.trim());
  }

  return (
    <div className="shield-note-backup">
      <h3>Set up private recovery</h3>
      <p className="shield-warning" role="alert">Your recovery phrase controls these funds. If you lose both the phrase and its encrypted backup, the funds cannot be recovered. Save the backup offline and store its password separately.</p>
      <p>Your recovery phrase stays in this browser session. It is never sent to Artemis or saved in browser storage.</p>
      {!phrase && <button type="button" onClick={() => setPhrase(createShieldRecoveryPhrase())}>CREATE RECOVERY PHRASE</button>}
      {!phrase && (
        <div className="shield-note-restore">
          <label className="shield-note-label" htmlFor="shield-restore-password">Open encrypted backup</label>
          <input id="shield-restore-password" type="password" autoComplete="current-password" value={recoveryPassword} onChange={(event) => setRecoveryPassword(event.target.value)} placeholder="Backup password" />
          <input type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} />
          <label className="shield-note-label" htmlFor="shield-restore-phrase">Or enter an existing recovery phrase</label>
          <textarea id="shield-restore-phrase" autoComplete="off" spellCheck={false} value={phrase} onChange={(event) => setPhrase(event.target.value)} rows={3} />
        </div>
      )}
      {phrase && (
        <>
          <label className="shield-note-label" htmlFor="shield-recovery-phrase">Recovery phrase</label>
          <textarea
            id="shield-recovery-phrase"
            autoComplete="off"
            spellCheck={false}
            value={phrase}
            onChange={(event) => { setPhrase(event.target.value); setConfirmed(false); }}
            rows={4}
          />
          <label className="shield-note-label" htmlFor="shield-backup-password">Encrypt a recovery file</label>
          <input
            id="shield-backup-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Use at least 12 characters"
          />
          <button type="button" disabled={password.length < 12} onClick={exportBackup}>
            DOWNLOAD ENCRYPTED BACKUP
          </button>
          <label className="shield-note-confirm">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            I saved the encrypted backup offline and stored its password separately.
          </label>
          <button type="button" disabled={!confirmed} onClick={acceptRecovery}>
            CONTINUE
          </button>
        </>
      )}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
