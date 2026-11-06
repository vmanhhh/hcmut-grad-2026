import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InviteExperience from "@/components/InviteExperience";
import { getInvite, toPayload } from "@/lib/invites";

export const dynamic = "force-dynamic";

// Generic metadata only: nothing from the guest record may reach <head> (FR-025).
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rec = await getInvite(code); // null for malformed and unknown codes alike
  if (!rec) notFound();
  // Only the whitelisted payload crosses into the client component.
  return <InviteExperience payload={toPayload(code, rec)} />;
}
