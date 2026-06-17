"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createConnection,
  ValidationError,
} from "@/features/calendar/services";

// ---------------------------------------------------------------------------
// Server Actions for the calendar connection feature
//
// These actions wrap the service layer with auth/session resolution. They
// return Promise<void> so they can be used directly as <form action={...}>.
// Errors are thrown; Next.js surfaces them via the nearest error boundary.
// ---------------------------------------------------------------------------

export async function connectCalendarAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  try {
    await createConnection({ userId: session.user.id });
  } catch (error) {
    if (error instanceof ValidationError) {
      // Already connected - treat as a no-op rather than surfacing an error.
      // The page will reflect the existing connection on revalidation.
    } else {
      throw error;
    }
  }

  revalidatePath("/schedule");
}
