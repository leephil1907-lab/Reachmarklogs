/**
 * Clerk configuration probe.
 *
 * Kept in its own module so the middleware, the server bootstrap and the health
 * endpoint can all ask the same question without importing Clerk's runtime —
 * which matters because the API must boot cleanly with no Clerk keys at all.
 */
export const clerkConfigured = () =>
  Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.trim())

export const clerkPublishableConfigured = () =>
  Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_PUBLISHABLE_KEY.trim())
