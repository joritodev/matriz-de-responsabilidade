export type ExtensionCopyInput = {
  matrixName: string;
  sequenceNumber: number;
  taskTitle: string;
  responsibleNames: string[];
  currentDueDate: string | null;
  requestedDueDate: string | null;
  approvedDueDate?: string | null;
  reason: string | null;
  extensionNumber: number;
};

function formatPtBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function responsiblesLabel(names: string[]): string {
  if (names.length === 0) return "—";
  return names.join(", ");
}

/** UC-22 — texto para colar no grupo dos chefes (BR-74). */
export function buildExtensionRequestToChefsText(input: ExtensionCopyInput): string {
  const nextNumber = input.extensionNumber + 1;
  return [
    `Pedido de prorrogação — ${input.matrixName}`,
    "",
    `Demanda #${input.sequenceNumber}`,
    `Responsável: ${responsiblesLabel(input.responsibleNames)}`,
    `Tarefa: ${input.taskTitle}`,
    `Prazo atual: ${formatPtBr(input.currentDueDate)}`,
    `Nova previsão pedida: ${formatPtBr(input.requestedDueDate)}`,
    `Motivo: ${input.reason?.trim() || "não informado"}`,
    `Prorrogação seria a nº ${nextNumber}.`,
    "",
    "Nenhuma data foi alterada ainda.",
    "Posso aprovar, ajustar a data, ou recusar e buscar como reduzir o atraso?",
  ].join("\n");
}

/** UC-22 — texto para o responsável após aprovação. */
export function buildExtensionApprovedToResponsibleText(input: ExtensionCopyInput): string {
  return [
    `Prorrogação aprovada — ${input.matrixName}`,
    "",
    `Demanda #${input.sequenceNumber}`,
    `Tarefa: ${input.taskTitle}`,
    `Prazo anterior: ${formatPtBr(input.currentDueDate)}`,
    `Novo prazo: ${formatPtBr(input.approvedDueDate ?? input.requestedDueDate)}`,
  ].join("\n");
}

/** UC-22 — texto para o responsável após rejeição. */
export function buildExtensionRejectedToResponsibleText(input: ExtensionCopyInput): string {
  return [
    `Prorrogação não aprovada — ${input.matrixName}`,
    "",
    `Demanda #${input.sequenceNumber}`,
    `Tarefa: ${input.taskTitle}`,
    `O prazo segue ${formatPtBr(input.currentDueDate)}.`,
    "Vamos conversar para evitar ou pelo menos reduzir o atraso.",
  ].join("\n");
}
