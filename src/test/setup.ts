import '@testing-library/jest-dom'

// Provide a dummy Resend key so src/lib/resend.ts does not throw at import
// time during tests. Individual tests mock @/lib/resend or @/lib/email/send-invite-email
// so the real Resend client is never called.
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test_dummy";