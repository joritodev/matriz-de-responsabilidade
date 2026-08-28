import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@local.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123456";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("MVP — fluxos principais (sem WhatsApp automático)", () => {
  test("login e dashboard", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Fila de atenção")).toBeVisible();
  });

  test("navegação: matrizes, visão geral, responsáveis", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Matrizes" }).click();
    await expect(page.getByRole("heading", { name: "Matrizes" })).toBeVisible();

    await page.getByRole("link", { name: "Visão Geral" }).click();
    await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Atrasadas" })).toBeVisible();

    await page.getByRole("link", { name: "Responsáveis" }).click();
    await expect(page.getByRole("heading", { name: "Responsáveis" })).toBeVisible();
  });

  test("caixa de entrada e filtros", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Caixa de Entrada" }).click();
    await expect(page.getByRole("heading", { name: "Caixa de Entrada" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prorrogações" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Validar entrega" })).toBeVisible();
  });

  test("validar datas e lembretes assistidos", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Validar datas" }).click();
    await expect(page.getByRole("heading", { name: "Validar datas" })).toBeVisible();

    await page.getByRole("link", { name: "Lembretes de hoje" }).click();
    await expect(page.getByRole("heading", { name: "Lembretes de hoje" })).toBeVisible();
    await expect(page.getByText("passada")).toBeVisible();
  });

  test("histórico de prorrogações e configurações", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Prorrogações" }).click();
    await expect(page.getByRole("heading", { name: "Prorrogações", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Configurações" }).click();
    await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();
    await expect(page.getByText("Adiado")).toBeVisible();
  });

  test("filtro de visão geral — atrasadas", async ({ page }) => {
    await login(page);
    await page.goto("/overview?view=overdue");
    await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible();
    const active = page.getByRole("link", { name: "Atrasadas" });
    await expect(active).toHaveAttribute("href", "/overview?view=overdue");
  });
});
