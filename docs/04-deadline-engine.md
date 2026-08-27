# 04 — Motor de prazos (Deadline Engine)

**Projeto:** Matriz de Responsabilidade  
**Fase:** 0 (especificação)  
**Complementa:** `02-domain-model.md`, `03-state-machines.md`  
**Implementação prevista:** `packages/core` (puro, determinístico, sem I/O de IA). TDD obrigatório (seção 43).

A IA **nunca** calcula prazo, nunca decide `OVERDUE`, nunca escolhe feriado. Se a OpenAI cair, os prazos continuam corretos (A32, seção 39 e 47).

---

## 1. Responsabilidade do motor

Dada uma `deadline_rules` + calendário + âncora (criação, conclusão validada do gatilho, ou período recorrente) + “hoje” no timezone da regra, o motor deve:

1. produzir `due_date` civil ou declarar `waiting_for_trigger`;
2. produzir `explanation` JSON respondendo **“por que esta data?”**;
3. classificar o status de prazo (`WAITING_FOR_TRIGGER` | `ON_TIME` | `DUE_SOON` | `DUE_TODAY` | `OVERDUE` | `NOT_APPLICABLE`);
4. **não** escrever WhatsApp, **não** mutar `base_status` (exceto quando o *application service* orquestra efeitos já especificados em `03`).

O worker chama o motor no tick diário e após eventos de âncora. A UI pode chamar on-read se o cache estiver stale.

---

## 2. Tipos de prazo

| `deadline_type` | MVP | Âncora | Fórmula |
|---|---|---|---|
| `FIXED_DATE` | FASE 1 | `fixed_date` | `due = fixed_date`. Sem cálculo de dias úteis |
| `BUSINESS_DAYS_AFTER_CREATION` | FASE 2 | `tasks.created_at` (data civil no TZ da regra) | `due = addBusinessDaysExclusive(anchor, amount)` |
| `BUSINESS_DAYS_AFTER_DEPENDENCY` | FASE 2 | `trigger_task.completed_at` **somente se** `base_status = COMPLETED` validado (A29) | idem, âncora = data civil da validação |
| `CALENDAR_DAYS_AFTER_TRIGGER` | **preparado**, não MVP obrigatório | mesma âncora A29 (ou `MILESTONE_DATE` na FASE 7, I6) | `due = addCalendarDaysExclusive(anchor, amount)` — **não** pula fim de semana/feriado |
| `RECURRING_BUSINESS_DAY` | FASE 2 | período civil (mês) | `due = nthBusinessDayOfPeriod(period, nth)` |
| `MANUAL` (`UNDEFINED`) | FASE 1 | nenhuma | `due = null` até o humano informar `fixed_date` ou trocar o tipo |

`amount` é inteiro `> 0`. `unit` reforça `BUSINESS_DAY` vs `CALENDAR_DAY`.

Texto de UI é **gerado** da regra, nunca a fonte:

- `FIXED_DATE` → “28/08/2026”
- relativo → “15 dias úteis após a conclusão da demanda #2”
- recorrente → “até o 3º dia útil de cada mês”

### 2.1 Limitação I6 (documentada, não escondida)

O exemplo real “15 dias úteis após a **definição da data da live**” pode ser um marco (`MILESTONE_DATE`), não a conclusão da tarefa “Definir data da live”.

**MVP (A29):** trigger = `COMPLETED` validado da tarefa gatilho.  
`trigger_type` já existe no modelo para `TASK_COMPLETED` agora e `MILESTONE_DATE` depois. Não usar IA para “adivinhar” a data da live a partir do texto.

---

## 3. Business Calendar

### 3.1 Fonte

Tabela `business_calendars` + `holidays` (não API externa obrigatória, A21).

Seed inicial: calendário `BR-NATIONAL`, locale `pt-BR`, timezone default `America/Sao_Paulo` (A2), `weekend_days = {0,6}` (domingo, sábado).

Cadeia de timezone:

```
deadline_rules.timezone
  → business_calendars.timezone
    → system_settings.timezone
      → America/Sao_Paulo
```

