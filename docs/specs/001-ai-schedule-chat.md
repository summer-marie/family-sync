# AI Schedule Chat

## Summary
This is the core feature of the app and the main reason it is different from a normal shared family calendar. Instead of making users manually scan multiple calendars, the app allows them to ask natural-language questions about shared availability, conflicts, and plans, and receive answers based only on the schedule data they are allowed to access.

## Related User Story
**US-7**  
As a family member, I want to ask natural-language questions about the family schedule so that I can get quick answers without manually comparing calendars.

## Acceptance Criteria
- A user can ask natural-language questions about the family schedule.
- AI responses are based on the schedule data the user is allowed to access.
- The AI stays within allowed scope and does not take unsupported actions.

## Key Data
- User question
- Authorized schedule data
- AI response
- Access boundaries

## Edge Cases
- Incomplete schedule data
- Unsupported questions
- Privacy-restricted event details
- Unclear date references