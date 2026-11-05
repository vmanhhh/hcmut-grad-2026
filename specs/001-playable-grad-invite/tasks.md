---

description: "Task list for HCMUT Graduation Invitation (Playable)"
---

# Tasks: HCMUT Graduation Invitation (Playable)

**Input**: Design documents from `/specs/001-playable-grad-invite/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, contracts/journey-bridge.md, quickstart.md, `.specify/memory/constitution.md`

**Tests**: Constitution Principle IV — critical-flow tests only. Playwright (Mobile Chrome = Pixel 7, Mobile Safari = iPhone 14) against the `invite-test` Supabase project covers valid vs invalid link, first vs return visit, the new-journey prompt, RSVP save/change and skip-to-card. Vitest covers the calendar builder. Everything else is validated by hand against quickstart.md scenarios V1–V20. No TDD for other code.

**Organization**: Tasks are grouped by user story and ordered by **release**, not strictly by priority:

- **Release A (~12/11/2026)** — card only, `event.journey_version = 0`: US1, US2, US6 → deploy → device validation → **send links**.
- **Release B (~22/11/2026)** — journey: US3, US4, US5 → `event.journey_version = 1`.
- Event day is fixed: Saturday 28/11/2026.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US6)
- **HOST INPUT**: Content the host (Trần Văn Mạnh) must provide; the code ships with placeholders until then
- Include exact file paths in descriptions

## Path Conventions

Single Next.js 16 app at the repository root (see plan.md → Project Structure): `app/`, `components/`, `game/`, `lib/`, `content/`, `public/`, `supabase/`, `scripts/`, `tests/`, `prototype/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository, toolchain and external accounts

