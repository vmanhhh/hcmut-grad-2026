import { expect, test, type Page } from "@playwright/test";
import { FIXTURES, resetFixtures, setJourneyVersion, testDb } from "./global-setup";

test.beforeEach(async () => {
  await resetFixtures();
  await setJourneyVersion(1);
});

test.afterAll(async () => {
  await setJourneyVersion(0);
});

/** Blocks the lazy game chunk (Phaser + game/) so only the host-owned HTML overlay is available. */
async function blockGameChunk(page: Page) {
  await page.route(/\/_next\/static\/.*(phaser|game)/i, (route) => route.abort());
}

function countOpens(page: Page) {
  const counter = { n: 0 };
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/open")) counter.n++;
  });
  return counter;
}

test("Vào thiệp mời works before Phaser loads, shows the card and posts /open exactly once", async ({ page }) => {
  await blockGameChunk(page);
  const opens = countOpens(page);
  await page.goto(`/i/${FIXTURES.fresh.code}`);

  const overlay = page.getByRole("dialog");
  await expect(overlay).toBeVisible();
  const skip = page.getByRole("button", { name: "Vào thiệp mời" }).first();
  await expect(skip).toBeVisible({ timeout: 1000 });
  await skip.click();

  await expect(overlay).toBeHidden();
  await expect(page.getByText(FIXTURES.fresh.name.replace("Khách ", ""))).toBeVisible();
  await expect.poll(() => opens.n).toBe(1);

  const { data } = await testDb().from("guests").select("opened_at").eq("invite_code", FIXTURES.fresh.code).single();
  expect(data?.opened_at).not.toBeNull();
});

test("a blocked game chunk falls back to the card within about 8 seconds", async ({ page }) => {
  await blockGameChunk(page);
  const opens = countOpens(page);
  await page.goto(`/i/${FIXTURES.fresh.code}`);
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });
  await expect.poll(() => opens.n).toBe(1);
});
