# Implementation Plan: HCMUT Graduation Invitation (Playable)

**Branch**: `001-playable-grad-invite` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-playable-grad-invite/spec.md`

## Summary

This is a secret-link invitation for Trần Văn Mạnh's HCMUT graduation (Saturday 28/11/2026, with meeting slots at 13:30–15:00 and 17:30–18:30 at the Computer Science faculty building).

A single Next.js 16 app on Vercel server-renders a personalized, tiltable invite card. The card has RSVP (with a choice of time slot), calendar actions (calendar file plus Google Calendar), maps directions, a gate and parking guide, and call and Zalo buttons. Guest data lives in Supabase Postgres and is reached only from server code.

A Phaser 4 side-scrolling journey loads lazily as an overlay on top of the already-rendered card. It always ends on the card, can be skipped from the first frame, and is replaced by stacked chapters under reduced motion.

Delivery happens in two releases:
- **A**: the card only (`journey_version = 0`). Links go out about 12/11.
- **B**: the journey ships (`journey_version = 1`), about 22/11. Guests who already opened their link get a one-time prompt to play it.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 22 (Vercel runtime), React 19.3

**Primary Dependencies**: next 16.4, phaser 4.2 (fallback 3.90), @supabase/supabase-js 2.x, nanoid 6, Tailwind CSS 4, zod (request validation)

**Storage**: Supabase Postgres (free tier) for `guests`, `event`, `gates` and `rate_limits`. Supabase Storage (public bucket `gates/`) holds the gate and walking photos. Static `content/memories.json` and `public/memories/` hold the journey photos.

**Testing**: Playwright 1.64 (Mobile Chrome + Mobile Safari projects) for the critical flows; Vitest for the calendar builder. Tests run against the `invite-test` Supabase project.

**Target Platform**: Mobile web first: iOS Safari 16+, Android Chrome, and the Zalo / Messenger in-app browsers. Desktop Chrome, Edge and Safari second.

**Project Type**: A single full-stack web app (Next.js App Router, with route handlers as the API).

**Performance Goals**:
- The card is visible within 3 seconds on 4G.
- The first-load JavaScript for the card, excluding the game, stays under about 120 KB gzipped.
- The journey runs at 60 fps on mid-range phones (at least 30 fps on low-end ones).
- The game chunk plus initial assets total under about 2.5 MB.

**Constraints**:
- No guest data in URLs, static bundles, `<head>` or logs.
- Free tier only, on a `*.vercel.app` subdomain.
- Every font needs Vietnamese diacritics (research R10).
- The event is 2026-11-28 and cannot move.

**Scale/Scope**: About 50–150 guests, 1 event, 3 gates, 6 memories, 1 game with 6 zones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How the design complies | Status |
|-----------|-------------------------|--------|
| I. Card First, Always Reachable | The card is server-rendered on every visit. The journey is an overlay loaded with a client-only dynamic import. Skip, Mute and Skip-cutscene are host-owned HTML. If the game hasn't loaded within 8 seconds, the card shows instead (journey-bridge contract). | ✅ |
| II. Guest Privacy by Design | RLS is on with no policies, and the service-role key is server-only. The page is `no-store` and `noindex`. Guest fields are only in the `/i/[code]` response. The preview is generic. Codes have about 70 bits of randomness and lookups are rate-limited. There's a source-and-bundle check (quickstart V19). | ✅ |
| III. Mobile First | Mobile Playwright projects, 44px touch targets, touch-drag tilt, the in-app browser fallback (R8), and the reduced-motion and low-power chapters fallback. | ✅ |
| IV. Critical-Flow Tests Only | End-to-end tests cover valid vs invalid links, first vs return visits, the new-journey prompt, RSVP save and change, and skip-to-card. A Vitest suite covers the calendar file. Everything else is checked by hand using quickstart.md. | ✅ |
| V. Simple and Shippable | One app, one DB, no extra services. The Supabase dashboard is the admin tool. Memories are static. Two releases protect the date. | ✅ |
| Constraints (free tier, Vietnamese, editable event facts) | Vercel Hobby plus Supabase free tier, with a daily keep-alive cron (R4). Content is in Vietnamese with fonts checked for diacritics. The event and gates are DB rows. | ✅ |

**Post-design re-check (after Phase 1)**: ✅ No violations. The second Supabase project (`invite-test`) holds test data only, isn't a runtime service, and doesn't need a justification entry.

## Project Structure

### Documentation (this feature)

```text
specs/001-playable-grad-invite/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R17
├── data-model.md        # Phase 1: tables, constraints, public payload
├── quickstart.md        # Phase 1: setup + validation scenarios V1–V20
├── contracts/
│   ├── http-api.md      # Page + API routes + outbound links
│   └── journey-bridge.md# React ↔ Phaser boundary
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                  # fonts (vietnamese subsets), generic metadata
├── page.tsx                    # bare root → "Thiệp không hợp lệ"-style landing (no guest data)
├── opengraph-image.png         # generic preview (R14)
├── globals.css                 # Tailwind + dark/gold tokens from the prototype
├── i/[code]/
│   ├── page.tsx                # server: rate-limit → lookup → visit decision → <InviteExperience>
│   └── not-found.tsx           # "Thiệp không hợp lệ"
└── api/
    ├── invite/[code]/open/route.ts
    ├── invite/[code]/rsvp/route.ts
    ├── invite/[code]/calendar.ics/route.ts
    └── health/route.ts         # cron keep-alive + rate_limits cleanup

