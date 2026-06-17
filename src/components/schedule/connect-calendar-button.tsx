"use client";

import { connectCalendarAction } from "@/features/calendar/actions";

// Thin client wrapper so the server action can be used as a form action
// inside a server component page. No state needed: the action revalidates
// /schedule and Next.js re-renders the page with the updated connection status.

export function ConnectCalendarButton() {
  return (
    <form action={connectCalendarAction}>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Connect Google Calendar
      </button>
    </form>
  );
}
