# Personas and Stories

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

## User Stories

### Must Have

#### Epic 1: Account and Family Access
**US-1**  
As a family member, I want to create an account, sign in, and securely access my family space so that only authorized people can view shared calendar information.

**US-2**  
As a family organizer, I want to create a family group so that I can start a shared hub for my family. As any member of that group, I want to invite additional people by email so that the right people can join — invite ability is not limited to the organizer.

**US-3**  
As a family member, I want to view the current members of my family group so that I know who is included in the shared schedule and notes.

#### Epic 2: Calendar Sharing and Visibility
**US-4**  
As a family member, I want to connect my Google Calendar so that my availability can be included in the family schedule, and have my connection stay valid automatically without needing to manually reconnect for routine token expiry.

**US-5**  
As a family organizer, I want to view a combined family schedule so that I can quickly understand conflicts, overlaps, and open time.

**US-6**  
As a privacy-conscious family member, I want control over whether my event titles are visible or hidden so that I can choose how much personal information is shared.

#### Epic 3: Family Planning Support
**US-7**  
As a family member, I want to ask natural-language questions about the family schedule so that I can get quick answers without manually comparing calendars.

**US-8**  
As a family member, I want to add notes to a shared space that every member of my family group can see, so that reminders and planning details stay in one place. Notes are added as individual cards, attributed to whoever wrote them.

**US-9**  
As a family organizer, I want to remove a member from the family group when needed so that the shared space stays accurate over time.

#### Epic 4: Trust and Transparency
**US-16**  
As a user, I want to read an FAQ and a clear privacy explanation so that I understand what data is collected, what the AI assistant can and can't see, and how to control my own visibility.

### Should Have

**US-10**  
As a family member, if my Google access is fully revoked (not just routinely expired), I want a clear reconnection prompt so that my schedule can be restored without confusion.

**US-11**  
As a family organizer, I want basic group settings such as renaming or deleting the group so that the shared space stays current.

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