# Data Model: HCMUT Graduation Invitation (Playable)

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

All tables have RLS enabled with **no policies**, and only server code with the service-role key can access them (Principle II).

## guests

One invite unit (a person or a household).

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| invite_code | text | unique, not null, `^[A-HJ-NP-Za-km-z2-9]{12}$` (R6) |
| display_name | text | not null, 1–80 chars (e.g. "Thầy Hùng", "Bố Mẹ") |
| role | enum `guest_role` | `lecturer` \| `family` \| `friend` \| `other` |
| salutation | text | optional override; otherwise derived from role (below) |
| message_title | text | not null, ≤ 120 chars |
| message_body | text | not null, ≤ 2000 chars |
| opened_at | timestamptz | null until the card is first reached; set once |
| journey_version_seen | int | default 0 |
| rsvp | enum `rsvp_answer` | null \| `yes` \| `no` \| `maybe` |
| meeting_window | enum `meeting_window` | null \| `early` (13:30–15:00) \| `late` (17:30–18:30) |
| party_size | smallint | null or 1–5 |
| wish | text | null or ≤ 500 chars |
| rsvp_at | timestamptz | last RSVP save |
| created_at, updated_at | timestamptz | default now(); `updated_at` maintained by trigger |

**Constraints**

- `rsvp in ('yes','maybe')` ⇒ `meeting_window is not null` (FR-009a)
- `rsvp = 'no'` ⇒ `meeting_window is null and party_size is null`
- `rsvp is null` ⇒ `meeting_window`, `party_size` and `wish` are null

**Default salutation by role** (FR-009c, kept in code):

| role | salutation | default title template |
|------|------------|------------------------|
| lecturer | "Kính gửi {display_name}" | "Trân trọng kính mời {display_name}" |
| family | "{display_name} thương" | "Con mời {display_name} tới dự" |
| friend | "Gửi {display_name}" | "Tới chung vui với mình nha!" |
| other | "Gửi {display_name}" | "Thân mời {display_name}" |

**State transitions**

```text
opened_at:            null ──(card first reached)──▶ timestamp   (never changes again)
journey_version_seen: n ──(card reached / prompt answered)──▶ event.journey_version
rsvp:                 null ──▶ yes|no|maybe ──▶ yes|no|maybe …   (last write wins)
```

## event (singleton)

One row, `id = 1` (enforced with `check (id = 1)`).

| Field | Type | Current value / note |
|-------|------|----------------------|
| id | smallint | 1 |
| title | text | "Lễ tốt nghiệp — Trần Văn Mạnh" |
| host_name | text | "Trần Văn Mạnh" |
| host_degree | text | "Bachelor of Engineering in Computer Science" |
| host_school | text | "HCMUT — Trường ĐH Bách khoa, ĐHQG-HCM" |
| contact_phone | text | "0981907003" (used for `tel:` and `zalo.me`) |
| address | text | "268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh" |
| meeting_point_name | text | "Tòa nhà Khoa Khoa học và Kỹ thuật Máy tính" (placeholder until the pin is sent) |
| meeting_lat, meeting_lng | double precision | placeholder; host sets real pin |
| meeting_note | text | walking/meeting tip; filled later |
| windows | jsonb | `[{"id":"early","starts_at":"2026-11-28T13:30:00+07:00","ends_at":"2026-11-28T15:00:00+07:00"},{"id":"late","starts_at":"2026-11-28T17:30:00+07:00","ends_at":"2026-11-28T18:30:00+07:00"}]` |
| busy_note | text | "15:00–17:30 mình ở trong lễ, chưa gặp được nha" |
| timezone | text | "Asia/Ho_Chi_Minh" |
| public_base_url | text | "https://manh-totnghiep.vercel.app" |
| journey_version | int | 0 at release A; 1 when the journey ships (R12) |
| updated_at | timestamptz | |

The `windows[].id` values must match the `meeting_window` enum.

## gates

Gate guidance cards (FR-021, FR-022). Editable in the dashboard.

| Field | Type | Seed |
|-------|------|------|
| id | text | PK: `cong-1`, `cong-2`, `cong-3` |
| sort_order | smallint | 2, 1, 3. Cổng 2 is shown first because it's the shortest walk |
| name | text | "Cổng 1" / "Cổng 2" / "Cổng 3" |
| distance | enum `gate_distance` | `far` / `near` / `near` |
| headline | text | 1: "Dễ tìm, hợp Grab — đi bộ xa hơn" · 2: "Gần nhất, đi bộ ngắn" · 3: "Gần, có bãi xe" |
| parking_note | text | 3: "Bãi xe dễ hết chỗ — tới sớm; cuối tuần ~3.000đ. Hết chỗ → Cổng 1 hoặc Grab" |
| best_for | text[] | subset of `grab`, `xe_may`, `o_to`, `di_bo` |
| lat, lng | double precision | host provides |
| photo_url | text | Supabase Storage `gates/…` or null (placeholder shown) |
| steps | jsonb | `[{"photo_url": "...", "text": "..."}]`; empty until host sends walking guidance |

## rate_limits

| Field | Type | Rules |
|-------|------|-------|
| key | text | PK part: `sha256(salt + ip)` + bucket name |
| window_start | timestamptz | PK part |
| count | int | incremented by `check_rate_limit()` |

Rows older than 1 day are deleted by the daily health cron.

## Memory (static content, not in DB)

`content/memories.json`, validated at build time:

```text
Memory {
  id: string
  zone: "gate" | "hallway" | "project" | "stage"
  sort_order: number
  year: number            // 2022–2026
  title: string           // ≤ 40 chars (fits frame label)
  caption: string         // ≤ 160 chars
  image: string           // path under /public/memories/
}
```

Expected content: 5 hallway memories (2022–2026) and 1 project memory.

## Public payload (what reaches the browser)

Only these fields are serialized into `/i/[code]`:

```text
InvitePayload {
  code
  guest: { display_name, salutation, message_title, message_body, rsvp, meeting_window, party_size, wish }
  visit: "first" | "return" | "return_new_journey"
  event: { title, host_name, host_degree, host_school, contact_phone, address,
           meeting_point_name, meeting_lat, meeting_lng, meeting_note, windows, busy_note, journey_version }
  gates: Gate[]
}
```

`id`, `role`, `opened_at` and timestamps are never sent.
