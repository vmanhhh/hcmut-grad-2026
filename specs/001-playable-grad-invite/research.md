# Research: HCMUT Graduation Invitation (Playable)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-11-05

Versions checked against npm on 2026-11-05: next 16.4.5, react 19.3.1, phaser 4.2.1, @supabase/supabase-js 2.119.0, @playwright/test 1.64.1, nanoid 6.0.2. Local toolchain: Node 22.16, pnpm 10.11.

## R1. Web shell

- **Decision**: Next.js 16 (App Router, TypeScript, React 19), Tailwind CSS, deployed on Vercel Hobby as project `manh-totnghiep`.
- **Rationale**: One app serves the server-rendered card, the API routes and the lazy-loaded game. Vercel gives a free HTTPS subdomain, and its daily cron is enough for the keep-alive (R4).
- **Alternatives**: A static site with Supabase called directly from the browser was rejected because it would expose the guest table to the browser (Principle II). Separate frontend and backend projects were rejected (Principle V).

## R2. Rendering strategy (card first)

- **Decision**: `/i/[code]` is a dynamic server component (`no-store`, `noindex`). It looks up the guest on the server and renders the full card HTML on every visit. On a first visit, the journey is a full-screen overlay mounted **on top of** an already-rendered card. Its code (Phaser and assets) is loaded with a client-only dynamic import after hydration. "Vào thiệp mời" is plain HTML in the overlay and works before the game loads.
- **Rationale**: The card is visible within the first response (SC-004), and skipping only removes the overlay. The guest payload exists only in that page's server response, never in a static bundle.
- **Alternatives**: Client-side fetching after load (a slower card and a loading state) and a separate `/play` route (a navigation that loses state) were rejected.

## R3. Game engine

- **Decision**: Phaser **4.2** (current stable), with arcade physics only, `pixelArt: true` and Scale Manager `FIT` at a fixed internal resolution (e.g. 480×270). There is one scene per zone group: Boot, Hallway (Gate → Memory → Project), Stage (Stage doors → Podium/diploma) and Letter.
- **Rationale**: The spec named Phaser 3, but 4.x is the maintained line and its core API (scenes, arcade, input, loader) is largely the same. Everything this journey needs (side-scrolling, parallax, tweens, particles) is core.
- **Fallback**: If an asset-pack or plugin incompatibility shows up, pin `phaser@3.90` and keep the same scene code. This is low risk because there are no third-party plugins.
- **Alternatives**: Kaboom/Kaplay (smaller, but weaker scaling and input on mobile) and hand-written canvas code (too slow to build in 2 weeks) were rejected.

## R4. Database and keeping it alive

- **Decision**: Supabase Postgres (free tier). RLS is **enabled with no policies** on every table, so the anonymous and authenticated roles can read nothing. Server code uses the secret (service-role) key from server-only env vars. A Vercel cron calls `/api/health` once a day, which runs a trivial query.
- **Rationale**: Free Supabase projects are paused after about a week without activity. A paused database would break every invite near the event, and the daily query prevents that.
- **Alternatives**: Vercel Postgres/Neon would also work, but the Supabase table editor is the admin tool the host wants (Q14).

## R5. Rate limiting code lookups

- **Decision**: A Postgres function `check_rate_limit(key text, max int, window_s int)` with a fixed window over a `rate_limits` table. The key is a hash of the client IP plus a salt. Limit: 30 code lookups per 10 minutes per IP. Above the limit, the page shows "Bạn thử lại sau ít phút nhé".
- **Rationale**: This needs no extra service (Principle V). With 12-character codes (R6) brute force is already infeasible; the limit just blocks noisy scanning.
- **Alternatives**: Upstash Redis was rejected as an extra service, and in-memory limiting doesn't work across serverless instances.

## R6. Invite code format

- **Decision**: 12 characters from a 57-character alphabet with no ambiguous characters (no `0 O 1 l I`), generated with `nanoid` `customAlphabet`. That gives about 70 bits of randomness. Example: `/i/k7Qx2mZp9RtW`.
- **Rationale**: Short enough to look tidy in Zalo messages and impossible to guess. Unknown and malformed codes return the same response (no enumeration).

## R7. Calendar

- **Decision**: A hand-built iCalendar file (`text/calendar`, served as an attachment named `tot-nghiep-manh.ics`). It contains one `VEVENT` per offered window, with times in **UTC** (`20261128T063000Z` is 13:30 at +07). Each event has a `UID` of `{code}-{window}@manh-totnghiep`, two `VALARM`s (`-PT24H`, `-PT90M`), the location (meeting point plus the full address), and a description with the invite link, meeting tip, gate summary and contact. Google Calendar uses `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…Z/…Z&ctz=Asia/Ho_Chi_Minh&location=…&details=…`, one link per window. Before an RSVP, the calendar file has both events and there are two Google buttons. After the guest picks a window, only that one is offered.
- **Rationale**: Vietnam has no daylight saving time, and UTC avoids bundling a `VTIMEZONE`. Building the file by hand is about 50 lines and is easy to unit-test.
- **Alternatives**: The `ics` npm package works too, but it's an extra dependency for a tiny format.

## R8. In-app browsers (Zalo, Messenger, Facebook)

