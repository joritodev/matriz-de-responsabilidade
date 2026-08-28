# Assumptions da FASE 0

**Status:** travadas para a especificação. Reabrir só com decisão explícita do dono.  
**Lei:** `PROMPT.md`  
**Perguntas ao dono:** `docs/11-open-questions.md` (Q1–Q5 **respondidas** em 27/08/2026)

Estas assumptions não bloqueiam arquitetura. Onde o `PROMPT.md` era ambíguo, a FASE 0 escolheu um lado para poder desenhar modelo, estados e fatias verticais.

---

## Decisões travadas

| ID | Assumption |
|----|------------|
| **A1** | Aplicação interna single-tenant. Um único espaço de trabalho. Sem multi-organização no MVP. |
| **A2** | Locale `pt-BR`. Timezone padrão `America/Sao_Paulo`, configurável em `system_settings`. |
| **A3** | Código e schema em inglês (`Matrix`, `Task`, `Responsible`). UI em português. |
| **A4** | Stack: Next.js (App Router) + React + TypeScript strict + Tailwind + shadcn/ui + TanStack Table + React Hook Form + Zod; PostgreSQL + Drizzle; pnpm; Docker Compose; Vitest + Testing Library + Playwright. |
| **A5** | Monorepo: `apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/whatsapp`, `packages/ai`, `packages/config`, `packages/shared`. Domínio só em `packages/core`. |
| **A6** | Jobs: pg-boss (PostgreSQL). Sem Redis no MVP. Worker processo separado. |
| **A7** | WhatsApp: Meta Cloud API oficial via `WhatsAppProvider` quando existir WABA. Sem WhatsApp Web / Puppeteer. **Q2:** hoje não há WABA/CNPJ; FASE 1–2 com `WHATSAPP_ENABLED=false` e textos copiáveis. Ver `docs/runbooks/whatsapp-waba-brasil.md`. |
| **A8** | IA: OpenAI Responses API + Structured Outputs + Zod. Modelo via ENV. Nunca ponto único de falha. |
| **A9** | Auth MVP: tabela `users` desde o dia 1 (`created_by`, audit). Papéis no schema: `ADMIN` e `OPERATOR`. **Q1:** só o dono é ADMIN; `OPERATOR` não é seedado nem exposto na UI do MVP. Sessão por cookie httpOnly. Sem OAuth. |
| **A10** | Matriz ativa ⇔ `archived_at IS NULL`. O campo `active` do prompt é derivado, não fonte de verdade. |
| **A11** | `sequence_number` incremental por matriz, imutável após criação = ordem de cadastro. Não é prioridade. Não gera dependência. `display_order` editável depois, com audit. |
| **A12** | Dependência só existe se cadastrada em `task_dependencies`. Múltiplos pré-requisitos = AND (todas `COMPLETED` validadas). Ciclos e auto-dependência proibidos. |
| **A13** | Status operacional persistido. Status de prazo sempre calculado (cache com `computed_at` permitido, nunca fonte de verdade). Status de prorrogação persistido. |
| **A14** | “Já entreguei” → `WAITING_FOR_VALIDATION` + inbox. Só `ADMIN` confirma → `COMPLETED`. Dispara `TaskCompleted` / `TaskDeliveryValidated` e pode satisfazer dependências. |
| **A15** | IA não muta estado de domínio. Só persiste classificação + item de inbox + sugestão. Prazo, status, responsável e dependências exigem ação humana. |
| **A16** | Recorrência: uma `Task`, não clonar linhas por mês. `DeadlineRule` + `deadline_occurrences`. Completar um período registra a ocorrência e abre o próximo (volta a `PENDING`). **Q3 = A, confirmado pelo dono.** |
| **A17** | Visão Geral = query agregada, não duplicação. Default: matrizes ativas. Filtro para incluir arquivadas. |
| **A18** | Tipo de matriz: string controlada (`GENERAL \| PROJECT \| COURSE \| PRODUCT \| EVENT \| OTHER`) + config extensível. Sem ENUM rígido de banco. Tipo `GENERAL` ≠ visão “Geral”. |
| **A19** | Papel de responsável: texto livre com sugestões, não enum rígido. |
| **A20** | Múltiplos responsáveis: N:N em `task_responsibles`. Notificações para todos os ativos. Digest por pessoa. Sem responsável primário no MVP. |
| **A21** | Feriados: calendário padrão BR com seed nacional 2026–2028 + feriados custom. Cálculo local, sem API externa obrigatória. |
| **A22** | Dias úteis = segunda a sexta, excluindo feriados do calendário da regra. |
| **A23** | Outbox transacional para efeitos (WhatsApp, alerta admin). Evento de domínio ≠ efeito. pg-boss processa a outbox. Sem tabela `domain_events`. Sem tabela `automation_jobs` paralela. |
| **A24** | Grupos de WhatsApp **via API:** não dependentes. **Q4:** o grupo dos chefes é humano. O sistema gera texto copiável; o ADMIN cola no grupo. Sem Groups API no MVP. |
| **A25** | Digest: se o mesmo responsável teria 2+ lembretes no mesmo dia, preferir digest. Configurável. |
| **A26** | Não lembrar: `COMPLETED` / `CANCELLED`; `WAITING_FOR_TRIGGER`; bloqueada cobrada como atraso do responsável. Bloqueio gera inbox para o admin e follow-up gentil opcional. |
| **A27** | Observações da tabela = projeção (status + prazo + prorrogações + notas). `task_notes` para texto livre. |
| **A28** | `original_due_date` preservado. Prazo vigente só muda por: cálculo inicial, trigger de dependência validado, aprovação de prorrogação, edição humana da regra. `FIXED_DATE` não muda ao concluir outra tarefa. |
| **A29** | `BUSINESS_DAYS_AFTER_DEPENDENCY` dispara quando a tarefa gatilho entra em `COMPLETED` (validada), não quando alguém diz que entregou. |
| **A30** | Sócios = chefes do dono. Canal MVP = `CLIPBOARD_GROUP` (mensagem para colar). Não seedar telefones dos chefes. `NotificationTargets` pode ficar vazio. |
| **A31** | `correlation_id` em webhook → mensagem → IA → inbox → notificação. |
| **A32** | Se IA, WhatsApp ou worker cair, dados e prazos continuam corretos e auditáveis. |
| **A33** | FASE 1 do roadmap não inclui WhatsApp. O Definition of Done do MVP (`PROMPT.md` §48) cobre até a FASE 5. |
| **A34** | Quick capture, import DOCX/CSV e templates de matriz: FASE 7. Arquitetura deve permitir; não implementar agora. |
| **A35** | Logs: Pino; mascarar telefone; nunca commitar secrets. |
| **A36** | UX: desktop-first, tabela central, pouco clique, sem animação excessiva. |
| **A37** | Graphify ([Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)) é skill de primeira classe. Agentes consultam `graphify-out/` antes de explorar o repo. Não é dependência de runtime. Ver `docs/13-graphify.md`. |
| **A38** | **Q5 = A:** um claim de entrega de qualquer responsável abre `WAITING_FOR_VALIDATION` da tarefa inteira. Sem entrega parcial no MVP. |

