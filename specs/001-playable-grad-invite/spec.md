# Feature Specification: HCMUT Graduation Invitation (Playable)

**Feature Branch**: `001-playable-grad-invite`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "A secret-link digital invitation that is also a short 2.5D pixel journey: guests walk the host's path from entering HCMUT to receiving the diploma, then land on an interactive 3D invite card with personalized message, campus directions, calendar, and RSVP."

## Clarifications

### Session 2026-11-05

- Q: Event date and time? → A: Saturday 28/11/2026, two meeting windows: 13:30–15:00 and 17:30–18:30 (Asia/Ho_Chi_Minh).
- Q: Meeting point? → A: The Computer Science faculty building (Khoa Khoa học và Kỹ thuật Máy tính), HCMUT CS1. The host provides the exact map pin and walking guidance later; guests are not expected to know the building.
- Q: Is Cổng 2 open to guests? → A: Yes, all gates (1, 2, 3) are open on the day.
- Q: What happens between the two windows? → A: 15:00–17:30 the host is inside the ceremony and cannot meet guests; the two windows are the only times to meet at the meeting point.
- Q: Do guests choose a window when they RSVP? → A: Yes. A guest answering Yes (or Maybe) picks exactly one window: 13:30 or 17:30.
- Q: Host identity on the card? → A: Trần Văn Mạnh — Bachelor of Engineering in Computer Science, HCMUT. Contact: 0981907003 (phone/Zalo).
- Q: Venue address? → A: HCMUT Cơ sở 1, 268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh.
- Q: Walking guidance from gates? → A: Provided by the host later; the card ships with placeholders that can be filled without redeploying.
- Q: When do links go out? → A: As soon as possible (no fixed date).
- Q: Custom domain? → A: None; the invite is served from a free hosting subdomain.
- Q: Does the contact number work on Zalo? → A: Yes; the card offers both tap-to-call and Zalo for 0981907003.
- Q: When is the first open recorded? → A: When the guest first reaches the card (by finishing or skipping the journey).
- Q: Send links before the game is ready? → A: Yes. Links go out as soon as the card works. When the journey ships later, guests who already opened see a one-time, skippable "Hành trình mới — chơi thử?" prompt.
- Q: Calendar with two windows? → A: Before RSVP, offer both windows (one calendar file with both events; two Google Calendar buttons). After choosing a window, offer only that window. Reminders 24 h and 90 min before.
- Q: Invite unit and party size? → A: One link per person or household; RSVP includes optional party size 1–5.
- Q: Does role change the experience? → A: Only the default salutation and message template; same journey for everyone.
- Q: RSVP notifications? → A: None for MVP; the host checks the dashboard.
- Q: Visual style? → A: Reuse the dark + gold look of the existing prototype; drop its dress-code picker and sticker yearbook.
- Q: Art, memories and audio? → A: Asset packs plus one custom host sprite with 3 outfits; 5 hallway photos (2022–2026) + 1 project photo with captions; royalty-free chiptune + 3–4 effects, off until first tap, mute remembered.
- Q: Admin? → A: Database dashboard + seed script for MVP; small admin page later.
- Q: Link preview on Zalo/Messenger? → A: Generic image and title, never the guest name.
- Q: Subdomain? → A: `manh-totnghiep` (or nearest available).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a personal invite and respond (Priority: P1)

A guest (lecturer, family member, friend) opens their private link on phone or PC, sees an invitation card addressed to them with their personal message, the event date/time and meeting point, and answers Yes / No / Maybe with an optional wish.

**Why this priority**: This is the invitation itself. Without it nothing else matters; the game is decoration on top.

**Independent Test**: Seed one guest, open their link on a phone with the journey disabled, verify name + message + event details appear, submit an RSVP, and confirm the host can see the response.

**Acceptance Scenarios**:

1. **Given** a valid invite link, **When** the guest opens it, **Then** they see only their own display name, title and message plus event details.
2. **Given** a guest on the card, **When** they choose an RSVP option and optionally type a wish and submit, **Then** the choice is saved and the card shows their current answer.
3. **Given** a guest who already answered, **When** they change their answer, **Then** the new answer replaces the old one.
4. **Given** an unknown, malformed or missing code, **When** someone opens the link, **Then** they see "Thiệp không hợp lệ" and no information about any guest or whether similar codes exist.

