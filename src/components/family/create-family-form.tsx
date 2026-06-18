import { createFamilyGroupAction } from "@/features/family/actions";

// ---------------------------------------------------------------------------
// CreateFamilyForm - server component
//
// Renders the family group creation form. Uses a server action directly.
// ---------------------------------------------------------------------------

export function CreateFamilyForm() {
  return (
    <form action={createFamilyGroupAction} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-secondary"
        >
          Family group name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="e.g. The Smiths"
          className="w-full rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/40"
          style={{
            backgroundColor: "#2a2520",
            border: "1px solid rgba(255, 220, 160, 0.10)",
          }}
          required
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-canvas hover:bg-amber-hover"
      >
        Create family
      </button>
    </form>
  );
}
