# ADR-006 — OpenAI Responses API + Structured Outputs + Zod, com fallback sem IA

Status: Aceito (FASE 0)

## Contexto

Respostas de responsáveis chegam em linguagem natural (“vou precisar até dia 30 porque estou esperando o Francisco”). O sistema precisa classificar, extrair prazo sugerido, pessoas, bloqueios e urgência — e **nunca** confiar em parsing livre (PROMPT §18, §37–39).

A IA não calcula dia útil, não decide atraso, não é fonte de verdade. Modelo muda o tempo todo; hardcodar um nome de modelo no código de domínio impede operação. Prompts também mudam: sem versão, não se explica por que a mensagem X foi parar em `UNCLEAR`.

Se a OpenAI cair, prazos e histórico têm de continuar (A8, A32, §39, critério §50).

## Decisão

1. **Provedor de triagem do MVP: OpenAI Responses API** com **Structured Outputs**, schema alinhado ao JSON conceitual da §18, validado de novo em runtime com **Zod** em `packages/ai`. Se o parse Zod falhar, trata-se como `UNCLEAR` + `requires_human_action = true`, sem mutar domínio.
2. **Modelo configurável por ENV** (`OPENAI_MODEL`). Nenhum valor de modelo é regra de negócio em `packages/core`. Trocar modelo não exige migration — exige, no máximo, nota no runbook e novo `AI_PROMPT_VERSION` se o prompt mudar.
3. **Prompts versionados** (`AI_PROMPT_VERSION`, ex. `responsibility-triage-v1`). Alteração de texto do sistema = bump para `v2`. Toda `ai_classification` persiste: `input_reference` (ids da mensagem/tarefa), `classification`, `confidence`, `created_at`, `model`, `schema_version`, `prompt_version`. **Não** persistir chain-of-thought / raciocínio interno (PROMPT §37).
4. **Chamada apenas no `apps/worker`**, via efeito de outbox `ClassifyInboundMessage` (ADR-005). `apps/web` tem `no-restricted-imports` de `packages/ai`.
5. **Threshold de confidence** (`AI_CONFIDENCE_THRESHOLD`): abaixo → forçar `requires_human_action`. A IA ainda grava a sugestão; o humano decide.
6. **Fallback sem IA (obrigatório):**
   - `OPENAI_API_KEY` ausente, `AI_ENABLED=false`, timeout, 5xx ou parse inválido;
   - mensagem inbound **já persistida**;
   - classificação `pending` / item de inbox “pendente de classificação”;
   - admin lê o texto e age;
   - quando o provedor voltar, o worker pode reprocessar pendências **sem** sobrescrever uma classificação humana posterior.
7. **Contexto mínimo no prompt:** mensagem, tarefa, responsáveis, matriz, prazo vigente, estado, dependências relevantes, recorte curto do histórico. Sem despejar a matriz inteira.
8. **IA não entra no motor de prazo, grafo de dependência, anti-spam nem “está overdue?”.** Isso é `packages/core` (PROMPT §47).
9. **FASE 7 (quick capture / import):** mesmo padrão — Structured Output + preview humano. Fora do MVP de runtime, mas a porta `packages/ai` já prevê um segundo `prompt_version` (`quick-capture-v1`) sem misturar com triagem.

Schema conceitual de saída (espelha §18; domínio/AI spec podem fechar enums):

```json
{
  "classification": "ON_TRACK | BLOCKED | NEEDS_INPUT | NEEDS_ANOTHER_PERSON | EXTENSION_REQUEST | CLAIMS_DELIVERED | UNCLEAR | OTHER",
  "summary": "string",
  "reason": "string|null",
  "requested_new_deadline": "date|null",
  "mentioned_people": ["string"],
  "dependencies_or_blockers": ["string"],
  "requires_human_action": true,
  "human_action_reason": "string|null",
  "urgency": "LOW | MEDIUM | HIGH",
  "confidence": 0.0,
  "suggested_reply": "string|null"
}
```

`suggested_reply` é rascunho para o admin, **não** enviado automaticamente (ADR-004).

## Consequências

- Investigação de uma classificação ruim usa `(prompt_version, model, schema_version, correlation_id, input_reference)`.
- Custo de API existe só no caminho inbound. FASE 1–3 funcionam com `AI_ENABLED=false`.
- Structured Outputs reduz JSON quebrado, mas **não** elimina alucinação de prazo: por isso o prazo extraído nunca é escrito em `deadline_rules` sem ADMIN.
- Troca futura de provedor (outro LLM com JSON schema) é adapter em `packages/ai`, desde que o DTO Zod permaneça o contrato do worker.
- LGPD: payload enviado à OpenAI contém nomes e trechos de conversa operacional. Minimizar contexto; contrato de subprocessamento e retenção ficam em `docs/08-security.md`. Sem IA, o dado não sai do Postgres.

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Parsing regex / “se contém ‘prorrogar’” | Frágil no português real; a §18 pede schema. Regex pode ser **apoio** de teste, não o classificador. |
| Chat Completions sem Structured Outputs + `JSON.parse` otimista | Quebra; viola “nunca confiar em parsing livre”. |
| Modelo hardcodado no código (`gpt-4o` et al.) | PROMPT §18: modelo via ENV. |
| Prompt solto no código sem versão | Impede explicar classificações antigas (§38). |
| IA no Server Action da inbox “ao vivo” | Latência, timeout, e duplica o caminho do worker; crash perde o efeito. |
| IA como fonte de `due_date` / `OVERDUE` | Determinístico no calendário (PROMPT §47). |
| Falhar o webhook se a OpenAI cair | Meta reenvia; operador perde confiança. Persist-first + fallback (§39). |
| Guardar o raciocínio interno do modelo | Sem valor operacional; risco de dado extra; §37 proíbe. |
| Multi-agente / tool-calling para mutar Task | ADR-004. |
| Dependência obrigatória de OpenAI para subir o Compose | Quebra local-first (ADR-001) e a pergunta §50 “funciona se a IA cair?”. |
