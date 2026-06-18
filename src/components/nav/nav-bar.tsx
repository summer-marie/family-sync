import Link from "next/link";
import { auth, signOut } from "@/auth";

// Sign-out uses a server action so no client component is needed.
async function SignOutButton() {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="rounded px-3 py-1 text-sm hover:bg-gray-100"
      >
        Sign out
      </button>
    </form>
  );
}

export async function NavBar() {
  const session = await auth();

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <Link href="/" className="font-semibold tracking-tight">
        Family Sync
      </Link>

      {session?.user && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/schedule"
              className="text-sm hover:underline"
            >
              Schedule
            </Link>
            <Link
              href="/family"
              className="text-sm hover:underline"
            >
              Family
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </>
      )}
    </nav>
  );
}
