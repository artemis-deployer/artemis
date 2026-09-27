import { describe, expect, it } from "vitest";
import { canDeposit } from "../lib/shielded";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("deterministic shield pool accounting model", () => {
  it("preserves deposit, withdrawal, and nullifier invariants across randomized valid and failed operations", () => {
    const random = seededRandom(0x5a17ed);
    const denomination = 1_000n;
    const cap = denomination * 80n;
    let balance = 0n;
    let totalDeposits = 0n;
    let totalWithdrawn = 0n;
    let nextNote = 0;
    const liveNotes = new Set<number>();
    const spentNullifiers = new Set<number>();

    for (let step = 0; step < 2_000; step += 1) {
      const operation = Math.floor(random() * 4);
      if (operation <= 1) {
        const before = { balance, totalDeposits, liveNotes: new Set(liveNotes) };
        const paused = operation === 1 && random() < 0.3;
        const value = random() < 0.12 ? denomination + 1n : denomination;
        const result = canDeposit({ paused, value, denomination, totalDeposits, poolCap: cap });
        if (result === "ok") {
          totalDeposits += denomination;
          balance += denomination;
          liveNotes.add(nextNote++);
        } else {
          expect({ balance, totalDeposits, liveNotes: new Set(liveNotes) }).toEqual(before);
        }
      } else {
        const before = { balance, totalWithdrawn, liveNotes: new Set(liveNotes), spentNullifiers: new Set(spentNullifiers) };
        const shouldReplay = random() < 0.2;
        const candidate = shouldReplay
          ? [...spentNullifiers][0]
          : [...liveNotes][Math.floor(random() * Math.max(liveNotes.size, 1))];
        if (candidate !== undefined && liveNotes.has(candidate) && !spentNullifiers.has(candidate)) {
          liveNotes.delete(candidate);
          spentNullifiers.add(candidate);
          totalWithdrawn += denomination;
          balance -= denomination;
        } else {
          expect({ balance, totalWithdrawn, liveNotes: new Set(liveNotes), spentNullifiers: new Set(spentNullifiers) }).toEqual(before);
        }
      }

      expect(totalDeposits - totalWithdrawn).toBe(balance);
      expect(totalDeposits).toBeLessThanOrEqual(cap);
      expect(liveNotes.size + spentNullifiers.size).toBe(Number(totalDeposits / denomination));
      expect([...liveNotes].some((note) => spentNullifiers.has(note))).toBe(false);
    }
  });
});
