"use client";

/** One-time, dismissible prompt for guests who opened their link before the journey existed (FR-012a). */
export default function NewJourneyPrompt({ onPlay, onDismiss }: { onPlay: () => void; onDismiss: () => void }) {
  return (
    <aside className="journey-prompt panel flex flex-col gap-3 border-brand-gold/40 p-4" aria-label="Hành trình mới">
      <p className="font-display font-bold text-brand-gold">Hành trình mới — chơi thử?</p>
      <p className="text-sm text-zinc-300">Mạnh vừa thêm một hành trình nhỏ đi qua 4 năm Bách khoa, chỉ vài phút thôi.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-gold" onClick={onPlay}>
          Chơi thử
        </button>
        <button type="button" className="btn" onClick={onDismiss}>
          Để sau
        </button>
      </div>
    </aside>
  );
}
