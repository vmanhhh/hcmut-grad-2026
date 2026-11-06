// Bare root: no guest data and no list of guests (FR-005).
export default function Home() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center bg-mesh">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-gold">Thiệp không hợp lệ</h1>
        <p className="mt-3 text-zinc-400">Hãy mở thiệp bằng đường dẫn riêng mà Mạnh đã gửi cho bạn.</p>
      </div>
    </main>
  );
}
