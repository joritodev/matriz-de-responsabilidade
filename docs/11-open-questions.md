# Perguntas em aberto

**Versão:** 0.1 (FASE 0)  
**Regra do `PROMPT.md` §49:** no máximo 5 perguntas, e só se realmente impedirem continuar. Nenhuma impede arquitetura, modelo ou a FASE 0. Seguimos com assumptions. Estas 5 precisam do dono **antes ou no início da FASE 1**, principalmente para seed e copy — não para redesenhar o sistema.

Gaps não bloqueantes (G-01–G-33) estão em `docs/01-functional-spec.md` §10. Não foram promovidos a pergunta.

---

## As 5 perguntas

### Q1 — Quem entra no dia 1?

**Pergunta:** a aplicação começa só com você (`ADMIN`) ou já precisamos de `OPERATOR`s (outras pessoas da operação com login)?

**Por que importa:** seed de usuários, telas de convite, e o que o Operator pode fazer.

**O que já está decidido:** tabela `users` e papéis `ADMIN` / `OPERATOR` existem desde o Slice 1.1. Só `ADMIN` aprova prorrogação, confirma entrega e altera dependências (`docs/08-security.md`).

**Se não responder agora:** FASE 1 sobe um único `ADMIN`. Operators podem ser adicionados depois sem migration estrutural.

**Opções:**

- **A (recomendada para o primeiro go-live):** só ADMIN.
- **B:** ADMIN + 1..N OPERATORs com CRUD de matriz/tarefa, sem ações sensíveis.

---

### Q2 — WhatsApp Business já existe?

**Pergunta:** já há WABA + número na Meta Cloud API, ou o setup é greenfield (criar app, número, templates, billing)?

**Por que importa:** a FASE 3 depende de templates `UTILITY` aprovados e de webhook HTTPS. Não muda o `WhatsAppProvider`.

**O que já está decidido:** API oficial; túnel só em perfil de dev; produção com hostname estável; FASE 1 nem liga o adapter.

**Se não responder agora:** desenvolvemos FASE 1–2 com fake provider. FASE 3 espera a conta.

**Opções:**

- **A:** greenfield — incluímos runbook de criação na FASE 3.
- **B:** conta existente — precisaremos de Phone Number ID, WABA ID e templates atuais.

---

### Q3 — Recorrência mensal após “concluir”?

**Pergunta:** no “terceiro dia útil de cada mês”, quando você marca o período como entregue, a demanda deve **reabrir sozinha** no mês seguinte (`PENDING` + nova ocorrência)?

**Assumption atual (A16):** sim. Uma linha de tarefa; `deadline_occurrences` guarda cada mês.

**Se for “não”:** a tarefa ficaria `COMPLETED` até alguém reabrir / clonar. Isso quebra a ideia de demanda permanente e polui `sequence_number`. Não é o desenho atual.

**Opções:**

- **A (recomendada, A16):** concluir o período fecha a ocorrência e abre a próxima.
- **B:** concluir encerra a série até ação manual.

---

### Q4 — Quem são os sócios no seed?

**Pergunta:** quando uma prorrogação for aprovada, quem recebe o aviso (nomes + WhatsApp e/ou só texto para copiar)?

**O que já está decidido:** `NotificationTargets` é lista configurável (A30). Grupo de WhatsApp **não** é dependência (A24). Lista vazia é válida: a UI gera mensagem pronta para copiar + notificação in-app.

**Se não responder agora:** FASE 5 entrega a tela de configuração com lista vazia. Você cadastra os alvos na operação.

**O que precisamos (quando souber):** nome, canal (`IN_APP` / `WHATSAPP_INDIVIDUAL` / copiar) e número se WhatsApp.

---

### Q5 — Vários responsáveis e “já entreguei”?

**Pergunta:** se Giovanni e Francisco estão na mesma demanda e **um** diz “já enviei”, isso abre validação da **tarefa inteira** ou só da parte dele?

**Assumption atual:** a tarefa é **una**. Um claim → `WAITING_FOR_VALIDATION` da tarefa. O inbox mostra quem falou. Só `ADMIN` marca `COMPLETED`.

**Se no futuro precisar de partes:** vira subtarefa (FASE 7), não “meio COMPLETED”.

**Opções:**

- **A (recomendada):** claim de qualquer responsável valida a tarefa toda (humano confirma).
- **B:** precisamos de subtarefas / checklist por responsável (fora do MVP).

---

## O que não virou pergunta (de propósito)

| Tema | Tratamento |
|------|------------|
| Timezone | A2 — `America/Sao_Paulo` |
| Auth protocol | A9 — cookie httpOnly, sem OAuth |
| Redis | A6 — não |
| Chatbot livre | Proibido pelo `PROMPT.md` §3 |
| Trigger “data da live” ≠ conclusão | I6 — FASE 7; MVP usa `COMPLETED` da gatilho |
| Anexos de evidência | G-10 |
| Dependência entre matrizes | G-08 |
| Quiet hours | G-11 |

---

## Como responder

Resposta livre ou no formato:

```
Q1: A
Q2: A
Q3: A
Q4: <nomes e canais, ou "lista vazia no seed">
Q5: A
```

Com isso a FASE 1 pode seedar certo. Sem resposta, seguimos A/A16/lista vazia/tarefa una.
