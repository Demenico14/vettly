/**
 * Password rules, following NIST SP 800-63B-4: length matters, composition rules don't. A password used
 * without a second factor needs at least 15 characters, long passphrases are welcome, and common or easily
 * guessed passwords are refused. Used by both the forms and the server.
 */
export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

/** Words and patterns that make a password easy to guess, however long it is. */
const COMMON = [
  "password", "passw0rd", "p@ssword", "qwerty", "qwertyuiop", "asdfgh", "zxcvbn", "123456", "1234567890", "abc123",
  "letmein", "welcome", "iloveyou", "admin", "administrator", "monkey", "dragon", "football", "soccer", "baseball",
  "sunshine", "princess", "shadow", "master", "superman", "batman", "trustno1", "changeme", "default", "secret",
  "vettly", "recruit", "zimbabwe", "harare", "bulawayo", "southafrica", "johannesburg",
];

/** True when the password is mostly common words, the person's own name or email, or very few distinct characters. */
export function isGuessable(password: string, context: string[] = []) {
  if (new Set(password.toLowerCase()).size < 5) return true;
  const plain = password.toLowerCase().replace(/[^a-z]/g, "");
  const words = [...COMMON, ...context.map((c) => c.toLowerCase().split("@")[0]!.replace(/[^a-z]/g, "")).filter((c) => c.length >= 4)];
  const covered = words.filter((w) => plain.includes(w)).reduce((n, w) => n + w.length, 0);
  return plain.length > 0 && covered >= plain.length * 0.6;
}

/** Why a password isn't acceptable, or null when it is. */
export function passwordProblem(password: string, context: string[] = []): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase of four or five words works well.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (isGuessable(password, context)) return "That password is too easy to guess. Avoid common words, repeated characters, your name and your email.";
  return null;
}