---

### User Story 2 - Get there: calendar and directions (Priority: P1)

From the card, the guest adds the event to their calendar and opens map directions to the host's single fixed meeting point, choosing the most suitable campus gate for how they travel.

**Why this priority**: Parents and lecturers must reliably arrive at the right spot at the right time; this is the practical value of the invite.

**Independent Test**: On iOS and Android, tap "Thêm vào lịch" and "Chỉ đường tới điểm gặp" from the card and verify the calendar entry and the map pin are correct.

**Acceptance Scenarios**:

1. **Given** the card, **When** the guest taps "Thêm vào lịch", **Then** they can add the event via a downloadable calendar file or Google Calendar, with correct local time (Asia/Ho_Chi_Minh), location, description (invite link, meeting tip, gate summary, contact) and reminders before the event.
2. **Given** the card, **When** the guest taps "Chỉ đường tới điểm gặp", **Then** their maps app opens at the meeting point.
3. **Given** the gate helper, **When** the guest views it, **Then** they see Cổng 1 / 2 / 3 each with a photo, a tip, and an "Open Maps" action, plus arrival options (Grab / Xe máy / Ô tô / Đi bộ) and honest notes (Cổng 3 parking fills fast, weekend fee about 3.000đ; Cổng 2 is the shortest walk; Cổng 1 is far from the meeting point).

---

### User Story 3 - First-visit playable journey (Priority: P2)

On first visit, the guest plays a 2–4 minute side-scrolling pixel journey as the host — Gate 2022, Memory hallway, Project alcove, Stage doors, Podium/diploma, Letter — and the letter reveals their personal message before transitioning into the card.

**Why this priority**: It is the delight factor that makes the invite memorable, but the invite works without it.

**Independent Test**: Open a fresh link on PC and on phone, complete the journey using only the provided controls, and confirm it ends on the card with the guest's message shown in the letter.

**Acceptance Scenarios**:

1. **Given** a first visit, **When** the link opens, **Then** the journey starts with a short move/interact tutorial.
2. **Given** the journey, **When** the guest moves (A/D or arrows on PC; on-screen buttons or tap-to-walk on mobile) and interacts (E / Space / click; tap a glowing frame), **Then** memory frames show photo + caption.
3. **Given** any point of the journey, **When** the guest taps "Vào thiệp mời", **Then** they go straight to the card.
4. **Given** a cutscene, **When** the guest taps Skip, **Then** the cutscene ends.
5. **Given** the journey, **Then** there is no combat, no lives, and no obstacle that can block progress.
6. **Given** the host sprite, **When** the guest moves between zones, **Then** the outfit evolves (freshman → student → formal on stage).

---

### User Story 4 - Return visits and replay (Priority: P2)

A guest reopening their link goes straight to the card. They can replay the journey any number of times; every replay ends back on the card.

**Why this priority**: Guests reopen the link on event day to find the time and directions; making them replay would be a barrier.

**Independent Test**: Finish or skip the journey once, reopen the link, verify the card appears immediately, then use "Replay journey" and verify it returns to the card.

**Acceptance Scenarios**:

1. **Given** a guest whose invite is already marked opened, **When** they open the link, **Then** the card appears without the journey.
2. **Given** the card, **When** the guest taps "Replay journey", **Then** the journey plays and ends on the card, and the opened marker does not change.
3. The opened marker is set at most once per guest, and setting it again has no effect.

---

### User Story 5 - Accessible and low-power fallback (Priority: P3)

Guests who prefer reduced motion or are on low-power devices get the same story as stacked chapters (or an auto-walk cinematic) and a flat card without tilt.

**Why this priority**: Keeps the invite usable for every guest, but most guests will get the full experience.

**Independent Test**: Enable "reduce motion" on a phone, open a fresh link, and verify chapters with the same photos/copy lead to a flat card.

**Acceptance Scenarios**:

