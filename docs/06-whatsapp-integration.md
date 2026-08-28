# 06 — Integração WhatsApp (Cloud API)

**Fase:** 0 (especificação). Sem código de produção.  
**Escopo:** automação de acompanhamento via WhatsApp Business Platform Cloud API oficial.  
**Princípio (PROMPT §3):** automação inicia e organiza o acompanhamento; humano negocia e decide. Não é chatbot autônomo.  
**Fonte de verdade de regras de produto:** `PROMPT.md` + brief compartilhado (A7, A20, A23–A26, A30–A32, A35).  
**Documentação oficial verificada em 27/08/2026.** Não tratar este arquivo como substituto das páginas da Meta; revalidar antes da FASE 3.

---

## 1. Objetivo

Substituir o acompanhamento operacional manual por:

1. lembretes e avisos de prazo via WhatsApp;
2. persistência íntegra de tudo que entra e sai;
3. handoff estruturado para triagem (IA + humano);
4. comunicação de prorrogação aprovada aos sócios, **sem** depender de grupos.

A camada WhatsApp **não** calcula prazo, **não** decide atraso, **não** muta estado de domínio. Ela envia, recebe, persiste e registra resultado. Regras de “quando lembrar” vivem em `packages/core` (NotificationRules + motor de prazo). O worker apenas executa efeitos.

Critério de qualidade (PROMPT §50) — esta proposta responde **sim** a:

- reduz trabalho operacional (lembretes/digest/aviso de sócios);
- é auditável (outbox, wamid, correlation_id, audit log);
- impede ação indevida da IA (IA não envia sozinha; só classifica após persistir);
- funciona se a IA cair (mensagem fica armazenada + inbox);
- funciona se o WhatsApp cair (evento na outbox; tarefa/prazo intactos);
- explica por que a mensagem foi enviada (NotificationRule + NotificationEvent);
- suporta múltiplos responsáveis (uma mensagem por pessoa, `{{nome}}` daquela pessoa);
- roda localmente (localhost + túnel HTTPS só para webhook).

---

## 2. O que a documentação oficial atual impõe

Fontes oficiais (Meta / WhatsApp Business Platform), conferidas nesta fase:

| Tema | URL oficial |
| --- | --- |
| Mensagens de serviço e janela de atendimento | https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages |
| Fundamentos de templates | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview |
| Categorização de templates (utility vs marketing) | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization |
| Opt-in | https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/ |
| Política de mensagens (referenciada pelo opt-in) | https://business.whatsapp.com/policy |
| Criar endpoint de webhook + HMAC | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/ |
| Visão geral de webhooks e campos | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview |
| Payload de mensagens inbound | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages |
| Status de mensagens outbound | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status |
| Groups API (limites e elegibilidade) | https://developers.facebook.com/documentation/business-messaging/whatsapp/groups |
| Envio em grupo | https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/groups-messaging |
| Limites de mensagens (tier do portfólio) | https://developers.facebook.com/docs/whatsapp/messaging-limits/ |
| Throughput, pair rate, qualidade | https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform |
| Códigos de erro | https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes |
| Precificação (CSW, utility, service; vigente em 2026) | https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages |
| Visão geral da plataforma (opt-in, termos, não usar ferramentas não oficiais) | https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform |

### 2.1 Janela de atendimento de 24 horas (Customer Service Window)

Imposição oficial (página *Service messages*, atualizada 21/05/2026):

- Quando o **usuário** envia uma mensagem **ou liga**, inicia um timer de **24 horas**.
- Nova mensagem/ligação do usuário **reinicia** o timer.
- **Dentro** da janela: a empresa pode enviar mensagens de serviço de forma livre (`type: text` e demais tipos de serviço). Não exigem aprovação prévia de template.
- **Fora** da janela: **somente** mensagens de template pré-aprovadas.
- Mensagens de serviço **não** servem para iniciar conversa. A própria página de precificação (25/08/2026) afirma: *non-template messages can only be used to respond — not reach out — to users*.
- Erro **131047**: “More than 24 hours have passed since the recipient last replied to the sender number” → solução oficial: enviar **template**.
- Há *known issue*: em casos raros o usuário envia mensagem e mesmo assim não é possível responder dentro da janela. O sistema deve tratar 131047 como sinal para reenviar via template, não como falha de negócio da tarefa.

**Fluxo correto neste produto:**

```
Automação inicia contato (lembrete, atraso, digest, aviso a sócio)
  → SEMPRE template (UTILITY, APPROVED).
  → Não usar sendText para outreach.

Usuário responde
  → janela 24h abre (persistir last_inbound_at).
  → ADMIN pode responder com sendText (mensagem de serviço).
  → Automação NÃO entra em conversa livre (PROMPT §3).
  → Se precisar de novo lembrete depois que a janela fechou → template de novo.

Dúvida se a janela está aberta
  → usar template. Template é válido dentro e fora da janela.
  → sendText só quando last_inbound_at está dentro de 24h E a origem é humana (admin).
```

A API **não** expõe um endpoint “a janela está aberta?”. Inferimos de `messages` inbound persistidas (`from` + `timestamp`). Relógio: UTC no banco; comparação em `America/Sao_Paulo` só para regras de calendário, não para a CSW (CSW é 24h corridas a partir do timestamp Unix do webhook).

### 2.2 Templates

Imposições oficiais (*Template fundamentals*, 21/05/2026):

- Template é o **único** tipo enviável fora da CSW.
- Precisa estar `APPROVED` para ser enviado. Status `PAUSED` / `DISABLED` / `REJECTED` / `IN_REVIEW` → não enviar; registrar falha + inbox “automação com erro”.
- Categorias: `UTILITY`, `MARKETING`, `AUTHENTICATION`. Categoria impacta preço e política.
- Nome: minúsculas, alfanumérico e `_`, até 512 caracteres. Mesmo nome + idiomas diferentes = templates distintos.
- Parâmetros **nomeados** (recomendado): `{{first_name}}` — minúsculas e underscores, únicos. Valores no envio em qualquer ordem, com `parameter_name`.
- Parâmetros posicionais `{{1}}` existem, mas **não** usar no produto: o prompt usa `{{nome}}` e named params evitam inversão.
- Meta **não traduz**. Idioma do template: `pt_BR`.
- Review automático; recategorização possível. Desde 09/04/2025, template enviado como `UTILITY` pode ser **aprovado como `MARKETING`**. Assinar webhook `template_category_update` e `message_template_status_update`.
- Limite de criação: 100 templates/hora por WABA.
- Limite de estoque: 250 templates se o portfólio **não** estiver verificado; até 6.000 se verificado + display name aprovado.
- Arquivamento automático após 12 meses inativos; exclusão 28 dias depois.
- Envio aceito pela API **não** significa entregue. Entrega chega em webhook `statuses`.
- Ordem de entrega de uma sequência **não** é garantida. Se a ordem importar, esperar `delivered` antes do próximo envio ao mesmo destinatário.

