"use client";

import { useState } from "react";
import { windowLabel } from "@/lib/calendar";
import type { MeetingWindow, Rsvp, SavedRsvp, WindowId } from "@/lib/types";

const ANSWERS: { id: Rsvp; label: string }[] = [
  { id: "yes", label: "Có, mình tới" },
  { id: "maybe", label: "Có thể" },
  { id: "no", label: "Tiếc quá, không tới được" },
];

export default function RsvpForm({
  code,
  windows,
  saved,
  onSaved,
}: {
  code: string;
  windows: MeetingWindow[];
  saved: SavedRsvp | null;
  onSaved: (rsvp: SavedRsvp) => void;
}) {
  const [answer, setAnswer] = useState<Rsvp | null>(saved?.rsvp ?? null);
  const [win, setWin] = useState<WindowId | null>(saved?.meeting_window ?? null);
  const [party, setParty] = useState<number>(saved?.party_size ?? 1);
  const [wish, setWish] = useState<string>(saved?.wish ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const needsWindow = answer === "yes" || answer === "maybe";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setJustSaved(false);
    if (!answer) return setError("Bạn chọn một câu trả lời nhé.");
    if (needsWindow && !win) return setError("Bạn chọn khung giờ gặp Mạnh nhé.");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/invite/${code}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvp: answer,
          meeting_window: needsWindow ? win : null,
          party_size: needsWindow ? party : null,
          wish: wish.trim() || null,
        }),
      });
      if (res.status === 429) {
        setError("Bạn thử lại sau ít phút nhé.");
        return;
      }
      if (!res.ok) {
        setError("Chưa lưu được. Bạn thử lại nhé.");
        return;
      }
      const data = (await res.json()) as { rsvp: SavedRsvp };
      onSaved(data.rsvp);
      setJustSaved(true);
    } catch {
      // Offline or network failure: the last successfully saved answer stays as it was.
      setError("Chưa lưu được (có thể đang mất mạng). Bạn thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel p-5 space-y-4" aria-labelledby="rsvp-title" noValidate>
      <div>
        <h2 id="rsvp-title" className="font-display text-lg font-bold text-brand-gold">
          Bạn có tới được không?
        </h2>
        {saved && (
          <p className="mt-1 text-sm text-zinc-400" data-testid="rsvp-saved">
            Đã lưu: {ANSWERS.find((a) => a.id === saved.rsvp)?.label}
            {saved.meeting_window && ` · ${windowLabel(windows.find((w) => w.id === saved.meeting_window) ?? windows[0])}`}
            {saved.party_size ? ` · ${saved.party_size} người` : ""}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Câu trả lời</legend>
        {ANSWERS.map((a) => (
          <label key={a.id} className="choice">
            <input type="radio" name="rsvp" value={a.id} checked={answer === a.id} onChange={() => setAnswer(a.id)} />
            <span>{a.label}</span>
          </label>
        ))}
      </fieldset>

      {needsWindow && (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-zinc-300">Bạn muốn gặp Mạnh lúc nào?</legend>
            {windows.map((w) => (
              <label key={w.id} className="choice">
                <input type="radio" name="window" value={w.id} checked={win === w.id} onChange={() => setWin(w.id)} />
                <span>{windowLabel(w)}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex items-center justify-between gap-3">
            <span id="party-label" className="text-sm font-semibold text-zinc-300">
              Số người đi cùng (tính cả bạn)
            </span>
            <div className="flex items-center gap-2" role="group" aria-labelledby="party-label">
              <button type="button" className="btn" aria-label="Giảm số người" onClick={() => setParty((p) => Math.max(1, p - 1))}>
                −
              </button>
              <output className="w-8 text-center text-lg font-bold" aria-live="polite" data-testid="party-size">
                {party}
              </output>
              <button type="button" className="btn" aria-label="Tăng số người" onClick={() => setParty((p) => Math.min(5, p + 1))}>
                +
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="wish" className="mb-1 block text-sm font-semibold text-zinc-300">
          Lời nhắn cho Mạnh (không bắt buộc)
        </label>
        <textarea
          id="wish"
          className="field"
          rows={3}
          maxLength={500}
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          placeholder="Chúc mừng Mạnh nhé…"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {justSaved && !error && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Đã lưu câu trả lời của bạn. Cảm ơn bạn!
        </p>
      )}

      <button type="submit" className="btn btn-gold w-full" disabled={busy}>
        {busy ? "Đang lưu…" : saved ? "Cập nhật câu trả lời" : "Gửi câu trả lời"}
      </button>
    </form>
  );
}
