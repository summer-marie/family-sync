import Link from "next/link";
import { auth, signOut } from "@/auth";
import { NavLinks } from "./nav-links";

async function SignOutButton() {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="w-full rounded-[0.625rem] px-4 py-3 text-left text-sm text-secondary hover:bg-row"
      >
        Sign out
      </button>
    </form>
  );
}

export async function NavBar() {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <>
      {/* Desktop sidebar — fixed, 16rem wide */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col lg:flex"
        style={{
          backgroundColor: "#100e0b",
          borderRight: "1px solid rgba(255, 220, 160, 0.08)",
        }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Brand */}
          <div className="px-6 py-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-amber"
            >
              Family Sync
            </Link>
          </div>

          {/* Nav links — only when authenticated */}
          {session?.user && (
            <nav className="flex-1 px-3">
              <NavLinks />
            </nav>
          )}

          {/* Secondary links (FAQ, Privacy) — desktop only */}
          {session?.user && (
            <div
              className="px-3 pt-4"
              style={{ borderTop: "1px solid rgba(255, 220, 160, 0.08)" }}
            >
              <NavLinks secondary />
            </div>
          )}

          {/* User info + sign out */}
          {session?.user && (
            <div
              className="px-3 pb-6 pt-4"
              style={{ borderTop: "1px solid rgba(255, 220, 160, 0.08)" }}
            >
              <p className="mb-2 truncate px-4 text-sm text-secondary">
                {userName}
              </p>
              <SignOutButton />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      {session?.user && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
          style={{
            backgroundColor: "#100e0b",
            borderTop: "1px solid rgba(255, 220, 160, 0.08)",
          }}
        >
          <NavLinks mobile />
        </nav>
      )}
    </>
  );
}