**Categorização dos nossos templates:** solicitar `UTILITY`. Justificativa oficial: *Account Alerts or Updates* — “important or time-sensitive updates… specific to purchased or subscribed products/services”, sem promoção. Lembrete de demanda interna de prazo se enquadra como alerta operacional da conta/serviço interno. Risco real: Meta pode recategorizar como marketing se o texto parecer “abrir conversa” ou persuasivo. Mitigação: tom factual, sem CTA promocional, sem “fale comigo para ofertas”; incluir identificadores da demanda (`#numero`, matriz, prazo). Se recategorizar, **não** desligar o produto: registrar, alertar admin, e só então decidir se o conteúdo precisa ser reescrito. Evitar Marketing Messages API (ela **não** aceita utility — erro 131055).

### 2.3 Opt-in

Imposição oficial (*Get opt-in for WhatsApp*, 16/06/2026) + política de nov/2024:

- **Obrigatório** obter opt-in **antes** de enviar mensagens.
- O opt-in da plataforma **pode ser geral** (não precisa citar WhatsApp pelo nome), **desde que** cumpra a lei local.
- Requisitos mínimos da Meta:
  1. declarar claramente que a pessoa está optando por receber comunicação da empresa;
  2. declarar o **nome da empresa**;
  3. cumprir a lei aplicável.
- Métodos exemplificados: SMS, site, telefone/IVR, presencial/papel.
- A Meta **não** gerencia o opt-in. É responsabilidade do negócio coletar, guardar e honrar.
- A página de *Service messages* reitera: só enviar a quem deu opt-in, **inclusive** dentro da CSW.
- Qualidade baixa sustentada → rate limit; bloqueio/denúncia degradam o número.

**LGPD (Brasil) é mais específica que a política da Meta.** Assumption **WA-A1**: o opt-in cadastrado no responsável deve ser **explícito para WhatsApp** (canal nomeado), com data, método e quem registrou. Consentimento genérico “aceito comunicações” **não** basta para o cadastro interno, mesmo que a Meta aceite opt-in geral. Isso reduz risco de bloqueio e atende especificidade do consentimento.

**Regra de produto (obrigatória):**

- Campo no `Responsible`: `whatsapp_opt_in_status` (`PENDING | OPTED_IN | OPTED_OUT | UNKNOWN`).
- Envio **somente** se `OPTED_IN`. Qualquer outro valor → não chama a API; grava `NotificationEvent` `SKIPPED_NO_OPT_IN`; opcionalmente item de inbox se a regra era crítica (OVERDUE).
- Admin pode registrar opt-in obtido fora do app (conversa, papel, reunião), com `opt_in_source`, `opt_in_at`, `opt_in_recorded_by`.
- Palavras de opt-out inbound (`PARAR`, `SAIR`, `STOP`, `CANCELAR`, `NÃO QUERO`) → `OPTED_OUT` imediato, **antes** do handoff de IA; honrar na hora; não esperar classificação.
- Mensagem inbound de alguém ainda `PENDING` **não** equivale a opt-in de outreach futuro, mas **abre CSW** e permite resposta humana pontual. Outreach automático continua bloqueado até `OPTED_IN`.

### 2.4 Assinatura de webhook (HMAC)

Imposição oficial (*Create a webhook endpoint*, 17/06/2026):

**GET (verificação do endpoint)**

```
GET <CALLBACK_URL>
  ?hub.mode=subscribe
  &hub.challenge=<HUB.CHALLENGE>
  &hub.verify_token=<HUB.VERIFY_TOKEN>
```

- Comparar `hub.verify_token` com o token armazenado no servidor (`WHATSAPP_VERIFY_TOKEN`).
- Se válido: HTTP 200 + body = valor cru de `hub.challenge`.
- Se inválido: 4xx (não 200). Sem isso a Meta não envia POSTs.

**POST (eventos)**

Header: `X-Hub-Signature-256: sha256=<hex HMAC-SHA256>`

1. Calcular HMAC-SHA256 do **corpo bruto** (bytes exatamente como chegaram) usando o **App Secret** como chave.
2. Comparar o hex gerado com a parte **depois** de `sha256=`.
3. Match → payload válido. Sem match → inválido (não persistir como evento autêntico; HTTP 4xx).

Regras de implementação (não negociáveis):

- Verificar **antes** de parsear JSON de negócio. Assinatura é sobre o body original; re-serializar quebra o HMAC.
- Comparação **constant-time**.
- Rejeitar POST sem o header.
- Preferir `X-Hub-Signature-256`. Header legado SHA-1 (`X-Hub-Signature`) **não** usar como autenticação.
- HTTPS com certificado TLS **válido**. Self-signed **não** é suportado.
- Payload até **3 MB**.
- Responder **200** somente após persistir o payload (ver §9). Timeout típico da Meta: responder em poucos segundos. Processamento pesado (IA) é assíncrono.
- Entrega **at-least-once**. Se não-200, retry imediato e depois com frequência decrescente por **até 7 dias**. Sem API para buscar histórico de webhooks perdidos.
- Batch: até 1000 updates por POST, **sem garantia** de batching. Tratar cada POST isoladamente.
- Sem ordenação garantida entre eventos.
- Sem timestamp assinado → HMAC **não** é anti-replay sozinho. Anti-replay: idempotência por `wamid` + rejeitar eventos com `timestamp` absurdamente antigo (ex.: > 7 dias, alinhado à janela de retry). Assumption **WA-A2**: corte de 7 dias.

Permissões para receber webhooks: `whatsapp_business_messaging` (messages) e `whatsapp_business_management` (demais campos).

Campos mínimos a assinar:

- `messages` (inbound + statuses)
- `message_template_status_update`
- `message_template_quality_update`
- `template_category_update`
- `phone_number_quality_update`
- `account_alerts`
- `business_capability_update`

Opcionais: `account_update`, `user_preferences` (marketing opt-out da plataforma — mesmo sendo utility, honrar se chegar).

### 2.5 Grupos — limitações oficiais (A24)

A Groups API **existe**, mas **não** é base do produto.

Imposições (*Groups API*, 16/06/2026 + *Group messaging*, 21/05/2026):

