import { mapsSearch } from "@/lib/links";
import type { ArrivalMode, Gate } from "@/lib/types";
import WalkSteps from "./WalkSteps";

export const MODE_LABEL: Record<ArrivalMode, string> = {
  grab: "Grab",
  xe_may: "Xe máy",
  o_to: "Ô tô",
  di_bo: "Đi bộ",
};

export default function GateCard({ gate, highlighted }: { gate: Gate; highlighted: boolean }) {
  return (
    <article
      className={`rounded-2xl border p-4 space-y-3 ${highlighted ? "border-brand-gold bg-brand-gold/10" : "border-white/10 bg-white/[0.03]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold">{gate.name}</h3>
          <p className="text-sm text-zinc-300">{gate.headline}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${gate.distance === "near" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}
        >
          {gate.distance === "near" ? "Gần" : "Xa hơn"}
        </span>
      </div>

      {gate.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gate.photo_url} alt={`Ảnh ${gate.name}`} loading="lazy" className="w-full rounded-xl" />
      ) : (
        <div className="grid h-24 place-items-center rounded-xl bg-white/5 text-xs text-zinc-500">Ảnh {gate.name} sẽ được cập nhật</div>
      )}

      {gate.parking_note && <p className="text-sm text-amber-200">{gate.parking_note}</p>}

      {gate.best_for.length > 0 && (
        <p className="flex flex-wrap gap-1.5 text-xs">
          {gate.best_for.map((m) => (
            <span key={m} className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-200">
              Hợp: {MODE_LABEL[m] ?? m}
            </span>
          ))}
        </p>
      )}

      <a className="btn w-full" href={mapsSearch(gate.lat, gate.lng)} target="_blank" rel="noopener noreferrer">
        Mở {gate.name} trên bản đồ
      </a>

      <details className="rounded-xl bg-white/[0.03] p-3">
        <summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold">Đi bộ từ {gate.name} tới điểm gặp</summary>
        <div className="pt-2">
          <WalkSteps steps={gate.steps} />
        </div>
      </details>
    </article>
  );
}
