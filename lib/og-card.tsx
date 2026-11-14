import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link-preview card shared by /i/{code} (guest name) and /g/{slug} (group label): a small copy of the
// in-app pixel card on the grass background. Callers decide which text goes in; nothing else is read.
export const OG_SIZE = { width: 1200, height: 630 };

const GOLD = "#f2c75a";
const CREAM = "#fff3c4";
const LILAC = "#b8b3e6";
const NAVY = "#1b1a38";
const RED = "#b02f36";

export async function renderInviteCardImage({ name, degree }: { name: string; degree: string }) {
  const [font, host] = await Promise.all([
    readFile(join(process.cwd(), "lib/fonts/PlusJakartaSans-Bold.ttf")),
    readFile(join(process.cwd(), "lib/fonts/host-graduate.png")),
  ]);
  const hostSrc = `data:image/png;base64,${host.toString("base64")}`;
  const nameSize = name.length > 22 ? 40 : name.length > 15 ? 50 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#5eb04d",
          backgroundImage:
            "radial-gradient(#7fcb68 3px, transparent 3.2px), radial-gradient(#4a9a3e 4px, transparent 4.2px), radial-gradient(#f2c75a 3px, transparent 3.2px)",
          backgroundSize: "56px 56px, 72px 72px, 300px 300px",
          backgroundPosition: "0 0, 28px 36px, 80px 140px",
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        <div style={{ display: "flex", position: "relative", width: 720 }}>
          {/* hard offset shadow */}
          <div style={{ position: "absolute", top: 10, left: 10, right: -10, bottom: -10, background: "#0b0a1c" }} />
          <div style={{ display: "flex", width: "100%", background: GOLD, padding: 5 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                padding: "30px 38px 26px",
                background: "#2b2a52",
                border: `5px solid ${NAVY}`,
                color: CREAM,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div
                    style={{
                      display: "flex",
                      background: RED,
                      border: `3px solid ${GOLD}`,
                      padding: "2px 14px",
                      fontSize: 20,
                      letterSpacing: 2,
                      color: "#fff",
                    }}
                  >
                    ★ THIỆP MỜI ★
                  </div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 12,
                      fontSize: 52,
                      lineHeight: 1.1,
                      color: GOLD,
                      textShadow: `3px 3px 0 ${NAVY}`,
                    }}
                  >
                    LỄ TỐT NGHIỆP
                  </div>
                  {degree ? (
                    <div style={{ display: "flex", marginTop: 6, fontSize: 17, letterSpacing: 1.5, color: LILAC }}>
                      {degree.toUpperCase()}
                    </div>
                  ) : null}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hostSrc} width={72} height={108} alt="" style={{ marginTop: -4 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
                <div style={{ display: "flex", fontSize: 19, letterSpacing: 2.5, color: LILAC }}>TRÂN TRỌNG KÍNH MỜI</div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 6,
                    fontSize: nameSize,
                    lineHeight: 1.2,
                    color: CREAM,
                    textShadow: `3px 3px 0 ${RED}`,
                  }}
                >
                  {name}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: "4px dashed rgba(242,199,90,0.7)",
                  fontSize: 19,
                  color: LILAC,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 24, color: CREAM }}>Trần Văn Mạnh</div>
                  <div style={{ display: "flex" }}>HCMUT · 2022 – 2026</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 22, color: GOLD }}>
                  <div style={{ display: "flex", fontSize: 30, color: CREAM }}>9h – 12h</div>
                  <div style={{ display: "flex" }}>Thứ Bảy, 28/11/2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Plus Jakarta Sans", data: font, weight: 700, style: "normal" }] },
  );
}