- [ ] T001 Initialize the repository at the repo root: run `git init`; create `.gitignore` covering `node_modules/`, `.next/`, `.vercel/`, `.env*` (with `!.env.example`), `guests.csv`, `links.csv`, `test-results/`, `playwright-report/`, and secret-bearing files under `.cursor/` (e.g. `.cursor/mcp.json`; review `.cursor/` for tokens before the first commit — keep `.cursor/skills/` only if it holds no secrets); move the existing `index.html` to `prototype/index.html`; make the first commit with the user's own git identity only
- [ ] T002 Scaffold a Next.js 16.4 App Router + TypeScript + React 19.3 app at the repo root with pnpm 10 (`package.json`, `tsconfig.json`, `next.config.ts`, `app/`), set `"engines": { "node": ">=22" }`, and remove the scaffold boilerplate pages/assets
- [ ] T003 Add dependencies and scripts in `package.json`: `next@16.4`, `react@19.3`, `phaser@4.2`, `@supabase/supabase-js@2`, `nanoid@6`, `zod`, `server-only`; dev: `tailwindcss@4`, `@tailwindcss/postcss`, `vitest`, `@playwright/test@1.64`, `tsx`, `supabase` (CLI); scripts `dev`, `build`, `start`, `test` (vitest run), `test:e2e` (playwright test), `db:migrate`, `seed:guests` (tsx scripts/seed-guests.ts)
- [ ] T004 [P] Configure Tailwind CSS 4 (`postcss.config.mjs`) and port the dark + gold design tokens (colors, radii, shadows) from `prototype/index.html` into `app/globals.css`; do NOT port the sticker yearbook or dress-code picker
- [ ] T005 [P] Create `.env.example` listing `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL` (for migrations), `RATE_LIMIT_SALT`, `CRON_SECRET` with comments that all are server-only (never `NEXT_PUBLIC_`)
- [ ] T006 [P] Create `vitest.config.ts` (node environment, `tests/unit/**`) and `playwright.config.ts` with projects `Mobile Chrome` (Pixel 7) and `Mobile Safari` (iPhone 14, WebKit), `webServer: pnpm dev`, env loaded from `.env.test`, `globalSetup: tests/e2e/global-setup.ts`
- [ ] T007 Create two free Supabase projects `invite-prod` and `invite-test`, run `supabase init` (creates `supabase/config.toml`), create the Vercel Hobby project `manh-totnghiep` (`vercel link`), and fill the gitignored `.env.local` (prod) and `.env.test` (test) from `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, server-only data access, rate limiting, visit decision, and the `/i/{code}` valid/invalid shell that every story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Write `supabase/migrations/0001_init.sql` part 1: enums `guest_role` (lecturer|family|friend|other), `rsvp_answer` (yes|no|maybe), `meeting_window` (early|late), `gate_distance` (far|near); tables `guests` (all fields per data-model.md, `invite_code` unique + check `^[A-HJ-NP-Za-km-z2-9]{12}$`, length checks 80/120/2000/500, `party_size` 1–5, the three RSVP consistency checks, `journey_version_seen int default 0`), `event` singleton (`check (id = 1)`, `windows jsonb`, `journey_version int default 0`), `gates` (text PK, `best_for text[]`, `steps jsonb default '[]'`), `rate_limits` (PK `key, window_start`); `updated_at` trigger on `guests` and `event`
- [ ] T009 Write `supabase/migrations/0001_init.sql` part 2: `alter table … enable row level security` on all four tables with **no policies**; `check_rate_limit(key text, max int, window_s int) returns boolean` (fixed window upsert on `rate_limits`, returns false when count > max); revoke execute from `anon`/`authenticated`
- [ ] T010 [P] Write `supabase/seed.sql`: event row id=1 with title "Lễ tốt nghiệp — Trần Văn Mạnh", host_name "Trần Văn Mạnh", host_degree "Bachelor of Engineering in Computer Science", host_school "HCMUT — Trường ĐH Bách khoa, ĐHQG-HCM", contact_phone "0981907003", address "268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh", meeting_point_name "Tòa nhà Khoa Khoa học và Kỹ thuật Máy tính", placeholder meeting_lat/lng (HCMUT CS1 campus centre), windows `early` 2026-11-28T13:30–15:00+07:00 and `late` 17:30–18:30+07:00, busy_note "15:00–17:30 mình ở trong lễ, chưa gặp được nha", timezone "Asia/Ho_Chi_Minh", public_base_url "https://manh-totnghiep.vercel.app", journey_version 0; gates `cong-1` (sort 2, far, "Dễ tìm, hợp Grab — đi bộ xa hơn"), `cong-2` (sort 1, near, "Gần nhất, đi bộ ngắn"), `cong-3` (sort 3, near, "Gần, có bãi xe", parking_note "Bãi xe dễ hết chỗ — tới sớm; cuối tuần ~3.000đ. Hết chỗ → Cổng 1 hoặc Grab"), each with `best_for`, placeholder lat/lng, null photo_url, empty steps; use `on conflict do update` so it is re-runnable
- [ ] T011 Implement `pnpm db:migrate` in `package.json` (Supabase CLI `supabase db push --db-url $SUPABASE_DB_URL --include-seed`) and apply `supabase/migrations/0001_init.sql` + `supabase/seed.sql` to both `invite-test` and `invite-prod`; verify in the dashboard that anon reads return nothing
- [ ] T012 [P] Define `InvitePayload`, `GuestPublic`, `EventPublic`, `MeetingWindow`, `Gate`, `GateStep`, `Memory` and `Visit` (`first` | `return` | `return_new_journey`) types in `lib/types.ts` exactly per data-model.md → Public payload (no `id`, `role`, `opened_at`, timestamps)
- [ ] T013 [P] Create the service-role Supabase client in `lib/supabase-server.ts` with `import "server-only"`, reading `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, `auth: { persistSession: false }`
- [ ] T014 [P] Implement role → default salutation and title templates (lecturer / family / friend / other, with `{display_name}` substitution; `salutation` column overrides) in `lib/salutation.ts`
- [ ] T015 Implement `checkRateLimit(bucket: "page" | "api", ip)` in `lib/rate-limit.ts`: key = `sha256(RATE_LIMIT_SALT + ip) + ":" + bucket`, calls the `check_rate_limit` RPC with 30 / 600 s, reads IP from `x-forwarded-for` / `x-real-ip`, never logs the IP or code (depends on T013)
- [ ] T016 Implement in `lib/invites.ts` (`server-only`): `isValidCode()` (regex from contracts/http-api.md), `getInvite(code)` (guest + event + gates sorted by `sort_order`, single round-trip where possible), `toPayload()` (whitelisted fields only, salutation via `lib/salutation.ts`), and `decideVisit(opened_at, journey_version_seen, event.journey_version)` implementing the table in contracts/http-api.md; malformed codes short-circuit to "not found" without a DB query that could leak timing differences (depends on T012–T014)
- [ ] T017 [P] Set up fonts in `app/layout.tsx` via `next/font/google` with `subsets: ['vietnamese','latin']`: VT323 (game/pixel UI), Space Grotesk (headings), Plus Jakarta Sans (body), Dancing Script (letter) — NOT Caveat; expose them as CSS variables; add generic site metadata (title "Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026", `lang="vi"`) with no guest fields
- [ ] T018 [P] Add `headers()` in `next.config.ts`: `Cache-Control: no-store` and `X-Robots-Tag: noindex` for `/i/:path*` and `/api/invite/:path*`
- [ ] T019 [P] Create the bare root landing in `app/page.tsx` ("Thiệp không hợp lệ"-style message, no guest data, no list of guests)
- [ ] T020 [P] Create the invalid invite page in `app/i/[code]/not-found.tsx` showing "Thiệp không hợp lệ" with identical output for every unknown/malformed code
- [ ] T021 Enforce the page lookup rate limit in `proxy.ts` (Next 16 proxy, matcher `/i/:path*`): call `checkRateLimit("page", ip)` and return a `429` HTML response "Bạn thử lại sau ít phút nhé" with `Retry-After` when exceeded (App Router pages cannot set a 429 status themselves) (depends on T015)
- [ ] T022 Implement the server page shell in `app/i/[code]/page.tsx`: `dynamic = "force-dynamic"`, `isValidCode` → `getInvite` → `notFound()` on miss → `toPayload` + `decideVisit` → render a temporary payload view; `generateMetadata` returns only generic metadata (depends on T016, T020, T021)
- [ ] T023 Create `tests/e2e/global-setup.ts` that resets the `invite-test` database to known fixtures via the service-role key from `.env.test`: guests `fresh` (opened_at null), `opened` (opened_at set, journey_version_seen 0), `answered` (rsvp yes, late, party 2), each with a fixed valid code and a unique display name; event `journey_version` set per test file via an exported helper `setJourneyVersion(n)`

**Checkpoint**: A valid fixture link renders its payload, an invalid one shows "Thiệp không hợp lệ", the 31st lookup returns 429 — user story work can begin

---

## Phase 3: User Story 1 — Open a personal invite and respond (Priority: P1) 🎯 MVP — Release A

**Goal**: A guest opens `/i/{code}`, sees a dark + gold tiltable card addressed to them (salutation, title, message, event, both windows, busy note, meeting point, host line), and answers Yes / No / Maybe with window, party size and wish; the first open is recorded.

