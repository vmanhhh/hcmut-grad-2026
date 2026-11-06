-- Seed data for the event row and the three gates. Safe to re-run (upserts).
--
-- Storage convention (public bucket `gates`): upload photos as
--   gates/{gate-id}/{n}.jpg      e.g. gates/cong-2/1.jpg
-- and put the public URL in gates.photo_url or gates.steps[].photo_url.
--
-- Coordinates below are placeholders (HCMUT campus centre); the host replaces them with real pins.

insert into event (
  id, title, host_name, host_degree, host_school, contact_phone, address,
  meeting_point_name, meeting_lat, meeting_lng, meeting_note,
  windows, busy_note, timezone, public_base_url, journey_version
) values (
  1,
  'Lễ tốt nghiệp — Trần Văn Mạnh',
  'Trần Văn Mạnh',
  'Bachelor of Engineering in Computer Science',
  'HCMUT — Trường ĐH Bách khoa, ĐHQG-HCM',
  '0981907003',
  '268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh',
  'Tòa nhà Khoa Khoa học và Kỹ thuật Máy tính',
  10.7728, 106.6606,
  null,
  '[{"id":"early","starts_at":"2026-11-28T13:30:00+07:00","ends_at":"2026-11-28T15:00:00+07:00"},
    {"id":"late","starts_at":"2026-11-28T17:30:00+07:00","ends_at":"2026-11-28T18:30:00+07:00"}]'::jsonb,
  '15:00–17:30 mình ở trong lễ, chưa gặp được nha',
  'Asia/Ho_Chi_Minh',
  'https://manh-totnghiep.vercel.app',
  0
)
on conflict (id) do update set
  title = excluded.title,
  host_name = excluded.host_name,
  host_degree = excluded.host_degree,
  host_school = excluded.host_school,
  contact_phone = excluded.contact_phone,
  address = excluded.address,
  meeting_point_name = excluded.meeting_point_name,
  windows = excluded.windows,
  busy_note = excluded.busy_note,
  timezone = excluded.timezone,
  public_base_url = excluded.public_base_url;
-- NOTE: meeting_lat/lng, meeting_note and journey_version are intentionally NOT overwritten on
-- re-run, so the host's dashboard edits (real pin, journey flip) survive a re-seed.

insert into gates (id, sort_order, name, distance, headline, parking_note, best_for, lat, lng, photo_url, steps)
values
  ('cong-1', 2, 'Cổng 1', 'far',  'Dễ tìm, hợp Grab — đi bộ xa hơn', null,
   array['grab'], 10.7722, 106.6590, null, '[]'::jsonb),
  ('cong-2', 1, 'Cổng 2', 'near', 'Gần nhất, đi bộ ngắn', null,
   array['di_bo','grab','xe_may'], 10.7731, 106.6612, null, '[]'::jsonb),
  ('cong-3', 3, 'Cổng 3', 'near', 'Gần, có bãi xe',
   'Bãi xe dễ hết chỗ — tới sớm; cuối tuần ~3.000đ. Hết chỗ → Cổng 1 hoặc Grab',
   array['xe_may','o_to'], 10.7737, 106.6600, null, '[]'::jsonb)
on conflict (id) do update set
  sort_order = excluded.sort_order,
  name = excluded.name,
  distance = excluded.distance,
  headline = excluded.headline,
  parking_note = excluded.parking_note,
  best_for = excluded.best_for;
-- lat/lng/photo_url/steps are not overwritten on re-run (the host edits them in the dashboard).
