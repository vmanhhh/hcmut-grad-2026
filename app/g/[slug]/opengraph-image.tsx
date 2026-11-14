import { getGroupCached } from "@/lib/groups";
import { OG_SIZE, renderInviteCardImage } from "@/lib/og-card";

// Group link preview: the card addressed to the group label (e.g. "Khóa 2023").
export const alt = "Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupCached(slug).catch(() => null);
  return renderInviteCardImage({ name: group?.label ?? "bạn", degree: "Bachelor of Engineering in Computer Science" });
}
