import { getInviteCached } from "@/lib/invites";
import { OG_SIZE, renderInviteCardImage } from "@/lib/og-card";

// Per-guest link preview (Messenger, Zalo, ...). Personal links are sent one by one, so display_name
// is meant to show; the message and every other guest field stay out of the image.
export const alt = "Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rec = await getInviteCached(code).catch(() => null);
  return renderInviteCardImage({ name: rec?.guest.display_name ?? "bạn", degree: rec?.event.host_degree ?? "" });
}