- Elegível apenas com **Official Business Account (OBA)**.
- Indisponível para número do app WhatsApp Business e para Multi-solution Conversations.
- Máximo **8 participantes** por grupo.
- Máximo **10.000 grupos** por número de negócio.
- Máximo **1** negócio Cloud API por grupo.
- Entrada **somente por convite** (link). Não há endpoint para adicionar participante direto.
- Tipos suportados: texto, mídia, templates de texto e de mídia.
- **Não** suportados: calling, disappearing, view-once, authentication templates, commerce, interactive (listas/botões).
- Métricas de template em grupo **não** existem; templates de grupo devem ser criados à parte (não reaproveitar 1:1).
- Envio: mesmo `POST /{phone-number-id}/messages`, com `recipient_type: "group"` e `to: {group_id}`.
- Status de grupo: webhook agregado (um POST com vários `status` objects para o mesmo wamid).

**Decisão de produto (A24, Q4):** o grupo dos chefes é **humano**. Default e MVP:

1. no `REQUESTED`, mensagem **pronta para copiar** para o grupo;
2. na decisão, mensagem **pronta para copiar** (ou template, se WABA) para o responsável;
3. notificação **in-app**.

`WHATSAPP_GROUP` na Cloud API **não** é usado. Aprovação nunca depende de grupo/API. Sem WABA, o produto inteiro opera assim (`docs/runbooks/whatsapp-waba-brasil.md`).

### 2.6 Limites, throughput, qualidade, políticas

Do *About the platform* (04/08/2026), *Messaging limits* (21/05/2026) e *Error codes* (18/06/2026):

**Messaging limits (portfólio, não por número):** máximo de números **únicos** alcançados **fora** da CSW em 24h móveis. Tiers: 250 → 2.000 → 10.000 → 100.000 → ilimitado. Contas novas começam em 250. Upgrade para 2.000 via verificação de business **ou** 2.000 entregas fora da CSW em 30 dias com templates de alta qualidade. Escala automática depois disso se qualidade alta e uso ≥ 50% do limite em 7 dias. Campo da API: `whatsapp_business_manager_messaging_limit` (`messaging_limit_tier` está **deprecado**).

**Throughput:** até **80 mensagens/segundo** por número (padrão). Erro **130429** se estourar.

**Pair rate:** 1 mensagem a cada **6 segundos** para o **mesmo** usuário (~10/min, ~600/h). Burst de até 45 em 6s “empresta” cota futura. Erro **131056**. Retry oficial sugerido: esperar `4^X` segundos. Digest (A25) e espaçamento interno existem também para respeitar isso.

**Graph API (certos endpoints de WABA):** 200 req/h (WABA nova) ou 5.000 req/h (WABA ativa). Erros **4** / **80007**.

**Qualidade do número:** baseada nos últimos 7 dias, ponderada por recência: blocks, reports, mutes, archives. Ratings: GREEN / YELLOW / RED / NA. Qualidade baixa sustentada → restrição (erro **131048**). Template low quality → pausa (**132015**) ou disable permanente (**132016**).

Diretrizes oficiais de qualidade (página de service messages): só opt-in; mensagens personalizadas e úteis; evitar welcome aberto; evitar excesso por dia; otimizar tamanho. Isso **alinha** com A25/A26.

**Política:** uso de ferramentas não oficiais (WhatsApp Web, Selenium, Puppeteer, libs não oficiais) é **proibido** como arquitetura (PROMPT §14 + termos da plataforma). A7.

**Precificação relevante (não é regra de envio, mas é risco operacional):**

- Até 30/09/2026: service messages na CSW e utility **dentro** da CSW seguem o regime vigente (utility-in-CSW gratuito desde 01/07/2025; service gratuito desde 01/11/2024).
- A partir de **01/10/2026**: service messages e utility **dentro** da CSW passam a ser cobrados por mensagem entregue. Sem método de pagamento até 30/09/2026, a Meta **para de entregar** service messages.
- Outreach (nossos lembretes) já é utility **fora** da CSW → já é cobrado no modelo per-message.
- Resposta humana do admin na CSW vira custo a partir de 01/10/2026.
- **WA-A3:** registrar método de pagamento no WABA antes de 30/09/2026 (runbook DevOps). Q2 (WABA existente vs greenfield) permanece aberta.

Outros erros que o worker deve conhecer (não retry infinito):

| Código | Significado | Ação |
| --- | --- | --- |
| 131047 | Fora da CSW com non-template | Reenviar como template (não deveria ocorrer no outreach) |
| 131056 | Pair rate | Retry com backoff 4^X; não marcar regra como cumprida |
| 130429 | Throughput | Retry global com jitter |
| 131048 / 131064 | Restrição de qualidade / classificação | Pausar outreach automático; inbox crítica |
| 132001 | Template inexistente/não aprovado | Inbox; não retry até correção |
| 132015 / 132016 | Template pausado/disabled | Inbox; failover para outro template se houver |
| 131026 | Número não é WhatsApp / ToS / app antigo | Não retry automático; marcar contato `UNDELIVERABLE` |
| 131021 | Remetente = destinatário | Não retry |
| 130403 | Empresa bloqueou o usuário | Não retry |
| 131050 | Usuário recusou marketing | Não retry marketing; nossos templates são utility — só honrar se aplicável |
| 131042 | Pagamento | Inbox crítica |
| 368 / 131031 | Conta restrita por política | Parar envios; alerta admin |
| 132000 / 132012 | Parâmetros de template | Falha permanente daquele envio; corrigir mapeamento |

TTL padrão de entrega (exceto auth): **30 dias**. Se não houver `delivered` nesse prazo, assumir drop.

Telefone no envio: **sempre E.164 com `+` e DDI**. Sem `+`, a Meta prefixa o DDI do número de negócio — risco alto de entrega errada. Brasil e México: a Cloud API pode alterar prefixo extra; persistir `wa_id` retornado no `contacts[]` da resposta e usá-lo dali em diante.

---

## 3. Arquitetura da camada WhatsApp

Pacote: `packages/whatsapp`. Sem regra de domínio.  
Consumidores: `apps/worker` (envio + processamento) e `apps/web` (handshake GET + POST persist-first).  
Domínio (quem lembrar, digest, opt-in de negócio): `packages/core`.

### 3.1 Interface `WhatsAppProvider`

Contrato único. Nenhuma chamada Graph API fora desta interface.

```text
WhatsAppProvider
  sendTemplate(input: SendTemplateInput) → SendResult
  sendText(input: SendTextInput) → SendResult
  receiveWebhook(input: RawWebhookRequest) → WebhookAcceptance
  getMessageStatus(providerMessageId: string) → MessageStatusSnapshot | null
```

**`sendTemplate`**

