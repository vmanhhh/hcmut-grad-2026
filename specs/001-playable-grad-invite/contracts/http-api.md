# HTTP Contract

The base URL is `https://manh-totnghiep.vercel.app`. All responses carry `Cache-Control: no-store` except static assets, and every route under `/i` and `/api/invite` sends `X-Robots-Tag: noindex`.

`{code}` must match `^[A-HJ-NP-Za-km-z2-9]{12}$`. A malformed code is treated exactly like an unknown code.

## Common error responses

| Case | Page `/i/{code}` | API |
|------|------------------|-----|
| Unknown or malformed code | 404, "Thiệp không hợp lệ" page | `404 {"error":"invalid_invite"}` |
| Rate limit exceeded (30 lookups / 10 min / IP) | 429, "Bạn thử lại sau ít phút nhé" page | `429 {"error":"rate_limited"}` + `Retry-After` |
| Bad body | — | `400 {"error":"bad_request","field":"…"}` |

The error bodies are identical for every unknown code, and response timing doesn't depend on whether a near-match exists.

---

## `GET /i/{code}` (page)

This is a server-rendered page containing the card and the `InvitePayload` (see [data-model.md](../data-model.md)). Each lookup counts toward the rate limit. `<head>` holds only the generic metadata and preview image.

The `visit` value is decided on the server:

| opened_at | journey_version_seen vs event.journey_version | event.journey_version | visit |
|-----------|-----------------------------------------------|-----------------------|-------|
| null | — | > 0 | `first` (journey overlay) |
| null | — | 0 | `first` (no journey: card, then open is recorded) |
| set | seen < current | > 0 | `return_new_journey` (card + one-time prompt) |
| set | otherwise | — | `return` (card) |

## `POST /api/invite/{code}/open`

The client calls this when the card is first displayed: after the journey ends, after a skip, or right away if there is no journey. It is also called when the guest answers the "new journey" prompt.

- Body: `{}` (empty)
- Effect: `opened_at = coalesce(opened_at, now())` and `journey_version_seen = event.journey_version`
- `200 {"ok":true}`. It is idempotent, so repeated calls change nothing further.

## `POST /api/invite/{code}/rsvp`

```json
{ "rsvp": "yes", "meeting_window": "early", "party_size": 2, "wish": "Chúc mừng em!" }
```

| Field | Rule |
|-------|------|
| rsvp | required: `yes` \| `no` \| `maybe` |
| meeting_window | required when rsvp is `yes`/`maybe`: `early` \| `late`; must be absent/null when `no` |
| party_size | optional integer 1–5; ignored when `no` |
| wish | optional, trimmed, ≤ 500 chars |

- `200 {"ok":true,"rsvp":{…saved values…}}`. The last write wins.
- The card shows the saved answer and switches the calendar actions to the chosen window.

## `GET /api/invite/{code}/calendar.ics[?window=early|late]`

- `200`, with `Content-Type: text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="tot-nghiep-manh.ics"`
- Which windows are included:
  - If `?window=` is given, only that window.
  - Otherwise, if the guest has saved a window, that window.
  - Otherwise both windows.
- Each `VEVENT` has these fields (see research R7):
  - `UID:{code}-{window}@manh-totnghiep`, `DTSTAMP`
  - `DTSTART`/`DTEND` in UTC
  - `SUMMARY:Gặp Mạnh — Lễ tốt nghiệp HCMUT`
  - `LOCATION:{meeting_point_name}, {address}`
  - `DESCRIPTION` with the invite link, meeting tip, gate summary and contact
  - `VALARM` at `-PT24H` and at `-PT90M`

## `GET /api/health`

This is the target of the Vercel cron, which runs daily. It runs `select 1` on the database and deletes stale `rate_limits` rows.

- `200 {"ok":true}`. It is protected by the `Authorization: Bearer ${CRON_SECRET}` header, which Vercel sends automatically for cron jobs.

## Outbound links (built on the client from the payload)

| Action | URL |
|--------|-----|
| Directions to meeting point | `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` |
| Gate on map | `https://www.google.com/maps/search/?api=1&query={lat},{lng}` |
| Google Calendar (per window) | `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates={startZ}/{endZ}&ctz=Asia/Ho_Chi_Minh&location=…&details=…` |
| Call | `tel:+84981907003` |
| Zalo | `https://zalo.me/0981907003` |
| Android in-app → Chrome | `intent://manh-totnghiep.vercel.app/i/{code}#Intent;scheme=https;package=com.android.chrome;end` |
