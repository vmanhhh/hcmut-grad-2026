// Build-time check for content/memories.json (data-model.md -> Memory). Wired as `prebuild`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const Memory = z.object({
  id: z.string().min(1),
  zone: z.enum(["gate", "hallway", "project", "stage"]),
  sort_order: z.number(),
  year: z.number().int().min(2022).max(2026),
  title: z.string().min(1).max(40),
  caption: z.string().max(160),
  image: z.string().startsWith("/memories/"),
});

const file = join(process.cwd(), "content", "memories.json");
const parsed = z.array(Memory).safeParse(JSON.parse(readFileSync(file, "utf8")));
if (!parsed.success) {
  console.error("content/memories.json is invalid:");
  for (const issue of parsed.error.issues) console.error(`  [${issue.path.join(".")}] ${issue.message}`);
  process.exit(1);
}

const problems: string[] = [];
for (const m of parsed.data) {
  if (!existsSync(join(process.cwd(), "public", m.image))) problems.push(`${m.id}: image ${m.image} not found under public/`);
}
const ids = new Set<string>();
for (const m of parsed.data) {
  if (ids.has(m.id)) problems.push(`duplicate id ${m.id}`);
  ids.add(m.id);
}
if (problems.length) {
  for (const p of problems) console.error("content/memories.json: " + p);
  process.exit(1);
}
console.log(`content/memories.json OK (${parsed.data.length} memories)`);

// ---- content/galleries.json (tools/build-galleries.py): four school-year galleries
const Item = z.object({
  kind: z.enum(["image", "video"]),
  src: z.string().startsWith("/memories/"),
  poster: z.string().startsWith("/memories/").optional(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
const Gallery = z.object({
  year: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  place: z.enum(["gate", "building", "hall", "stage"]),
  title: z.string().min(1),
  subtitle: z.string(),
  events: z.array(z.object({ id: z.string().min(1), title: z.string().min(1).max(80), items: z.array(Item).min(1) })),
});
const gal = z.array(Gallery).length(4).safeParse(JSON.parse(readFileSync(join(process.cwd(), "content", "galleries.json"), "utf8")));
if (!gal.success) {
  console.error("content/galleries.json is invalid:");
  for (const issue of gal.error.issues) console.error(`  [${issue.path.join(".")}] ${issue.message}`);
  process.exit(1);
}
const gProblems: string[] = [];
const gIds = new Set<string>();
for (const g of gal.data) {
  for (const e of g.events) {
    if (gIds.has(e.id)) gProblems.push(`duplicate event id ${e.id}`);
    gIds.add(e.id);
    for (const it of e.items) {
      for (const f of [it.src, it.poster]) if (f && !existsSync(join(process.cwd(), "public", f))) gProblems.push(`${e.id}: ${f} not found under public/`);
    }
  }
}
if (gProblems.length) {
  for (const p of gProblems) console.error("content/galleries.json: " + p);
  process.exit(1);
}
console.log(`content/galleries.json OK (${gal.data.reduce((n, g) => n + g.events.length, 0)} events)`);