**Independent Test**: Seed one guest with `journey_version = 0`, open the link on a phone, verify name + message + event details, submit an RSVP, reload, and see the answer persisted in the Supabase dashboard (quickstart V1, V3, V4, V5).

### Tests for User Story 1 (critical flows only)

- [ ] T024 [P] [US1] Write `tests/e2e/invite-access.spec.ts`: valid fixture code shows only its own display name/message and no other fixture's name; `/i/AAAAAAAAAAAA` and `/i/abc` return 404 with identical "Thiệp không hợp lệ" body; `/` shows no guest data; page `<head>` contains no guest name
- [ ] T025 [P] [US1] Write `tests/e2e/rsvp.spec.ts`: on `fresh` with `journey_version = 0`, RSVP Yes + late + party 2 + wish → reload → answer persists; change to No → window and party size cleared; Yes without window is blocked with a visible error

### Implementation for User Story 1

- [ ] T026 [US1] Add `markOpened(code)` (`opened_at = coalesce(opened_at, now())`, `journey_version_seen = event.journey_version`, idempotent) and `saveRsvp(code, input)` with a zod `RsvpSchema` (window required for yes/maybe, forced null for no; party_size 1–5 ignored for no; wish trimmed ≤ 500; sets `rsvp_at`) in `lib/invites.ts`
- [ ] T027 [P] [US1] Implement `POST` in `app/api/invite/[code]/open/route.ts`: `checkRateLimit("api")` → 429 `{"error":"rate_limited"}` + `Retry-After`; invalid/unknown → 404 `{"error":"invalid_invite"}`; else `markOpened` → `200 {"ok":true}` (depends on T026)
- [ ] T028 [P] [US1] Implement `POST` in `app/api/invite/[code]/rsvp/route.ts`: rate limit, code check, zod parse → `400 {"error":"bad_request","field":…}`, `saveRsvp` → `200 {"ok":true,"rsvp":{…}}` (depends on T026)
- [ ] T029 [P] [US1] Build `components/card/TiltCard.tsx`: CSS 3D `perspective` + `rotateX/Y` up to ±12° from pointer move (PC) and touch drag (mobile, `touch-action` tuned so vertical page scroll still works), spring back on release, completely flat under `prefers-reduced-motion` (FR-008)
- [ ] T030 [P] [US1] Build `components/card/RsvpForm.tsx`: Yes / No / Maybe, window radio (13:30–15:00 / 17:30–18:30) shown and required for Yes/Maybe, party size 1–5 stepper, wish textarea (≤ 500), submit to `/api/invite/{code}/rsvp`, shows the current saved answer, clear error message on failure/offline (last successful answer stays), 44px targets; exposes `onSaved(rsvp)` to the parent
- [ ] T031 [US1] Build `components/card/InviteCard.tsx`: salutation, message title/body, event title, date "Thứ Bảy 28/11/2026", both windows plus busy note (FR-023), meeting point name + address, host line "Trần Văn Mạnh — Bachelor of Engineering in Computer Science, HCMUT" (FR-024), RSVP section, and named slots for calendar/directions/contact/replay actions; wrapped in `TiltCard`; Vietnamese copy; portrait-first layout
- [ ] T032 [US1] Build the client shell `components/InviteExperience.tsx` (Release A mode): receives `InvitePayload`, renders `InviteCard`, holds RSVP state, and calls `POST /api/invite/{code}/open` once on mount when `visit === "first"` and `event.journey_version === 0` (FR-012)
- [ ] T033 [US1] Replace the temporary view in `app/i/[code]/page.tsx` with `<InviteExperience payload={…} />`, passing only the whitelisted payload
- [ ] T034 [US1] Mobile pass on `components/card/*.tsx` and `app/globals.css`: 44px touch targets, 360px-wide portrait and landscape layouts, Vietnamese diacritics render in all four fonts; manually verify quickstart V1, V3, V4 (RSVP part), V5

**Checkpoint**: US1 works end to end with `journey_version = 0`; `tests/e2e/invite-access.spec.ts` and `tests/e2e/rsvp.spec.ts` pass on both mobile projects

---

## Phase 4: User Story 2 — Get there: calendar and directions (Priority: P1) — Release A

**Goal**: From the card the guest adds the event to their calendar (.ics or Google, filtered by chosen window), opens directions to the meeting point, picks a gate (photo, tip, Open Maps, walking steps), sees arrival options, can call or Zalo the host, and gets a fallback inside Zalo/Messenger.

**Independent Test**: On iOS and Android, tap "Thêm vào lịch" and "Chỉ đường tới điểm gặp" from the card and verify the calendar entry (local time, location, 2 reminders) and the map pin (quickstart V6–V9).

### Tests for User Story 2 (critical flows only)

- [ ] T035 [P] [US2] Write `tests/unit/calendar.test.ts` (Vitest): early window → `DTSTART:20261128T063000Z` / `DTEND:20261128T080000Z`, late → `20261128T103000Z` / `20261128T113000Z`; two `VALARM`s `-PT24H` and `-PT90M` per event; `UID:{code}-{window}@manh-totnghiep`; CRLF line endings, line folding at 75 octets and escaping of `,;\n` in Vietnamese text; window selection (query param > saved window > both); Google URL has `dates=…Z/…Z` and `ctz=Asia/Ho_Chi_Minh`

### Implementation for User Story 2

