/**
 * Loads `.env.test.local` before the suite runs.
 *
 * Only the integration tests need it, and they skip themselves when the
 * variables are absent — so a missing file is the normal case for anyone who
 * has not set up a test project, not an error.
 */
try {
  process.loadEnvFile(".env.test.local");
} catch {
  // No file: the integration tests will skip.
}
