import { expect, test } from "@playwright/test";
import { FIXTURES, resetFixtures, setJourneyVersion, testDb } from "./global-setup";

test.beforeEach(async () => {
  await resetFixtures();
  await setJourneyVersion(0);
});

test("RSVP yes + late + party 2 + wish persists across reload, and changing to no clears window and party", async ({ page }) => {
  await page.goto(`/i/${FIXTURES.fresh.code}`);

  await page.getByLabel("Có, mình tới").check();
  await page.getByLabel("17:30–18:30").check();
  await page.getByRole("button", { name: "Tăng số người" }).click();
  await expect(page.getByTestId("party-size")).toHaveText("2");
  await page.getByLabel(/Lời nhắn cho Mạnh/).fill("Chúc mừng Mạnh nhé!");
  await page.getByRole("button", { name: "Gửi câu trả lời" }).click();
  await expect(page.getByTestId("rsvp-saved")).toContainText("17:30–18:30");

  await page.reload();
  await expect(page.getByTestId("rsvp-saved")).toContainText("2 người");
  await expect(page.getByLabel("Có, mình tới")).toBeChecked();
  await expect(page.getByLabel("17:30–18:30")).toBeChecked();
  await expect(page.getByLabel(/Lời nhắn cho Mạnh/)).toHaveValue("Chúc mừng Mạnh nhé!");

  // Change to No: window and party size are cleared.
  await page.getByLabel("Tiếc quá, không tới được").check();
  await page.getByRole("button", { name: "Cập nhật câu trả lời" }).click();
  await expect(page.getByTestId("rsvp-saved")).toContainText("không tới được");

  const { data } = await testDb()
    .from("guests")
    .select("rsvp, meeting_window, party_size")
    .eq("invite_code", FIXTURES.fresh.code)
    .single();
  expect(data).toEqual({ rsvp: "no", meeting_window: null, party_size: null });
});

test("Yes without a window is blocked with a visible error", async ({ page }) => {
  await page.goto(`/i/${FIXTURES.fresh.code}`);
  await page.getByLabel("Có, mình tới").check();
  await page.getByRole("button", { name: "Gửi câu trả lời" }).click();
  await expect(page.getByRole("alert")).toContainText("khung giờ");

  const { data } = await testDb().from("guests").select("rsvp").eq("invite_code", FIXTURES.fresh.code).single();
  expect(data?.rsvp).toBeNull();
});
