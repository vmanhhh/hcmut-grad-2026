# Specification Analysis Report — 001-playable-grad-invite

Run by Claude (Sonnet 5.5) in `grad-claude/` (copy of `grad/`). Read-only: spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/*, constitution.md were not modified.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Coverage / Inconsistency | HIGH | spec FR-010; research R7; tasks T036, T040 | FR-010 requires 24h + 90min reminders on calendar entries, but the Google Calendar `render?action=TEMPLATE` URL cannot set reminders. Only the .ics path has `VALARM`. | Relax FR-010 to "reminders in the .ics file; Google link uses the calendar's default reminder", or make .ics the primary action and say so on the card. |
| I1 | Inconsistency | MEDIUM | contracts/http-api.md (30 / 10 min / IP); T015, T021 | Contract and R5 define one limit for "code lookups". T015 applies the same 30/600 limit to a separate `api` bucket (open, rsvp, calendar.ics). Guests behind one carrier NAT or venue Wi-Fi share an IP. | Give the `api` bucket a higher limit, or key it by code + IP. Update the contract to state both buckets. |
| I2 | Underspecification | MEDIUM | T021, FR-025 | Zalo / Messenger link-preview crawlers fetch `/i/{code}` from a few shared IPs. When the host sends 50–150 links in a session, the page limit can return 429. The 429 page has no OG tags, so the preview breaks. | Exempt known crawler user-agents from the page limit (they only see generic metadata), or raise the limit for them. |
| U1 | Underspecification | MEDIUM | FR-010a; T045 | FR-010a covers calendar and maps actions in in-app browsers, but T045 only handles the calendar download plus "copy details". No explicit fallback or verification for the maps link inside Zalo. | Add the maps check to T048 (V7) and include the maps URL in the "Sao chép thông tin" payload. |
| D1 | Constitution (soft) | LOW | Constitution IV; T065, T082 | Principle IV lists critical flows. `skip.spec` and the new-journey-prompt test in `visits.spec` are arguably covered by "first vs return" and "skip-to-card", but the prompt test is an extension. | Note in the plan that the prompt test belongs to "first vs return visit". |
| T1 | Terminology drift | LOW | plan Project Structure vs tasks | `proxy.ts` (T021), `vercel.json` (T056), `guests.example.csv` (T049) and `scripts/validate-content.ts` (T066) appear in tasks but not in plan.md's structure. Spec Key Entities omits Gate and rate_limits. | Add them to the plan structure. Optional for the spec. |
| T2 | Terminology drift | LOW | tasks vs data-model | `SUPABASE_SECRET_KEY` (tasks) vs "service-role key" (plan, data-model). | Pick one term. |
| A1 | Ambiguity | LOW | plan Performance Goals | "about 120 KB", "about 2.5 MB", "60 fps on mid-range" are approximate. T059, T081 and T093 do give measurement steps. | Acceptable. Could state hard limits. |

No CRITICAL findings. No constitution MUST violations (I–V and Constraints all pass the check).

## Coverage Summary

| Requirement | Has task? | Task IDs |
|-------------|-----------|----------|
| FR-001..005 access, privacy, rate limit | Yes | T008, T009, T015, T016, T018, T020–T022, T024, T058 |
| FR-006, FR-007, FR-008 card | Yes | T029, T031, T043, T044, T084 |
| FR-009, 009a, 009b, 009c RSVP | Yes | T026, T028, T030, T014, T025 |
| FR-010 calendar | Partial (reminders on Google, see C1) | T035, T036, T039, T040 |
| FR-010a in-app browsers | Partial (maps, see U1) | T038, T045 |
| FR-011 directions | Yes | T037, T043, T044 |
| FR-012, 012a first/return | Yes | T016, T026, T032, T080, T085, T082 |
| FR-013, 014 replay, skip, mute | Yes | T079, T084, T085 |
| FR-015..018 journey, fallback | Yes | T071–T078, T087, T088 |
| FR-019, 020 admin, event facts | Yes | T049–T053, T010, T060 |
| FR-021..024 gates, windows, host | Yes | T010, T031, T041–T044 |
| FR-025 generic preview | Yes | T054, T022 (see I2) |
| FR-026 audio | Yes | T078, T079 |
| SC-001..007 | Yes (mostly manual, via quickstart V1–V20) | T057–T059, T063, T081, T093, T099 |

## Unmapped Tasks

None. Every task maps to a user story, a foundation item or a release gate.

## Metrics

- Functional requirements: 29 (FR-001..026 plus 009a/b/c, 010a, 012a)
- Success criteria: 7
- Tasks: 100
- Requirement coverage: 29 / 29 have at least one task (2 partial)
- Critical: 0 · High: 1 · Medium: 3 · Low: 4
- Ambiguity: 1 · Duplication: 0

## Next Actions

- No CRITICAL issues, so `/speckit-implement` may proceed.
- Before implementing, resolve C1 (edit FR-010 wording or add a note in R7), and decide I1 and I2 (the rate-limit design in T015/T021).
- Suggested: edit `spec.md` FR-010, then `contracts/http-api.md` and `tasks.md` T015/T021/T045.
