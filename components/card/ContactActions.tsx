import { telLink, zaloLink } from "@/lib/links";

export default function ContactActions({ phone }: { phone: string }) {
  return (
    <section className="panel p-5 space-y-3" aria-labelledby="contact-title">
      <h2 id="contact-title" className="font-display text-lg font-bold text-brand-gold">
        Liên hệ Mạnh
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <a className="btn" href={telLink(phone)}>
          Gọi {phone}
        </a>
        <a className="btn" href={zaloLink(phone)} target="_blank" rel="noopener noreferrer">
          Nhắn Zalo
        </a>
      </div>
    </section>
  );
}
