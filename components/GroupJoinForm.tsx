"use client";

import { useEffect, useState } from "react";

const storageKey = (slug: string) => `grad-group:${slug}`;

/**
 * Name + optional note. On success the server returns a personal invite code and we go to /i/{code}.
 * The code is remembered in this browser so reopening the group link does not create a second guest.
 */
export default function GroupJoinForm({ slug, label }: { slug: string; label: string }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKey(slug));
    } catch {
      saved = null;
    }
    if (saved && /^[A-HJ-NP-Za-km-z2-9]{12}$/.test(saved)) window.location.replace(`/i/${saved}`);
    else setChecking(false);
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Bạn cho mình biết tên nhé.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/group/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note: note || null }),
      });
      if (res.status === 429) throw new Error("Hơi nhiều lượt rồi, bạn thử lại sau ít phút nhé.");
      if (!res.ok) throw new Error("Chưa gửi được, bạn thử lại nhé.");
      const { code } = (await res.json()) as { code: string };
      try {
        localStorage.setItem(storageKey(slug), code);
      } catch {
        /* private mode: the guest just keeps the /i link */
      }
      window.location.assign(`/i/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được, bạn thử lại nhé.");
      setBusy(false);
    }
  }

  if (checking) return <p className="mt-6 text-sm text-[#b8b3e6]">Đang mở thiệp của bạn…</p>;

  return (
    <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="pixel-label mb-1 block">
          Tên của bạn
        </label>
        <input
          id="name"
          className="field"
          autoComplete="name"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Ví dụ: Nguyễn Văn A (${label})`}
          required
        />
      </div>
      <div>
        <label htmlFor="note" className="pixel-label mb-1 block">
          Ghi chú (không bắt buộc)
        </label>
        <textarea
          id="note"
          className="field"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Bạn là ai, quen Mạnh từ đâu, hoặc điều muốn nhắn…"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-gold w-full" disabled={busy}>
        {busy ? "Đang mở thiệp…" : "Nhận thiệp mời"}
      </button>
    </form>
  );
}
