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
      <p className="mb-3 text-sm text-secondary">Invite by email address.</p>
      <form action={inviteMemberAction} className="flex gap-2">
        <input type="hidden" name="familyGroupId" value={familyGroupId} />
        <input
          type="email"
          name="email"
          placeholder="Email address"
          className="flex-1 rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/40"
          style={{
            backgroundColor: "#2a2520",
            border: "1px solid rgba(255, 220, 160, 0.10)",
          }}
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-canvas hover:bg-amber-hover"
        >
          Invite
        </button>
      </form>
    </>
  );
}
