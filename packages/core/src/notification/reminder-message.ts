import type { DeadlineStatus } from "../status/types";

export type ReminderMessageInput = {
  responsibleName: string;
  taskTitle: string;
  matrixName?: string | null;
  dueDate: string | null;
  deadlineStatus: DeadlineStatus;
  overdueDays?: number;
};

/**
 * Copy dos lembretes operacionais (docs/01-functional-spec.md §529: humano, curto,
 * educado, não robótico). O mesmo texto alimenta o envio assistido por wa.me hoje e
 * os templates UTILITY da Cloud API quando houver WABA.
 */
export function buildReminderMessage(input: ReminderMessageInput): string {
  const name = firstName(input.responsibleName);
  const due = formatPtBr(input.dueDate);
  const task = `"${input.taskTitle}"`;

  switch (input.deadlineStatus) {
    case "OVERDUE": {
      const since = input.overdueDays && input.overdueDays > 0
        ? ` (há ${input.overdueDays} ${input.overdueDays === 1 ? "dia" : "dias"})`
        : "";
      return `Oi, ${name}! O prazo da demanda ${task} venceu em ${due}${since}. Não é cobrança — só quero entender como está e se precisa de ajuda ou de um prazo novo.`;
    }
    case "DUE_TODAY":
      return `Oi, ${name}! A demanda ${task} vence hoje (${due}). Consegue fechar ainda hoje? Se tiver algum impedimento, me avisa que a gente resolve.`;
    case "DUE_SOON":
      return `Oi, ${name}! Passando pra lembrar da demanda ${task} — o prazo é ${due}. Se precisar de mais tempo ou estiver travado em alguma coisa, é só falar.`;
    case "WAITING_FOR_TRIGGER":
      return `Oi, ${name}! A demanda ${task} depende de outra etapa antes de ganhar prazo. Te aviso assim que destravar.`;
    default:
      return `Oi, ${name}! Uma atualização rápida sobre a demanda ${task}${due === "—" ? "" : ` (prazo ${due})`}. Como está?`;
  }
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "tudo bem";
  return trimmed.split(/\s+/)[0]!;
}

function formatPtBr(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