### 3.2 Dia útil (A22)

Um `date` é **útil** no calendário C se e somente se:

1. o dia da semana **não** está em `weekend_days`;
2. **não** existe `holidays.observed_on = date` para `calendar_id = C`.

Não existe “meio expediente” no MVP. Feriado municipal custom entra como linha `kind=CUSTOM`.

### 3.3 Seed de feriados — tabela, não hardcoded eterno

O motor **não** contém um array eterno de feriados. Testes usam fixtures; produção usa `holidays` (D4).

**Feriados federais típicos a semear para 2026–2028** (revisar legislação vigente na implementação; incluir `20/11` Consciência Negra, Lei 14.759/2023):

| Data civil 2026 | Nome | `kind` |
|---|---|---|
| 2026-01-01 | Confraternização Universal | `NATIONAL` |
| 2026-04-21 | Tiradentes | `NATIONAL` |
| 2026-05-01 | Dia do Trabalho | `NATIONAL` |
| 2026-09-07 | Independência | `NATIONAL` |
| 2026-10-12 | Nossa Senhora Aparecida | `NATIONAL` |
| 2026-11-02 | Finados | `NATIONAL` |
| 2026-11-15 | Proclamação da República | `NATIONAL` |
| 2026-11-20 | Consciência Negra | `NATIONAL` |
| 2026-12-25 | Natal | `NATIONAL` |

**Opcionais / corporativos (`OPTIONAL_OBSERVED` ou `CUSTOM`) — não assumir no seed federal mínimo:**

| Evento | 2026 (aproximação) | Nota |
|---|---|---|
| Carnaval (seg/ter) | 2026-02-16 e 2026-02-17 | Páscoa 2026-04-05; terça de carnaval = Páscoa − 47 dias. **Configurável.** Muitas empresas folgam; não é feriado federal universal |
| Sexta-feira Santa | 2026-04-03 | ponto facultativo / estadual em vários locais |
| Corpus Christi | 2026-06-04 | Páscoa + 60 dias |

Os casos de teste da §8 usam o **calendário federal mínimo** salvo quando o caso disser o contrário. Carnaval **não** desloca o 3º dia útil de fevereiro 2026 (cai nos dias 16–17).

Atualização anual: job ou operação admin insere o próximo ano na **tabela**. Trocar a lei de feriados não exige release do algoritmo, só do seed.

---

## 4. Algoritmo: N dias úteis (exclusivo da âncora)

**D1:** “N dias úteis **após** a data âncora” **não** conta o próprio dia âncora. O primeiro dia da conta é o próximo dia útil estritamente posterior.

Justificativa: a linguagem do processo (“em até 15 dias úteis após a conclusão”) é de prazo *a partir do fato*. Contar o dia da conclusão como dia 1 encurtaria o prazo de forma não intuitiva.

```
função addBusinessDaysExclusive(anchor: DateCivil, n: int, cal: Calendar) -> DateCivil
  precondição: n > 0
  current = anchor
  remaining = n
  enquanto remaining > 0:
    current = current + 1 dia civil
    se isBusinessDay(current, cal):
      remaining = remaining - 1
  return current
```

`addBusinessDaysInclusive(anchor, n)` (não usado nos relativos “após”, usado no *n-ésimo dia útil do período*): começa em `anchor` e conta se o próprio `anchor` for útil.

**Final de semana / feriado na âncora:** a âncora pode ser sábado (tarefa validada num sábado pelo admin). O algoritmo não exige que `anchor` seja útil. O primeiro incremento já pula para a próxima civil, e só decrementa em dias úteis.

**N dias úteis *antes*** (janela `DUE_SOON`, D-3):

```
função subtractBusinessDaysExclusive(anchorDue: DateCivil, n: int, cal) -> DateCivil
  current = anchorDue
  remaining = n
  enquanto remaining > 0:
    current = current - 1 dia civil
    se isBusinessDay(current, cal):
      remaining = remaining - 1
  return current
```

`DUE_SOON` quando `today >= subtractBusinessDaysExclusive(due, N) AND today < due`.

