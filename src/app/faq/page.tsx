// ---------------------------------------------------------------------------
// /faq page - static content, no auth required
// ---------------------------------------------------------------------------

const faqs = [
  {
    question: "What calendar providers does Family Sync support?",
    answer:
      "Google Calendar only, for now. Each family member connects their own Google account; non-Google calendars aren't supported in this version.",
  },
  {
    question: "Can other family members see my full calendar?",
    answer:
      "Not unless you choose to. Each person controls their own visibility setting: \"Full\" shows event titles to the rest of the family, while \"Busy only\" hides titles and shows just busy/free blocks. This is enforced before any data reaches the shared schedule or the AI assistant.",
  },
  {
    question: "Does the AI assistant see my private event details?",
    answer:
      "The AI only ever sees schedule data that's already been filtered by your visibility setting. If your events are set to busy-only, the assistant only knows you're busy at that time — not what the event is.",
  },
  {
    question: "Does Family Sync store my calendar events?",
    answer:
      "No. Events are read live from Google Calendar each time they're needed. The database only stores your connection status and visibility preference, not your actual events.",
  },
  {
    question: "Can I belong to more than one family group?",
    answer:
      "Not in this version — each account belongs to a single family group at a time. Support for multiple groups may come in a future version.",
  },
  {
    question: "What happens if my Google Calendar connection expires?",
    answer:
      "Family Sync automatically renews your access in the background using Google's refresh token, so you shouldn't need to reconnect manually under normal use. If a connection is fully revoked, you'll see a clear reconnect prompt.",
  },
  {
    question: "Who can invite new members to my family group?",
    answer:
      "Any member of the group can send an invite by email — it's not limited to the organizer.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-primary md:text-3xl">
        FAQ
      </h1>

      <ul className="space-y-3">
        {faqs.map((faq) => (
          <li
            key={faq.question}
            className="rounded-[0.625rem] p-4"
            style={{
              backgroundColor: "#1e1b16",
              border: "1px solid rgba(255, 220, 160, 0.10)",
            }}
          >
            <p className="mb-2 font-semibold text-primary">{faq.question}</p>
            <p className="text-sm text-secondary">{faq.answer}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
