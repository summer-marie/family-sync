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
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Family group name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="e.g. The Smiths"
          className="w-full rounded border px-3 py-2"
          required
        />
      </div>

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Create family
      </button>
    </form>
  );
}