### 4.1 Dias corridos (tipo preparado)

```
função addCalendarDaysExclusive(anchor, n) -> anchor + n dias civis
```

Não consulta feriados. Documentado para não implementar com o algoritmo de úteis por engano.

---

## 5. Terceiro dia útil do mês

`recurrence_config = { "nth": 3, "unit": "BUSINESS_DAY", "period": "MONTH" }`

```
função nthBusinessDayOfMonth(year, month, nth, cal) -> DateCivil
  precondição: nth > 0
  d = Date(year, month, 1)
  last = último dia civil de (year, month)
  count = 0
  enquanto d <= last:
    se isBusinessDay(d, cal):
      count = count + 1
      se count == nth:
        return d
    d = d + 1
  erro de domínio: o mês não possui nth dias úteis
    (não esperado para nth=3 no calendário BR)
```

O 1º dia civil do mês **entra na conta se for útil**. Sábado/domingo/feriado no dia 1 simplesmente não incrementam `count`.

Não é “dia 3 do mês se for útil, senão próximo”: isso falharia quando o mês começa numa sexta útil (dia 1 = 1º útil, dia 3 = 3º útil = domingo? não — só incrementa úteis). O loop acima é a definição.

Feriado no meio: pula, continua contando.

---

## 6. Recorrência: uma task + `deadline_occurrences`

A16 / D2: **não** clonar a demanda todo mês.

| Momento | Efeito |
|---|---|
| Cadastro da regra | Criar ocorrência `OPEN` do período corrente (ou do próximo, se o nth do mês atual já passou — **D13** abaixo) |
| Tick diário | Status de prazo da ocorrência aberta; não cria mês extra |
| Admin valida entrega do período | ocorrência → `COMPLETED`; cria próxima `OPEN`; `base_status → PENDING`; `tasks.completed_at` permanece `NULL` |
| Admin cancela a série | `recurrence_ended_at`; ocorrência aberta → `CANCELLED`; `base_status → CANCELLED` ou permanece até decisão humana |
| Prorrogação | Atualiza `due_date` da ocorrência `OPEN` e `tasks.current_due_date`; **não** altera meses futuros |

**D13 — mês já “passou” no cadastro:** se hoje é 10/03/2026 e o 3º útil foi 04/03, o cadastro **abre março como `OVERDUE`** (transparência) **ou** abre abril, conforme escolha do admin no formulário (`start_from: CURRENT_PERIOD | NEXT_PERIOD`). Default: `CURRENT_PERIOD` para não esconder atraso já existente. Campo no `recurrence_config.start_policy`.

Fechar período **não** dispara `BUSINESS_DAYS_AFTER_DEPENDENCY` em terceiros como se a série tivesse morrido: o evento de domínio é `OccurrenceCompleted` + `TaskDeliveryValidated` (período). Dependentes de uma recorrente são raros; D3 desencoraja. Se existirem, A29 só se aplica se a regra apontar essa task como gatilho — documentar como armadilha de modelagem (ver §11).

---

## 7. O que recalcula e o que não recalcula

| Evento | `FIXED_DATE` | `BUSINESS_DAYS_AFTER_CREATION` | `BUSINESS_DAYS_AFTER_DEPENDENCY` | Recorrente |
|---|---|---|---|---|
| Create da task/regra | materializa `fixed_date` | calcula a partir de `created_at` | `waiting_for_trigger` se gatilho incompleto | cria ocorrência do período |
| Outra tarefa qualquer `COMPLETED` | **não muda** (I3) | **não muda** | **só se** essa outra é o `trigger_task_id` **e** COMPLETED validado | não |
| O próprio gatilho `COMPLETED` validado (A29) | n/a | n/a | **calcula** due; seta original se nulo | n/a |
| Claim “já entreguei” no gatilho | n/a | n/a | **não** dispara (ainda não validado) | n/a |
| `ExtensionApproved` nesta task | vigente muda; original não | idem | idem | vigente da ocorrência aberta |
| `ExtensionRequested` | não | não | não | não |
| Edição humana da regra | sim | sim (reancora em `created_at`, **não** em “hoje”, salvo o admin mudar a âncora) | sim, se âncora já existir | recompute ocorrência aberta |
| Passar o dia | só status calculado | só status | só status | só status |
| Feriado inserido no passado | **não** rematerializa `FIXED_DATE`; relativos já materializados **não** reescrevem sozinhos — **D14** | ver D14 | ver D14 | ocorrência futura sim no próximo recálculo; aberta: só se admin pedir “recalcular” |

