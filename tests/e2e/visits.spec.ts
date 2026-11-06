import { expect, test } from "@playwright/test";
import { FIXTURES, resetFixtures, setJourneyVersion, testDb } from "./global-setup";

test.beforeEach(async () => {
  await resetFixtures();
  await setJourneyVersion(1);
});

test.afterAll(async () => {
  await setJourneyVersion(0);
});

test("first visit shows the overlay; after skipping, a reload shows the card with no overlay or prompt", async ({ page }) => {
  await page.goto(`/i/${FIXTURES.fresh.code}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Vào thiệp mời" }).first().click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(async () => {
    const { data } = await testDb().from("guests").select("opened_at").eq("invite_code", FIXTURES.fresh.code).single();
    return data?.opened_at;
  }).not.toBeNull();

  await page.reload();
  await expect(page.getByText(FIXTURES.fresh.name.replace("Khách ", ""))).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Hành trình mới — chơi thử?")).toBeHidden();
});

test("a guest who opened during Release A sees the new-journey prompt once", async ({ page }) => {
  await page.goto(`/i/${FIXTURES.opened.code}`);
  await expect(page.getByText("Hành trình mới — chơi thử?")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Để sau" }).click();
  await expect(page.getByText("Hành trình mới — chơi thử?")).toBeHidden();
  await expect.poll(async () => {
    const { data } = await testDb().from("guests").select("journey_version_seen").eq("invite_code", FIXTURES.opened.code).single();
    return data?.journey_version_seen;
  }).toBe(1);

  await page.reload();
  await expect(page.getByText("Hành trình mới — chơi thử?")).toBeHidden();
});

test("replay ends on the card and never changes opened_at", async ({ page }) => {
  const db = testDb();
  const before = await db.from("guests").select("opened_at").eq("invite_code", FIXTURES.answered.code).single();
  await db.from("guests").update({ journey_version_seen: 1 }).eq("invite_code", FIXTURES.answered.code);

  await page.goto(`/i/${FIXTURES.answered.code}`);
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Chơi lại hành trình" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Vào thiệp mời" }).first().click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Chơi lại hành trình" })).toBeVisible();

  const after = await db.from("guests").select("opened_at").eq("invite_code", FIXTURES.answered.code).single();
  expect(new Date(after.data!.opened_at).getTime()).toBe(new Date(before.data!.opened_at).getTime());
});
