import "server-only";

// Skeleton stub — RED phase only.
// All exports are intentionally unimplemented so the tests in
// __tests__/notes.test.ts can load and fail on behavioral assertions
// rather than module-not-found errors.

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function saveNote(_input: {
  userId: string;
  familyGroupId: string;
  content: string;
}): Promise<never> {
  throw new Error("saveNote: not implemented");
}