- Destino: E.164 individual (MVP) ou `group_id` se `recipient_type = group` (pós-MVP, feature-flag).
- `templateName`, `language` (`pt_BR`), `namedParameters: { nome, numero, matriz, tarefa, prazo, ... }`.
- `bizOpaqueCallbackData`: id da outbox / `correlation_id` (volta no webhook de status).
- Não envia se o caller não passou pela checagem de opt-in (o provider **também** recusa `to` sem opt-in resolvido no input: `optInConfirmed: true` obrigatório). Defesa em profundidade.

**`sendText`**

- Somente CSW aberta + origem humana (admin).
- Body texto; opcional `context.message_id` (reply contextual oficial).
- Mesma exigência de `optInConfirmed` **ou** `humanReplyInOpenWindow: true` (resposta pontual a inbound; ainda assim não faz outreach).

**`receiveWebhook`**

- Recebe headers + **raw body bytes**.
- Executa GET handshake **ou** HMAC do POST.
- Não interpreta negócio. Devolve:
  - `accepted: false` (assinatura/token inválidos);
  - `accepted: true` + `payload` parseado **depois** da verificação, para o caller persistir.

O HTTP handler em `apps/web`:

1. lê raw body;
2. chama `receiveWebhook`;
3. se inválido → 401/403;
4. se GET válido → 200 + challenge;
5. se POST válido → **persiste** `webhook_receipts` na mesma request → 200;
6. enfileira job `ProcessWhatsAppWebhook`.

**`getMessageStatus`**

- Lê o último status persistido para o `wamid` (fonte: webhooks `statuses`). A Cloud API **não** oferece GET confiável de status histórico de uma mensagem enviada; o status **é o webhook**. Este método é leitura do nosso banco, não round-trip Meta. Útil para UI e para o worker decidir retry.

### 3.2 `MetaWhatsAppProvider`

Única implementação no MVP.

- Graph API `POST /{WHATSAPP_API_VERSION}/{PHONE_NUMBER_ID}/messages`.
- Versão configurável por ENV (`WHATSAPP_API_VERSION`, default documentado hoje: `v26.0`). Não hardcodar eternamente.
- Auth: Bearer system-user token (`WHATSAPP_ACCESS_TOKEN`).
- Mapeia erros Graph → `SendResult` estruturado (`retryable`, `code`, `details`).
- Normaliza `wa_id` da resposta `contacts[]`.
- Captura `messages[0].id` (wamid) como `provider_message_id`.
- Timeout curto; **não** espera webhook de delivered no request síncrono. Aceitação da API = `accepted`, não `delivered`.

Implementações futuras (BSP, outro número) entram como nova classe atrás da mesma interface. Sem ifs de fornecedor em `packages/core`.

Não usar: WhatsApp Web, Baileys, whatsapp-web.js, Puppeteer, Selenium, Evolution API não oficial, etc.

---

## 4. Persist-first, idempotência e mapeamento inbound

### 4.1 Persist-first (PROMPT §17)

Nada de IA, nada de matching de tarefa, nada de mutação de domínio **antes** de gravar o webhook.

```
POST /webhooks/whatsapp
  → HMAC OK?
  → INSERT webhook_receipts (raw_payload protegido, headers reduzidos, received_at, signature_ok)
  → COMMIT
  → HTTP 200
  → job ProcessWhatsAppWebhook(receipt_id)
```

Se o INSERT falhar → **não** devolver 200. A Meta reenvia (até 7 dias).  
Se o INSERT passar e o job falhar depois → 200 já foi; o job retenta internamente. Mensagem **não se perde**.

`raw_payload` é dado pessoal: coluna com acesso restrito, sem SELECT em logs, retenção configurável (ver §16).

### 4.2 Idempotência

A Meta reenvia. Chaves:

| Evento | Chave natural | Tabela |
| --- | --- | --- |
| Mensagem inbound | `messages[].id` (**wamid**) | `messages.provider_message_id` UNIQUE |
| Status outbound | `(statuses[].id, statuses[].status)` | `message_status_events` UNIQUE `(provider_message_id, status)` |
| Receipt HTTP | hash SHA-256 do raw body | `webhook_receipts.body_sha256` (índice; não único absoluto — batch igual é raro; o único de verdade é o wamid) |

Algoritmo do job:

1. Ler receipt.
2. Para cada `entry.changes.value.messages[]`: `INSERT ... ON CONFLICT (provider_message_id) DO NOTHING`. Se conflito → **não** reprocessar triagem.
3. Para cada `statuses[]`: inserir evento de status; atualizar `messages.delivery_status` se o novo status for mais avançado (`sent < delivered < read`; `failed` é terminal). Conflito do par `(wamid, status)` → no-op.
4. `processing_status` do receipt: `PENDING → PROCESSED | PARTIAL | FAILED`.

Nunca usar “telefone + texto + minuto” como idempotência. Só `wamid`.

### 4.3 Conversation / Message

Entidades (alinhadas ao domínio; nomes em inglês):

**Conversation** — um fio por contato (`wa_id` / responsável). Não um fio por tarefa. Uma pessoa discute várias demandas no mesmo chat.

- `id`
- `responsible_id` (nullable até matching)
- `wa_id`
- `last_inbound_at` (base da CSW)
- `last_outbound_at`
- `opt_out_detected_at`
- `created_at`

**Message**

- `id`
- `conversation_id`
- `provider_message_id` (wamid, UNIQUE, nullable só para outbound ainda não aceito pela API)
- `direction` (`INBOUND | OUTBOUND`)
- `responsible_id` / contato
- `task_id` nullable (quando identificável)
- `matrix_id` nullable
- `notification_event_id` nullable (se foi disparo de regra)
- `raw_payload` protegido (recorte do objeto da mensagem, não o POST inteiro — o POST fica em `webhook_receipts`)
- `normalized_text`
- `type` (`text | image | audio | document | unsupported | template | status_only | ...`)
- `timestamp` (Unix do provider, em timestamptz)
- `processing_status` (`RECEIVED | NORMALIZED | TRIAGE_PENDING | TRIAGED | SKIPPED | ERROR`)
- `correlation_id` (A31)

Matching de tarefa (heurística determinística, **sem IA**):

1. Se o outbound anterior mais recente na conversa tinha `task_id` e o inbound chegou em < N horas (default 72h, configurável) → herda essa tarefa.
2. Se o texto contém `#123` e a matriz foi a do último outbound → tenta `sequence_number`.
3. Senão `task_id = null`. A IA (FASE 4) pode sugerir tarefa; o admin confirma. Este doc **não** detalha a IA.

Mídia inbound: baixar via Media API, armazenar de forma controlada, `normalized_text` = `"[audio]"` / `"[imagem]"` etc. Falha de download = erro **131052**; mensagem permanece armazenada como unsupported + inbox.

### 4.4 Contrato de handoff para triagem (IA) — sem detalhar o modelo

