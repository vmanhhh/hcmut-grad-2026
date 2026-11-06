import type { Metadata, Viewport } from "next";
import { Dancing_Script, Plus_Jakarta_Sans, Space_Grotesk, VT323 } from "next/font/google";
import "./globals.css";


// Game/pixel UI and letter handwriting are only needed once the journey starts, so no preload.
const vt323 = VT323({ weight: "400", subsets: ["vietnamese", "latin"], variable: "--font-vt323", display: "swap", preload: false });
const dancing = Dancing_Script({ subsets: ["vietnamese", "latin"], variable: "--font-dancing", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["vietnamese", "latin"], variable: "--font-space", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["vietnamese", "latin"], variable: "--font-jakarta", display: "swap" });

const TITLE = "Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026";
const DESCRIPTION = "Thiệp mời riêng tới lễ tốt nghiệp của Trần Văn Mạnh, HCMUT, 28/11/2026.";

// Generic metadata only: no guest fields anywhere in <head> (FR-025, Principle II).
export const metadata: Metadata = {
  metadataBase: new URL("https://manh-totnghiep.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", locale: "vi_VN" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5eb04d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${vt323.variable} ${dancing.variable} ${spaceGrotesk.variable} ${jakarta.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