1. **Given** reduced-motion preference, **When** the link opens, **Then** no tilt or scroll-heavy animation runs and the same content is reachable.
2. **Given** the card on PC, **When** the pointer moves over it, **Then** it tilts; **Given** a phone, **When** the guest drags on it, **Then** it tilts.

---

### User Story 6 - Host manages guests (Priority: P2)

The host creates and edits guests (display name, role, message title/body) and views open status, RSVP and wishes, without redeploying.

**Why this priority**: Each invite must be personalized before sending; RSVPs must be readable.

**Independent Test**: Add a guest via the admin tool, copy their generated link, open it, and verify the new message shows; then see their RSVP in the admin tool.

**Acceptance Scenarios**:

1. **Given** the admin tool, **When** the host adds a guest, **Then** a unique opaque invite code is generated and the shareable link is available.
2. **Given** an edited message, **When** the guest reloads, **Then** the new message appears.

---

### Edge Cases

- Guest forwards the link: the recipient sees the original guest's message (accepted by design).
- Someone tries many codes quickly: lookups are throttled and responses never confirm near-matches.
- Guest closes the tab mid-journey on first visit: see FR-012 for whether the next visit replays or opens the card.
- Audio blocked by browser autoplay rules: journey still works silently; audio starts after first interaction and can be muted.
- Slow mobile connection: card content must be reachable even if game assets are still loading (skip available immediately).
- RSVP submitted twice or while offline: last successful answer wins; the guest sees a clear error if saving failed.
- Event day after the event has ended: link still works, card still displays (no expiry).
- Rotating the phone or a very small screen: journey and card remain usable.
- Guest opens in an in-app browser (Zalo / Messenger / Facebook): calendar and maps actions must still work or offer a fallback (copy details / open in browser).

## Requirements *(mandatory)*

### Functional Requirements

**Access & privacy**

- **FR-001**: Each guest MUST have a unique, opaque, non-guessable invite code; the link format is `/i/{code}`.
- **FR-002**: Guest name and message MUST NOT appear in the URL and MUST only be revealed after a valid code is presented.
- **FR-003**: Invalid or missing codes MUST show "Thiệp không hợp lệ" with no guest enumeration.
- **FR-004**: Code lookups MUST be rate-limited per client.
- **FR-005**: There MUST be no public guest list and links MUST NOT expire or be consumed.

**Card**

- **FR-006**: The card MUST show guest display name, personalized title and message, event title, date/time, meeting point/venue, and host name / major / HCMUT.
- **FR-007**: The card MUST offer: Add to calendar, Directions to meeting point, RSVP, Replay journey, and the gate/parking helper.
- **FR-008**: The card MUST tilt in 3D on pointer move (PC) and touch drag (mobile), and be flat under reduced-motion preference.

**RSVP**

- **FR-009**: Guests MUST be able to answer Yes / No / Maybe with an optional wish, and change their answer later.
- **FR-009a**: A Yes or Maybe answer MUST include exactly one meeting window: 13:30–15:00 or 17:30–18:30. The host can see each guest's chosen window.
- **FR-009b**: RSVP MUST include an optional party size (1–5).
- **FR-009c**: The guest's role MUST only select the default salutation and message template.
- **FR-025**: Shared-link previews (Zalo, Messenger, etc.) MUST be generic and never include the guest's name or message.
- **FR-026**: Audio MUST stay off until the guest's first interaction, and the mute choice MUST be remembered.

**Calendar & directions**

- **FR-010**: Calendar MUST be offered as a downloadable calendar file and as Google Calendar links, with time zone Asia/Ho_Chi_Minh, location, description (invite link, meeting tip, gate summary, contact) and reminders (24 hours and 90 minutes before). Before RSVP both windows are offered; after the guest picks a window, only that window is offered.
- **FR-010a**: Calendar and map actions MUST work inside the Zalo and Messenger in-app browsers, or offer a fallback (open in browser / copy details).
- **FR-011**: Directions MUST open a maps app at the host's single fixed meeting point; each gate card MUST open maps at that gate.

**First / return visit**

