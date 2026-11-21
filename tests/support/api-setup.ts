/** Stops the API tests early, with a clear message, when the app or Mailpit isn't running. */
export default async function setup() {
  const base = process.env.VETTLY_TEST_URL ?? "http://localhost:3000";
  const mail = process.env.MAILPIT_URL ?? "http://localhost:8025";
  for (const [what, url] of [["Vettly", `${base}/api/health`], ["Mailpit", `${mail}/api/v1/info`]] as const) {
    const ok = await fetch(url).then((r) => r.ok).catch(() => false);
    if (!ok) throw new Error(`${what} isn't reachable at ${url}. Start the stack (see tests/README.md) and try again.`);
  }
}
