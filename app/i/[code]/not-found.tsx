// Identical output for every unknown or malformed code (FR-003).
export default function InviteNotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center bg-mesh">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-gold">Thiệp không hợp lệ</h1>
        <p className="mt-3 text-zinc-400">Hãy kiểm tra lại đường dẫn mà Mạnh đã gửi cho bạn.</p>
      </div>
    </main>
  );
}
