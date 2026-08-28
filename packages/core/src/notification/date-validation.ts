import { firstName } from "./reminder-message";

export type DateValidationTaskLine = {
  matrixName: string;
  sequenceNumber: number;
  title: string;
  dueLabel: string;
  prerequisiteNote?: string | null;
};

function formatPtBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Texto para validar com o responsável se as datas da matriz estão corretas
 * (antes de cobrar de fato). Uso assistido — admin copia e envia.
 */
export function buildDateValidationMessage(input: {
  responsibleName: string;
  tasks: DateValidationTaskLine[];
}): string {
  const name = firstName(input.responsibleName);
  const lines = input.tasks.map((task, index) => {
    const base = `${index + 1}) ${task.title} (${task.matrixName} #${task.sequenceNumber}) — prazo ${task.dueLabel}`;
    if (task.prerequisiteNote) return `${base}\n   (${task.prerequisiteNote})`;
    return base;
  });

  return [
    `Oi, ${name}! Tudo bem?`,
    "",
    "Estou conferindo com cada responsável se as datas que colocamos nas matrizes estão certas — antes de começar a cobrar de fato, quero só alinhar contigo.",
    "",
    "Essas demandas suas já estão chegando no prazo:",
    "",
    ...lines,
    "",
    "Pode me dizer, para cada uma:",
    "• a data está correta?",
    "• ou precisa ajustar? Se sim, qual seria a data realista?",
    "",
    "Não é cobrança ainda — é só validação das datas da matriz. Valeu!",
  ].join("\n");
}

export function dateValidationDueLabel(input: {
  currentDueDate: string | null;
  deadlineExplanation: string | null;
}): string {
  if (input.deadlineExplanation?.trim()) return input.deadlineExplanation.trim();
  return formatPtBr(input.currentDueDate);
}
