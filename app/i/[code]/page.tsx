import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InviteExperience from "@/components/InviteExperience";
import { getInviteCached, toPayload } from "@/lib/invites";

export const dynamic = "force-dynamic";

// Personal links are sent one by one, so the link preview shows the guest's display_name (and
// only that: never the message, role or RSVP). An unknown code falls back to the generic preview.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const rec = await getInviteCached(code).catch(() => null);
  const robots = { index: false, follow: false };
  if (!rec) return { robots };
  const title = `Thiệp mời dành cho ${rec.guest.display_name} — Trần Văn Mạnh · HCMUT 2026`;
  const description = "Thiệp mời riêng tới lễ tốt nghiệp của Trần Văn Mạnh, HCMUT, 28/11/2026.";
  return {
    robots,
    title,
    description,
    openGraph: { title, description, type: "website", locale: "vi_VN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rec = await getInviteCached(code); // null for malformed and unknown codes alike
  if (!rec) notFound();
  // Only the whitelisted payload crosses into the client component.
  return <InviteExperience payload={toPayload(code, rec)} />;
}