- **Decision**: Detect them from the user agent (`Zalo`, `FBAN`, `FBAV`, `FB_IAB`, `Messenger`). When detected:
  - Google Calendar becomes the main calendar action, because it works as a web page.
  - A banner says "Để tải lịch về máy, mở bằng trình duyệt".
    - On Android it uses an `intent://…#Intent;scheme=https;package=com.android.chrome;end` link.
    - On iOS it shows the instruction "⋯ → Mở bằng Safari".
  - There is also a "Sao chép thông tin" button that copies the date, the time slot and the address.
- **Rationale**: Most links will be opened from Zalo, and in-app web views often ignore `.ics` downloads (FR-010a).

## R9. Maps, phone and Zalo links

- **Decision**:
  - Meeting point: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.
  - Each gate: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`.
  - Call: `tel:+84981907003`.
  - Zalo: `https://zalo.me/0981907003`.
- **Rationale**: Google Maps universal links open the app on both iOS and Android, and fall back to the web otherwise.

## R10. Fonts (Vietnamese diacritics)

Checked against the Google Fonts metadata:

| Use | Font | Vietnamese subset |
|-----|------|-------------------|
| Game text / pixel UI | **VT323** (alternative: Tiny5) | yes |
| Card headings | Space Grotesk | yes |
| Card body | Plus Jakarta Sans | yes |
| Letter handwriting | **Dancing Script** (alternatives: Patrick Hand, Pangolin) | yes |
| ~~Caveat~~ (used in the prototype) | — | **no**: it drops diacritics, so it's replaced |
| Pixelify Sans, Silkscreen, Press Start 2P | — | no: don't use them |

- **Decision**: Load the fonts with `next/font/google` and `subsets: ['vietnamese','latin']`. Phaser text uses VT323 and only starts after `document.fonts.load('16px VT323')` resolves.

## R11. Card tilt

- **Decision**: CSS 3D transforms (`perspective` and `rotateX/Y` up to ±12°) driven by pointer events. Touch-drag tilts on mobile, and the card springs back on release. It's disabled under `prefers-reduced-motion`. No library is used.
- **Alternatives**: `motion` (it adds weight for one effect) and Three.js (far too heavy for mobile, which goes against Principle III) were rejected.

## R12. First visit, return visit and journey versioning

- **Decision**: `event.journey_version` (0 = no journey yet, 1 = first game release) and `guests.journey_version_seen`. When the card is first reached, set `opened_at` once (only if it is null) and set `journey_version_seen = event.journey_version`. What the guest sees on load:
  - `opened_at` is null and `journey_version > 0`: the journey overlay plays.
  - `opened_at` is null and `journey_version = 0`: the card, then the open is recorded.
  - `opened_at` is set and `journey_version_seen < journey_version`: the card plus the one-time prompt "Hành trình mới — chơi thử?". Either choice sets the version as seen.
  - Otherwise: the card.
- **Rationale**: This lets links go out before the game exists (R6 of the grill) and still guarantees that every guest is offered the journey once.

## R13. Content and assets

- **Decision**:
  - Memories (5 hallway photos plus 1 project photo) live in `content/memories.json`, with images in `public/memories/`. These are static and not guest data.
  - Event facts and gate guidance live in DB tables so they can be edited without redeploying.
  - Gate and walking-step photos go in a public Supabase Storage bucket `gates/`.
  - Pixel art comes from itch.io packs (licenses are recorded in `public/game/CREDITS.md`), plus one custom host sprite with 3 outfit frames.
  - Audio is a royalty-free chiptune loop and 3–4 sound effects. It's unlocked on first input, and the mute choice is stored in `localStorage`.

## R14. Link preview

- **Decision**: One static `opengraph-image.png` (1200×630) with the title "Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026". The same metadata is used on every route, and `/i/[code]` never puts guest fields in `<head>`.

## R15. Testing

- **Decision**:
  - Playwright end-to-end tests with projects for `Mobile Chrome` (Pixel 7) and `Mobile Safari` (iPhone 14, WebKit). They cover valid and invalid links, first and return visits, the new-journey prompt, saving and changing an RSVP, and skip-to-card.
  - Vitest unit tests for the calendar builder: times, UTC, alarms, and which windows are included.
  - Tests run against a **second free Supabase project** (`invite-test`) with fixture guests, so production data is never touched and Docker isn't needed.
- **Rationale**: This follows Principle IV. Everything else is checked by hand using quickstart.md on real phones.

## R16. Admin workflow

- **Decision**: The host keeps `guests.csv` locally (gitignored) and runs `pnpm seed:guests`, which upserts guests, creates codes for new rows, and writes `links.csv` with each full link and a ready-to-paste Zalo message. Edits and RSVP review happen in the Supabase table editor. A small `/admin` page is post-MVP.

## R17. Delivery timeline

| Date | Milestone |
|------|-----------|
| 05–07/11 | Scaffold, DB schema, seed script, invalid/valid link, RSVP |
| 08–10/11 | Card UI, tilt, calendar, maps, contact, in-app browser fallback |
| 10–12/11 | Gate cards and walking steps (placeholders until the host sends photos) → **links can go out (release A, journey_version 0)** |
| 12–20/11 | Phaser journey: hallway, memories, stage, diploma, letter, skip, audio, chapters fallback |
| 20–22/11 | Polish, device testing → **release B (journey_version 1)** |
| 22–27/11 | Buffer; final gate photos; RSVP review |
