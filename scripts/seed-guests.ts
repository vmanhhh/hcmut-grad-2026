// pnpm seed:guests -- [--file guests.csv] [--env .env.local|.env.test]
// guests.csv -> upsert guests (generating codes for new rows) -> links.csv with Zalo-ready messages.
// Both guests.csv and links.csv are gitignored: they hold real guest data.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { defaultTitleFor, salutationFor, type Role } from "../lib/salutation";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // [A-HJ-NP-Za-km-z2-9]
const CODE_RE = /^[A-HJ-NP-Za-km-z2-9]{12}$/;
const newCode = customAlphabet(CODE_ALPHABET, 12);
const COLUMNS = ["display_name", "role", "message_title", "message_body", "salutation", "invite_code"] as const;

// --- CSV (quoted fields, doubled quotes, multi-line values) ------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: string[][]): string {
  const q = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}

// --- validation (mirrors the DB constraints) ---------------------------------------------------

const Row = z.object({
  display_name: z.string().trim().min(1).max(80),
  role: z.enum(["lecturer", "family", "friend", "other"]),
  message_title: z.string().trim().max(120),
  message_body: z.string().trim().min(1).max(2000),
  salutation: z.string().trim().max(120),
  invite_code: z.string().trim().refine((v) => v === "" || CODE_RE.test(v), "invalid invite_code format"),
});

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function zaloMessage(role: Role, salutation: string, link: string): string {
  if (role === "lecturer") {
    return `${salutation}, em là Mạnh ạ. Em xin phép mời thầy/cô tới dự lễ tốt nghiệp của em ngày 28/11/2026. Thiệp mời riêng đây ạ: ${link}`;
  }
  if (role === "family") {
    return `${salutation}! Con tốt nghiệp rồi nè. Con mời cả nhà tới dự ngày 28/11/2026, thiệp mời riêng đây ạ: ${link}`;
  }
  return `${salutation}! Mình là Mạnh nè. Mình mời bạn tới chung vui lễ tốt nghiệp ngày 28/11/2026 nhé. Thiệp mời riêng của bạn đây: ${link}`;
}

async function main() {
  const file = arg("file", "guests.csv");
  const envFile = arg("env", ".env.local");
  if (!existsSync(file)) throw new Error(`Missing ${file}. See guests.example.csv for the format.`);
  if (!existsSync(envFile)) throw new Error(`Missing ${envFile}. Copy .env.example and fill it in.`);
  process.loadEnvFile(envFile);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(`SUPABASE_URL / SUPABASE_SECRET_KEY missing in ${envFile}`);

  const table = parseCsv(readFileSync(file, "utf8"));
  const header = table[0]?.map((h) => h.trim());
  if (!header || COLUMNS.some((c) => !header.includes(c))) {
    throw new Error(`Header must contain: ${COLUMNS.join(",")}`);
  }
  const col = (r: string[], name: (typeof COLUMNS)[number]) => r[header.indexOf(name)] ?? "";

  // validate every row first; abort with row numbers on any error
  const errors: string[] = [];
  const parsed = table.slice(1).map((r, idx) => {
    const raw = Object.fromEntries(COLUMNS.map((c) => [c, col(r, c)]));
    const res = Row.safeParse(raw);
    const rowNo = idx + 2; // 1-based, header is row 1
    if (!res.success) {
      for (const issue of res.error.issues) errors.push(`row ${rowNo}: ${issue.path.join(".")}: ${issue.message}`);
      return null;
    }
    return res.data;
  });
  const seen = new Set<string>();
  parsed.forEach((p, idx) => {
    if (p?.invite_code) {
      if (seen.has(p.invite_code)) errors.push(`row ${idx + 2}: duplicate invite_code`);
      seen.add(p.invite_code);
    }
  });
  if (errors.length) throw new Error("Invalid CSV, nothing was written:\n  " + errors.join("\n  "));
  const rows = parsed.filter((p): p is NonNullable<typeof p> => p !== null);

  // generate codes for new rows (never reuse one already in this file)
  for (const r of rows) {
    if (!r.invite_code) {
      let c = newCode();
      while (seen.has(c)) c = newCode();
      seen.add(c);
      r.invite_code = c;
    }
  }
  const records = rows.map((r) => ({
    invite_code: r.invite_code,
    display_name: r.display_name,
    role: r.role as Role,
    salutation: r.salutation || null,
    message_title: r.message_title || defaultTitleFor(r.role as Role, r.display_name),
    message_body: r.message_body,
  }));

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: ev, error: evErr } = await db.from("event").select("public_base_url").eq("id", 1).single();
  if (evErr || !ev) throw new Error("Could not read the event row (has the migration + seed been applied?)");

  const { data: existing, error: exErr } = await db
    .from("guests")
    .select("invite_code, display_name, role, salutation, message_title, message_body")
    .in("invite_code", records.map((r) => r.invite_code));
  if (exErr) throw new Error(`Could not read existing guests: ${exErr.message}`);
  const byCode = new Map((existing ?? []).map((g) => [g.invite_code as string, g]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const changed: typeof records = [];
  for (const r of records) {
    const old = byCode.get(r.invite_code);
    if (!old) {
      created++;
      changed.push(r);
    } else if (
      old.display_name !== r.display_name ||
      old.role !== r.role ||
      (old.salutation ?? null) !== r.salutation ||
      old.message_title !== r.message_title ||
      old.message_body !== r.message_body
    ) {
      updated++;
      changed.push(r);
    } else unchanged++;
  }
  // Upsert only the editable columns: opened_at and the RSVP fields are never touched.
  if (changed.length) {
    const { error } = await db.from("guests").upsert(changed, { onConflict: "invite_code" });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }

  // write generated codes back so reruns are idempotent
  const out = [
    [...COLUMNS] as string[],
    ...rows.map((r) => [r.display_name, r.role, r.message_title, r.message_body, r.salutation, r.invite_code]),
  ];
  writeFileSync(file, toCsv(out), "utf8");

  const base = (ev.public_base_url as string).replace(/\/$/, "");
  const links = [
    ["display_name", "link", "zalo_message"],
    ...records.map((r) => {
      const link = `${base}/i/${r.invite_code}`;
      const sal = salutationFor(r.role, r.display_name, r.salutation);
      return [r.display_name, link, zaloMessage(r.role, sal, link)];
    }),
  ];
  writeFileSync("links.csv", toCsv(links), "utf8");

  console.log(`guests: ${created} new, ${updated} updated, ${unchanged} unchanged (${records.length} total)`);
  console.log("wrote links.csv (gitignored) and updated invite_code in " + file);
}

// run only when executed directly (parseCsv/toCsv stay importable)
if (process.argv[1] && /seed-guests\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
