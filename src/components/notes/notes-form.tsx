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
        className="w-full rounded-lg p-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/40"
        style={{
          backgroundColor: "#2a2520",
          border: "1px solid rgba(255, 220, 160, 0.10)",
        }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-canvas hover:bg-amber-hover disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
