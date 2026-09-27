"use client";

import { useState } from "react";
import {
  createShieldRecoveryPhrase,
  decryptShieldBackup,
  encryptShieldBackup,
  validateShieldRecoveryPhrase,
} from "@/lib/shielded-client";
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";

type Props = {
  onReady: (phrase: string) => void;
};

type VaultTab = "generate" | "restore-file" | "manual-input";

export function ShieldNoteBackup({ onReady }: Props) {
  const [tab, setTab] = useState<VaultTab>("generate");
  const [phrase, setPhrase] = useState("");
  const [showPhrase, setShowPhrase] = useState(true);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");

  const words = phrase.trim() ? phrase.trim().split(/\s+/) : [];

  function handleCreatePhrase() {
    const newPhrase = createShieldRecoveryPhrase();
    setPhrase(newPhrase);
    setConfirmed(false);
    setStatus("Generated 12-word cryptographic seed phrase in memory.");
    setStatusType("info");
  }

  function copyPhrase() {
    if (!phrase) return;
    void navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function exportBackup() {
    if (!phrase || password.length < 12) return;
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
      setStatus("Encrypted backup downloaded (artemis-shield-recovery.json). Store it safely offline!");
      setStatusType("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "backup_export_failed");
      setStatusType("error");
    }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    setStatus("");
    try {
      const backup = JSON.parse(await file.text()) as unknown;
      const decrypted = await decryptShieldBackup(backup, recoveryPassword);
      setPhrase(decrypted);
      setRecoveryPassword("");
      setConfirmed(true);
      setStatus("Encrypted recovery file successfully unlocked. Phrase ready.");
      setStatusType("success");
      setTab("generate");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "backup_import_failed");
      setStatusType("error");
    }
  }

  function acceptRecovery() {
    if (!confirmed || !phrase.trim()) return;
    if (!validateShieldRecoveryPhrase(phrase)) {
      setStatus("Invalid recovery phrase. Please verify your 12 words.");
      setStatusType("error");
      return;
    }
    onReady(phrase.trim());
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Mode Selector Tabs */}
      <div className="flex rounded-lg border border-white/10 bg-[#121316] p-1 text-xs">
        <button
          type="button"
          onClick={() => { setTab("generate"); setStatus(""); }}
          className={`flex-1 rounded-md py-2 font-mono font-medium transition-all ${
            tab === "generate"
              ? "bg-[#fae8a4] text-[#18191c] font-bold shadow-sm"
              : "text-white/60 hover:text-white"
          }`}
        >
          GENERATE KEY
        </button>
        <button
          type="button"
          onClick={() => { setTab("restore-file"); setStatus(""); }}
          className={`flex-1 rounded-md py-2 font-mono font-medium transition-all ${
            tab === "restore-file"
              ? "bg-[#fae8a4] text-[#18191c] font-bold shadow-sm"
              : "text-white/60 hover:text-white"
          }`}
        >
          RESTORE FILE
        </button>
        <button
          type="button"
          onClick={() => { setTab("manual-input"); setStatus(""); }}
          className={`flex-1 rounded-md py-2 font-mono font-medium transition-all ${
            tab === "manual-input"
              ? "bg-[#fae8a4] text-[#18191c] font-bold shadow-sm"
              : "text-white/60 hover:text-white"
          }`}
        >
          IMPORT PHRASE
        </button>
      </div>

      {/* Security Advisory Pill */}
      <div className="flex items-start gap-3 rounded-lg border border-[#fae8a4]/20 bg-[#fae8a4]/5 p-3.5 text-xs leading-relaxed text-[#fae8a4]/90">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#fae8a4]" />
        <div>
          <strong className="font-semibold text-white">Sovereign Client Security:</strong> Your recovery phrase generates shielded note secrets entirely in your browser memory. Artemis never sees, transmits, or stores your keys.
        </div>
      </div>

      {/* TAB 1: GENERATE / VIEW PHRASE */}
      {tab === "generate" && (
        <div className="flex flex-col gap-4">
          {!phrase ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#fae8a4]/30 bg-[#fae8a4]/10 text-[#fae8a4]">
                <Key className="h-6 w-6" />
              </div>
              <h4 className="m-0 font-unbounded text-base font-bold text-white">No Active Vault Key</h4>
              <p className="mt-1.5 mb-5 max-w-sm text-xs leading-relaxed text-white/60">
                Generate a fresh 12-word recovery phrase to control your deposits and compute private zero-knowledge withdrawal proofs.
              </p>
              <button
                type="button"
                onClick={handleCreatePhrase}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#fae8a4] bg-[#fae8a4] px-5 py-2.5 font-mono text-xs font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] active:scale-[0.98]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                CREATE 12-WORD VAULT KEY
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Header Bar with Action Controls */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-wider text-white/50 uppercase">
                  Seed Phrase Matrix ({words.length} words)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/70 hover:border-white/25 hover:text-white"
                  >
                    {showPhrase ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPhrase ? "Hide" : "Reveal"}
                  </button>
                  <button
                    type="button"
                    onClick={copyPhrase}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/70 hover:border-white/25 hover:text-white"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                </div>
              </div>

              {/* 12-Word Matrix Grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {words.map((word, index) => (
                  <div
                    key={`${index}-${word}`}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-[#121316] px-3 py-2 font-mono text-xs"
                  >
                    <span className="text-white/35 text-[10px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={`font-semibold tracking-wide ${showPhrase ? "text-white" : "text-white/20 select-none blur-[3px]"}`}>
                      {showPhrase ? word : "••••••"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Encrypted JSON Backup (Optional & Recommended) */}
              <div className="rounded-xl border border-white/10 bg-[#121316] p-4">
                <div className="flex items-center gap-2 mb-2 font-mono text-xs font-semibold text-white/80">
                  <Lock className="h-3.5 w-3.5 text-[#fae8a4]" />
                  <span>Optional: Download Encrypted Backup File</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set password (min 12 chars)"
                    className="flex-1 rounded-lg border border-white/15 bg-[#18191c] px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-[#fae8a4] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={password.length < 12}
                    onClick={() => void exportBackup()}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-mono text-xs font-bold text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                    EXPORT .JSON
                  </button>
                </div>
              </div>

              {/* Confirmation Gate */}
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/80 hover:bg-white/[0.04]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#fae8a4]"
                />
                <span>
                  I have safely recorded this recovery phrase offline. I understand that without it, deposited testnet notes cannot be proven or recovered.
                </span>
              </label>

              {/* Accept & Unlock Action */}
              <button
                type="button"
                disabled={!confirmed}
                onClick={acceptRecovery}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#fae8a4] bg-[#fae8a4] px-5 py-3 font-mono text-xs font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShieldCheck className="h-4 w-4" />
                CONFIRM & UNLOCK VAULT
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESTORE FROM ENCRYPTED FILE */}
      {tab === "restore-file" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-[#121316] p-5">
            <h4 className="m-0 mb-2 font-unbounded text-sm font-bold text-white">Restore Encrypted .json</h4>
            <p className="mb-4 text-xs text-white/60">
              Provide your backup password and upload the previously exported <code className="text-[#fae8a4]">artemis-shield-recovery.json</code> file.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-bold text-white/50 uppercase" htmlFor="restore-pwd">
                  Backup Password
                </label>
                <input
                  id="restore-pwd"
                  type="password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="Enter decryption password"
                  className="w-full rounded-lg border border-white/15 bg-[#18191c] px-3.5 py-2.5 font-mono text-xs text-white placeholder-white/30 focus:border-[#fae8a4] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-bold text-white/50 uppercase">
                  Select Backup File
                </label>
                <div className="relative flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 p-4 hover:border-white/40">
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => void importBackup(e.target.files?.[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 font-mono text-xs text-white/70">
                    <Upload className="h-4 w-4 text-[#fae8a4]" />
                    <span>Choose or drag recovery .json here</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL INPUT */}
      {tab === "manual-input" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-[#121316] p-5">
            <h4 className="m-0 mb-2 font-unbounded text-sm font-bold text-white">Import Secret Phrase</h4>
            <p className="mb-4 text-xs text-white/60">
              Enter your 12-word seed phrase separated by single spaces.
            </p>
            <textarea
              value={phrase}
              onChange={(e) => {
                setPhrase(e.target.value);
                setConfirmed(true);
              }}
              rows={3}
              placeholder="e.g. abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
              className="w-full rounded-lg border border-white/15 bg-[#18191c] p-3 font-mono text-xs text-white placeholder-white/30 focus:border-[#fae8a4] focus:outline-none"
            />
            <button
              type="button"
              disabled={!phrase.trim()}
              onClick={acceptRecovery}
              className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#fae8a4] bg-[#fae8a4] px-5 py-2.5 font-mono text-xs font-bold tracking-wider text-[#18191c] transition-all hover:bg-[#fff0b8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShieldCheck className="h-4 w-4" />
              VERIFY & UNLOCK VAULT
            </button>
          </div>
        </div>
      )}

      {/* Status Notice */}
      {status && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 font-mono text-xs ${
            statusType === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : statusType === "error"
                ? "border border-red-500/30 bg-red-500/10 text-red-300"
                : "border border-white/10 bg-white/5 text-white/70"
          }`}
        >
          {statusType === "success" && <Check className="h-3.5 w-3.5 shrink-0" />}
          <span>{status}</span>
        </div>
      )}
    </div>
  );
}
