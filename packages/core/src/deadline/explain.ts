export function formatDeadlineExplanation(
  deadlineType: string | null | undefined,
  explanation: Record<string, unknown> | null | undefined,
): string | null {
  if (!explanation || typeof explanation !== "object") {
    if (deadlineType === "MANUAL") return "Prazo manual — sem data calculada automaticamente.";
    return null;
  }

  const type = String(explanation.type ?? deadlineType ?? "");

  if (type === "FIXED_DATE") {
    const date = explanation.date ?? explanation.dueDate;
    return date ? `Data fixa cadastrada: ${formatPtBr(String(date))}.` : "Data fixa cadastrada.";
  }

  if (type === "BUSINESS_DAYS_AFTER_CREATION") {
    const amount = explanation.amount;
    const anchor = explanation.anchor;
    return `Contagem de ${amount} dias úteis a partir do cadastro (${formatPtBr(String(anchor ?? "—"))}), pulando fins de semana e feriados nacionais.`;
  }

  if (type === "BUSINESS_DAYS_AFTER_DEPENDENCY") {
    if (explanation.waitingForTrigger) {
      return `Aguardando conclusão validada da(s) dependência(s) para calcular ${explanation.amount} dias úteis.`;
    }
    const amount = explanation.amount;
    const anchor = explanation.anchor;
    return `${amount} dias úteis após a validação da dependência (âncora ${formatPtBr(String(anchor ?? "—"))}), pulando fins de semana e feriados.`;
  }

  if (type === "CALENDAR_DAYS_AFTER_TRIGGER") {
    if (explanation.waitingForTrigger) {
      return `Aguardando conclusão validada do gatilho para calcular ${explanation.amount} dias corridos.`;
    }
    const amount = explanation.amount;
    const anchor = explanation.anchor;
    return `${amount} dias corridos após a validação do gatilho (âncora ${formatPtBr(String(anchor ?? "—"))}). Fins de semana e feriados entram na contagem.`;
  }

  if (type === "RECURRING_BUSINESS_DAY") {
    const nth = explanation.nth ?? 3;
    const month = explanation.month;
    const year = explanation.year;
    const dueDate = explanation.dueDate;
    const period =
      year && month ? `${String(month).padStart(2, "0")}/${year}` : "período corrente";
    return `${nth}º dia útil de ${period} → ${formatPtBr(String(dueDate ?? "—"))}. Sábados, domingos e feriados não entram na contagem.`;
  }

  if (type === "MANUAL" && explanation.label) {
    return String(explanation.label);
  }

  return null;
}

function formatPtBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
