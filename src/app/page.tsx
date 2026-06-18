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
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Family Sync</h1>
      <p className="mb-8 max-w-md text-gray-600">
        One place to see your family&apos;s schedule and ask scheduling
        questions — without sharing everything.
      </p>
      <form action={handleSignIn}>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
