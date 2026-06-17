# Family Sync Peek Project Plan

## User Personas

### Primary User Base

#### Family Organizer
I am the person in my family who usually ends up coordinating plans, checking schedules, and trying to figure out who is available without texting everyone one by one. I want one place where I can quickly understand the family schedule without dealing with the mess and noise of a raw shared calendar.

- I need a fast way to see combined availability.
- I get frustrated when calendars are cluttered or hard to compare.
- I need enough detail to plan family events, but I do not want the app to feel chaotic.

#### Privacy-Conscious Family Member
I want to stay connected to the family schedule, but I do not want to give up full control over my personal calendar. I am willing to share what helps the family coordinate, but I want visibility settings that let me decide how much other people can see.

- I need control over whether event titles are visible or hidden.
- I worry that sharing too much calendar detail could feel invasive.
- I want privacy settings to be simple and easy to understand.

### Secondary User

#### Casual Family Participant
I do not want to manage the whole family calendar system; I just want quick answers about what is happening and when people are free. I would rather ask a simple question than dig through multiple calendars and try to compare them myself.

- I need the app to feel easy and low-effort.
- I prefer natural-language help over manual schedule scanning.
- I am more likely to use the app on my phone for quick checks.

### Dev Perspective

#### Solo Student Developer
I am building this project by myself, so I need the scope to stay realistic, testable, and organized enough to finish on time. I also need the project structure to clearly show my TDD process, because the testing workflow is part of the grade and has to be obvious in my commits.

- I need a manageable MVP with clear boundaries.
- I need each feature to be small enough to plan, test, build, and commit in stages.
- I need a process for tracking test prompts, total tests written, and final testing evidence.

## User Stories

### Must Have

#### Epic 1: Account and Family Access
**US-1**  
As a family member, I want to create an account, sign in, and securely access my family space so that only authorized people can view shared calendar information.

**US-2**  
As a family organizer, I want to create a family group and invite specific members so that the right people can join the shared hub.

**US-3**  
As a family member, I want to view the current members of my family group so that I know who is included in the shared schedule and notes.

#### Epic 2: Calendar Sharing and Visibility
**US-4**  
As a family member, I want to connect my Google Calendar so that my availability can be included in the family schedule.

**US-5**  
As a family organizer, I want to view a combined family schedule so that I can quickly understand conflicts, overlaps, and open time.

**US-6**  
As a privacy-conscious family member, I want control over whether my event titles are visible or hidden so that I can choose how much personal information is shared.

#### Epic 3: Family Planning Support
**US-7**  
As a family member, I want to ask natural-language questions about the family schedule so that I can get quick answers without manually comparing calendars.

**US-8**  
As a family member, I want to create and edit shared family notes so that important reminders and planning details stay in one place.

**US-9**  
As a family organizer, I want to update or delete the family group and manage membership when needed so that the shared space stays accurate over time.

### Should Have

**US-10**  
As a family member, I want a clear reconnection flow if my Google Calendar disconnects so that my schedule can be restored without confusion.

**US-11**  
As a family organizer, I want basic group settings such as renaming the group so that the shared space stays current.

### Could Have

**US-12**  
As a family member, I want the AI to support a few limited actions in the future so that the assistant can become more helpful over time.

**US-13**  
As a family organizer, I want more detailed permission levels in the future so that different members can have different access levels.

### Won’t Have This Time

**US-14**  
As a user, I want support for non-Google calendar providers, but this will not be included in the MVP because the project is focused on Google Calendar only.

**US-15**  
As a user, I want fully autonomous AI scheduling and editing, but this will not be included in the MVP because it requires stronger trust and safety controls.

## Acceptance Criteria

### Core Must-Have Criteria

#### US-1 — Account and Family Access
- Users can sign up, sign in, and sign out successfully.
- Protected family pages are only available to authenticated users.
- Users can only access the family data they are authorized to see.

#### US-2 — Family Group Creation
- An authenticated user can create a family group.
- A family organizer can invite members by email.
- Group members can view the current list of members.

#### US-3 — Group Membership View
- Group membership updates appear correctly after add or remove actions.
- Unauthorized users cannot view another group’s member list.

#### US-4 — Google Calendar Connection
- A user can connect their Google Calendar successfully.
- The app stores the connection so the user does not need to reconnect every session.
- If the connection fails or expires, the user is informed clearly.

#### US-5 — Combined Schedule View
- The app shows a shared family schedule using connected calendars.
- Overlapping busy times are visible in the shared view.
- Missing calendar data is handled without breaking the schedule page.

#### US-6 — Event Visibility Controls
- A family member can choose whether event titles are visible or hidden.
- Visibility settings are reflected in the shared schedule consistently.

#### US-7 — AI Schedule Questions
- A user can ask natural-language questions about the family schedule.
- AI responses are based on the schedule data the user is allowed to access.
- The AI stays within allowed scope and does not take unsupported actions.

