// Role -> default salutation and title (FR-009c). Pure; also used by scripts/seed-guests.ts.

export type Role = "lecturer" | "family" | "friend" | "other";

const SALUTATION: Record<Role, string> = {
  lecturer: "Kính gửi {display_name}",
  family: "{display_name} thương",
  friend: "Gửi {display_name}",
  other: "Gửi {display_name}",
};

const TITLE: Record<Role, string> = {
  lecturer: "Trân trọng kính mời {display_name}",
  family: "Con mời {display_name} tới dự",
  friend: "Tới chung vui với mình nha!",
  other: "Thân mời {display_name}",
};

function fill(template: string, displayName: string): string {
  return template.replaceAll("{display_name}", displayName);
}

/** `override` (the guests.salutation column) wins over the role template. */
export function salutationFor(role: Role, displayName: string, override?: string | null): string {
  const t = override && override.trim() ? override.trim() : SALUTATION[role];
  return fill(t, displayName);
}

export function defaultTitleFor(role: Role, displayName: string): string {
  return fill(TITLE[role], displayName);
}
