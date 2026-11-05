# Quickstart & Validation: HCMUT Graduation Invitation (Playable)

References: [data-model.md](./data-model.md), [contracts/http-api.md](./contracts/http-api.md), [contracts/journey-bridge.md](./contracts/journey-bridge.md)

## Prerequisites

- Node 22+, pnpm 10+
- Two free Supabase projects: `invite-prod` and `invite-test`
- A Vercel account (Hobby plan), with the project named `manh-totnghiep`

## Setup

```powershell
pnpm install
Copy-Item .env.example .env.local   # fill SUPABASE_URL, SUPABASE_SECRET_KEY, RATE_LIMIT_SALT, CRON_SECRET
pnpm db:migrate                     # applies supabase/migrations to the project in .env.local
pnpm seed:guests -- --file guests.csv   # writes links.csv
pnpm dev                            # http://localhost:3000
```

`guests.csv` columns: `display_name,role,message_title,message_body[,salutation][,invite_code]`. Leave `invite_code` empty for new guests.

## Automated checks

```powershell
pnpm test          # Vitest: calendar builder
pnpm test:e2e      # Playwright (Mobile Chrome + Mobile Safari) against invite-test
```

## Validation scenarios

Each scenario lists the spec items it proves. Run the "📱" ones on a real iPhone and a real Android phone, including once from **inside Zalo**.

| # | Scenario | Expected | Proves |
|---|----------|----------|--------|
| V1 | Open `/i/AAAAAAAAAAAA` and `/i/abc` | Same "Thiệp không hợp lệ" page, 404, no guest data | FR-003, SC-001 |
| V2 | Open 31 unknown codes within 10 minutes from one IP | The 31st shows "Bạn thử lại sau ít phút nhé" (429) | FR-004 |
| V3 | Open a fresh seeded link with `journey_version = 0` | The card appears immediately with the name, message, both time slots and the busy note. `opened_at` is set | FR-006, FR-012, FR-023 |
| V4 📱 | On the card, RSVP Yes, 17:30 slot, party size 2, with a wish. Reload | The answer persists. The calendar now offers only 17:30 | FR-009, FR-009a/b, FR-010 |
| V5 | Change the RSVP to No | The time slot and party size are cleared, and the calendar offers both slots again | FR-009 |
| V6 📱 | Tap "Thêm vào lịch" (calendar file) on iPhone and Android, and Google Calendar on both | 13:30–15:00 or 17:30–18:30 shows on 28/11 in local time, with the location and 2 reminders | FR-010, SC-005 |
| V7 📱 | Open the link inside Zalo and tap "Thêm vào lịch" | The banner offers "open in browser" and "copy details", and Google Calendar works | FR-010a |
| V8 📱 | Tap "Chỉ đường tới điểm gặp", then "Open Maps" on each gate | The maps app opens at the meeting pin or the gate pin | FR-011, FR-021 |
| V9 📱 | Tap the call and Zalo buttons | The dialer opens with 0981907003, and Zalo opens the chat | FR-024 |
| V10 | Share the link in Zalo or Messenger | The preview shows a generic title and image, with no guest name | FR-025 |
| V11 | Set `event.journey_version = 1`, then open a guest that was already opened | The card appears with the one-time "Hành trình mới — chơi thử?" prompt. After answering, it doesn't appear on reload | FR-012a |
| V12 📱 | Open a fresh link with `journey_version = 1` | The journey plays: tutorial, then hallway frames with a photo and caption, stage, diploma, then a letter with this guest's message, then the card | US3, FR-015, FR-017 |
| V13 | During the journey, tap "Vào thiệp mời" within 1 second of load | The card appears, even if Phaser hasn't loaded yet | FR-014, Principle I |
| V14 | Reopen after V12 and tap "Replay journey" | The journey replays and ends on the card. `opened_at` doesn't change | US4, FR-013 |
| V15 📱 | Turn on "Reduce motion" and open a fresh link | Stacked chapters appear instead of the game. The card is flat with no tilt | FR-018, FR-008 |
| V16 | Throttle the network to "Fast 4G" and open a link | The card or the skip button is visible in under 3 seconds | SC-004 |
| V17 📱 | Have a non-gamer finish the journey on a phone with no help | They finish in 2–4 minutes and never get stuck | SC-007 |
| V18 | Edit a guest's message in the Supabase dashboard, then reload their link | The new message shows without a redeploy | FR-019 |
| V19 | View the page source of `/i/{code}`, and search the JavaScript bundles for a guest name | The name appears only in that page's HTML payload, never in `/_next/static` | Principle II |
| V20 | Time a skip → RSVP → add-to-calendar run on a phone | Under 1 minute | SC-002 |
