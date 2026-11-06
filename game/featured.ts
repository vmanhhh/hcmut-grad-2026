import type { Gallery, GalleryItem } from "@/lib/types";

/**
 * Featured memories hung along the journey. `place` puts outdoor beats on Campus hedges and indoor
 * beats on Hallway walls. Real photos are never drawn in the pixel canvas — only a wooden frame —
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
};

type Beat = Omit<Featured, "y" | "side">;

// Order follows the host's own telling of the four years.
const OUTDOOR: Beat[] = [
  { id: "f1", year: 1, place: "outdoor", event: "y1-first-flight-to-hcmut", title: "Day 1: bay vào Sài Gòn", caption: "Một chiếc vali, một giấc mơ\nvà tấm vé đến Bách Khoa." },
  { id: "f3", year: 1, place: "outdoor", event: "y1-khai-giang", title: "Khai giảng", caption: "Ngày đầu làm sinh ziên." },
  { id: "f7", year: 1, place: "outdoor", event: "y1-nhung-nguoi-ban-moi", title: "Những người bạn mới", caption: "Gặp gỡ những người bạn mới." },
  { id: "f5", year: 1, place: "outdoor", event: "y1-trip-dau-tien-cung-nhung-nguoi-ban-nguoi", title: "Chuyến đi Nha Trang đầu tiên", caption: "Chuyến đi đầu tiên cùng Đoàn Hội." },
  { id: "f4", year: 1, place: "outdoor", event: "y1-hoc-quoc-phong", title: "Học quốc phòng", caption: "Đi học quốc phòng cũng hề hề 🤡" },
  { id: "f6", year: 1, place: "outdoor", event: "y1-mhx-dau-tien", title: "Mùa hè Xanh 2023", caption: "Top 1 cách đen da nhanh nhất." },
  { id: "f8", year: 2, place: "outdoor", event: "y2-dan-em-dau-tien", title: "Nhận mấy đứa nhỏ K23", caption: "Gồi chở đàn em và té xe ;)" },
  { id: "f10", year: 2, place: "outdoor", event: "y2-xuan-tinh-nguyen", title: "Xuân tình nguyện", caption: "Đi Xuân tình nguyện cùng mọi người." },
  { id: "f9", year: 2, place: "outdoor", event: "y2-da-lat-cung-doan-hoi", title: "Tập huấn Đà Lạt", caption: "Tập huấn Đà Lạt hỗn loạn." },
  { id: "f23", year: 2, place: "outdoor", event: "y2-media-cse", more: ["y2-media-lo"], title: "Media lỏ", caption: "Ban truyền thông cùng các sếp —\nanh Kiên quá yếu." },
];

const INDOOR: Beat[] = [
  { id: "f12", year: 2, place: "indoor", event: "y2-dem-bach-khoa-mat-dien", title: "Một đêm ở BK mưa to và cúp điện", caption: "Hên ko bị bảo vệ bắt." },
  { id: "f13", year: 2, place: "indoor", event: "y2-first-night-cung-lbd", title: "Đêm đầu cùng LBĐ", caption: "Thầy chưa làm gì em đâu." },
  { id: "f14", year: 3, place: "indoor", event: "y3-trip-cuoi-cung-cung-doan-hoi", title: "Trip cuối cùng cùng Đoàn Hội", caption: "Chuyến đi cuối cùng\ncùng những người anh em." },
  { id: "f15", year: 3, place: "indoor", event: "y3-nha-c24-07", title: "Giặc đến nhà C24.07", caption: "Tội nghiệp thầy ngủ được 2 tiếng\nrồi bị lôi đi khám." },
  { id: "f24", year: 4, place: "indoor", event: "y4-trip-cuoi-cung-cung-k22", title: "Trip cuối năm đại học cùng K22", caption: "Chuyến đi cuối cùng\ncủa những năm đại học cùng K22." },
  { id: "f25", year: 4, place: "indoor", event: "y4-party-welcome-nguoi-moi", title: "Ngày đầu gia nhập thị trường", caption: "Mọi người làm party welcome\nngười mới ;))" },
  { id: "f19", year: 4, place: "indoor", event: "y4-trekking-cung-cong-ty-dau-tien", title: "Những chuỗi ngày trekking", caption: "Sinh nhật trekking, vui trekking, buồn trekking,\nđi chill cũng trekking." },
  { id: "f21", year: 4, place: "indoor", event: "y4-trip-cung-nhung-nguoi-de-thung", title: "Du lịch cùng đồng nghiệp thân thiết", caption: "Cũng nhiều kỷ niệm." },
  {
    id: "f20",
    year: 4,
    place: "indoor",
    event: "y4-tat-nien-cung-nhung-dong-nghiep-de-thuon",
    more: ["y4-lan-dau-lam-sale", "y4-sinh-nhat-cong-ty"],
    title: "Những moment cùng đồng nghiệp",
    caption: "Tất niên, lần đầu làm Sale, sinh nhật công ty…\nvới những đồng nghiệp dễ thương nhất.",
  },
  { id: "f17", year: 4, place: "indoor", event: "y4-ban-hoc-moi-tot-nghiep", title: "Đi tốt nghiệp FTU lấy vía", caption: "Lấy vía thành công từ Trà My,\ngiờ tới lượt tôi." },
  { id: "f27", year: 4, place: "indoor", event: "y4-nha-trung-nhut-dong-thap", more: ["y4-nhau"], title: "Ghé nhà Trung Nhựt ở Đồng Tháp", caption: "Lần đầu ghé nhà bạn Nhựt Trần." },
  { id: "f26", year: 4, place: "indoor", event: "y4-anh-em-nha-d1107", title: "D1107", caption: "Cùng bộ ba Thầy Bí, Thầy Đẳng, Thầy Quân." },
];

function space(beats: Beat[], yOut: number, yIn: number): Featured[] {
  return beats.map((b, i) => {
    const t = beats.length === 1 ? 0 : i / (beats.length - 1);
    return {
      ...b,
      side: (i % 2 === 0 ? "l" : "r") as "l" | "r",
      y: Math.round(yOut - t * (yOut - yIn)),
    };
  });
}

/** Outdoor campus lane: gate → main-hall door. */
export const FEATURED_OUTDOOR = space(OUTDOOR, 83, 18);
/** Indoor hallway: entrance → stage door. */
export const FEATURED_INDOOR = space(INDOOR, 60, 12);

/** All featured (Boot / lookups). */
export const FEATURED = [...FEATURED_OUTDOOR, ...FEATURED_INDOOR];

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
