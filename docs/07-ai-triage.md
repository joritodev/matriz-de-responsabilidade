# 07 — IA para triagem (human-in-the-loop)

**Fase:** 0 (especificação). Sem código de produção.  
**Fonte de verdade de domínio:** PostgreSQL, nunca o modelo.  
**Decisões herdadas:** A8, A14, A15, A23, A31, A32.  
**APIs consultadas (2026-08):** [OpenAI Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Este documento define **quando** a IA entra, **o que** ela recebe, **o JSON** que devolve, **o que o sistema pode fazer** com esse JSON e **o que a IA é proibida de fazer**.

---

## 1. Princípios

1. **Automação inicia e organiza; humano negocia e decide** (PROMPT §3). Não existe chatbot autônomo com conversa livre.
2. **A IA não é fonte de verdade** (PROMPT §37). Banco de dados é. Toda saída da IA é um *parecer operacional* versionado.
3. **A IA não muta domínio** (A15). O LLM só devolve JSON. Efeitos colaterais são código determinístico em `packages/core`, nunca em `packages/ai`.
4. **IA nunca é ponto único de falha** (A8, A32, PROMPT §39). Se a OpenAI cair, mensagem, prazos e histórico permanecem corretos.
5. **IA nunca entra no caminho crítico de prazo.** Cálculo de `due_date`, status de prazo, feriados, atraso e agendamento de lembrete são determinísticos e **não** chamam modelo.
6. **Não usar IA para operações determinísticas** (PROMPT §47): não calcular prazo, não decidir se está atrasada, não inferir dependência pela ordem da demanda.

---

## 2. Papel da IA neste produto

A IA existe **somente** para triagem de mensagens inbound de responsáveis (WhatsApp), depois que a mensagem já foi persistida.

Ela deve:

1. interpretar o texto;
2. classificar;
3. extrair entidades (prazo pedido, pessoas, bloqueios);
4. resumir;
5. sugerir uma ação e um rascunho de resposta;
6. sinalizar se o administrador precisa intervir.

Ela **não** deve conversar de volta com o responsável, nem alterar tarefa, prazo, responsável ou dependência.

---

## 3. Quando a IA é acionada

### 3.1 Gatilho único no MVP

A IA é acionada **somente após persistir** uma `Message` inbound identificável (PROMPT §17–18).

Fluxo (evento ≠ efeito, A23):

```
webhook Meta
  → validar assinatura
  → persistir Message (idempotente por provider_message_id)
  → gravar outbox: InboundMessagePersisted
  → COMMIT
  → worker (pg-boss) coleta outbox
  → job ClassifyInboundMessage
  → OpenAI Responses API (fora da transação de domínio)
  → validar Zod
  → persistir ai_classifications + efeitos permitidos do sistema
```

`correlation_id` nasce no webhook e atravessa mensagem → job de IA → `ai_classifications` → `inbox_item` → notificação ao admin (A31).

### 3.2 Condições para enfileirar o job

Enfileirar `ClassifyInboundMessage` se **todas** forem verdadeiras:

- `direction = INBOUND`;
- texto normalizado não vazio (após strip);
- mensagem ainda sem classificação bem-sucedida (`ai_classifications` ausente ou última tentativa em falha);
- `AI_ENABLED=true` (kill switch; se `false`, ir direto ao fallback §12).

Não enfileirar para: status de entrega da Meta, echoes, mensagens outbound, templates enviados pelo sistema, reações/stickers sem texto.

### 3.3 Onde a IA é proibida

| Caminho | Pode chamar OpenAI? |
|---|---|
| Cálculo de prazo / Business Calendar / feriados | **Não** |
| Status de prazo (`DUE_SOON`, `OVERDUE`, `WAITING_FOR_TRIGGER`, …) | **Não** |
| Scheduler de lembretes e anti-spam | **Não** |
| Transição `COMPLETED` / `CANCELLED` / mudança de responsável / dependências | **Não** |
| Aprovação de prorrogação e aviso aos sócios | **Não** |
| Persistência do webhook | **Não** (mensagem primeiro) |
| Job `ClassifyInboundMessage` após persistir inbound | **Sim** |

### 3.4 Idempotência do job

- Chave: `message_id`.
- Se já existir `ai_classifications` com `validation_status = VALID`, o job é no-op.
- Falha anterior (`INVALID_OUTPUT`, `PROVIDER_ERROR`, `TIMEOUT`, `REFUSAL`) **pode** ser retentada com backoff, sem duplicar inbox do tipo `CLASSIFICATION_PENDING` (atualizar o existente).

---

## 4. Fronteira IA × sistema × humano (A15)

Três atores, responsabilidades disjuntas:

| Ator | Pode fazer | Não pode fazer |
|---|---|---|
| **LLM** (`packages/ai`) | Devolver JSON no schema §6 | Escrever no banco de domínio, chamar WhatsApp, alterar prazo/status |
| **Sistema** (`packages/core`) | Persistir classificação; criar inbox; gravar `suggested_reply`; efeitos estreitos de §10 | Marcar `COMPLETED`; alterar `calculated_due_date`; mudar responsável; alterar `task_dependencies`; falar com sócios |
| **Humano (ADMIN)** | Aprovar/rejeitar prorrogação; confirmar entrega; responder; mudar status/responsável; resolver inbox | — |

**Decisão AI-D1 (resolve tensão A14 × A15):** o LLM nunca escreve status. Após JSON **válido** com `classification = CLAIMS_DELIVERED`, um *application service* determinístico pode transicionar a tarefa para `WAITING_FOR_VALIDATION` (A14). Isso **não** é conclusão. `COMPLETED` continua exclusivo do ADMIN.

**Decisão AI-D2:** após JSON válido com `classification = EXTENSION_REQUEST`, o sistema cria `DeadlineExtension` com `status = REQUESTED` e **não** altera `calculated_due_date` / `original_due_date` (A28).

**Decisão AI-D3:** nenhuma outra classificação altera status operacional. `BLOCKED`, `NEEDS_INPUT` e `NEEDS_ANOTHER_PERSON` geram inbox; o admin aplica a transição se quiser. Inbox e `WAITING_FOR_INPUT` podem coexistir (I9).

---

## 5. Integração OpenAI (estado atual da API)

### 5.1 API e não Chat Completions

Usar **Responses API** (`POST /v1/responses`), não Chat Completions.

Structured Outputs na Responses API **não** usam `response_format`. Usam `text.format`:

```json
{
  "model": "<OPENAI_MODEL>",
  "input": [ { "role": "system", "content": "..." }, { "role": "user", "content": "..." } ],
  "text": {
    "format": {
      "type": "json_schema",
      "name": "responsibility_triage_v1",
      "strict": true,
      "schema": { }
    }
  }
}
```

No SDK TypeScript oficial: `openai.responses.parse(...)` com `zodTextFormat(TriageOutputSchema, "responsibility_triage_v1")`. O objeto parseado vem em `response.output_parsed`.

**Não usar JSON Mode** (`text.format = { type: "json_object" }`). JSON Mode garante JSON válido, **não** adesão ao schema. Este produto exige adesão (enums, nulos, campos obrigatórios).

### 5.2 Regras de Structured Outputs que o schema deve obedecer

Documentação oficial ([Supported schemas](https://developers.openai.com/api/docs/guides/structured-outputs)):

- raiz = `object` (não `anyOf` / união discriminada no topo);
- **todos** os campos em `required`;
- opcionais emulados com união `null` (`["string","null"]` / `z.string().nullable()`);
- `additionalProperties: false` em **todo** objeto;
- tipos: string, number, boolean, integer, object, array, enum, anyOf;
- `requested_new_deadline` como `string` com `format: "date"` (YYYY-MM-DD) ou `null` — JSON Schema não tem tipo nativo `date`;
- recusar schema com `allOf` / `not` / `if-then-else`.

**Zod é a fonte do contrato na aplicação.** O JSON Schema enviado à API é derivado do Zod (helper do SDK). Depois do parse da API, **validar de novo** com `TriageOutputSchema.parse(...)`. Structured Outputs reduz lixo; não substitui validação de borda (PROMPT §18: nunca confiar em parsing livre).

### 5.3 Recusa, resposta incompleta e reasoning

A API pode devolver `refusal` (safety) em vez do schema. Tratar como falha de classificação → fallback §12.

Resposta `status = incomplete` (ex.: `max_output_tokens`) → fallback.

A Responses API pode emitir itens `reasoning`. **Não persistir** chain-of-thought / reasoning / “raciocínio interno” (PROMPT §37). Guardar só o JSON operacional + metadados §9.

### 5.4 Modelo nunca hardcoded

O identificador do modelo **não** vive em código-fonte nem no prompt versionado.

| ENV | Obrigatória | Função |
|---|---|---|
| `OPENAI_API_KEY` | sim, se `AI_ENABLED=true` | autenticação |
| `OPENAI_MODEL` | sim, se `AI_ENABLED=true` | id do modelo (ex. valor só no `.env`) |
| `OPENAI_BASE_URL` | não | override de endpoint / proxy |
| `AI_ENABLED` | sim (default `true` só no env de deploy) | kill switch |
| `AI_PROMPT_VERSION` | sim | default `responsibility-triage-v1` |
| `AI_SCHEMA_VERSION` | sim | default `responsibility-triage-output-v1` |
| `AI_CONFIDENCE_THRESHOLD` | sim | default `0.75` (ver §8) |
| `AI_TIMEOUT_MS` | sim | default `15000` |
| `AI_MAX_RECENT_MESSAGES` | sim | default `5` |
| `AI_MAX_MESSAGE_CHARS` | sim | default `2000` por mensagem no prompt |

Se `AI_ENABLED=true` e `OPENAI_MODEL` ausente → recusar boot (validação de ENV) ou, no worker, tratar como IA indisponível (fallback). **Não** cair para um modelo default no código.

O valor de `OPENAI_MODEL` gravado em `ai_classifications.model` é o que **de fato** foi enviado na request, para auditoria.

---

## 6. Schema de saída (PROMPT §18)

`AI_SCHEMA_VERSION = responsibility-triage-output-v1`.

### 6.1 Contrato conceitual

```json
{
  "classification": "ON_TRACK | BLOCKED | NEEDS_INPUT | NEEDS_ANOTHER_PERSON | EXTENSION_REQUEST | CLAIMS_DELIVERED | UNCLEAR | OTHER",
  "summary": "string",
  "reason": "string | null",
  "requested_new_deadline": "YYYY-MM-DD | null",
  "mentioned_people": ["string"],
  "dependencies_or_blockers": ["string"],
  "requires_human_action": true,
  "human_action_reason": "string | null",
  "urgency": "LOW | MEDIUM | HIGH",
  "confidence": 0.0,
  "suggested_reply": "string | null"
}
```

### 6.2 Semântica dos campos

| Campo | Semântica | Restrição |
|---|---|---|
| `classification` | Classe única da mensagem **desta** tarefa | Enum fechado. Se ambígua, `UNCLEAR`, não “chutar”. |
| `summary` | 1–3 frases em pt-BR para o admin | Sem inventar prazo, pessoa ou entrega não ditos. |
| `reason` | Motivo citado pelo responsável (bloqueio, material, etc.) | `null` se não houver. |
| `requested_new_deadline` | Nova data **explícita** ou derivável sem chute | Só YYYY-MM-DD; senão `null`. Ver §6.4. |
| `mentioned_people` | Nomes citados, como no texto | Não resolver IDs. Não completar sobrenome. |
| `dependencies_or_blockers` | Impedimentos em linguagem do responsável | Não criar `task_dependencies`. |
| `requires_human_action` | O admin precisa agir? | O sistema **sobrescreve** (§8). |
| `human_action_reason` | Por que o humano entra | Obrigatório (não nulo) se `requires_human_action = true` após override. |
| `urgency` | Prioridade da atenção do admin | Não confundir com `sequence_number`. |
| `confidence` | Autoavaliação 0.0–1.0 | Número; fora da faixa → inválido. |
| `suggested_reply` | Rascunho para o admin enviar | **Nunca** envio automático (§15). Tom humano, curto, pt-BR. |

### 6.3 Zod conceitual (fonte do contrato)

Trecho de spec — não é código de produção. Deve ser compatível com `strict: true` (todos required; opcionais via `.nullable()`).

```ts
const ClassificationEnum = z.enum([
  "ON_TRACK",
  "BLOCKED",
  "NEEDS_INPUT",
  "NEEDS_ANOTHER_PERSON",
  "EXTENSION_REQUEST",
  "CLAIMS_DELIVERED",
  "UNCLEAR",
  "OTHER",
]);

const UrgencyEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

const TriageOutputSchema = z.object({
  classification: ClassificationEnum,
  summary: z.string().min(1).max(500),
  reason: z.string().max(500).nullable(),
  requested_new_deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  mentioned_people: z.array(z.string().min(1).max(80)).max(10),
  dependencies_or_blockers: z.array(z.string().min(1).max(200)).max(10),
  requires_human_action: z.boolean(),
  human_action_reason: z.string().max(500).nullable(),
  urgency: UrgencyEnum,
  confidence: z.number().min(0).max(1),
  suggested_reply: z.string().max(1000).nullable(),
});
```

JSON Schema derivado deve marcar todos os campos `required` e `additionalProperties: false`. `requested_new_deadline` e `reason`, `human_action_reason`, `suggested_reply` usam `anyOf`/`type: ["string","null"]`.

Validação **adicional** em `packages/core` após o Zod (regras que o modelo pode violar mesmo com schema válido):

- se `classification = EXTENSION_REQUEST` e a mensagem não pede prazo, ainda assim a classe pode ser válida com `requested_new_deadline = null`;
- se `classification ≠ EXTENSION_REQUEST`, forçar `requested_new_deadline = null` (ignorar data alucinada);
- se `requires_human_action = true` e `human_action_reason` nulo/vazio → preencher com texto padrão do sistema (`"Revisão humana obrigatória para esta classificação."`);
- aplicar override de confidence e de política §8.

Saída que falha Zod ou JSON Schema → **não** aplicar efeitos de domínio; fallback §12.

### 6.4 Extração de data (anti-alucinação de prazo)

O modelo **não calcula** prazo de negócio. Ele só extrai.

| Texto do responsável | `requested_new_deadline` | `reason` |
|---|---|---|
| “prorrogar até dia 30” e o prazo atual é 25/10/2026 | `2026-10-30` se o mês/ano forem inequívocos no contexto | motivo citado |
| “mais 3 dias” sem data absoluta | `null` | preservar “mais 3 dias…” |
| “até sexta” sem data absoluta inequívoca | `null` | preservar o trecho |
| nenhuma menção a prazo | `null` | `null` ou outro motivo |

**Proibido:** inventar dia/mês/ano; usar “hoje” do treino do modelo; somar dias úteis (isso é Business Calendar). Se houver dúvida, `null` + `UNCLEAR` ou `EXTENSION_REQUEST` com data nula.

O sistema **nunca** copia `requested_new_deadline` para `DeadlineRule` / `calculated_due_date`. No máximo preenche `DeadlineExtension.requested_due_date` como sugestão editável (AI-D2).

### 6.5 Prioridade de classificação (desempate)

Uma mensagem, uma classe. Ordem se várias se aplicarem:

1. `CLAIMS_DELIVERED` se afirmar entrega/conclusão desta demanda;
2. `EXTENSION_REQUEST` se pedir mais prazo / nova data;
3. `BLOCKED` se impedimento concreto;
4. `NEEDS_ANOTHER_PERSON` se depender de pessoa nomeada e não for só bloqueio genérico;
5. `NEEDS_INPUT` se faltar informação/acesso do admin/sistema;
6. `ON_TRACK` se progresso positivo sem pedido nem bloqueio;
7. `UNCLEAR` se não der para decidir;
8. `OTHER` residual (agradecimento, off-topic, etc.).

“Já enviei, mas preciso até dia 30” → `CLAIMS_DELIVERED` ganha; `reason` e `requested_new_deadline` ainda podem ser preenchidos para o admin ver o pedido extra. O sistema aplica AI-D1; **não** cria prorrogação automática nesse desempate (o admin vê o contexto). Registrar assumption **AI-A1**: o inbox de validação de entrega inclui o texto completo; o admin cria prorrogação se ainda fizer sentido.

---

## 7. Input da IA (mínimo necessário)

### 7.1 Princípio de minimização (LGPD / PII)

Enviar **só** o que a classificação exige. Proibido no prompt:

- telefone (`whatsapp_number`, E.164);
- e-mail;
- payload cru do webhook;
- outras matrizes/tarefas não relacionadas;
- histórico longo da conversa;
- secrets, nomes de sócios como destinatários, NotificationTargets.

Logs (Pino, A35): mascarar telefone; não logar o prompt completo em INFO; DEBUG local pode logar `input_hash` + ids, não o texto da mensagem em produção.

### 7.2 Payload estruturado (user message)

Objeto JSON serializado na mensagem `user` (não prosa solta). Campos:

```json
{
  "message": {
    "id": "uuid",
    "normalized_text": "…",
    "sent_at": "2026-08-27T18:40:00-03:00"
  },
  "task": {
    "id": "uuid",
    "sequence_number": 3,
    "title": "Elaborar versão 1",
    "operational_status": "IN_PROGRESS",
    "deadline_status": "ON_TIME"
  },
  "matrix": {
    "id": "uuid",
    "name": "OD Academy",
    "type": "COURSE"
  },
  "responsibles": [
    { "id": "uuid", "name": "Fenilli" }
  ],
  "sender": { "id": "uuid", "name": "Fenilli" },
  "deadline": {
    "current_due_date": "2026-10-25",
    "original_due_date": "2026-10-25",
    "deadline_type": "FIXED_DATE",
    "timezone": "America/Sao_Paulo",
    "extension_status": "NONE",
    "extension_count": 0
  },
  "dependencies": {
    "prerequisites": [
      { "sequence_number": 2, "title": "Definir data da live", "operational_status": "COMPLETED" }
    ],
    "dependents": []
  },
  "recent_messages": [
    {
      "direction": "OUTBOUND",
      "sent_at": "…",
      "text": "…"
    }
  ]
}
```

`recent_messages`: no máximo `AI_MAX_RECENT_MESSAGES` da **mesma** conversa/tarefa, mais recentes, cada uma truncada em `AI_MAX_MESSAGE_CHARS`. Incluir o lembrete outbound que originou a resposta, se couber. Não incluir mensagens de outras tarefas.

Se a mensagem inbound **não** estiver correlacionada a uma tarefa: ainda classificar com `task = null` e forçar `requires_human_action = true`, `classification` tipicamente `UNCLEAR`/`OTHER`, inbox `UNLINKED_MESSAGE`. Assumption **AI-A2**: o correlacionador de tarefa (WhatsApp) é problema do provider/worker, não da IA; a IA não “adivinha” a demanda pelo texto se o sistema não vinculou.

### 7.3 System prompt

Texto fixo da versão `responsibility-triage-v1`. Não interpolar dados de tarefa no system prompt (dados vão no user JSON). Isso permite hashear o system prompt por versão.

Conteúdo normativo do system prompt v1 (resumo obrigatório; o texto integral vive versionado em `packages/ai/prompts/responsibility-triage-v1.md` na FASE 4):

- você classifica respostas de responsáveis sobre demandas de uma matriz;
- responda **somente** no schema; sem markdown, sem cadeia de raciocínio;
- não invente prazos, pessoas, entregas ou dependências;
- não calcule dias úteis;
- uma classe por mensagem, segundo a prioridade §6.5;
- `suggested_reply` é rascunho para o administrador, em português, curto, educado; não promete prorrogação nem conclusão;
- se a mensagem afirmar entrega (“já fiz”, “já enviei”, “está pronto”), use `CLAIMS_DELIVERED` — o sistema **não** marcará concluída;
- se pedir mais prazo, `EXTENSION_REQUEST` mesmo sem data absoluta;
- se confidence for baixa, declare-a honestamente.

---

## 8. Threshold de confidence e override de `requires_human_action`

O modelo **sugere** `requires_human_action` e `confidence`. O sistema **decide**.

Após Zod válido, `ApplyTriagePolicy` (core) aplica, nesta ordem:

1. Se `confidence < AI_CONFIDENCE_THRESHOLD` → `requires_human_action = true` e `human_action_reason` concatenado com `"confidence abaixo do limiar"`.
2. Se `classification ∈ { EXTENSION_REQUEST, CLAIMS_DELIVERED, BLOCKED, NEEDS_INPUT, NEEDS_ANOTHER_PERSON, UNCLEAR }` → `requires_human_action = true`.
3. Se `mentioned_people.length > 0` → `requires_human_action = true` (encaminhar a pessoa é decisão humana).
4. Se `task` não vinculada → `requires_human_action = true`.
5. `ON_TRACK` ou `OTHER` com confidence ≥ limiar e sem pessoas mencionadas: pode permanecer `requires_human_action = false`.

**Default do limiar:** `0.75`. Configurável só por ENV (`AI_CONFIDENCE_THRESHOLD`), não hardcoded de modelo.

Mesmo com `requires_human_action = false`, a classificação é persistida. Não se cria inbox (reduz ruído). O admin ainda vê a classificação na timeline da tarefa.

---

## 9. Persistência: `ai_classifications` e o que **não** guardar

PROMPT §37–38.

### 9.1 Campos obrigatórios da classificação

| Campo | Origem |
|---|---|
| `id` | UUID |
| `message_id` | FK da mensagem inbound |
| `task_id` | nullable se desvinculada |
| `classification` + demais campos do JSON (já pós-policy) | output validado |
| `prompt_version` | `AI_PROMPT_VERSION` efetivo (`responsibility-triage-v1`) |
| `schema_version` | `AI_SCHEMA_VERSION` |
| `model` | `OPENAI_MODEL` usado na request |
| `input_reference` | ver §9.2 |
| `provider_response_id` | id da Responses API, se houver |
| `validation_status` | `VALID` / `INVALID_OUTPUT` / `PROVIDER_ERROR` / `TIMEOUT` / `REFUSAL` / `SKIPPED` |
| `correlation_id` | A31 |
| `created_at` | clock do servidor |
| `latency_ms` | observabilidade |
| `origin` | `AI_SUGGESTION` no audit das ações derivadas |

Guardar o **JSON de output** (pós-policy) em coluna JSONB. É o artefato operacional.

### 9.2 `input_reference`

Não precisa regravar o system prompt inteiro (ele é recuperável pela versão). Gravar:

```json
{
  "prompt_version": "responsibility-triage-v1",
  "schema_version": "responsibility-triage-output-v1",
  "model": "<OPENAI_MODEL>",
  "message_id": "uuid",
  "task_id": "uuid | null",
  "recent_message_ids": ["uuid"],
  "input_hash": "sha256-do-user-json-canônico"
}
```

Opcional (recomendado no MVP interno): snapshot compacto do user JSON em tabela/coluna `ai_classification_inputs` com retenção (LGPD). Não é chain-of-thought; é o insumo. Telefones já não entram nesse JSON.

### 9.3 Proibido persistir

- chain-of-thought, `reasoning`, “thinking”, tokens de raciocínio;
- prompt system duplicado a cada linha (só a versão);
- payload bruto da Meta;
- `OPENAI_API_KEY`;
- output que falhou parse, **exceto** um recorte curto de erro (`error_code`, hash, mensagem de Zod) para debug.

Origin de audit das sugestões: `AI_SUGGESTION`. Origin das transições de sistema (WAITING_FOR_VALIDATION, DeadlineExtension REQUESTED): `SYSTEM`. Nunca esconder (PROMPT §25).

---

## 10. Efeitos permitidos após JSON válido

Executados em transação **depois** da validação, por `ApplyTriageEffects` em `packages/core`. `packages/ai` não importa o domínio.

### 10.1 Sempre (classificação válida)

1. Inserir `ai_classifications` (`VALID`).
2. Atualizar `messages.processing_status = CLASSIFIED`.
3. Emitir evento `MessageClassified` (sem I/O externo na mesma transação; outbox se for notificar).

### 10.2 Inbox

Criar `inbox_item` (Central de Pendências) quando `requires_human_action = true` **ou** quando a classificação está na tabela abaixo.

| classification | Tipo de inbox | Cria inbox? |
|---|---|---|
| `EXTENSION_REQUEST` | `EXTENSION_REQUESTED` | sim |
| `CLAIMS_DELIVERED` | `DELIVERY_CLAIMED` | sim |
| `BLOCKED` | `BLOCKER_DETECTED` | sim |
| `NEEDS_INPUT` | `NEEDS_INPUT` | sim |
| `NEEDS_ANOTHER_PERSON` | `NEEDS_ANOTHER_PERSON` | sim |
| `UNCLEAR` | `UNCLEAR_RESPONSE` | sim |
| `OTHER` + human action | `NEEDS_REVIEW` | sim |
| `ON_TRACK` + human action (baixa confidence) | `NEEDS_REVIEW` | sim |
| `ON_TRACK` + sem human action | — | **não** |

O item aponta para `message_id`, `task_id`, `ai_classification_id`, `correlation_id`. Copiar `suggested_reply` para o rascunho do item (`suggested_reply` da inbox = o do JSON).

### 10.3 `suggested_reply`

Apenas persistido no classification + inbox. **Não** enfileira envio WhatsApp. **Não** abre janela de conversa livre automática.

### 10.4 Efeito de sistema: “já entreguei” (PROMPT §19, A14, caso G)

Se `classification = CLAIMS_DELIVERED` e a tarefa está em estado que admite reivindicação (`PENDING`, `IN_PROGRESS`, `BLOCKED`, `WAITING_FOR_INPUT` — **não** `COMPLETED` / `CANCELLED`):

1. Status operacional → `WAITING_FOR_VALIDATION`.
2. `completed_at` permanece `null`.
3. Evento de domínio `TaskDeliveryClaimed`.
4. Inbox `DELIVERY_CLAIMED` com pergunta ao admin: confirmar entrega?
5. Dependências **não** são satisfeitas (A29: trigger = `COMPLETED` validado).

Se a tarefa já está `WAITING_FOR_VALIDATION`, não repetir a transição; atualizar/agregar inbox.

Se um de vários responsáveis diz “entreguei”, a reivindicação vale para a **tarefa inteira** (Q5 / assumption do brief). O inbox mostra quem falou.

Confirmação do ADMIN → `COMPLETED` + `TaskCompleted` / `TaskDeliveryValidated` (fora deste documento de IA). Rejeição → volta a `IN_PROGRESS` (ou estado anterior registrado no audit) + nota.

### 10.5 Efeito de sistema: pedido de prorrogação (PROMPT §12, caso F)

Se `classification = EXTENSION_REQUEST`:

1. Criar `DeadlineExtension` com `status = REQUESTED`, `request_source = WHATSAPP` (ou `AI_TRIAGE`), `requested_by` = responsável remetente, `reason` do JSON, `requested_due_date` = `requested_new_deadline` (pode ser null), `previous_due_date` = prazo vigente **somente como snapshot informativo**.
2. **Não** alterar `calculated_due_date`, `original_due_date`, regra de prazo, contador de prorrogações aprovadas.
3. Evento `ExtensionRequested`.
4. Inbox `EXTENSION_REQUESTED`.
5. Nenhuma mensagem a sócios (A30 / PROMPT §13 só após **aprovação** humana).

### 10.6 Lista fechada — a IA / o pós-processamento **nunca**

- prorrogação aprovada ou prazo vigente novo;
- `COMPLETED` / `CANCELLED`;
- mudança de responsável (`task_responsibles`);
- criar/remover `task_dependencies`;
- excluir tarefa;
- aprovar justificativa;
- negociar nova data com o responsável via mensagem automática;
- enviar comunicação a sócios;
- disparar `suggested_reply`;
- alterar Business Calendar / feriados;
- qualquer write em tabelas de prazo além do insert de `DeadlineExtension REQUESTED`.

---

## 11. Prompt versionado (PROMPT §38)

```
AI_PROMPT_VERSION=responsibility-triage-v1
```

- Qualquer mudança de instrução (desempate, tom, campos) → `responsibility-triage-v2`.
- Mudança só de schema de output → `AI_SCHEMA_VERSION` nova; prompt pode permanecer v1 se o texto for compatível.
- Job grava as duas versões em toda classificação.
- Não interpolar o nome do modelo no arquivo do prompt.

Isso permite responder: “por que esta mensagem foi classificada assim naquela data?” → versão + modelo + `input_hash` + JSON.

---

## 12. Fallback sem IA (PROMPT §39, A8, A32)

A IA **não** pode ser SPOF de dados ou prazos.

### 12.1 Gatilhos de fallback

- `AI_ENABLED=false`;
- `OPENAI_MODEL` / API key ausentes em runtime;
- timeout (`AI_TIMEOUT_MS`);
- HTTP 4xx/5xx, rede, quota;
- `refusal`;
- resposta incompleta;
- JSON/Zod inválido;
- worker de classificação morto (a mensagem já está no banco; o alerta de backlog cobre).

### 12.2 Comportamento obrigatório

1. **Mensagem permanece armazenada.** Nada é apagado ou reprocessado no webhook.
2. `messages.processing_status = PENDING_CLASSIFICATION` (UI: **“pendente de classificação”**).
3. Inbox `CLASSIFICATION_PENDING` (ou reutilizar) com urgency `MEDIUM`, `requires_human_action` implícito.
4. Alerta in-app ao ADMIN; outbox de WhatsApp ao admin **somente** se regra de notificação permitir (não explodir em tempestade de erros — coalescer por janela, ex. 15 min).
5. **Prazos intactos.** Nenhuma `DeadlineRule`, ocorrência, scheduler ou status de prazo muda.
6. Registrar `ai_classifications` com `validation_status` de erro (sem fingir classe). Não preencher `classification` de negócio com `UNCLEAR` sintético do modelo — usar status de processamento, não contaminar o enum de triagem.
7. O admin pode classificar manualmente na Central (origem `USER`) ou reenfileirar o job.

Deadline engine, lembretes e dashboard **ignoram** a ausência de classificação. Uma tarefa OVERDUE continua OVERDUE.

---

## 13. Human-in-the-loop — Central de Pendências (PROMPT §20)

A IA **alimenta** a caixa; o admin **opera**.

Itens gerados por triagem (além de itens não-IA: atraso crítico, falha de envio WhatsApp):

- pedido de prorrogação;
- bloqueio;
- precisa de informação;
- depende de outra pessoa;
- resposta não compreendida / pendente de classificação;
- entrega declarada aguardando validação;
- revisão por baixa confidence.

Cada item permite:

| Ação | Efeito |
|---|---|
| **Ver contexto** | tarefa, prazo, dependências, thread, JSON da classificação, confidence, versões |
| **Aprovar ação** | confirma entrega → `COMPLETED`; ou aprova prorrogação (fluxo FASE 5, com ajuste de data) |
| **Responder** | abre compositor **pré-preenchido** com `suggested_reply`; envio é ação humana explícita |
| **Adiar** | snooze do inbox; não altera prazo da tarefa |
| **Marcar como resolvido** | fecha o item; não implica `COMPLETED` nem prorrogação |

Não existe botão “enviar automaticamente a sugestão da IA”. O rascunho só sai se o admin clicar em enviar.

Se `requires_human_action = false` (`ON_TRACK` confiável), não poluir a Central. A timeline da tarefa ainda mostra “classificado: no prazo”.

---

## 14. Resumos para o administrador (PROMPT §21)

Resumos **não** são uma segunda chamada ao LLM. São **templates determinísticos** alimentados pelo JSON validado + dados da tarefa. Motivo: auditável, barato, funciona se a IA cair (o fallback tem template próprio).

### 14.1 Frase explícita quando o sistema não decidiu sozinho

Todo resumo de inbox/WhatsApp admin que **não** concluiu nem prorrogou deve conter uma frase inequívoca, por exemplo:

- `Nenhuma alteração de prazo foi feita.`
- `A tarefa NÃO foi marcada como concluída.`
- `O sistema NÃO tomou essa decisão automaticamente. Aguardando sua ação.`

Quando o sistema **aplicou** AI-D1, ainda assim:

- `Status alterado para “aguardando validação”. A entrega NÃO foi confirmada.`

### 14.2 Templates (derivados do JSON)

**Bloqueio** (`BLOCKED`):

```
Atualização — {sender_name}

Matriz: {matrix_name}
Demanda: #{sequence_number}
Situação: bloqueio identificado

{summary}

Prazo: {current_due_date}

Precisa de sua intervenção: SIM.
Motivo: {human_action_reason | reason}

O sistema NÃO tomou essa decisão automaticamente.
```

**Prorrogação** (`EXTENSION_REQUEST`):

```
Pedido de prorrogação

Matriz: {matrix_name}
Demanda: #{sequence_number}
Responsável: {sender_name}
Prazo atual: {current_due_date}
Nova previsão solicitada: {requested_new_deadline | "não informada"}
Motivo: {reason}

Nenhuma alteração foi feita ainda.

Acesse para aprovar ou rejeitar.
```

**Entrega reivindicada** (`CLAIMS_DELIVERED`):

```
{sender_name} informou que concluiu a demanda #{sequence_number} ({task_title}).
Matriz: {matrix_name}

Status alterado para “aguardando validação”. A tarefa NÃO foi marcada como concluída.

Confirmar entrega?
```

**Pendente de classificação** (fallback):

```
Mensagem recebida de {sender_name} sobre a demanda #{sequence_number} está pendente de classificação (IA indisponível ou inválida).

Prazos não foram alterados. Acesse a Central de Pendências.
```

`urgency` e `confidence` podem aparecer na UI; no WhatsApp do admin, só se agregarem sinal (ex. `Urgência: ALTA`).

---

## 15. `suggested_reply` — rascunho, nunca conversa livre

- Destinatário operacional: o **admin**, como texto inicial do compositor.
- Não é template de lembrete (templates oficiais Meta continuam em `packages/whatsapp`).
- Não é resposta automática ao responsável.
- Não negociar prazo (“prorroguei para dia 30”).
- Não confirmar entrega (“obrigado, marquei como concluída”).
- Tom: humano, curto, educado, profissional, pt-BR (PROMPT §15).

Se o admin enviar o rascunho, a mensagem outbound é persistida com origin `USER` (o humano enviou), não `AI_SUGGESTION`. Audit pode notar `used_suggested_reply = true`.

---

## 16. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Alucinação de prazo | Prorrogação indevida | IA não escreve prazo vigente; data só sugestão; extração conservadora §6.4; caso F testa prazo intacto |
| Baixa confidence | Ação errada silenciosa | Override §8; inbox; limiar ENV |
| Menções a pessoas | Encaminhar errado / omitir sócio | `mentioned_people` textual; sempre human action; admin resolve |
| PII no prompt | LGPD, vazamento em logs | Minimização §7; sem telefone/e-mail/payload; máscara A35; `input_hash` |
| Recusa / schema inválido | Mensagem “sumir” | Fallback §12; mensagem já persistida |
| Chatbot infinito | Ruído, risco jurídico | Sem auto-reply; só templates de sistema + envio humano |
| Modelo hardcoded obsoleto | Quebra silenciosa | `OPENAI_MODEL` obrigatório via ENV |
| CoT armazenado | dado inútil + risco | Proibido §9.3 |
| IA no engine de prazo | Atraso “criativo” | Boundary §3.3; testes de não-chamada |
| Um responsável “entreguei” em tarefa N:N | Concluir trabalho de outro | Q5: valida a tarefa toda, mas só após ADMIN (AI-D1) |
| Data relativa “+3 dias” virar chute | Prazo errado no pedido | `requested_new_deadline = null`; reason preserva o texto |

---

## 17. Observabilidade

Cada job de classificação loga (Pino, structured):

`correlation_id`, `message_id`, `task_id`, `prompt_version`, `schema_version`, `model`, `validation_status`, `latency_ms`, `classification` (se VALID), `confidence`, `inbox_item_id`.

Cadeia rastreável (PROMPT §32):

`webhook recebido → mensagem persistida → IA acionada → classificação criada → alerta criado`.

Não logar texto completo da mensagem em INFO. Falhas incrementam métrica `ai.triage.failure` (preparar; implementação na FASE 4/6).

---

## 18. Pacotes e FASE

| Pacote | Responsabilidade |
|---|---|
| `packages/ai` | Cliente Responses, `zodTextFormat`, prompts versionados, parse, erros de provider |
| `packages/core` | Policy de confidence, efeitos AI-D1/D2, inbox, eventos, **proibição** de mutação indevida |
| `packages/db` | Tabelas `ai_classifications`, `inbox_items` |
| `apps/worker` | Job `ClassifyInboundMessage`, timeout, retry, fallback |
| `apps/web` | Central de Pendências, rascunho, resumos |

FASE 4 implementa este spec. FASE 1–3 não chamam OpenAI. Arquitetura (interfaces `TriageProvider`) pode existir cedo; adapter real só na FASE 4.

---

## 19. Testes (obrigatórios neste recorte)

TDD nas regras críticas. Fixtures em `packages/ai` + `packages/core`. **Não** chamar a API real nos testes unitários (fake `TriageProvider`).

### 19.1 Caso F (PROMPT §44)

Mensagem: `"Vou precisar prorrogar até dia 30 porque ainda estou esperando o material."`

Contexto: matriz OD Academy, demanda #3, responsável Fenilli, prazo atual 2026-10-25.

Esperado:

- classificação `EXTENSION_REQUEST`;
- `reason` menciona material;
- `requested_new_deadline` = `2026-10-30` **somente se** o desempate de mês/ano for inequívoco no contexto; senão `null` e reason contém “dia 30” (fixture documenta a variante escolhida: com `current_due_date` no mesmo mês, aceitar `2026-10-30`);
- sistema **não** altera prazo vigente;
- cria `DeadlineExtension` `REQUESTED`;
- cria inbox;
- admin recebe alerta;
- resumo contém “Nenhuma alteração foi feita ainda.”

### 19.2 Caso G (PROMPT §44)

Mensagem: `"Já enviei."`

Esperado:

- classificação `CLAIMS_DELIVERED`;
- sistema → `WAITING_FOR_VALIDATION`;
- **não** `COMPLETED`;
- `completed_at` nulo;
- inbox “confirmar entrega?”;
- dependentes **não** liberados;
- resumo contém “NÃO foi marcada como concluída”.

### 19.3 Fixtures de JSON

**Válido (mínimo):** todos os campos, enums corretos, `confidence` 0.91, `requested_new_deadline` nulo, arrays vazios permitidos.

**Válido (prorrogação):** caso F.

**Inválidos (devem falhar Zod / policy e acionar fallback, sem mutar prazo):**

- `classification` fora do enum (`DONE`, `completed`);
- campo obrigatório ausente (`summary`);
- propriedade extra (`chain_of_thought`, `new_status`);
- `confidence: 1.5` ou `"alta"`;
- `requested_new_deadline: "30/10"` ou `"amanhã"`;
- raiz array;
- `requires_human_action` string `"true"`.

Fixture extra: JSON válido com `classification = ON_TRACK`, `confidence = 0.40`, `requires_human_action = false` → após policy, `requires_human_action = true` e inbox `NEEDS_REVIEW`.

### 19.4 Outros testes de borda

- provider timeout / 500 → mensagem `PENDING_CLASSIFICATION`, prazo intacto, inbox de fallback;
- `AI_ENABLED=false` → mesmo fallback, zero chamadas;
- job duplicado na mesma `message_id` já `VALID` → no-op;
- `suggested_reply` preenchido → nenhum `WhatsAppProvider.sendText` no job de triagem;
- `packages/ai` não referencia repositórios de `tasks` / `deadline_rules`.

---

## 20. Critério de qualidade (PROMPT §50)

| Pergunta | Resposta neste desenho |
|---|---|
| Reduz trabalho operacional? | Sim: classifica, resume, monta inbox e rascunho. |
| Auditável? | Sim: versões, modelo, `input_hash`, JSON, `correlation_id`, origin SYSTEM vs AI_SUGGESTION. |
| Impede ação indevida da IA? | Sim: LLM sem write de domínio; lista fechada §10.6. |
| Funciona se a IA cair? | Sim: §12, prazos intactos. |
| Funciona se o WhatsApp cair? | Fora do escopo da IA; mensagem que não chegou não dispara triagem. |
| Explica prazo? | IA não calcula prazo; resumo usa `current_due_date` do banco. |
| Explica mensagem enviada? | Triagem não envia; rascunho rastreia `used_suggested_reply`. |
| Múltiplos responsáveis? | Remetente identificado; claim vale para a tarefa (Q5). |
| Dependências? | Contexto no input; IA não altera grafo; entrega reivindicada não dispara trigger. |
| Prorrogações históricas? | Só insert REQUESTED; histórico de aprovadas intacto. |
| Rodável localmente? | Fake provider + ENV; sem OpenAI obrigatória para dev do core. |

---

## 21. Decisões deste documento

| ID | Decisão |
|---|---|
| AI-D1 | `CLAIMS_DELIVERED` → sistema (não a IA) vai para `WAITING_FOR_VALIDATION`; nunca `COMPLETED`. |
| AI-D2 | `EXTENSION_REQUEST` → sistema cria `DeadlineExtension REQUESTED`; não mexe no prazo vigente. |
| AI-D3 | Outras classes não mudam status operacional; só inbox + classificação. |
| AI-D4 | Responses API + `text.format.json_schema` + `strict: true` + revalidação Zod. Sem JSON Mode. |
| AI-D5 | Modelo exclusivamente via `OPENAI_MODEL`. Sem default em código. |
| AI-D6 | `AI_PROMPT_VERSION=responsibility-triage-v1`; guardar version, model, schema_version, input_reference. Sem CoT. |
| AI-D7 | Confidence `< AI_CONFIDENCE_THRESHOLD` (default 0.75) força `requires_human_action = true` no core. |
| AI-D8 | Resumos admin = templates a partir do JSON, com frase de “não decidimos sozinhos”. |
| AI-D9 | `suggested_reply` nunca é enviado automaticamente. |
| AI-D10 | IA fora do caminho crítico de prazo; só depois de persistir inbound. |

Assumptions: AI-A1 (desempate entrega+prorrogação privilegiando claim), AI-A2 (tarefa desvinculada não é adivinhada pela IA).

Perguntas que este spec **não** fecha (vão para o integrator / `docs/11-open-questions.md`): Q1–Q5 do brief; em especial Q5 já operacionalizado como “claim da tarefa toda, confirmação humana”.

---

## 22. O que a IA está proibida de fazer (lista de fechamento)

A IA (modelo + `packages/ai`) **não pode**:

1. prorrogir prazo ou escrever `calculated_due_date` / `original_due_date` / `DeadlineRule`;
2. marcar tarefa `COMPLETED` ou `CANCELLED`;
3. alterar responsável ou `task_responsibles`;
4. criar, remover ou inferir `task_dependencies`;
5. excluir tarefa ou matriz;
6. aprovar ou rejeitar justificativa / prorrogação;
7. negociar nova data com o responsável;
8. enviar WhatsApp (template, texto livre ou `suggested_reply`);
9. comunicar sócios / NotificationTargets;
10. calcular dias úteis, atraso, feriado ou recorrência;
11. decidir status de prazo;
12. persistir chain-of-thought;
13. ser o único caminho para o dado inbound existir;
14. escolher o modelo internamente (isso é ENV);
15. continuar conversa livre após a resposta do responsável.
