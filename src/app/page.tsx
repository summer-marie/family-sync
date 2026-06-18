import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/schedule");
  }

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/schedule" });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-primary md:text-3xl">
        Family Sync
      </h1>
      <p className="mb-8 max-w-md text-base text-secondary">
        One place to see your family&apos;s schedule and ask scheduling
        questions — without sharing everything.
      </p>
      <form action={handleSignIn}>
        <button
          type="submit"
          className="rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-canvas hover:bg-amber-hover"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
