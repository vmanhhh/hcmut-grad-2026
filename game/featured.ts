import type { Gallery, GalleryItem } from "@/lib/types";

/**
 * Featured memories hung along the journey. `place` puts outdoor beats on Campus hedges and indoor
 * beats (the old hallway was removed: walking through the building door goes straight to the hall). Real photos are never drawn in the pixel canvas — only a wooden frame —
 * crisp photos appear in the HTML caption strip (`onFeatured`).
 */
export type Featured = {
  id: string;
  year: 1 | 2 | 3 | 4;
  place: "outdoor" | "indoor";
  event: string;
  /** Extra gallery events whose photos are shown in the same frame (one beat, several albums). */
  more?: string[];
  side: "l" | "r";
  y: number;
  title: string;
  caption: string;
  /** Shot date or range taken from the photos' EXIF (shown on the memory card), e.g. "19/09/2022" or "07/06 – 26/07/2025". */
  when?: string;
};

type Beat = Omit<Featured, "y" | "side">;

// Order follows the host's own telling of the four years. Kept short on purpose (11 stops): related
// albums are merged into one stop so guests walk less. `when` comes from the photos' EXIF dates.
const OUTDOOR: Beat[] = [
  { id: "f1", year: 1, place: "outdoor", event: "y1-first-flight-to-hcmut", more: ["y1-khai-giang"], title: "Day 1: bay vào Sài Gòn & Khai giảng", caption: "Một chiếc vali, một giấc mơ\nvà tấm vé đến Bách Khoa.", when: "19/09 – 09/10/2022" },
  { id: "f5", year: 1, place: "outdoor", event: "y1-trip-dau-tien-cung-nhung-nguoi-ban-nguoi", more: ["y1-nhung-nguoi-ban-moi"], title: "Vào Đoàn Hội & chuyến đi Nha Trang đầu tiên", caption: "Gặp gỡ những người bạn mới, trước khi bị bào.", when: "18 – 20/02/2023" },
  { id: "f6", year: 1, place: "outdoor", event: "y1-hoc-quoc-phong", more: ["y1-mhx-dau-tien"], title: "Học quốc phòng & Mùa hè Xanh 2023", caption: "Hết thích kem chuối sau quốc phòng,\ntop 1 cách đen da nhanh nhất 🍌", when: "25/03 – 21/07/2023" },
  { id: "f8", year: 2, place: "outdoor", event: "y2-dan-em-dau-tien", title: "Nhận mấy đứa nhỏ K23", caption: "Gòi chở Thiên Kim và té xe :))", when: "07/10/2023" },
  { id: "f23", year: 2, place: "outdoor", event: "y2-media-cse", more: ["y2-media-lo"], title: "Media lỏ", caption: "Hội những người bị dí nhiều nhất đoàn hội", when: "16/09/2023 – 12/01/2024" },
  { id: "f10", year: 2, place: "outdoor", event: "y2-xuan-tinh-nguyen", more: ["y2-da-lat-cung-doan-hoi"], title: "Xuân tình nguyện & tập huấn Đà Lạt", caption: "Đi Xuân tình nguyện cùng mọi người,\nlên Đà Lạt thì toàn nhậu không.", when: "13 – 20/01/2024" },
  { id: "f13", year: 2, place: "outdoor", event: "y2-first-night-cung-lbd", more: ["y3-nha-c24-07"], title: "Đêm đầu cùng LBĐ & nhà C24.07", caption: "Bị thầy dụ về Vinhomes Q9 xa xôi hẻo lánh,\nrồi có ngôi nhà sa đọa nhất Bình Dương.", when: "31/03 – 03/12/2024" },
  { id: "f19", year: 4, place: "outdoor", event: "y4-trekking-cung-cong-ty-dau-tien", more: ["y4-party-welcome-nguoi-moi"], title: "Gia nhập thị trường & những chuỗi ngày trekking", caption: "Sinh nhật trekking, vui trekking, buồn trekking,\nđi chill cũng trekking.", when: "07/06 – 26/07/2025" },
  { id: "f24", year: 4, place: "outdoor", event: "y4-anh-em-nha-d1107", more: ["y4-trip-cuoi-cung-cung-k22"], title: "Nhà thổ D1107 · cuối năm đại học", caption: "Cùng bộ ba Thầy Bí, Thầy Đẳng, Thầy Quân,\nvà chuyến đi cuối cùng cùng K22.", when: "29/11 – 14/12/2025" },
  {
    id: "f20",
    year: 4,
    place: "outdoor",
    event: "y4-tat-nien-cung-nhung-dong-nghiep-de-thuon",
    more: ["y4-lan-dau-lam-sale", "y4-sinh-nhat-cong-ty", "y4-trip-cung-nhung-nguoi-de-thung"],
    title: "Những moment cùng đồng nghiệp",
    caption: "Những người là động lực để mình lên công ty\nthay vì ở nhà wfh.",
    when: "22/08/2025 – 11/07/2026",
  },
  { id: "f17", year: 4, place: "outdoor", event: "y4-ban-hoc-moi-tot-nghiep", title: "Đi tốt nghiệp FTU lấy vía", caption: "Lấy vía thành công từ Trà My,\ngiờ tới lượt tôi.", when: "26/09/2026" },
];

function space(beats: Beat[], yOut: number, yIn: number, first: "l" | "r" = "l"): Featured[] {
  return beats.map((b, i) => {
    const t = beats.length === 1 ? 0 : i / (beats.length - 1);
    return {
      ...b,
      side: ((i % 2 === 0) === (first === "l") ? "l" : "r") as "l" | "r",
      y: Math.round(yOut - t * (yOut - yIn)),
    };
  });
}

/** Outdoor campus lane: gate → main-hall door. */
/** "Day 1" is the BK logo pillar of the gate itself (Campus places it there); the rest are spaced along the lane. */
export const FEATURED_OUTDOOR: Featured[] = [
  { ...OUTDOOR[0], side: "l", y: 66 } /* = Campus GATE_Y / T */,
  ...space(OUTDOOR.slice(1), 58, 17, "r"), // first stop (Nha Trang) on the right so the logo pillar does not cover it
];

/** All featured (Boot / lookups). */
export const FEATURED = FEATURED_OUTDOOR;

function eventsOf(galleries: Gallery[], f: Featured) {
  const all = galleries.flatMap((g) => g.events);
  return [f.event, ...(f.more ?? [])].map((id) => all.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
}

/** Media for the HTML card: videos keep their file (src = poster still, video = mp4). */
export function featuredMedia(galleries: Gallery[], f: Featured): { src: string; w: number; h: number; video?: string }[] {
  const out: { src: string; w: number; h: number; video?: string }[] = [];
  for (const ev of eventsOf(galleries, f)) {
    for (const it of ev.items) {
      if (it.kind === "image") out.push({ src: it.src, w: it.w, h: it.h });
      else if (it.kind === "video") out.push({ src: it.poster ?? "", w: it.w, h: it.h, video: it.src });
    }
  }
  return out;
}

/** Stills for the HTML caption strip (and gallery). Never drawn into the pixel canvas. */
export function featuredPhotos(galleries: Gallery[], f: Featured): GalleryItem[] {
  const out: GalleryItem[] = [];
  for (const ev of eventsOf(galleries, f)) {
    for (const it of ev.items) {
      if (it.kind === "image") out.push(it);
      else if (it.kind === "video" && it.poster) out.push({ kind: "image", src: it.poster, w: it.w, h: it.h });
    }
  }
  return out;
}
