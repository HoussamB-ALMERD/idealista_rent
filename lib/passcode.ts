import { timingSafeEqual } from "crypto";

// Compares against APP_PASSCODE without leaking timing information about how
// many leading characters matched. Also throws (rather than silently allowing
// access) if the env var isn't configured, so a missing secret fails closed.
export function verifyPasscode(input: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) {
    throw new Error("APP_PASSCODE is not set");
  }

  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(expected, "utf8");

  // timingSafeEqual requires equal-length buffers; zero-pad both to the same
  // fixed length first so a length mismatch doesn't short-circuit into a fast
  // path that could leak timing info.
  const len = Math.max(a.length, b.length, 64);
  const aPadded = Buffer.alloc(len);
  const bPadded = Buffer.alloc(len);
  a.copy(aPadded);
  b.copy(bPadded);

  return a.length === b.length && timingSafeEqual(aPadded, bPadded);
}
