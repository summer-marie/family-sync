import { inviteMemberAction } from "@/features/family/actions";

// ---------------------------------------------------------------------------
// InviteForm - server component
//
// Renders the email invite form. Only shown to the organizer.
// The familyGroupId is passed via a hidden input field.
// ---------------------------------------------------------------------------

export function InviteForm({ familyGroupId }: { familyGroupId: string }) {
  return (
    <>
      <p className="mb-2 text-sm text-gray-600">Invite by email address.</p>
      <form action={inviteMemberAction} className="flex gap-2">
        <input type="hidden" name="familyGroupId" value={familyGroupId} />
        <input
          type="email"
          name="email"
          placeholder="Email address"
          className="flex-1 rounded border px-3 py-2"
          required
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Invite
        </button>
      </form>
    </>
  );
}