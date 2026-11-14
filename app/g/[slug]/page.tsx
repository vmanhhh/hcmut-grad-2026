import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GroupJoinForm from "@/components/GroupJoinForm";
import { getGroupCached } from "@/lib/groups";

export const dynamic = "force-dynamic";

// Group links are shared openly (a cohort chat, a story), so the preview only names the group.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupCached(slug).catch(() => null);
  const robots = { index: false, follow: false };
  if (!group) return { robots };
  const title = `Thiệp mời ${group.label} — Trần Văn Mạnh · HCMUT 2026`;
  const description = "Thiệp mời tới lễ tốt nghiệp của Trần Văn Mạnh, HCMUT, 28/11/2026.";
  return {
    robots,
    title,
    description,
    openGraph: { title, description, type: "website", locale: "vi_VN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupCached(slug); // null for malformed, unknown and switched-off slugs alike
  if (!group) notFound();

  return (
    <div className="bg-grass min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-3 py-6 sm:px-4">
        <div className="ticket-wrapper">
          <div className="pixel-card">
            <div className="pixel-card-in">
              <span className="pixel-ribbon">★ THIỆP MỜI ★</span>
              <h1 className="pixel-title mt-3">LỄ TỐT NGHIỆP</h1>
              <p className="pixel-label mt-4">Trân trọng kính mời</p>
              <p className="pixel-name mt-1 break-words">{group.label}</p>
              <p className="mt-3 text-sm text-[#d9d4ff]">Cho mình biết tên bạn để nhận thiệp mời riêng nhé.</p>
              <GroupJoinForm slug={group.slug} label={group.label} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
