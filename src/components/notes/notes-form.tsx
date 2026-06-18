"use client";

import { useState } from "react";

interface NotesFormProps {
  familyGroupId: string;
}

export function NotesForm({ familyGroupId }: NotesFormProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyGroupId, content }),
    });
    setSaving(false);
    setContent("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="relative">
      <textarea
        aria-label="Notes"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="w-full rounded-lg p-3 pb-10 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber/40"
        style={{
          backgroundColor: "#2a2520",
          border: "1px solid rgba(255, 220, 160, 0.10)",
        }}
      />
      {saved && (
        <span className="absolute bottom-2 left-3 text-xs text-amber">
          Saved to schedule
        </span>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="absolute bottom-2 right-2 rounded-md bg-amber px-3 py-1 text-xs font-medium text-canvas hover:bg-amber-hover disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Note"}
      </button>
    </div>
  );
}
