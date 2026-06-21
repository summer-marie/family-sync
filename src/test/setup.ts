import '@testing-library/jest-dom'

// Provide a dummy Resend key so src/lib/resend.ts does not throw at import
// time during tests. Individual tests mock @/lib/resend or @/lib/email/send-invite-email
// so the real Resend client is never called.
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test_dummy";

// Dummy values for env vars that send-invite-email.ts and services.ts now
// require explicitly (no code-level fallback). Real .env.local / Vercel env
// values take precedence if already set.
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";