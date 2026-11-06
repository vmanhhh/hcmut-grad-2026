// Outbound links (contracts/http-api.md -> Outbound links). Pure and client-safe.

export function mapsDirections(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function mapsSearch(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** "0981907003" -> "tel:+84981907003" */
export function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("84") ? digits : digits.replace(/^0/, "84");
  return `tel:+${intl}`;
}

export function zaloLink(phone: string): string {
  return `https://zalo.me/${phone.replace(/\D/g, "")}`;
}

/** Opens an https URL in Chrome from an Android in-app browser. */
export function androidChromeIntent(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
}
