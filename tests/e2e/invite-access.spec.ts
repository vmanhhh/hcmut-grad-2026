import { expect, test } from "@playwright/test";
import { FIXTURES, FIXTURE_MESSAGES, resetFixtures, setJourneyVersion } from "./global-setup";

test.beforeEach(async () => {
  await resetFixtures();
  await setJourneyVersion(0);
});

test("a valid code shows only its own guest", async ({ page }) => {
  const res = await page.goto(`/i/${FIXTURES.fresh.code}`);
  expect(res?.status()).toBe(200);
  const body = page.locator("body");
  await expect(body).toContainText(FIXTURES.fresh.name.replace("Khách ", "")); // salutation: "Gửi {name}"
  await expect(body).toContainText(FIXTURE_MESSAGES.fresh);
  const html = await page.content();
  expect(html).not.toContain(FIXTURES.opened.name);
  expect(html).not.toContain(FIXTURES.answered.name);
  expect(html).not.toContain(FIXTURE_MESSAGES.opened);
});

test("unknown and malformed codes return an identical 404", async ({ page }) => {
  const bodies: string[] = [];
  for (const code of ["AAAAAAAAAAAA", "abc"]) {
    const res = await page.goto(`/i/${code}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Thiệp không hợp lệ")).toBeVisible();
    bodies.push(await page.locator("main").innerText());
  }
  expect(bodies[0]).toBe(bodies[1]);
});

test("the root page shows no guest data", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  for (const f of Object.values(FIXTURES)) expect(text).not.toContain(f.name);
  expect(text).toContain("Thiệp không hợp lệ");
});

test("the page head contains no guest name", async ({ page }) => {
  await page.goto(`/i/${FIXTURES.fresh.code}`);
  const head = await page.locator("head").innerHTML();
  expect(head).not.toContain(FIXTURES.fresh.name);
  expect(head).not.toContain(FIXTURES.fresh.name.replace("Khách ", ""));
  expect(head).not.toContain(FIXTURE_MESSAGES.fresh);
});