**D14 — feriado tardio:** mudar a tabela de feriados **não** altera `current_due_date` já materializado automaticamente (surpresa operacional). Ferramenta admin “recalcular prazo desta regra” gera audit. Status `DUE_SOON` futuro usa o calendário **atual** (janela D-3 pode mudar).

**Trigger = COMPLETED validado (A29), não o claim.** `WAITING_FOR_VALIDATION` no gatilho deixa o dependente em `WAITING_FOR_TRIGGER`.

---

## 8. Por que a IA nunca calcula prazo

1. A regra é determinística e tem TDD (seção 43–44). LLM não é função pura estável.
2. Explicabilidade: cada data precisa de `explanation` auditável com feriados pulados. Modelo não é fonte de verdade (seção 37).
3. Disponibilidade: A32 / seção 39 — prazos funcionam com IA no chão.
4. Risco: alucinar “15 dias úteis” cruzando carnaval de forma inconsistente.
5. Seção 47: proibição explícita, ao lado de “não decidir atraso”.

A IA **pode** extrair `requested_new_deadline` de um texto e sugerir. Aplicar é ADMIN + motor só para validar que a data é civil parseável, não para “melhorar” o cálculo.

---

## 9. Explicabilidade: “por que esta data?”

Toda materialização grava `deadline_rules.explanation` (e `deadline_occurrences.explanation`). Schema conceitual:

```json
{
  "algorithm": "BUSINESS_DAYS_AFTER_DEPENDENCY",
  "calendar_id": "…",
  "calendar_code": "BR-NATIONAL",
  "timezone": "America/Sao_Paulo",
  "locale": "pt-BR",
  "anchor_type": "TRIGGER_TASK_COMPLETED",
  "anchor_task_id": "…",
  "anchor_sequence_number": 2,
  "anchor_date": "2026-03-10",
  "counting": "EXCLUSIVE",
  "amount": 15,
  "unit": "BUSINESS_DAY",
  "skipped": [
    { "date": "2026-03-14", "reason": "WEEKEND" },
    { "date": "2026-03-15", "reason": "WEEKEND" }
  ],
  "business_days_counted": [
    "2026-03-11", "2026-03-12", "2026-03-13",
    "2026-03-16", "2026-03-17", "2026-03-18",
    "2026-03-19", "2026-03-20", "2026-03-23",
    "2026-03-24", "2026-03-25", "2026-03-26",
    "2026-03-27", "2026-03-30", "2026-03-31"
  ],
  "result": "2026-03-31",
  "computed_at": "2026-03-10T18:00:00-03:00",
  "engine_version": "deadline-engine-v1"
}
```

Para `FIXED_DATE`:

```json
{
  "algorithm": "FIXED_DATE",
  "result": "2026-08-28",
  "source": "fixed_date",
  "computed_at": "…"
}
```

Para 3º útil:

```json
{
  "algorithm": "NTH_BUSINESS_DAY_OF_MONTH",
  "year": 2026,
  "month": 8,
  "nth": 3,
  "skipped": [
    { "date": "2026-08-01", "reason": "WEEKEND" },
    { "date": "2026-08-02", "reason": "WEEKEND" }
  ],
  "counted": [
    { "date": "2026-08-03", "n": 1 },
    { "date": "2026-08-04", "n": 2 },
    { "date": "2026-08-05", "n": 3 }
  ],
  "result": "2026-08-05"
}
```

UI do detalhe da tarefa: bloco “Regra de prazo” + botão/expander “Como esta data foi calculada?” listando pulos. Sem isso, o critério da seção 50 falha.

