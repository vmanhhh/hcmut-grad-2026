import "server-only";
import { cache } from "react";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { canUsePgFallback, pgServer } from "./pg-server";
import { supabaseServer } from "./supabase-server";
import { defaultTitleFor, type Role } from "./salutation";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const newCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", 12); // matches CODE_RE in invites.ts

export type Group = {
  id: string;
  slug: string;
  label: string;
  role: Role;
  salutation: string | null;
  message_title: string | null;
  message_body: string;
};

const COLUMNS = "id, slug, label, role, salutation, message_title, message_body";

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** Active group by slug, or null (malformed, unknown and switched-off slugs look the same). */
export async function getGroup(slug: string): Promise<Group | null> {
  if (!isValidSlug(slug)) return null;
  if (canUsePgFallback()) {
    const [g] = await pgServer()<Group[]>`
      select id, slug, label, role, salutation, message_title, message_body
      from groups where slug = ${slug} and active`;
    return g ?? null;
  }
  const { data, error } = await supabaseServer().from("groups").select(COLUMNS).eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw new Error("group lookup failed");
  return (data as Group | null) ?? null;
}

/** Same lookup, deduplicated within one request (page + generateMetadata + opengraph-image). */
export const getGroupCached = cache(getGroup);

export const JoinSchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().max(500).nullish(),
});
export type JoinInput = z.infer<typeof JoinSchema>;

/** Creates a personal guest row from a group link and returns its invite code (null when the group is unknown). */
export async function joinGroup(slug: string, input: JoinInput): Promise<string | null> {
  const group = await getGroup(slug);
  if (!group) return null;
  const title = group.message_title ? group.message_title.replaceAll("{display_name}", input.name) : ""; // the letter has no title
  const note = input.note ? input.note : null;

  // 12 random chars: a collision is practically impossible, but retry a few times on a unique violation
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newCode();
    if (canUsePgFallback()) {
      try {
        await pgServer()`
          insert into guests (invite_code, display_name, role, salutation, message_title, message_body, note, group_id)
          values (${code}, ${input.name}, ${group.role}, ${group.salutation}, ${title}, ${group.message_body}, ${note}, ${group.id})`;
        return code;
      } catch (e) {
        if ((e as { code?: string }).code === "23505") continue;
        throw e;
      }
    }
    const { error } = await supabaseServer().from("guests").insert({
      invite_code: code,
      display_name: input.name,
      role: group.role,
      salutation: group.salutation,
      message_title: title,
      message_body: group.message_body,
      note,
      group_id: group.id,
    });
    if (!error) return code;
    if (error.code === "23505") continue;
    throw new Error("join failed");
  }
  throw new Error("could not allocate an invite code");
}
