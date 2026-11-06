"use client";

import { useState } from "react";
import { copyDetailsText, inviteLink } from "@/lib/calendar";
import { androidChromeIntent } from "@/lib/links";
import type { InAppInfo } from "@/lib/user-agent";
import type { EventPublic, MeetingWindow } from "@/lib/types";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Shown inside Zalo / Messenger / Facebook web views, where .ics downloads often fail (FR-010a). */
export default function InAppBrowserBanner({
  info,
  code,
  event,
  windows,
}: {
  info: InAppInfo;
  code: string;
  event: EventPublic;
  windows: MeetingWindow[];
}) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  if (!info.inApp) return null;

  const url = inviteLink(event, code);

  return (
    <aside className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 space-y-3" aria-label="Mở bằng trình duyệt">
      <p className="text-sm font-semibold text-amber-100">Để tải lịch về máy, mở bằng trình duyệt.</p>
      {info.os === "android" && (
        <a className="btn w-full" href={androidChromeIntent(url)}>
          Mở bằng Chrome
        </a>
      )}
      {info.os === "ios" && <p className="text-sm text-amber-100">Trên iPhone: bấm “⋯” → “Mở bằng Safari”.</p>}
      <button
        type="button"
        className="btn w-full"
        onClick={async () => setCopied((await copyText(copyDetailsText(event, windows))) ? "ok" : "fail")}
      >
        Sao chép thông tin
      </button>
      {copied === "ok" && (
        <p role="status" className="text-sm text-emerald-300">
          Đã sao chép ngày giờ, địa chỉ và link bản đồ.
        </p>
      )}
      {copied === "fail" && (
        <p role="alert" className="text-sm text-red-300">
          Chưa sao chép được. Bạn giữ và chép thủ công giúp mình nhé.
        </p>
      )}
    </aside>
  );
}