Depois de persistir `Message` inbound com texto (e passar pelo filtro de opt-out):

Evento interno `ResponsibleResponded` / `InboundMessageStored`.

Job **posterior** (pacote `packages/ai`, FASE 4):

```text
AiTriageRequested {
  correlation_id: string
  message_id: uuid
  conversation_id: uuid
  responsible_id: uuid | null
  task_id: uuid | null
  matrix_id: uuid | null
  normalized_text: string
  received_at: timestamptz
  task_snapshot: { title, sequence_number, operational_status, deadline_status, due_date, extension_status } | null
  recent_messages: Array<{ direction, normalized_text, timestamp }>  // estritamente as N últimas, default 5
}
```

Contrato de falha: se o consumidor de IA estiver fora, `processing_status = TRIAGE_PENDING`, item de inbox “pendente de classificação”, **mensagem continua armazenada**. IA nunca é ponto único de falha (A8, A32).

A automação **não** responde automaticamente ao responsável após a classificação (PROMPT §3). Exceção: honra de opt-out (mensagem curta de confirmação **somente se CSW aberta**; senão, só estado interno + in-app).

---

## 5. Templates iniciais e tom

Tom: humano, curto, educado, profissional, não robótico, sem formalidade excessiva (PROMPT §15). Sem “prezado(a)”, sem “informamos que o sistema”. Sem emoji excessivo. Sem chatbot follow-up em cadeia.

Parâmetros nomeados oficiais (minúsculas): `nome`, `numero`, `matriz`, `tarefa`, `prazo`. O texto abaixo é o **conteúdo a submeter** no WhatsApp Manager / Message Templates API, idioma `pt_BR`, categoria pedida `UTILITY`, `parameter_format: named`.

Variáveis **proibidas** no começo ou fim da string (erro 2388299). Por isso o fechamento é texto fixo, não `{{nome}}` no final.

### 5.1 `reminder_due_soon` (REMINDER_DUE_SOON)

Uso: D-3, D-1, D0 (e digest unitário se só uma demanda).

```
Oi, {{nome}}. Passando para lembrar da demanda #{{numero}} da matriz {{matriz}}: {{tarefa}}.

O prazo é {{prazo}}.

Está tudo caminhando para concluirmos dentro do prazo? Se tiver bloqueio, estiver dependendo de alguém ou precisar de alguma coisa, pode me avisar por aqui.
```

### 5.2 `task_overdue` (OVERDUE)

Uso: D+1 e follow-up de atraso. **Nunca** para `BLOCKED` nem `WAITING_FOR_TRIGGER`.

```
Oi, {{nome}}. A demanda #{{numero}} da matriz {{matriz}} está com o prazo vencido e ainda consta como pendente:

{{tarefa}}

Consegue me atualizar o andamento? Se houver impedimento ou se for preciso rever o prazo, me diga o motivo e a nova previsão.
```

### 5.3 `blocked_follow_up` (BLOCKED FOLLOW-UP) — faz sentido, opcional

**Faz sentido criar.** Bloqueio por pré-requisito **não** é atraso do responsável (A26). O template **não** cobra atraso. Pergunta se o bloqueio continua e se a pessoa precisa de algo. Default da **regra**: `enabled = false` no seed; o template existe para ligar sem recriar na Meta.

```
Oi, {{nome}}. A demanda #{{numero}} da matriz {{matriz}} segue aguardando um pré-requisito ({{tarefa}}).

Não estou cobrando prazo seu. Só queria saber se o bloqueio continua ou se você precisa de alguma coisa da nossa parte.
```

Parâmetro extra: nenhum além dos padrão. O título da tarefa já descreve o contexto; o sistema **não** empurra “você está atrasado”.

### 5.4 `reminder_digest` (A25)

Quando o mesmo responsável teria **2+** lembretes no mesmo dia civil (`America/Sao_Paulo`).

```
Oi, {{nome}}. Você tem {{quantidade}} demandas para acompanhar hoje:

{{lista}}

Se alguma estiver travada, dependendo de outra pessoa ou precisar de prazo novo, me avisa por aqui.
```

`lista` é texto já montado no core, uma linha por demanda, ex.: `#3 OD Academy — Elaborar versão 1 (prazo 30/10)`. Cuidado com limite de caracteres do body de template (1024). Se estourar: digest só com as N mais urgentes + linha “e mais X no sistema”. Assumption **WA-A4**: N=5 no default.

Não disparar **também** os unitários no mesmo dia quando o digest for escolhido.

### 5.5 `extension_approved_notice` (sócios — §13)

Disparado **somente** após `ExtensionApproved` (humano aprovou). Nunca a IA envia isto.

```
Prorrogação registrada — {{matriz}}

Demanda #{{numero}}
Responsável: {{responsavel}}
Tarefa: {{tarefa}}
Prazo anterior: {{prazo_anterior}}
Novo prazo: {{novo_prazo}}
Solicitado por: {{solicitado_por}}
Motivo: {{motivo}}
Prorrogação nº {{numero_prorrogacao}}.
```

Formato alinhado ao exemplo da seção 13. `{{nome}}` aqui **não** é o sócio: o sócio é o destinatário; `responsavel` é quem está na tarefa. Se o target for o próprio responsável, ainda assim o texto é o registro formal (é comunicação de fato, não lembrete).

Copy-ready in-app = **exatamente** este texto já interpolado.

### 5.6 Templates de admin (seção 21)

Dois utility adicionais, destinatário = WhatsApp do administrador (também com opt-in):

- `admin_blocker_alert`
- `admin_extension_request_alert`

Conteúdo segue os exemplos da §21, com frase fixa: “Nenhuma alteração foi feita automaticamente.” em pedidos de prorrogação. Não são conversa com responsável.

### 5.7 Renderização por destinatário (I5 / A20)

Tarefa com Giovanni e Francisco → **duas** mensagens, cada uma com `{{nome}}` daquela pessoa. Sem “Giovanni e Francisco” num único template. Sem responsável primário.

Se um tem opt-in e o outro não: envia só para quem tem; `SKIPPED_NO_OPT_IN` para o outro; a tarefa não é “não notificada”.

---

## 6. NotificationRules — defaults, não constantes eternas

Tabela `notification_rules` (configurável na UI, seed na FASE 3). O worker **lê o banco**. Defaults abaixo são seed, não magia no código.

Cada regra:

- `id`, `code`, `enabled`
- `trigger` (quando avaliar)
- `offset_business_days` (negativo = antes, 0 = no dia, positivo = depois)
- `template_code`
- `audience` (`TASK_RESPONSIBLES | NOTIFICATION_TARGETS | ADMIN`)
- `skip_if` (lista de condições)
- `dedupe_key_template` (ex.: `task:{id}:rule:{code}:occurrence:{occ}`)
- `min_hours_since_last_outbound_to_contact` (anti-spam)
- `digest_eligible` (bool)

