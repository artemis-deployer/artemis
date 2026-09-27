import { closeSync, fsyncSync, mkdirSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

function isWithinDirectory(directory, target) {
  const rel = relative(directory, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export function resolveShieldRehearsalBackupPath({ projectDirectory = process.cwd(), environment = process.env } = {}) {
  const configuredPath = environment.SHIELD_E2E_BACKUP_PATH?.trim();
  const dataDirectory = environment.LOCALAPPDATA || environment.XDG_DATA_HOME || join(homedir(), ".local", "share");
  const backupPath = resolve(configuredPath || join(dataDirectory, "ArtemisZK", "shield-rehearsal", "note-recovery.json"));
  const nextDirectory = resolve(projectDirectory, ".next");
  if (isWithinDirectory(nextDirectory, backupPath)) {
    throw new Error("SHIELD_E2E_BACKUP_PATH must be outside the project .next directory.");
  }
  return backupPath;
}

export function writeShieldRehearsalBackupOnce(filePath, contents) {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  let descriptor;
  try {
    descriptor = openSync(filePath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("Shield rehearsal recovery backup already exists; refusing to overwrite the only note backup.");
    throw error;
  }

  try {
    writeFileSync(descriptor, contents, "utf8");
    fsyncSync(descriptor);
  } catch (error) {
    closeSync(descriptor);
    unlinkSync(filePath);
    throw error;
  }
  closeSync(descriptor);
}