---

## Inconsistências do PROMPT.md e como foram resolvidas

| ID | Inconsistência | Resolução |
|----|----------------|-----------|
| **I1** | `active` + `archived_at` redundantes | **A10** |
| **I2** | `sequence_number` vs coluna Ordem vs edição de exibição | **A11** |
| **I3** | Recalcular datas ao concluir dependência vs prazo fixo | **A28** — só prazos relativos/trigger |
| **I4** | Status de prazo `COMPLETED` sobrepõe o operacional | Prazo calculado usa `NOT_APPLICABLE` quando operacional é `COMPLETED`/`CANCELLED` |
| **I5** | Template `{{nome}}` singular vs N responsáveis | Renderizar por destinatário |
| **I6** | “Definição da data da live” pode ser marco, não conclusão | MVP: trigger = `COMPLETED` da gatilho. `trigger_type` reservado para FASE 7 |
| **I7** | Visão Geral vs tipo `GENERAL` | **A18** |
| **I8** | Outbox vs pg-boss vs `automation_jobs` | Outbox persiste o efeito; pg-boss é o poller; sem tabela extra |
| **I9** | `WAITING_FOR_INPUT` vs inbox | Inbox = fila do admin; `WAITING_FOR_INPUT` = estado da tarefa. Coexistem |
| **I10** | DoD §48 inclui WhatsApp; FASE 1 não | **A33** — slices deixam isso explícito |

---

## Integração (decisões do agente principal)

- Eventos de domínio são **in-process**. Não há tabela `domain_events`.
- `outbox_messages` substitui `automation_jobs`.
- ENV canônica da URL pública: `APP_URL`.
- Modelo OpenAI: sem valor hardcoded; obrigatório somente se `AI_ENABLED=true`.
- AuthZ MVP: só `ADMIN` (único usuário seedado) aprova prorrogação, confirma entrega e altera dependências.
- Pedido de prorrogação gera texto para o **grupo dos chefes**; a decisão no app gera texto de volta ao **responsável**. O sistema não fala no grupo sozinho.
