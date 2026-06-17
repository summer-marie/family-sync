"use client";

import { useState } from "react";

interface NotesFormProps {
  familyGroupId: string;
  initialContent: string;
}

export function NotesForm({ familyGroupId, initialContent }: NotesFormProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyGroupId, content }),
    });
    setSaving(false);
  }

  return (
    <div>
      <textarea
        aria-label="Notes"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="w-full rounded border p-2 text-sm"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