- [ ] T036 [P] [US2] Implement `lib/calendar.ts`: `selectWindows(windows, saved, query)`, `buildIcs({ event, code, windows, gates })` (one `VEVENT` per window, UTC times, `SUMMARY:Gặp Mạnh — Lễ tốt nghiệp HCMUT`, `LOCATION:{meeting_point_name}, {address}`, `DESCRIPTION` with invite link, meeting tip, gate summary and contact, two `VALARM`s), and `googleCalendarUrl(window, …)` per research R7 — pure functions, no server-only imports
- [ ] T037 [P] [US2] Implement `lib/links.ts`: `mapsDirections(lat,lng)`, `mapsSearch(lat,lng)`, `telLink("0981907003")` → `tel:+84981907003`, `zaloLink` → `https://zalo.me/0981907003`, `androidChromeIntent(url)` per contracts/http-api.md → Outbound links
- [ ] T038 [P] [US2] Implement `lib/user-agent.ts`: `detectInAppBrowser(ua)` → `{ inApp: boolean, app: "zalo" | "messenger" | "facebook" | null, os: "ios" | "android" | "other" }` matching `Zalo`, `FBAN`, `FBAV`, `FB_IAB`, `Messenger`
- [ ] T039 [US2] Implement `GET` in `app/api/invite/[code]/calendar.ics/route.ts`: rate limit, code check, `?window=early|late` validation (400 otherwise), window selection, `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: attachment; filename="tot-nghiep-manh.ics"` (depends on T036)
- [ ] T040 [P] [US2] Build `components/card/CalendarActions.tsx`: "Thêm vào lịch" .ics link plus one Google Calendar button per offered window (both before RSVP, only the chosen window after); in an in-app browser make Google Calendar the primary action (depends on T036, T038)
- [ ] T041 [P] [US2] Build `components/card/ContactActions.tsx`: tap-to-call and Zalo chat buttons for 0981907003 using `lib/links.ts` (FR-024)
- [ ] T042 [P] [US2] Build `components/card/WalkSteps.tsx`: ordered step list (photo + text) from `gate.steps`, with a friendly placeholder ("Mạnh sẽ cập nhật hướng dẫn đi bộ sớm") when the array is empty or a photo is null
- [ ] T043 [US2] Build `components/card/GateCard.tsx`: gate name, distance badge, headline, parking note, `best_for` icons, photo (placeholder when `photo_url` is null), "Open Maps" via `mapsSearch`, and expandable `WalkSteps` (depends on T042)
- [ ] T044 [US2] Build `components/card/DirectionsPanel.tsx`: primary "Chỉ đường tới điểm gặp" button (`mapsDirections`), arrival options Grab / Xe máy / Ô tô / Đi bộ that highlight matching gates, gate list in `sort_order` (Cổng 2 first) with honest notes per FR-021 (Cổng 1 far, Cổng 3 parking fills fast + ~3.000đ weekend fee) (depends on T043)
- [ ] T045 [P] [US2] Build `components/card/InAppBrowserBanner.tsx`: when `detectInAppBrowser` is in-app, show "Để tải lịch về máy, mở bằng trình duyệt" with the Android `intent://` link or the iOS instruction "⋯ → Mở bằng Safari", plus "Sao chép thông tin" (copies date, chosen or both windows, address) with a clipboard fallback (FR-010a)
- [ ] T046 [P] [US2] Create the public Supabase Storage bucket `gates` in `invite-prod` and `invite-test` and document the upload path convention `gates/{gate-id}/{n}.jpg` in a comment at the top of `supabase/seed.sql`
- [ ] T047 [US2] Integrate `CalendarActions`, `DirectionsPanel`, `ContactActions` and `InAppBrowserBanner` into `components/card/InviteCard.tsx` and pass saved RSVP state from `components/InviteExperience.tsx` so the calendar switches to the chosen window immediately after saving
- [ ] T048 [US2] Manually verify quickstart V6 (.ics on iPhone + Android, Google Calendar), V7 (inside Zalo), V8 (meeting pin + each gate, placeholders acceptable), V9 (call + Zalo) on a local tunnel or preview deployment

**Checkpoint**: US1 + US2 make a complete, practical invite; `pnpm test` passes

---

## Phase 5: User Story 6 — Host manages guests (Priority: P2) — Release A

**Goal**: The host keeps `guests.csv` locally, runs `pnpm seed:guests` to upsert guests and generate codes, gets `links.csv` with Zalo-ready messages, and edits/reads guests and RSVPs in the Supabase table editor without redeploying.

**Independent Test**: Add a row to `guests.csv`, run the script against `invite-test`, open the generated link, see the message; edit it in the dashboard, reload, see the change; submit an RSVP and see it in the dashboard (quickstart V18).

### Implementation for User Story 6

- [ ] T049 [P] [US6] Create a committed sample `guests.example.csv` with header `display_name,role,message_title,message_body,salutation,invite_code` and 3 fake rows (one per role), no real guest data
- [ ] T050 [US6] Implement CSV parsing and validation in `scripts/seed-guests.ts`: `--file` and `--env` (`.env.local` default, `.env.test` option) flags, quoted multi-line `message_body` support, zod validation matching DB constraints, empty `message_title` falls back to the role template from `lib/salutation.ts`; abort with row numbers on any error
- [ ] T051 [US6] Add code generation and upsert to `scripts/seed-guests.ts`: `nanoid` `customAlphabet` over the code alphabet `[A-HJ-NP-Za-km-z2-9]`, length 12, for rows without `invite_code`; upsert on `invite_code` (never touching `opened_at`, RSVP fields); write generated codes back into the `invite_code` column of the input CSV so reruns are idempotent
- [ ] T052 [US6] Add output to `scripts/seed-guests.ts`: write gitignored `links.csv` with `display_name,link,zalo_message` where link = `{event.public_base_url}/i/{code}` and the message is a short, warm Vietnamese text ready to paste into Zalo (salutation + one line + link); print a summary (new / updated / unchanged)
- [ ] T053 [US6] Run the independent test against `invite-test` and verify quickstart V18 (dashboard edit → reload shows new message without redeploy)

