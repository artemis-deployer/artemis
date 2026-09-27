import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveShieldRehearsalBackupPath, writeShieldRehearsalBackupOnce } from "../scripts/shield/rehearsal-backup.mjs";

const temporaryDirectories: string[] = [];
function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "artemis-shield-backup-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Shield rehearsal recovery backup", () => {
  it("stores the default backup in persistent app data outside the project build directory", () => {
    const project = temporaryDirectory();
    const appData = temporaryDirectory();
    const path = resolveShieldRehearsalBackupPath({
      projectDirectory: project,
      environment: { ...process.env, LOCALAPPDATA: appData, SHIELD_E2E_BACKUP_PATH: "" },
    });

    expect(path).toBe(resolve(appData, "ArtemisZK", "shield-rehearsal", "note-recovery.json"));
    expect(path.startsWith(resolve(project, ".next"))).toBe(false);
  });

  it("rejects a configured path inside the project's .next directory", () => {
    const project = temporaryDirectory();

    expect(() => resolveShieldRehearsalBackupPath({
      projectDirectory: project,
      environment: { ...process.env, SHIELD_E2E_BACKUP_PATH: join(project, ".next", "recovery.json") },
    })).toThrow("must be outside the project .next directory");
  });

  it("creates a backup once and refuses to overwrite an existing encrypted note", () => {
    const path = join(temporaryDirectory(), "persistent", "note-recovery.json");
    const original = '{"ciphertext":"original"}\n';

    writeShieldRehearsalBackupOnce(path, original);

    expect(readFileSync(path, "utf8")).toBe(original);
    expect(() => writeShieldRehearsalBackupOnce(path, '{"ciphertext":"replacement"}\n'))
      .toThrow("already exists; refusing to overwrite the only note backup");
    expect(readFileSync(path, "utf8")).toBe(original);
  });
});
