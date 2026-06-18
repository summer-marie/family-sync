# Shared Notes Redesign Plan

## Current State

`SharedNote` is a single note per family group (`@unique` on `familyGroupId`). It stores one content string, updated in place, with `updatedByUserId` tracking the last editor. Note creation and editing currently lives on the Members page.

No note history is stored. No per-note ownership or delete functionality exists.

## Desired End State

Replace the single shared note with a **whiteboard model** — a list of notes any family member can add to or delete from. Notes are scoped to the family group and displayed on the schedule page.

### Layout

**Desktop:** Notes panel displayed below the AI chat on the schedule page.

**Mobile:** Notes section below the AI chat, collapsed by default with a toggle to expand/collapse.

Note creation moves off the Members page entirely once this is in place.

## Schema Change Required

The current `SharedNote` model needs to be replaced with a multi-row `FamilyNote` model:

```prisma
model FamilyNote {
  id            String      @id @default(cuid())
  familyGroupId String
  content       String
  createdAt     DateTime    @default(now())
  createdByUserId String

  familyGroup   FamilyGroup @relation(fields: [familyGroupId], references: [id], onDelete: Cascade)
  createdBy     User        @relation(fields: [createdByUserId], references: [id])

  @@map("family_note")
}
```

This is a **breaking schema change** — it requires a Prisma migration and removes the old `shared_note` table.

## Permissions (Whiteboard Model)

- Any family member can **add** a note
- Any family member can **delete** any note
- No edit-in-place — add and delete only (keeps it simple)

## Work Breakdown

### Backend
- [ ] Update `prisma/schema.prisma` — replace `SharedNote` with `FamilyNote`
- [ ] Write and run migration
- [ ] Update or replace the shared notes API route to support list, create, and delete operations
- [ ] Remove `sharedNote` relation from `FamilyGroup` and `User` models, add `familyNotes`

### Frontend
- [ ] Remove note creation section from the Members page
- [ ] Add notes panel below AI chat on the schedule page
- [ ] Implement responsive toggle for mobile (collapsed by default)
- [ ] Add inline delete button per note (visible to all members)
- [ ] Add note creation input in the notes panel

### Tests
- [ ] Update or replace existing `SharedNote` API tests
- [ ] Add tests for create, list, and delete note operations
- [ ] Update any Playwright tests that reference the Members page notes section

## Risk Notes

- The migration drops the `shared_note` table — any existing note content will be lost. Acceptable for MVP since note data is not critical.
- Moving note creation off the Members page changes user flow — make sure the schedule page notes panel is discoverable before removing it from Members.
- The `updatedBy` relation on `User` currently references `SharedNote` — removing it requires updating the `User` model too.

## Deferred Until

Come back to this after current UI polish and any other backend priorities are addressed. Do not start this work without planning the migration carefully.