- **FR-012**: The system MUST record the first open once (idempotently) and use it only to choose first-visit (journey) vs return-visit (card) experience. It is recorded when the guest first reaches the card (by finishing or skipping the journey); closing the tab mid-journey does not count.
- **FR-012a**: If the guest opened the invite before the journey existed, their next visit MUST show a one-time, skippable prompt to play the new journey; the choice is remembered.
- **FR-013**: Replay MUST be unlimited and always end on the card.
- **FR-014**: "Vào thiệp mời" (skip whole journey), cutscene Skip, and Mute MUST be available throughout the journey.

**Journey**

- **FR-015**: The journey MUST follow Gate 2022 → Memory hallway → Project alcove → Stage doors → Podium/diploma → Letter → Card, take about 2–4 minutes, and contain no combat, lives or precision jumps.
- **FR-016**: Memory content (photos, captions, years) MUST be editable without changing game logic.
- **FR-017**: The Letter scene MUST show this guest's personal message.
- **FR-018**: Under reduced motion or low power, the journey MUST be replaced by stacked chapters or an auto-walk cinematic with the same content, ending on the card.

**Admin**

- **FR-019**: The host MUST be able to create/edit guests and messages and view opened status, RSVP and wishes without redeploying.

**Event facts**

- **FR-020**: Event date/time, meeting point (name + map pin) and walking guidance MUST be configurable without redeploying. Current values: Saturday 28/11/2026, windows 13:30–15:00 and 17:30–18:30; meeting point at the Computer Science faculty building (exact pin to be provided by the host).
- **FR-021**: Gate guidance MUST reflect real logistics: all three gates are open; Cổng 1 far (easy landmark / Grab drop-off, longer walk); Cổng 2 near (shortest walk); Cổng 3 near with parking that fills fast and a weekend fee of about 3.000đ (the event is on a Saturday, so the fee applies).
- **FR-022**: Because guests do not know the meeting building, the card MUST provide step-by-step walking guidance from each gate to the meeting point (photos and text supplied by the host).
- **FR-023**: The card MUST clearly show both meeting windows and state that the host is unavailable 15:00–17:30 because of the ceremony.
- **FR-024**: The card MUST show the host as "Trần Văn Mạnh — Bachelor of Engineering in Computer Science, HCMUT", with contact 0981907003 offered as both a tap-to-call action and a Zalo chat action.

### Key Entities

- **Guest**: one invitee (person or household). Invite code, display name, role (lecturer / family / friend / other), message title, message body, first-opened time, RSVP answer, chosen meeting window (13:30 or 17:30), wish, created/updated times.
- **Memory**: one framed item in the journey. Order, zone, title, caption, image, year.
- **Event**: single configuration. Title, start/end, time zone, meeting point name and pin, maps link, building hint, contact (Zalo/phone), public base URL for links.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid links show only that guest's message; 100% of invalid codes are blocked without revealing guest data.
- **SC-002**: A guest who skips the game can RSVP and add to calendar in under 1 minute on a phone.
- **SC-003**: First visit plays the journey then shows the card; return visit shows the card first; replay ends on the card — verified on iOS Safari, Android Chrome, and desktop Chrome.
- **SC-004**: The card (with event date and meeting point) is visible within 3 seconds of opening the link on a typical 4G phone, even if the journey is still loading.
- **SC-005**: Calendar entries show the correct local time on iPhone, Android and Google Calendar; the directions action lands on the meeting point.
- **SC-006**: Gate tips match real logistics as confirmed by the host.
- **SC-007**: A non-gamer guest can finish the journey using only on-screen controls without getting stuck.

## Assumptions

- One link per invite unit; a household (e.g. "Bố Mẹ") can share one link.
- Content language is Vietnamese.
- The host is the only admin; a database dashboard is acceptable as the admin tool for MVP.
- Memory/project content can be static content for MVP.
- Audio is off until the first user interaction (browser autoplay rules) and can be muted.
- Number of guests is small (tens, not thousands).
- Accepted risk: forwarding a link shares that guest's message.
- Out of scope: guest login, expiry/one-time links, free-roam 3D campus, combat/hard platforming, multiplayer, indoor routing SDK, gyro tilt (later).
