import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { v7 as uuidv7 } from "uuid";
import { loadEnv } from "@matriz/config";
import { createDb } from "./client";
import { brNationalHolidaySeed } from "./data/br-national-holidays";
import { businessCalendars, holidays, systemSettings, users } from "./schema/index";

async function main() {
  const env = loadEnv();
  const { db, client } = createDb(env.databaseUrl);

  const calendarId = uuidv7();
  const existingCalendar = await db
    .select()
    .from(businessCalendars)
    .where(eq(businessCalendars.code, "BR-NATIONAL"))
    .limit(1);

  let resolvedCalendarId = existingCalendar[0]?.id ?? calendarId;
  if (!existingCalendar[0]) {
    await db.insert(businessCalendars).values({
      id: calendarId,
      code: "BR-NATIONAL",
      name: "Calendário nacional BR",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      weekendDays: [0, 6],
      isDefault: true,
    });
  }

  const holidayRows = brNationalHolidaySeed();
  for (const row of holidayRows) {
    await db
      .insert(holidays)
      .values({
        id: uuidv7(),
        calendarId: resolvedCalendarId,
        observedOn: row.observedOn,
        name: row.name,
        kind: "NATIONAL",
        source: "BR-NATIONAL-SEED",
        year: row.year,
      })
      .onConflictDoNothing({ target: [holidays.calendarId, holidays.observedOn] });
  }

  const adminEmail = env.seedAdminEmail ?? "admin@local.test";
  const adminName = env.seedAdminName ?? "Administrador";
  const adminPassword = env.seedAdminPassword ?? "change-me-local-only";

  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (!existingAdmin[0]) {
    await db.insert(users).values({
      id: uuidv7(),
      name: adminName,
      email: adminEmail,
      passwordHash: await hash(adminPassword, 12),
      role: "ADMIN",
      active: true,
    });
  }

  const settings: Array<{ key: string; value: unknown }> = [
    { key: "timezone", value: "America/Sao_Paulo" },
    { key: "locale", value: "pt-BR" },
    { key: "default_calendar_id", value: resolvedCalendarId },
    {
      key: "allowed_matrix_types",
      value: ["GENERAL", "PROJECT", "COURSE", "PRODUCT", "EVENT", "OTHER"],
    },
    { key: "due_soon_business_days", value: 3 },
  ];

  for (const setting of settings) {
    await db
      .insert(systemSettings)
      .values({
        key: setting.key,
        value: setting.value,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