**Checkpoint**: The host can personalize and generate every link; Release A feature set is complete

---

## Phase 6: Release A — Ship the card and send links (~12/11/2026)

**Purpose**: Cross-cutting Release A work, critical-flow test run, privacy/performance gates, production deploy, device validation, and sending links

- [ ] T054 [P] Add the generic 1200×630 preview `app/opengraph-image.png` (title "Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026", dark + gold) and `openGraph`/`twitter` metadata in `app/layout.tsx`; confirm `/i/[code]` inherits it without guest fields (FR-025)
- [ ] T055 [P] Implement `GET` in `app/api/health/route.ts`: require `Authorization: Bearer ${CRON_SECRET}` (401 otherwise), run a trivial query, delete `rate_limits` rows older than 1 day, return `200 {"ok":true}`
- [ ] T056 Add `vercel.json` with a daily cron for `/api/health` (Hobby-compatible schedule, e.g. `0 20 * * *`) (depends on T055)
- [ ] T057 Run `pnpm test` and `pnpm test:e2e` (both Mobile Chrome and Mobile Safari) against `invite-test` with `journey_version = 0`; fix failures in the owning files under `app/`, `components/`, `lib/`
- [ ] T058 Privacy check (quickstart V19) on a `pnpm build` output: view source of `/i/{code}` and search `.next/static/**` for fixture guest names and messages — they appear only in that page's HTML payload; confirm no guest data in URLs, `<head>`, server logs (`console.*` in `lib/` and `app/api/`) or the bundled client code
- [ ] T059 Performance check (quickstart V16): under "Fast 4G" throttling the card is visible in < 3 s; first-load JS for `/i/[code]` from the `pnpm build` report is ≤ ~120 KB gzipped
- [ ] T060 HOST INPUT (due ~12/11): obtain the exact meeting spot + map pin and meeting tip; update `meeting_lat`, `meeting_lng`, `meeting_note` (and name if needed) on the `event` row in `invite-prod` via the dashboard, and mirror the values in `supabase/seed.sql`
- [ ] T061 Deploy to Vercel production (`manh-totnghiep`): set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SALT`, `CRON_SECRET` as server env vars, run `pnpm db:migrate` against `invite-prod`, confirm `event.journey_version = 0`, the cron is registered and `/api/health` returns 200 for the cron call
- [ ] T062 HOST INPUT (due before Release A): finalize `guests.csv` (display names, roles, personal titles and messages) — gitignored, never committed
- [ ] T063 Device validation on production with one temporary test guest: quickstart V1–V10, V18 and V20 on a real iPhone (Safari), a real Android (Chrome) and inside Zalo; record results in the PR/commit message; delete the test guest from `invite-prod` afterwards
- [ ] T064 🚀 CHECKPOINT — SEND LINKS: run `pnpm seed:guests -- --file guests.csv` against `invite-prod`, spot-check 2–3 links from `links.csv` on a phone, send the Zalo messages from `links.csv`, and tag the commit `release-a`

**Checkpoint**: Release A is live and links are out. Everything after this point must keep the card behavior unchanged.

---

## Phase 7: User Story 3 — First-visit playable journey (Priority: P2) — Release B

**Goal**: On first visit (with `journey_version > 0`) a 2–4 minute Phaser side-scroller plays as an overlay on top of the already-rendered card — Gate 2022 → Memory hallway → Project alcove → Stage doors → Podium/diploma → Letter — and ends on the card. "Vào thiệp mời", Skip-cutscene and Mute are host-owned HTML available from the first frame.

**Independent Test**: With `journey_version = 1`, open a fresh link on PC and on a phone, finish the journey using only provided controls, and confirm it ends on the card with this guest's message shown in the letter (quickstart V12, V13, V17).

### Tests for User Story 3 (critical flows only)

- [ ] T065 [P] [US3] Write `tests/e2e/skip.spec.ts`: with `setJourneyVersion(1)` and the `fresh` fixture, the journey overlay appears; tapping "Vào thiệp mời" within 1 s (before Phaser loads, by blocking the game chunk route) shows the card and triggers exactly one `POST /open`; a blocked game chunk falls back to the card within ~8 s

### Implementation for User Story 3

- [ ] T066 [P] [US3] Create `content/memories.json` with 5 hallway placeholders (2022–2026) + 1 project placeholder (images in `public/memories/placeholder-*.png`) and `scripts/validate-content.ts` (zod `Memory` schema: zone, sort_order, year 2022–2026, title ≤ 40, caption ≤ 160, image exists under `public/memories/`) wired as `prebuild` in `package.json`
- [ ] T067 [P] [US3] HOST INPUT (due ~10/11): select the itch.io pixel-art asset packs (tiles, campus props, parallax backgrounds, UI frames); place files under `public/game/` and record name, author, URL and license for each in `public/game/CREDITS.md`
- [ ] T068 [P] [US3] HOST INPUT (due ~13/11): collect photo/description references for the three outfits (freshman, student, formal); produce the custom host sprite sheet `public/game/sprites/host.png` (idle + walk frames per outfit) and add it to `public/game/CREDITS.md`
- [ ] T069 [P] [US3] HOST INPUT (due ~14/11): collect 5 hallway photos (2022–2026) + 1 project photo with titles and captions; optimize (WebP, ≤ 200 KB each) into `public/memories/` and replace the placeholders in `content/memories.json` (no game-logic change, FR-016)
- [ ] T070 [P] [US3] Add a royalty-free chiptune loop and 3–4 sound effects (step, interact, diploma, letter) under `public/game/audio/` and credit them in `public/game/CREDITS.md`
- [ ] T071 [US3] Implement `startJourney(parent, input, cb)` in `game/index.ts` per contracts/journey-bridge.md: Phaser 4.2 `Game` with `pixelArt: true`, Scale `FIT` at 480×270, arcade physics; await `document.fonts.load('16px VT323')` and the Dancing Script face before starting; scene order Boot → Hallway → Stage → Letter; guarantee `onFinish` is called exactly once; return a handle with `destroy()` plus `setMuted(muted)` and `skipCutscene()` for the host-owned HTML controls
- [ ] T072 [P] [US3] Implement `game/scenes/Boot.ts`: preload sprites, tiles, memory images from the `JourneyInput.memories` paths and audio; emit load progress; reject on load error so the host can fall back
- [ ] T073 [P] [US3] Implement `game/ui/TouchControls.ts` (on-screen ◀ ▶ buttons ≥ 44 px plus tap-to-walk toward the tapped x) and keyboard input (A/D, ←/→)
- [ ] T074 [P] [US3] Implement `game/ui/InteractPrompt.ts`: glowing frame highlight when in range, interact via E / Space / click / tap on the frame, and the photo + caption popup with close
- [ ] T075 [US3] Implement `game/scenes/Hallway.ts`: Gate 2022 zone with the short move/interact tutorial, Memory hallway with 5 framed memories, Project alcove with 1 memory; parallax; outfit freshman → student by zone; `onZone("gate"|"hallway"|"project")`; no combat, lives, fail states or required jumps (FR-015) (depends on T072–T074)
- [ ] T076 [US3] Implement `game/scenes/Stage.ts`: Stage doors and Podium/diploma cutscene in the formal outfit, skippable via `skipCutscene()`; `onZone("stage"|"diploma")` (depends on T075)
- [ ] T077 [US3] Implement `game/scenes/Letter.ts`: letter showing this guest's `letter.salutation`, `title`, `body` (Dancing Script, wrapped for 480×270, scrollable if long) and a "Vào thiệp mời" ending that calls `onFinish("completed")`; `onZone("letter")` (FR-017) (depends on T076)
- [ ] T078 [US3] Add audio handling in `game/index.ts`: no sound until the first pointer/key input (audio unlock), music + effects respect `input.muted`, `setMuted` toggles the Phaser sound manager and calls `onMuteChange` (FR-026)
- [ ] T079 [US3] Build `components/journey/JourneyHost.tsx`: full-screen overlay above the rendered card; HTML "Vào thiệp mời", Skip-cutscene and Mute buttons visible from the first frame; client-only `import("@/game")` after hydration; 8 s load timeout and chunk/asset errors → `onFinish("skipped")`; mute choice read from and saved to `localStorage`; on finish destroy the game, remove the overlay and notify the parent with the reason
- [ ] T080 [US3] Extend `components/InviteExperience.tsx`: when `visit === "first"` and `event.journey_version > 0`, mount `JourneyHost` (mode `"play"`, letter from payload, memories from `content/memories.json`) over the card; on finish (completed or skipped) remove the overlay and call `POST /api/invite/{code}/open` once (FR-012, FR-014)
- [ ] T081 [US3] Verify with `pnpm build` that Phaser and `game/` are in a separate lazy chunk (not in `/i/[code]` first-load JS) and that the game chunk + initial assets total ≤ ~2.5 MB; manually verify quickstart V12, V13 and a first V17 run with a non-gamer

**Checkpoint**: First-visit journey works and always lands on the card; `tests/e2e/skip.spec.ts` passes

---

## Phase 8: User Story 4 — Return visits and replay (Priority: P2) — Release B

**Goal**: Return visitors go straight to the card; "Replay journey" plays any number of times and always ends on the card without changing `opened_at`; guests who opened during Release A see a one-time, skippable "Hành trình mới — chơi thử?" prompt.

**Independent Test**: Finish or skip once, reopen → card immediately; tap "Replay journey" → returns to the card; with `journey_version = 1`, an `opened` guest sees the prompt once and not after answering (quickstart V11, V14).

### Tests for User Story 4 (critical flows only)

- [ ] T082 [P] [US4] Write `tests/e2e/visits.spec.ts`: `fresh` + `journey_version = 1` → overlay; after skip, reload → card with no overlay; `opened` (seen 0) + `journey_version = 1` → card + "Hành trình mới — chơi thử?" prompt; answer "Không" → reload shows no prompt; replay does not change `opened_at` (checked via service-role query)

### Implementation for User Story 4

- [ ] T083 [P] [US4] Build `components/card/NewJourneyPrompt.tsx`: one-time, dismissible prompt "Hành trình mới — chơi thử?" with "Chơi thử" and "Để sau" (44 px targets); emits `onPlay` / `onDismiss`
- [ ] T084 [US4] Add a "Replay journey" action to `components/card/InviteCard.tsx`, shown only when `event.journey_version > 0` (FR-007, FR-013)
- [ ] T085 [US4] Extend `components/InviteExperience.tsx`: `return` → card only; `return_new_journey` → card + `NewJourneyPrompt`, either choice calls `POST /open` (sets `journey_version_seen`) and "Chơi thử" mounts `JourneyHost`; replay mounts `JourneyHost` with mode `"replay"` and never calls `/open`; every run ends on the card
- [ ] T086 [US4] Manually verify quickstart V11 and V14

**Checkpoint**: First, return, new-journey prompt and replay flows all work; `tests/e2e/visits.spec.ts` passes

---

## Phase 9: User Story 5 — Accessible and low-power fallback (Priority: P3) — Release B

**Goal**: Under reduced motion or on low-power devices the journey is replaced by stacked chapters with the same photos and letter, ending on a flat card.

**Independent Test**: Enable "Reduce motion" on a phone, open a fresh link with `journey_version = 1`, and verify chapters with the same photos/copy lead to a flat card (quickstart V15).

### Implementation for User Story 5

- [ ] T087 [P] [US5] Build `components/journey/ChaptersFallback.tsx`: stacked chapters Gate 2022 → Hallway → Project → Stage → Diploma → Letter using `content/memories.json` and the guest's letter, no scroll-driven or heavy animation, "Vào thiệp mời" always visible and at the end, calls the same `onFinish` contract
- [ ] T088 [US5] Add device detection to `components/journey/JourneyHost.tsx`: `prefers-reduced-motion: reduce`, `navigator.hardwareConcurrency <= 2` or `navigator.deviceMemory <= 2` → render `ChaptersFallback` instead of importing Phaser (FR-018) (depends on T087)
- [ ] T089 [P] [US5] Add a global `@media (prefers-reduced-motion: reduce)` block in `app/globals.css` that disables transitions/animations on the card and prompt
- [ ] T090 [US5] Manually verify quickstart V15 on iPhone and Android (chapters shown, card flat with no tilt)

**Checkpoint**: All six user stories are functional

---

## Phase 10: Release B — Ship the journey (~22/11/2026)

**Purpose**: Gate and flip `journey_version` to 1 without breaking the live card

- [ ] T091 Run `pnpm test` and `pnpm test:e2e` (all four spec files, both mobile projects) against `invite-test`, covering `journey_version` 0 and 1
- [ ] T092 Re-run the privacy check (quickstart V19) including the `game/` chunk and `content/memories.json` output in `.next/static/**` — no guest names or messages
- [ ] T093 Re-run the performance check (quickstart V16) with the journey enabled: card or "Vào thiệp mời" visible in < 3 s on Fast 4G; journey ~60 fps on a mid-range phone and ≥ 30 fps on a low-end one
- [ ] T094 Deploy a Vercel preview that uses `invite-test` env vars with `journey_version = 1` and run device validation quickstart V11–V17 on a real iPhone, a real Android and inside Zalo
- [ ] T095 Deploy Release B to production, then set `update event set journey_version = 1 where id = 1;` in `invite-prod` via the dashboard (no redeploy needed); spot-check one already-opened guest sees the prompt once and one fresh guest gets the journey; tag the commit `release-b`

**Checkpoint**: Release B is live

---

## Phase 11: Polish & Cross-Cutting Concerns (20–27/11/2026)

**Purpose**: Final real content, full regression and pre-event operations

- [ ] T096 HOST INPUT (due ~20/11): collect per-gate pins and walking photos/text; upload photos to the Supabase Storage bucket `gates/` and update `lat`, `lng`, `photo_url` and `steps` on the `gates` rows in `invite-prod` via the dashboard (no redeploy); mirror the non-photo values in `supabase/seed.sql`
- [ ] T097 Confirm with the host that every gate tip, parking note and arrival recommendation in the `gates` rows matches real logistics (SC-006), and re-verify quickstart V8 with the real pins
- [ ] T098 [P] Final art and audio polish in `game/scenes/*.ts` and `public/game/`, and verify `public/game/CREDITS.md` lists every third-party asset and license
- [ ] T099 Full regression of quickstart V1–V20 on production with a temporary test guest on iPhone Safari, Android Chrome, desktop Chrome and inside Zalo/Messenger; delete the test guest afterwards
- [ ] T100 Pre-event operations (22–27/11): confirm the daily `/api/health` cron ran in the Vercel logs and the Supabase project is not paused, review RSVPs and chosen windows in the `guests` table, and update `event.meeting_note` / `busy_note` if plans change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (T001 first, then T002 → T003; T004–T006 in parallel; T007 any time before Phase 2)
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational; T047 integrates into `InviteCard` from US1 (T031/T032)
- **US6 (Phase 5)**: Depends on Foundational only (schema + `lib/salutation.ts`); can run in parallel with US1/US2
- **Release A ship (Phase 6)**: Depends on US1, US2, US6; T060 and T062 are host inputs that gate T064
- **US3 (Phase 7)**: Depends on Release A being live (so the card is frozen) and on host inputs T067–T069; code tasks can start on placeholders before the inputs arrive
- **US4 (Phase 8)**: Depends on US3 (`JourneyHost`, `startJourney`)
- **US5 (Phase 9)**: Depends on US3's `JourneyHost` (T079); independent of US4
- **Release B ship (Phase 10)**: Depends on US3, US4, US5
- **Polish (Phase 11)**: T096/T097 can run as soon as gate inputs arrive (even before Release B); T099/T100 last

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P1)**: After Foundational — integrates into US1's card (T047) but its libraries and components are independent
- **US6 (P2)**: After Foundational — independent
- **US3 (P2)**: After Foundational technically; scheduled after Release A
- **US4 (P2)**: Needs US3
- **US5 (P3)**: Needs US3's `JourneyHost`; the tilt/flat-card part of US5 acceptance (FR-008) is delivered in US1 (T029)

### Host-Provided Inputs (tracked as tasks)

| Task | Input | Due | Unblocks |
|------|-------|-----|----------|
| T067 | itch.io asset pack selection | ~10/11 | Journey art (T072–T077) |
| T060 | Meeting spot + map pin | ~12/11 | Accurate directions before sending links |
| T068 | Outfit references (freshman / student / formal) | ~13/11 | Custom host sprite |
| T069 | 5 hallway photos + 1 project photo + captions | ~14/11 | Real memory content |
| T062 | `guests.csv` with messages | Before Release A | T064 send links |
| T096 | Gate pins + walking photos/text | ~20/11 | Real gate cards (V8, SC-006) |

### Within Each User Story

- Critical-flow tests are written alongside the story and must pass at its checkpoint (no TDD requirement)
- `lib/` modules before API routes before components before integration in `InviteExperience`
- Story complete and checkpoint validated before moving on

### Parallel Opportunities

- Setup: T004, T005, T006 together after T003
- Foundational: T010 alongside T008/T009; T012, T013, T014 together; T017, T018, T019, T020 together
- US1: T024 + T025 (tests), T027 + T028 (routes after T026), T029 + T030 (components)
- US2: T035, T036, T037, T038 together; then T040, T041, T042, T045, T046 together
- US6 runs fully in parallel with US1/US2 (different files: `scripts/seed-guests.ts`, `guests.example.csv`)
- Release A: T054 + T055 together; host inputs T060/T062 run in the background
- US3: content/asset tasks T066–T070 in parallel with each other and with code; T072, T073, T074 together after T071
- US4 and US5 can proceed in parallel once T079 is done (US4 touches `InviteExperience`/`InviteCard`/`NewJourneyPrompt`; US5 touches `ChaptersFallback`/`JourneyHost`/`globals.css`)

---

## Parallel Example: User Story 1

```text
# After T026 (lib/invites.ts) is done:
Task: "T027 Implement POST in app/api/invite/[code]/open/route.ts"
Task: "T028 Implement POST in app/api/invite/[code]/rsvp/route.ts"
Task: "T029 Build components/card/TiltCard.tsx"
Task: "T030 Build components/card/RsvpForm.tsx"

# Tests, any time after Foundational:
Task: "T024 Write tests/e2e/invite-access.spec.ts"
Task: "T025 Write tests/e2e/rsvp.spec.ts"
```

## Parallel Example: User Story 2

```text
Task: "T035 Write tests/unit/calendar.test.ts"
Task: "T036 Implement lib/calendar.ts"
Task: "T037 Implement lib/links.ts"
Task: "T038 Implement lib/user-agent.ts"
# then
Task: "T040 Build components/card/CalendarActions.tsx"
Task: "T041 Build components/card/ContactActions.tsx"
Task: "T042 Build components/card/WalkSteps.tsx"
Task: "T045 Build components/card/InAppBrowserBanner.tsx"
```

## Parallel Example: User Story 3

```text
# Content and assets (host-dependent) alongside engine work:
Task: "T066 content/memories.json placeholders + scripts/validate-content.ts"
Task: "T070 Audio under public/game/audio/"
# After T071 (game/index.ts):
Task: "T072 game/scenes/Boot.ts"
Task: "T073 game/ui/TouchControls.ts"
Task: "T074 game/ui/InteractPrompt.ts"
```

---

## Implementation Strategy

### MVP First (Release A = Setup + Foundational + US1 + US2 + US6)

1. Phase 1 Setup → Phase 2 Foundational (valid/invalid link, rate limit)
2. Phase 3 US1 → **STOP and VALIDATE** (card + RSVP on a phone) — this alone is a usable invite
3. Phase 4 US2 (calendar, directions, gates with placeholders, contact, in-app banner)
4. Phase 5 US6 (seed script) — can overlap with steps 2–3
5. Phase 6: tests, V19 privacy, V16 performance, deploy, device validation, **send links (T064)** — target ~12/11

### Incremental Delivery

1. Release A (~12/11): card-only invite, `journey_version = 0`, links sent
2. Release B (~22/11): US3 journey → US4 return/replay/prompt → US5 fallback → flip `journey_version = 1`
3. Polish (20–27/11): real gate pins/photos, full V1–V20 regression, pre-event ops
4. Each release leaves the card working; if Release B slips, Release A remains a complete invite and `journey_version` simply stays 0

### Solo Developer Strategy

1. Days 05–07/11: Phases 1–2 and T026–T028
2. Days 08–10/11: rest of US1, US2; US6 in gaps; pick asset packs (T067)
3. Days 10–12/11: Phase 6 → send links
4. Days 12–20/11: US3, then US4 and US5
5. Days 20–22/11: Phase 10 → Release B; 22–27/11: Phase 11

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps a task to its user story for traceability
- HOST INPUT tasks are owned by the host; code never waits on them thanks to placeholders
- Commit after each task or logical group with the user's own git identity
- Never commit `guests.csv`, `links.csv` or any `.env*` file other than `.env.example`
