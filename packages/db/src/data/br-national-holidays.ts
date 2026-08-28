/** Feriados federais fixos BR — seed 2026–2028 (docs/04-deadline-engine.md §3.3). */
export type NationalHolidaySeed = {
  observedOn: string;
  name: string;
  year: number;
};

const FIXED_NATIONAL: { monthDay: string; name: string }[] = [
  { monthDay: "01-01", name: "Confraternização Universal" },
  { monthDay: "04-21", name: "Tiradentes" },
  { monthDay: "05-01", name: "Dia do Trabalho" },
  { monthDay: "09-07", name: "Independência" },
  { monthDay: "10-12", name: "Nossa Senhora Aparecida" },
  { monthDay: "11-02", name: "Finados" },
  { monthDay: "11-15", name: "Proclamação da República" },
  { monthDay: "11-20", name: "Consciência Negra" },
  { monthDay: "12-25", name: "Natal" },
];

const YEARS = [2026, 2027, 2028] as const;

export function brNationalHolidaySeed(years: readonly number[] = YEARS): NationalHolidaySeed[] {
  const rows: NationalHolidaySeed[] = [];
  for (const year of years) {
    for (const holiday of FIXED_NATIONAL) {
      rows.push({
        observedOn: `${year}-${holiday.monthDay}`,
        name: holiday.name,
        year,
      });
    }
  }
  return rows;
}
