# Calendar Connection and Shared Schedule

## Summary
This feature supports the AI chat by bringing each family member’s Google Calendar data into the app and combining it into a shared family schedule. The schedule view should help users understand availability, conflicts, and open time across the group without relying on a raw shared Google Calendar alone.

## Related User Stories
**US-4**  
As a family member, I want to connect my Google Calendar so that my availability can be included in the family schedule.

**US-5**  
As a family organizer, I want to view a combined family schedule so that I can quickly understand conflicts, overlaps, and open time.

## Acceptance Criteria
- A user can connect their Google Calendar successfully.
- The app stores the connection so the user does not need to reconnect every session.
- If the connection fails or expires, the user is informed clearly.
- The app shows a shared family schedule using connected calendars.
- Overlapping busy times are visible in the shared view.
- Missing calendar data is handled without breaking the schedule page.

## Key Data
- CalendarConnection
- Connected user
- Event data
- Free/busy data
- Visibility setting

## Edge Cases
- Failed calendar connection
- Expired connection
- Missing calendar data
- Overlapping events
- One member not connected