`engine_version` permite reproduzir cálculos antigos se o algoritmo de exclusividade mudar.

---

## 10. Casos de teste trabalhados (seção 44) — ano 2026

Calendário dos casos A, C, D salvo menção: **federal mínimo** da §3.3 (sem carnaval, sem Corpus, sem sexta-santa). Timezone `America/Sao_Paulo`. Semana: sáb/dom não úteis.

Referência de dias da semana 2026 (úteis para conferência):

- 2026-01-01 = quinta (feriado)
- 2026-03-10 = terça
- 2026-04-16 = quinta
- 2026-08-01 = sábado
- 2026-08-05 = quarta
- 2026-08-28 = sexta
- 2026-11-01 = domingo

### 10.1 CASO A — `FIXED_DATE`

**Fixture**

| Campo | Valor |
|---|---|
| Matriz | Matriz Geral (`type=GENERAL`) |
| Task | `#1` sequence_number=1 |
| Responsável | Matheus |
| Título | Atualizar a Assinatura Suprema no Site |
| Pré-requisito | nenhum |
| Regra | `FIXED_DATE`, `fixed_date=2026-08-28` |

**Cálculo**

- `addBusinessDays` **não** é chamado.
- `original_due_date = 2026-08-28`
- `current_due_date = 2026-08-28`
- `waiting_for_trigger = false`
- `explanation.algorithm = FIXED_DATE`

**Status de prazo em datas civis** (N de DUE_SOON = 3 úteis):

D-3 úteis de 28/08/2026 (sexta):

- volta: 27/08 qui (1), 26/08 qua (2), 25/08 ter (3) → janela começa **2026-08-25**.

| `today` | `cached_deadline_status` esperado |
|---|---|
| 2026-08-24 | `ON_TIME` |
| 2026-08-25 | `DUE_SOON` |
| 2026-08-26 | `DUE_SOON` |
| 2026-08-27 | `DUE_SOON` |
| 2026-08-28 | `DUE_TODAY` |
| 2026-08-29 | `OVERDUE` |
| após `COMPLETED` em qualquer dia | `NOT_APPLICABLE` |

**Não-regredes:** concluir qualquer outra demanda **não** altera 28/08/2026.

---

### 10.2 CASO C — `BUSINESS_DAYS_AFTER_DEPENDENCY` (15 úteis)

**Fixture**

| Campo | Valor |
|---|---|
| Matriz | Pós-Graduação Ordenação de Despesas |
| Task `#2` | Definir data da live. Prazo próprio irrelevante para o cálculo da `#3` |
| Task `#3` | Preparar material para live |
| Dependência | `#3` depende de `#2` (`task_dependencies`) |
| Regra da `#3` | `BUSINESS_DAYS_AFTER_DEPENDENCY`, `amount=15`, `unit=BUSINESS_DAY`, `trigger_task_id=#2`, `trigger_type=TASK_COMPLETED` |

#### C.1 Antes da validação da `#2`

- `#3`.`current_due_date` = `NULL`
- `waiting_for_trigger = true`
- prazo calculado = `WAITING_FOR_TRIGGER`
- operacional típico = `PENDING` ou `BLOCKED` (grafo)
- **não** gerar lembrete de vencimento (A26)

Claim “já defini a live” na `#2` → `#2` vai a `WAITING_FOR_VALIDATION` → `#3` **continua** `WAITING_FOR_TRIGGER`.

#### C.2 Depois de ADMIN validar `#2` em **2026-03-10** (terça)

Âncora civil: `2026-03-10`. Contagem exclusiva, 15 úteis. Não há feriado federal entre 11/03 e 31/03.