#### US-8 — Shared Family Notes
- Group members can create and edit a shared note.
- Unauthorized users cannot access the shared note.

#### US-9 — Group Update and Deletion
- A family organizer can rename the group.
- A family organizer can remove a member.
- A family organizer can delete the group with confirmation.

### If Time Permits / Still Undecided

- More detailed permission levels beyond organizer/member.
- Limited AI-assisted actions with strict guardrails.
- More advanced note behavior, such as history or better organization.
- More polished reconnection and recovery flows for broken calendar connections.
- Expanded mobile or PWA enhancements beyond core responsive usability.
- Support for additional calendar providers beyond Google.

## Feature Specifications

### Must Have

#### AI Schedule Chat
This is the core feature of the app and the main reason it is different from a normal shared family calendar. Instead of making users manually scan multiple calendars, the app allows them to ask natural-language questions about shared availability, conflicts, and plans, and receive answers based only on the schedule data they are allowed to access.

- Key data: user question, authorized schedule data, AI response, access boundaries.
- Edge cases: incomplete schedule data, unsupported questions, privacy-restricted event details, unclear date references.

#### Calendar Connection and Shared Schedule
This feature supports the AI chat by bringing each family member’s Google Calendar data into the app and combining it into a shared family schedule. The schedule view should help users understand availability, conflicts, and open time across the group without relying on a raw shared Google Calendar alone.

- Key data: CalendarConnection, connected user, event data, free/busy data, visibility setting.
- Edge cases: failed calendar connection, expired connection, missing calendar data, overlapping events, one member not connected.

#### Auth and Family Access
This feature ensures that each user has their own account and can only access the family data they are authorized to see. It also supports creating a family group, inviting members, and viewing the current membership so the app knows whose schedule data belongs in the shared hub.

- Key data: User, FamilyGroup, GroupMembership, invite email.
- Edge cases: unauthorized access, duplicate invites, invalid emails, user belongs to no group.

#### Privacy and Visibility Controls
This feature allows a family member to choose whether their event titles are shown or hidden in the shared family schedule and AI responses. It matters because the app’s usefulness depends on balancing coordination with privacy, rather than exposing every calendar detail by default.

- Key data: visibility setting per member or connection.
- Edge cases: setting changes after data is already loaded, hidden titles in AI answers, mixed visibility across group members.

#### Shared Family Notes
This feature gives the family one shared note space for reminders, plans, or coordination details that belong alongside the calendar hub. It is part of the MVP, but it is a supporting feature rather than the main differentiator of the app.

- Key data: SharedNote, group association, editor access.
- Edge cases: empty note content, unauthorized access, concurrent edits kept simple for MVP.

### If Time Permits

#### Group Management Enhancements
This feature expands basic group management with smoother update and removal flows, such as renaming the group, removing members more gracefully, and improving confirmation steps.

- Key data: FamilyGroup settings, membership changes.
- Edge cases: removing the last member, deleting the group owner, accidental deletion.

#### Reconnection and Recovery Flow
This feature improves how the app handles broken or expired Google Calendar connections by guiding the user through reconnecting their account cleanly.

- Key data: connection status, reconnect prompt, failure state.
- Edge cases: revoked Google access, expired tokens, repeated reconnection failure.

#### Limited AI-Assisted Actions
This feature would allow a few tightly controlled AI-supported actions later, but only with strong guardrails and explicit user intent. It is intentionally outside the MVP because the first version should prove the read-focused AI schedule experience before adding action-taking behavior.

- Key data: requested action, confirmation state, allowed action list.
- Edge cases: ambiguous commands, unauthorized actions, accidental changes.

## Development Progress

| Step | Feature | Spec | Status |
|------|---------|------|--------|
| 1 | Schedule and event normalization | — | COMPLETE |
| 2 | Privacy filter | — | COMPLETE |
| 3 | Question parser | — | COMPLETE |
| 4 | Auth and family access | 003 | COMPLETE |
| 5 | Calendar connection and shared schedule | 002 | COMPLETE |
| 5a | Privacy and visibility controls | 004 | COMPLETE |
| 5b | AI schedule chat | 001 | COMPLETE |
| 6 | Shared family notes | 005 | COMPLETE |

## Open Questions / Unknowns

- Final SQL database choice and hosting approach.
- Exact Google Calendar scopes and how much event detail should be pulled for MVP.
- Whether the mobile requirement will be met through a responsive web app, a PWA, or a separate mobile build.
- Which free LLM option will be used first for the AI chat feature.
- Whether event-title visibility should default to shown or hidden for new members.
- How group invitations will work in practice, email link, pending invite state, or manual join flow.
- Whether shared notes need edit history or should remain a single simple note for MVP.
- How test logs and prompt tracking will be summarized at the end of the project.
- What success metrics will define the AI chat feature as good enough for the first version.