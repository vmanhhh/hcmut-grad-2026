import type { GateStep } from "@/lib/types";

export default function WalkSteps({ steps }: { steps: GateStep[] }) {
  if (!steps.length) {
    return <p className="text-sm text-zinc-400">Mạnh sẽ cập nhật hướng dẫn đi bộ sớm.</p>;
  }
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gold/15 text-sm font-bold text-brand-gold">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            {s.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo_url} alt="" loading="lazy" className="w-full rounded-xl" />
            ) : null}
            <p className="text-sm text-zinc-200">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