| n | data | dia |
|---|---|---|
| 1 | 2026-03-11 | quarta |
| 2 | 2026-03-12 | quinta |
| 3 | 2026-03-13 | sexta |
| — | 2026-03-14 | sábado (skip) |
| — | 2026-03-15 | domingo (skip) |
| 4 | 2026-03-16 | segunda |
| 5 | 2026-03-17 | terça |
| 6 | 2026-03-18 | quarta |
| 7 | 2026-03-19 | quinta |
| 8 | 2026-03-20 | sexta |
| — | 2026-03-21–22 | weekend |
| 9 | 2026-03-23 | segunda |
| 10 | 2026-03-24 | terça |
| 11 | 2026-03-25 | quarta |
| 12 | 2026-03-26 | quinta |
| 13 | 2026-03-27 | sexta |
| — | 2026-03-28–29 | weekend |
| 14 | 2026-03-30 | segunda |
| **15** | **2026-03-31** | terça |

**`due_date = 2026-03-31`.**

- `original_due_date` da `#3` = `2026-03-31` (primeira materialização)
- `current_due_date` = `2026-03-31`
- Eventos: `TaskDeliveryValidated(#2)`, `TaskDependencySatisfied(#3←#2)`, recálculo da regra da `#3`
- Se em 31/03 a `#3` ainda não foi validada: `DUE_TODAY`; em 01/04: `OVERDUE`

#### C.3 Variante cruzando feriados (Tiradentes + 1º de maio)

Gatilho validado em **2026-04-16** (quinta).

| n | data | nota |
|---|---|---|
| 1 | 2026-04-17 | sexta |
| — | 2026-04-18–19 | weekend |
| 2 | 2026-04-20 | segunda |
| — | **2026-04-21** | **Tiradentes — skip** |
| 3 | 2026-04-22 | quarta |
| 4 | 2026-04-23 | quinta |
| 5 | 2026-04-24 | sexta |
| — | 2026-04-25–26 | weekend |
| 6 | 2026-04-27 | segunda |
| 7 | 2026-04-28 | terça |
| 8 | 2026-04-29 | quarta |
| 9 | 2026-04-30 | quinta |
| — | **2026-05-01** | **Dia do Trabalho — skip** |
| — | 2026-05-02–03 | weekend |
| 10 | 2026-05-04 | segunda |
| 11 | 2026-05-05 | terça |
| 12 | 2026-05-06 | quarta |
| 13 | 2026-05-07 | quinta |
| 14 | 2026-05-08 | sexta |
| — | 2026-05-09–10 | weekend |
| **15** | **2026-05-11** | segunda |

**`due_date = 2026-05-11`.**  
`explanation.skipped` **deve** incluir `2026-04-21` (`HOLIDAY/Tiradentes`) e `2026-05-01` (`HOLIDAY/Dia do Trabalho`) além dos weekends.

#### C.4 Isolamento I3

Task `#1` da Matriz Geral (Caso A, FIXED 28/08) **não muda** quando `#2` desta matriz é validada.

---

### 10.3 CASO D — 3º dia útil de cada mês (`RECURRING_BUSINESS_DAY`)

**Fixture**

| Campo | Valor |
|---|---|
| Título | Divulgar disciplinas do mês |
| Regra | `nth=3`, `period=MONTH`, calendário federal mínimo 2026 |

Uma única `tasks`. Doze ocorrências possíveis em 2026 (criar on-demand, não pré-materializar o ano inteiro no cadastro — só a `OPEN` + histórico fechado).

#### D.1 Tabela mestra 2026 (federal mínimo)

Contagem: 1º civil do mês → pular sáb/dom/feriado nacional da §3.3.

