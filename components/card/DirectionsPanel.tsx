"use client";

import { useState } from "react";
import { mapsDirections } from "@/lib/links";
import type { ArrivalMode, EventPublic, Gate } from "@/lib/types";
import GateCard, { MODE_LABEL } from "./GateCard";

const MODES: ArrivalMode[] = ["grab", "xe_may", "o_to", "di_bo"];

export default function DirectionsPanel({ event, gates }: { event: EventPublic; gates: Gate[] }) {
  const [mode, setMode] = useState<ArrivalMode | null>(null);
  const sorted = [...gates].sort((a, b) => a.sort_order - b.sort_order); // Cổng 2 first

  return (
    <section className="panel p-5 space-y-4" aria-labelledby="dir-title">
      <h2 id="dir-title" className="font-display text-lg font-bold text-brand-gold">
        Đường tới chỗ gặp
      </h2>

      <a
        className="btn btn-gold w-full"
        href={mapsDirections(event.meeting_lat, event.meeting_lng)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Chỉ đường tới điểm gặp
      </a>
      <p className="text-sm text-zinc-300">
        Điểm gặp: <strong>{event.meeting_point_name}</strong>
        {event.meeting_note ? ` — ${event.meeting_note}` : ""}
      </p>

      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-300">Bạn đi bằng gì?</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Phương tiện">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn btn-compact ${mode === m ? "btn-gold" : ""}`}
              aria-pressed={mode === m}
              onClick={() => setMode(mode === m ? null : m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((g) => (
          <GateCard key={g.id} gate={g} highlighted={mode !== null && g.best_for.includes(mode)} />
        ))}
      </div>
    </section>
  );
}