### 6.1 Seed inicial

| code | enabled | trigger | offset (dias úteis) | template | skip_if |
| --- | --- | --- | --- | --- | --- |
| `DUE_SOON_D3` | true | due_date − 3 úteis, início da manhã operacional | −3 | `reminder_due_soon` | ver §7 |
| `DUE_SOON_D1` | true | due_date − 1 útil | −1 | `reminder_due_soon` | idem |
| `DUE_TODAY_D0` | true | dia do vencimento (calendário da regra, timezone da system_settings) | 0 | `reminder_due_soon` | idem |
| `OVERDUE_D1` | true | 1 útil após due_date, ainda não concluída | +1 | `task_overdue` | + não se `BLOCKED` |
| `OVERDUE_FOLLOWUP` | true | N úteis após último OVERDUE sem inbound do responsável | default **+3** a partir do último overdue enviado | `task_overdue` | idem + teto de 3 follow-ups |
| `BLOCKED_FOLLOWUP` | **false** | tarefa `BLOCKED` há M úteis (default 3) e ainda bloqueada | — | `blocked_follow_up` | nunca combina com OVERDUE |
| `DIGEST_DAILY` | true | fim da consolidação da manhã (após avaliar as regras do dia) | — | `reminder_digest` | se < 2 candidatos |
| `EXTENSION_APPROVED_TO_TARGETS` | true | evento `ExtensionApproved` | 0 (imediato via outbox) | `extension_approved_notice` | — |
| `ADMIN_INBOX_ALERT` | true | evento de triagem que exige humano | 0 | templates admin | — |

“Manhã operacional” default: **09:00** `America/Sao_Paulo` (configurável em `system_settings.notification_send_hour`). Não acordar gente à meia-noite.

Recorrência (A16): a chave de dedupe inclui `occurrence_id`. Concluir o período não gera OVERDUE do período seguinte.

### 6.2 O que as regras **não** cobram (A26) — obrigatório

Não enfileirar WhatsApp (nem unitário nem digest) quando:

- status operacional `COMPLETED` ou `CANCELLED`;
- status de prazo `WAITING_FOR_TRIGGER` / `NOT_APPLICABLE` (I4);
- a tarefa está `BLOCKED` **e** a regra é de atraso (`OVERDUE_*`) — bloqueio **não** é atraso do responsável;
- a pessoa não está `OPTED_IN`;
- `Responsible.active = false`;
- a matriz está arquivada (`archived_at IS NOT NULL`), salvo regra explícita futura;
- já existe `NotificationEvent` com a mesma `dedupe_key` em estado `SENT | DELIVERED | QUEUED`.

Bloqueio: item de **inbox para o admin** sempre; WhatsApp gentil só se `BLOCKED_FOLLOWUP.enabled`.

`WAITING_FOR_VALIDATION` (“já entreguei”, A14): não mandar OVERDUE. Pode haver um lembrete interno ao admin; não cobrar o responsável.

---

## 7. Anti-spam e digest (A25, A26)

Camada no core, **antes** de escrever na outbox.

1. **Dedupe por tipo:** a mesma regra + mesma tarefa + mesma ocorrência + mesmo responsável não dispara duas vezes.
2. **Cooldown por contato:** default `min_hours_since_last_outbound_to_contact = 12`. Configurável. Exceção: `EXTENSION_APPROVED_TO_TARGETS` e alertas de admin (não são lembretes).
3. **Teto diário por contato:** default 2 mensagens automáticas/dia (digest conta como 1). Configurável.
4. **Digest (A25):** se, após aplicar skip/dedupe, o mesmo responsável teria **2+** lembretes no mesmo dia civil → **uma** `reminder_digest` no lugar. Estratégia em `system_settings.digest_strategy`: `DIGEST_WHEN_2_PLUS` (default) | `ALWAYS_PER_TASK` | `ALWAYS_DIGEST`. Sempre configurável.
5. **Pair rate Meta:** o worker serializa envios ao mesmo `wa_id` com intervalo mínimo de **6s** (mais margem: 8s). Digest reduz a chance de 131056.
6. **Não “uma mensagem por tarefa” às cegas** quando o dia está cheio — o digest existe exatamente para isso.
7. Inbound do responsável no dia **cancela** follow-up automático restante daquele ciclo (não cancela aviso a sócios).

Tudo isso gera `NotificationEvent` com `result = SKIPPED_*` para auditoria (“por que não enviou?”).

---

## 8. NotificationTargets (sócios, §13)

Após `ExtensionApproved`:

Texto estruturado (§5.5) contendo: matriz, número da demanda, tarefa, responsável, prazo anterior, novo prazo, motivo, quem solicitou, número de prorrogações.

**Tipos de target (A30, lista configurável, não hardcoded):**

| type | MVP | Comportamento |
| --- | --- | --- |
| `IN_APP` | sim, sempre | notificação na Central + registro |
| `WHATSAPP_INDIVIDUAL` | sim | `sendTemplate` para o `Responsible` do sócio, se opt-in |
| `WHATSAPP_GROUP` | não dependente | só se OBA + flag + group_id; falha → fallback |
| `EMAIL` | não | reservado |
| `COPY_READY` | sim | gera o texto interpolado para o admin colar onde quiser |

Fluxo de fallback (obrigatório):

```
ExtensionApproved
  → sempre IN_APP + COPY_READY
  → para cada WHATSAPP_INDIVIDUAL com opt-in: outbox sendTemplate
  → se WHATSAPP_GROUP configurado e healthy: tenta uma vez
  → se grupo falhar ou indisponível: não é erro de negócio; individuais + copy-ready bastam
```

Seed de quem são os sócios = Q4 (aberta). A arquitetura não assume nomes.

---

## 9. Outbox transacional (PROMPT §30, A23)

Não chamar a Cloud API dentro da transação que altera tarefa/prazo.

```
Transação de domínio
  → persiste mudança (ex.: ExtensionApproved, TaskDueSoon calculado)
  → INSERT outbox_messages (status=PENDING, aggregate, payload, dedupe_key UNIQUE)
COMMIT

Worker (pg-boss poller da outbox, processo separado)
  → SELECT FOR UPDATE SKIP LOCKED
  → status=SENDING
  → WhatsAppProvider.sendTemplate / sendText
  → sucesso API (wamid): SENT + provider_message_id
  → erro retryable: PENDING + next_attempt_at + attempts++
  → erro permanente: FAILED + inbox “automação com erro”
  → webhook delivered/read/failed: atualiza NotificationEvent; não reenvia
```