| Mês | Dia 1 | Feriados relevantes no começo do mês | 1º útil | 2º útil | **3º útil = due** | Particularidade testada |
|---|---|---|---|---|---|---|
| Jan | quinta | 01/01 feriado | 02/01 sexta | 05/01 segunda | **2026-01-06** | feriado no dia 1 |
| Fev | domingo | (carnaval 16–17 **fora** do seed mínimo) | 02/02 segunda | 03/02 terça | **2026-02-04** | mês começa domingo |
| Mar | domingo | — | 02/03 segunda | 03/03 terça | **2026-03-04** | começa domingo |
| Abr | quarta | sexta-santa 03/04 **não** no seed mínimo | 01/04 quarta | 02/04 quinta | **2026-04-03** | 3º útil cai na sexta-santa civil — **com seed mínimo permanece 03/04**. Teste extra abaixo |
| Mai | sexta | **01/05 feriado** | 04/05 segunda | 05/05 terça | **2026-05-06** | feriado + weekend imediatamente após |
| Jun | segunda | Corpus 04/06 opcional, não afeta nth=3 | 01/06 segunda | 02/06 terça | **2026-06-03** | mês começa útil |
| Jul | quarta | — | 01/07 quarta | 02/07 quinta | **2026-07-03** | |
| Ago | **sábado** | — | 03/08 segunda | 04/08 terça | **2026-08-05** | **mês começa sábado** |
| Set | terça | 07/09 Independência (depois do 3º) | 01/09 terça | 02/09 quarta | **2026-09-03** | feriado no mês mas irrelevante ao nth=3 |
| Out | quinta | 12/10 depois | 01/10 quinta | 02/10 sexta | **2026-10-05** | 03–04 weekend entre 2º e 3º |
| Nov | **domingo** | **02/11 Finados (segunda)** | 03/11 terça | 04/11 quarta | **2026-11-05** | começa domingo + feriado na segunda |
| Dez | terça | Natal 25/12 irrelevante | 01/12 terça | 02/12 quarta | **2026-12-03** | |

#### D.2 Casos obrigatórios da seção 44, detalhados

**Mês começa sábado — agosto 2026**

- 01/08 sáb skip, 02/08 dom skip
- 03/08 seg = 1, 04/08 ter = 2, **05/08 qua = 3**
- `due = 2026-08-05`
- `skipped`: 01 e 02 `WEEKEND`

**Mês começa domingo — novembro 2026 + feriado**

- 01/11 dom skip
- 02/11 seg Finados skip (`HOLIDAY`)
- 03/11 ter = 1, 04/11 qua = 2, **05/11 qui = 3**
- `due = 2026-11-05`
- Sem Finados no calendário, o 3º útil seria 04/11 — o teste de fixture **com** e **sem** 02/11 prova que feriado desloca.

**Mês começa sexta feriado — maio 2026**

- 01/05 sex feriado skip
- 02/05 sáb skip, 03/05 dom skip
- 04/05 seg = 1, 05/05 ter = 2, **06/05 qua = 3**
- `due = 2026-05-06`

**Janeiro: feriado 1º + não começa em weekend**

- 01/01 qui feriado skip
- 02/01 sex = 1
- 03/01 sáb skip, 04/01 dom skip
- 05/01 seg = 2, **06/01 ter = 3**
- `due = 2026-01-06`

#### D.3 Teste extra (opcional observado): abril com Sexta-feira Santa

Se o admin incluir `2026-04-03` como `OPTIONAL_OBSERVED`:

- 01/04 qua = 1, 02/04 qui = 2, 03/04 skip, 04/04 sáb skip, 05/04 Páscoa dom skip, **06/04 seg = 3**
- `due` passa de `2026-04-03` para **`2026-04-06`**
- Prova que **seed é tabela**: o mesmo algoritmo, calendários diferentes, datas diferentes. Não hardcodar 03/04 no motor.

#### D.4 Ciclo de ocorrência

1. Em 01/08/2026, ocorrência agosto `OPEN`, `due=2026-08-05`, prazo `DUE_SOON` ou `ON_TIME` conforme o today.
2. Admin valida entrega em 05/08 → ocorrência agosto `COMPLETED`; cria setembro `OPEN` `due=2026-09-03`; task `PENDING`; `completed_at` da task nulo.
3. Não nasce `tasks` clone com `sequence_number` novo.
4. Visão Geral continua mostrando **uma** linha, prazo vigente = setembro.

---

## 11. Riscos de modelagem (prazos)

