import type { TestIntegrity } from "@/types/psychometrics";

/**
 * Plain-language notes on what the candidate's browser noticed during a test, for the activity log and HR's
 * report. Empty when nothing was noticed.
 */
export function integrityNotes(i: TestIntegrity | undefined, fastAnswers = 0) {
  const notes: string[] = [];
  const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
  const away = (s: number) => (s < 90 ? `${s} s` : `${Math.round(s / 60)} min`);
  if (i?.leftWindow) notes.push(`left the test window ${times(i.leftWindow)}${i.awaySeconds ? ` (${away(i.awaySeconds)} away)` : ""}`);
  if (i?.pasteBlocked) notes.push(`tried to paste ${times(i.pasteBlocked)}`);
  if (i?.copyBlocked) notes.push(`tried to copy ${times(i.copyBlocked)}`);
  if (i?.shortcutsBlocked) notes.push(`used a blocked shortcut ${times(i.shortcutsBlocked)}`);
  if (i?.cameraOff) notes.push(`camera stopped ${times(i.cameraOff)} during the recording`);
  if (fastAnswers) notes.push(`${fastAnswers} answer${fastAnswers === 1 ? "" : "s"} given in under two seconds`);
  return notes;
}