Garante:

- tarefa atualizada **sem** perder o aviso (outbox sobrevive a crash);
- crash no meio do POST: `dedupe_key` + idempotência; se a API aceitou mas o processo morreu antes de gravar wamid, o retry pode gerar **segunda** mensagem. Mitigação: `biz_opaque_callback_data` = `outbox_id`; se webhook chegar com esse id e a linha ainda `SENDING`, reconcilia em vez de reenviar. Assumption **WA-A5**: janela de reconciliação 15 min antes de retry.
- duplicata de regra: `dedupe_key` unique na outbox.

Retry interno: exponencial (1m, 4m, 16m, 64m…), teto 6 tentativas para 131056/130429/5xx/timeout. Depois: FAILED + inbox. A linha **permanece**; admin pode “reenviar” (cria nova outbox com novo id, mesma regra só se a dedupe de negócio permitir).

pg-boss é o **poller**. Outbox é a **persistência**. Não são a mesma coisa (I8).

---

## 10. Scheduler e ciclo diário

Worker, não o processo web.

1. Job `EvaluateNotificationRules` (a cada 15 min, mas só envia no `notification_send_hour` salvo eventos imediatos).
2. Motor de prazo (outro spec) marca cache `deadline_status` com `computed_at`. WhatsApp **não** recalcula dia útil.
3. Core produz lista de `IntendedNotification`.
4. Anti-spam/digest filtra.
5. Transação: `notification_events` + `outbox_messages`.
6. Outbox worker envia.

Eventos imediatos (não esperam 09:00): `ExtensionApproved`, alerta de admin por bloqueio/prorrogação/falha.

---

## 11. Dev local vs produção

**Local**

- App web em localhost.
- Meta exige HTTPS público com certificado válido.
- Túnel (cloudflared, ngrok, ou equivalente) **só** no perfil `whatsapp-tunnel` do Compose / documentação DevOps. Não sobe no `docker compose up` padrão.
- Callback URL do App Dashboard aponta para o túnel `/webhooks/whatsapp`.
- Verify token e App Secret em ENV local, nunca commitados.
- Quando o túnel cai, webhooks acumulam retry da Meta (7 dias) — aceitável em dev, inaceitável em prod.

**Produção**

- Endpoint HTTPS **do próprio deploy** (mesmo app `apps/web` ou gateway).
- **Não** depende da máquina do desenvolvedor ligada.
- Sem túnel.
- Token de sistema de longa duração em secret manager / ENV do host.
- App Meta em Live mode (alguns webhooks não fluem em Dev mode).
- Override de webhook por WABA/número só para staging, nunca apontando staging a partir de prod.

ENV (validação Zod em `packages/config`):

```
WHATSAPP_API_VERSION
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_WABA_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_APP_SECRET          # HMAC
WHATSAPP_VERIFY_TOKEN
WHATSAPP_APP_ID
```

Ausência de qualquer um em produção → a app sobe, mas o provider fica `disabled` e o dashboard mostra “WhatsApp não configurado”. Prazos continuam corretos (A32).

---

## 12. Falhas visíveis e resiliência

| Falha | Dado | UX |
| --- | --- | --- |
| Cloud API fora / 5xx | outbox PENDING | card dashboard “automações com erro” quando estoura teto de retry |
| 131056 / 130429 | retry | silencioso até teto |
| Template rejeitado/pausado | FAILED permanente | inbox + não há envio fantasma |
| Sem opt-in | SKIPPED_NO_OPT_IN | visível no detalhe da tarefa, não como “atraso de envio” |
| Webhook inválido | não persiste como autêntico | 4xx |
| Webhook válido, job de processamento cai | receipt persistido | retry job; se persistir ERROR → inbox |
| IA cai | Message TRIAGE_PENDING | inbox “pendente de classificação” |
| Worker cai | outbox intacta | retoma no restart |
| Qualidade RED / 131048 | pausa outreach | inbox crítica para admin |

Mensagem inbound **sempre** permanece armazenada, classificada ou não.

Dashboard (PROMPT §22) consome a fila de `outbox_messages` com status `FAILED` para o card “automações com erro”.

---

## 13. Qualidade da conta e rate limit — comportamento do produto

- Antes de um lote diário, o worker pode `GET` `quality_rating` e `whatsapp_business_manager_messaging_limit`. Se RED: **não** disparar outreach em massa; só alertas de admin e respostas humanas na CSW.
- Webhooks `phone_number_quality_update`, `message_template_quality_update`, `account_alerts` → persistir e, se degradar, inbox.
- Respeitar pair rate mesmo com poucas pessoas (matrizes internas ainda batem 131056 se um digest + overdue + admin reply saírem juntos).
- Não “aquecer” a conta com spam de teste em números reais. Dev usa números de teste da Meta.
- Conteúdo: personalizado (`{{nome}}`, `#numero`); volume baixo por desenho (digest + cooldown). Isso é a principal defesa de qualidade.

---

## 14. LGPD e dados pessoais

Dados: nome, telefone, conteúdo de mensagens, raw JSON da Meta, histórico operacional.

| Controle | Como |
| --- | --- |
| Minimização | persistir raw para auditoria/idempotência, não replicar em 10 tabelas |
| Propósito | acompanhamento de demandas internas; não marketing |
| Base | consentimento (opt-in WhatsApp) + execução de atividade interna; registrar base no cadastro do responsável |
| Raw payload | coluna de acesso restrito (`webhook_receipts.raw_payload`, `messages.raw_payload`); não vai para Pino, Sentry, ou AI prompt cru sem necessidade — o handoff usa `normalized_text` |
| Telefone nos logs (A35) | mascarar: `+55*******1234` (manter DDI + 4 finais). Nunca logar body de webhook |
| `wa_id` | dado pessoal; tratar como telefone |
| Retenção | `system_settings.whatsapp_raw_retention_days` default **365**; após isso, anonimizar raw e manter metadados (wamid, direção, task_id) |
| Exclusão | fluxo futuro de “esquecer responsável”: apagar/anonimizar conversas + opt-out; audit log guarda que a exclusão ocorreu, não o texto |
| Acesso | só `ADMIN` / `OPERATOR` autenticados; sem endpoint público de leitura de raw |
| Operadores | a Meta é operadora de canal; o aviso de privacidade interno deve citar envio via WhatsApp Business Platform |

---

## 15. Modelo conceitual (não é migration)

Relacionado a entidades do domínio (nomes em inglês):