1. **Âncora exclusiva vs inclusiva** — se produto/legal quiser contar o dia da conclusão, todos os fixtures da §10.2 mudam. Travado em D1; teste deve nomear `Exclusive`.
2. **Validação fora de dia útil** — admin confirma domingo; âncora é domingo; o 1º útil é segunda. Correto pelo algoritmo, mas o copy deve dizer “a partir de dd/mm”.
3. **Feriado móvel** — carnaval muda todo ano; seed `OPTIONAL` evita surpresa nacional vs corporativo.
4. **Recorrente como gatilho de outra task** — completar um mês dispararia relativo todo mês. Desencorajar no UI (D3 + aviso).
5. **Prorrogação vs original** — relatórios de “quanto escorregou” usam `original_due_date` + soma de extensões, não o texto da célula.
6. **Cache stale** — `cached_deadline_status` sem `deadline_status_as_of` vira bug de dashboard à meia-noite. Recomputar se data civil do TZ mudou.
7. **Dois calendários** — task em calendário A, feriado só em B: nunca misturar no mesmo `addBusinessDays`.
8. **I6 marco vs COMPLETED** — copy da UI deve dizer “após a conclusão validada de #{n}”, não “após definir a data”, até existir `MILESTONE_DATE`.

---

## 12. Interface conceitual (`packages/core`)

```ts
// ilustrativo — não é produção
type DeadlineStatus =
  | "WAITING_FOR_TRIGGER"
  | "ON_TIME"
  | "DUE_SOON"
  | "DUE_TODAY"
  | "OVERDUE"
  | "NOT_APPLICABLE";

function isBusinessDay(date: CivilDate, cal: Calendar): boolean;
function addBusinessDaysExclusive(anchor: CivilDate, n: number, cal: Calendar): CivilDate;
function nthBusinessDayOfMonth(year: number, month: number, nth: number, cal: Calendar): CivilDate;
function materializeDue(rule: DeadlineRule, ctx: AnchorContext): MaterializeResult;
function computeDeadlineStatus(input: {
  baseStatus: BaseStatus;
  due: CivilDate | null;
  waitingForTrigger: boolean;
  today: CivilDate;
  cal: Calendar;
  dueSoonBusinessDays: number;
}): DeadlineStatus;
```

Sem import de `packages/ai`. Sem fetch HTTP. Calendário injetado (facilita fixture de teste).

---

## 13. Matriz de testes TDD (além de A, C, D)

| ID | Cenário | Esperado |
|---|---|---|
| T-WE | `addBusinessDaysExclusive(sexta, 1)` | segunda |
| T-HOL | âncora véspera de Tiradentes 2026 | pula 21/04 |
| T-SELF | dependência `task_id = depends_on_task_id` | rejeita **antes** de calcular prazo |
| T-TRIG | gatilho `WAITING_FOR_VALIDATION` | dependente ainda `WAITING_FOR_TRIGGER` |
| T-FIX | COMPLETED alheio | FIXED inalterado |
| T-NA | `COMPLETED` + due no passado | `NOT_APPLICABLE`, não `OVERDUE` |
| T-SOON | Caso A em 25/08/2026 | `DUE_SOON` |
| T-REC | agosto→setembro após validar | uma task, duas ocorrências |
| T-EXT | `REQUESTED` | due vigente igual |
| T-AI | chamar motor a partir de classificação | nem existe o caminho |

Casos B, E, F, G são de dependência N:N / WhatsApp / claim — cobertos em `03` e no test plan (subagent QA), não neste motor, exceto o isolamento de prazo em F: pedido de prorrogação **não** chama `materializeDue` para aplicar a data sugerida.

---

## 14. Assumptions locais

| ID | Decisão |
|---|---|
| D1 | Relativos “após” são exclusivos da âncora (já em `02`) |
| D13 | Default de recorrência cadastrada no meio do mês: período corrente (pode nascer overdue) |
| D14 | Inserir feriado antigo não reescreve due já materializado sem ação admin |
| D15 | `DUE_SOON` em dias úteis, overdue “há N dias” na UI usa **dias civis** (`today - due`) — copy “Atrasada há 3 dias” da seção 11 |
| D16 | Seed federal 2026–2028 é dado; carnaval/corpus/sexta-santa são opcionais e **configuráveis** |