components/
├── InviteExperience.tsx        # client: decides overlay vs card, calls /open
├── card/                       # InviteCard, TiltCard, RsvpForm, CalendarActions,
│                               # DirectionsPanel, GateCard, WalkSteps, ContactActions,
│                               # InAppBrowserBanner, NewJourneyPrompt
└── journey/                    # JourneyHost (dynamic import, skip/mute HTML), ChaptersFallback

game/                           # Phaser 4, client-only
├── index.ts                    # startJourney() per journey-bridge contract
├── scenes/                     # Boot, Hallway, Stage, Letter
└── ui/                         # touch controls, interact prompts

lib/
├── supabase-server.ts          # service-role client ("server-only")
├── invites.ts                  # getInvite, markOpened, saveRsvp, visit decision
├── rate-limit.ts               # wraps check_rate_limit() RPC
├── calendar.ts                 # buildIcs(), googleCalendarUrl()
├── links.ts                    # maps, tel, zalo, intent URLs
├── salutation.ts               # role → default salutation/title
├── user-agent.ts               # in-app browser detection
└── types.ts                    # InvitePayload, Memory, Gate

content/memories.json
public/memories/  public/game/  (sprites, tiles, audio, CREDITS.md)

supabase/
├── migrations/0001_init.sql    # enums, tables, constraints, RLS on, check_rate_limit()
└── seed.sql                    # event row + 3 gates (placeholders)

scripts/seed-guests.ts          # guests.csv → upsert + codes → links.csv

tests/
├── e2e/                        # invite-access, visits, rsvp, skip
└── unit/calendar.test.ts

prototype/index.html            # existing prototype, kept for visual reference
```

**Structure Decision**: This is a single Next.js app at the repository root. Server-only modules live in `lib/` behind the `server-only` import, so they can't end up in a client bundle. The Phaser code is kept in `game/` and touches React only through `startJourney()`. The existing `index.html` moves to `prototype/` and the card reuses its dark and gold design tokens. Its sticker yearbook and dress-code picker are not carried over.

## Delivery Phases (for /speckit-tasks)

1. **Foundation**: repo + git init, Next.js scaffold, Supabase migration and seed, `seed-guests` script, invalid/valid link handling, rate limit.
2. **Release A (US1, US2, US6), about 12/11**: card UI and tilt, RSVP with time slot and party size, calendar (calendar file and Google), maps, call and Zalo, gate cards with walking steps (placeholders), in-app browser banner, generic preview, health cron, critical-flow tests. Then send the links.
3. **Release B (US3, US4, US5), about 22/11**: Phaser journey (hallway, memories, project, stage, diploma, letter), touch and keyboard controls, audio and mute, skip and replay, chapters fallback, `journey_version = 1`, the new-journey prompt.
4. **Polish**: real gate photos and pin, art and audio, device pass (quickstart V1–V20).

## Open Inputs from the Host (not blocking the plan)

| Input | Needed by | Blocks |
|-------|-----------|--------|
| Meeting point exact spot + map pin | ~12/11 | Directions accuracy (placeholder until then) |
| Gate pins + walking photos/text per gate | ~20/11 | Gate step content (placeholders until then) |
| 5 hallway photos (2022–2026) + 1 project photo, captions | ~14/11 | Journey content |
| Guest list (`guests.csv`) with messages | before release A | Sending links |
| Photo / description of your look per outfit (freshman, student, formal) | ~13/11 | Custom host sprite |

## Complexity Tracking

No constitution violations, so this section is empty.