- `responsibles.whatsapp_number_e164`, `whatsapp_opt_in_status`, `whatsapp_opt_in_at`, `whatsapp_opt_in_source`, `whatsapp_wa_id`
- `notification_rules` (§6)
- `notification_targets` (pessoa/canal para sócios e admin)
- `notification_events` (intenção + resultado: QUEUED, SENT, DELIVERED, READ, FAILED, SKIPPED_*)
- `outbox_messages`
- `webhook_receipts`
- `conversations`, `messages`, `message_status_events`
- `outbox_messages` (visibilidade de erro: status `FAILED`)

Eventos de domínio que **geram** outbox (efeito ≠ evento): `TaskDueSoon`, `TaskOverdue`, `ReminderScheduled`, `ExtensionApproved`, `BlockerDetected` (inbox; WhatsApp só se regra ligada), `ResponsibleResponded` (não envia; handoff IA).

---

## 16. Fluxos ponta a ponta (resumo)

**Outreach de prazo**

```
scheduler → core avalia regras → skip A26/opt-in/dedupe
  → se 2+ para a mesma pessoa: digest
  → tx: notification_events + outbox
  → worker sendTemplate
  → wamid em messages (OUTBOUND)
  → statuses webhook → SENT/DELIVERED/READ/FAILED
```

**Inbound**

```
Meta POST → HMAC → persist receipt → 200
  → job: upsert Conversation/Message por wamid
  → opt-out lexical? atualiza responsável
  → atualiza last_inbound_at (abre CSW)
  → matching determinístico de tarefa
  → AiTriageRequested (FASE 4)
  → inbox se requires_human_action (sempre, no default do produto)
```

**Prorrogação aprovada**

```
admin aprova → DeadlineExtension APPROVED + audit
  → outbox para cada NotificationTarget
  → template sócios + in-app + copy-ready
  → grupo só se flag
```

---

## 17. Fora de escopo desta camada

- Classificação LLM, prompts, thresholds (docs/07).
- Cálculo de dia útil e feriado (docs/04).
- Mutar prazo, responsável, COMPLETED.
- Chatbot de múltiplos turnos.
- E-mail.
- Dependência de grupo.
- FASE 1 do roadmap: **sem** WhatsApp (A33). Esta spec alimenta a FASE 3.

---

## 18. Assumptions e perguntas

| ID | Tipo | Texto |
| --- | --- | --- |
| WA-A1 | assumption | Opt-in interno é explícito para WhatsApp, além do mínimo da Meta. |
| WA-A2 | assumption | Webhooks com timestamp > 7 dias são descartados após persistir o receipt (anti-replay fraco). |
| WA-A3 | assumption | Método de pagamento no WABA será configurado antes de 01/10/2026. |
| WA-A4 | assumption | Digest trunca lista em 5 demandas + “e mais X”. |
| WA-A5 | assumption | Reconciliação outbox via `biz_opaque_callback_data` por 15 min antes de retry. |
| A24–A26, A7, A23, A30, A31, A35 | travadas | ver brief. |
| Q2 | aberta | Já existe WABA/número Cloud API, ou setup greenfield? Afeta OBA/grupos, display name, tier 250. |
| Q4 | aberta | Quem entra no seed de NotificationTargets (sócios). |

---

## 19. Riscos

1. **Recategorização UTILITY → MARKETING:** muda preço, pode cair em limites de marketing por usuário (131049) e em MM API. Mitigar texto factual + monitorar `template_category_update`.
2. **Qualidade do número:** lembretes repetidos a colegas internos ainda geram mute/block. Digest e cooldown são a defesa; `BLOCKED_FOLLOWUP` default off.
3. **Grupos:** OBA + 8 pessoas + convite-only tornam grupo de sócios frágil. Fallback individual é o caminho real.
4. **Janela 24h mal implementada:** `sendText` de automação fora da CSW → 131047 em massa. Outreach **só** template.
5. **HMAC no JSON parseado:** falha silenciosa de verificação ou rejeição de todos os POSTs. Teste de contrato obrigatório (TDD, PROMPT §43).
6. **At-least-once + retry 7 dias:** sem UNIQUE em wamid, triagem duplicada e inbox duplicada.
7. **Outbox vs aceitação da API:** crash entre POST e COMMIT do wamid → risco de mensagem duplicada. Reconciliação WA-A5.
8. **Tier 250:** ambiente interno pequeno cabe; testes mal feitos contra números reais queimam cota e qualidade.
9. **Greenfield (Q2):** display name, verificação, pagamento e templates `APPROVED` são caminho crítico da FASE 3, não da FASE 1.
10. **Precificação 01/10/2026:** respostas humanas na CSW deixam de ser gratuitas; sem cartão, service messages param.
11. **Brasil E.164 / nono dígito / wa_id ≠ input:** matching de responsável deve preferir `wa_id` persistido.
12. **LGPD + raw webhook:** vazar payload em log é incidente. Máscara e retenção desde o dia 1.
13. **Não há replay oficial de webhook:** se produção recusar 200 por dias, eventos se perdem após 7 dias. Healthcheck do endpoint é crítico.
14. **Automação conversando:** qualquer “resposta automática esperta” viola §3 e piora qualidade. Handoff é classificar e avisar o admin.

---

## 20. Acceptance criteria (camada WhatsApp, FASE 3)

1. Dado responsável sem opt-in, nenhum POST é feito à Cloud API; há `SKIPPED_NO_OPT_IN`.
2. Dado opt-in, lembrete D-1 sai como template `reminder_due_soon` com `{{nome}}` daquela pessoa.
3. Dois responsáveis na mesma tarefa → dois envios, nomes distintos, uma `Task`.
4. Tarefa `WAITING_FOR_TRIGGER` ou `COMPLETED` → zero outreach.
5. Tarefa `BLOCKED` → zero `task_overdue`; inbox para admin; `blocked_follow_up` só se a regra estiver ligada.
6. Três demandas no mesmo dia para a mesma pessoa + estratégia default → **um** digest, não três templates.
7. Webhook POST com HMAC inválido → 4xx, nada persistido como autêntico.
8. Mesmo wamid reenviado pela Meta → uma `Message`, uma triagem.
9. Payload persistido **antes** de qualquer job de IA.
10. `ExtensionApproved` gera in-app + copy-ready no formato da §13 + WhatsApp individual aos targets com opt-in; ausência de grupo **não** falha o fluxo.
11. Queda da API após COMMIT de domínio → outbox reenvia; tarefa não fica “aprovada sem aviso”.
12. Falha permanente → card “automações com erro”; mensagem inbound anterior intacta.
13. Logs não contêm telefone completo nem raw JSON.
14. Local: túnel documentado; produção usa URL HTTPS própria.

Este documento é a lei da FASE 3 para WhatsApp. Revalidar as URLs oficiais da Meta no início da implementação: janela, templates, opt-in, HMAC, grupos e limites mudam com frequência.
