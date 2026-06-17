import { removeMemberAction } from "@/features/family/actions";

// ---------------------------------------------------------------------------
// RemoveMemberButton - server component
//
// Renders a button to remove a member from the family group. Only shown to
// the organizer. Both IDs are passed via hidden inputs.
// ---------------------------------------------------------------------------

export function RemoveMemberButton({
  familyGroupId,
  memberUserId,
}: {
  familyGroupId: string;
  memberUserId: string;
}) {
  return (
    <form action={removeMemberAction}>
      <input type="hidden" name="familyGroupId" value={familyGroupId} />
      <input type="hidden" name="memberUserId" value={memberUserId} />
      <button
        type="submit"
        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      >
        Remove
      </button>
    </form>
  );
}