# WABA com MEI — passo a passo (configurar sem pagar ainda)

**Objetivo:** deixar a conta pronta para quando você tiver chip dedicado, números dos responsáveis e quiser ligar `WHATSAPP_ENABLED=true`.  
**Enquanto `WHATSAPP_ENABLED=false`:** nenhuma mensagem sai pela API, **nenhuma tarifa é cobrada**. O envio assistido (`/reminders` + `wa.me`) continua funcionando.

**Lei do projeto:** só Cloud API oficial (ADR-003). Sem Baileys, Evolution, QR no número pessoal (ADR-007).

---

## O que você vai precisar (checklist)

| Item | Por quê | Custo aproximado |
|------|---------|------------------|
| **MEI ativo** (CCMEI) | Verificação da empresa na Meta | DAS ~R$80/mês (já paga se mantém o MEI) |
| **Meta Business Manager** | Painel da empresa — **gratuito** | R$0 |
| **App no Meta for Developers** | Credenciais da Cloud API — **gratuito** | R$0 |
| **Chip dedicado** (pré-pago) | Número só para o bot — **não** use o pessoal | ~R$15–30 |
| **HTTPS público** (produção) | Webhook da Meta | VPS ~R$30/mês ou túnel em dev |
| **Templates UTILITY aprovados** | Obrigatório para lembrete fora da janela 24h | R$0 até aprovar; depois ~R$0,08–0,40/msg entregue |

**Não confunda:** Meta Verified (selo azul pago) **não** é necessário para a API.

---

## Fase A — MEI e Business Manager (1–10 dias úteis)

### A1. Confirmar o MEI

1. Acesse [Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor).
2. Baixe o **CCMEI** (Certificado da Condição de Microempreendedor Individual).
3. Tenha em mãos: CNPJ, razão social, endereço, comprovante de endereço recente (conta em nome do MEI ou CCMEI).

### A2. Criar o Business Manager

1. Acesse [business.facebook.com](https://business.facebook.com).
2. **Criar conta** → tipo **Empresa**.
3. Preencha **exatamente** como no CCMEI (nome, CNPJ, endereço). Divergência = recusa na verificação.
4. Ative **autenticação em duas etapas** em todos os administradores.

### A3. Verificar a empresa

1. Business Manager → **Configurações** → **Centro de Segurança** → **Iniciar verificação**.
2. Envie: CCMEI + comprovante de endereço + documento do responsável.
3. Aguarde e-mail da Meta (1–15 dias úteis, comum 3–5).

> Sem verificação completa você ainda pode testar em modo sandbox, mas **produção** com templates reais exige empresa verificada.

---

## Fase B — App WhatsApp e credenciais (1–2 horas)

### B1. Criar app no Meta for Developers

1. [developers.facebook.com](https://developers.facebook.com) → **Meus apps** → **Criar app**.
2. Tipo: **Outro** → **Business** → nome ex.: `Matriz Responsabilidade`.
3. Adicione o produto **WhatsApp**.

### B2. Número de telefone

1. No painel WhatsApp → **API Setup** / **Começar**.
2. A Meta oferece um **número de teste** grátis para desenvolvimento (mensagens só para números que você cadastrar como testadores).
3. Para **produção**: compre chip dedicado, cadastre na WABA. O número **não pode** estar ativo no WhatsApp comum do celular — precisa sair do app (perde histórico daquele app).

### B3. Copiar credenciais para o `.env`

No painel da Meta, anote e cole no seu `.env` (nunca commitar):

```env
WHATSAPP_TOKEN=           # Token temporário ou permanente (System User)
WHATSAPP_PHONE_NUMBER_ID= # ID do número na API
WHATSAPP_WABA_ID=         # WhatsApp Business Account ID
WHATSAPP_APP_SECRET=      # App Secret (Configurações básicas do app)
WHATSAPP_VERIFY_TOKEN=    # Você inventa — mesmo valor no .env e no painel do webhook
WHATSAPP_GRAPH_API_VERSION=v22.0
WHATSAPP_ENABLED=false    # Mantenha false até estar tudo pronto
```

**Onde achar cada um:**

| Variável | Onde na Meta |
|----------|----------------|
| `WHATSAPP_TOKEN` | WhatsApp → API Setup → token temporário; produção: System User com token permanente |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → API Setup → Phone number ID |
| `WHATSAPP_WABA_ID` | WhatsApp → API Setup → WhatsApp Business Account ID |
| `WHATSAPP_APP_SECRET` | App → Configurações → Básico → Chave secreta do app |
| `WHATSAPP_VERIFY_TOKEN` | Você escolhe (ex.: string aleatória de 32 chars) |

Confira o status em **Configurações** do app → a página mostra o checklist (sem expor os tokens).

---

## Fase C — Webhook (receber respostas)

A Meta precisa chamar seu servidor em HTTPS.

### Desenvolvimento local (túnel)

1. Instale [ngrok](https://ngrok.com) ou Cloudflare Tunnel.
2. Exponha a porta 3000: `ngrok http 3000`
3. URL do webhook: `https://SEU-TUNEL.ngrok.io/api/whatsapp/webhook`
4. No painel Meta → WhatsApp → **Configuração** → **Webhook**:
   - URL: a acima
   - Verify token: o mesmo de `WHATSAPP_VERIFY_TOKEN`
   - Assinar campos: `messages`, `message_template_status_update`

O app já responde ao GET (challenge) e ao POST (ACK + verificação HMAC quando `WHATSAPP_APP_SECRET` estiver preenchido).

### Produção

- `APP_URL=https://seu-dominio.com`
- Webhook: `https://seu-dominio.com/api/whatsapp/webhook`
- Certificado TLS válido (Let's Encrypt).

---

## Fase D — Templates (antes do primeiro envio real)

Lembretes automáticos **sempre** usam template `UTILITY` aprovado (fora da janela de 24h).

1. Business Manager → **WhatsApp Manager** → **Modelos de mensagem** → **Criar modelo**.
2. Categoria: **Utilidade** (`UTILITY`).
3. Idioma: `pt_BR`.
4. Nomes (minúsculas, underscore) alinhados ao spec:
   - `reminder_due_soon` — D-3, D-1, vence hoje
   - `task_overdue` — atrasada
   - `reminder_digest` — resumo de várias demandas
5. Corpo: copie de `docs/06-whatsapp-integration.md` §5.
6. Aguarde aprovação (minutos a 2 dias).

> Enquanto templates estiverem `IN_REVIEW`, a API não envia. **Sem template aprovado = sem cobrança de envio.**

---

## Fase E — Opt-in dos responsáveis (obrigatório)

Antes de **qualquer** envio automático:

1. Avise cada responsável que receberá lembretes operacionais pelo WhatsApp da empresa (nome do MEI).
2. No app: cadastre o WhatsApp em **Responsáveis** (E.164).
3. Marque opt-in quando implementarmos o campo na UI (hoje só `OPTED_OUT` bloqueia; `UNKNOWN` permite no assistido).

Sem opt-in documentado, a Meta pode restringir a conta.

---

## Fase F — Ligar o envio (quando você decidir pagar)

Só faça isto quando tiver: verificação OK, chip dedicado, templates `APPROVED`, opt-in, números cadastrados.

1. No `.env`: `WHATSAPP_ENABLED=true`
2. Reinicie web + worker.
3. Envie **uma** mensagem de teste para seu próprio número.
4. Confira no painel Meta se status = `delivered`.

**Volume deste projeto:** ~25 lembretes/mês → tarifa Meta na casa de **R$5–15/mês** (ordem de grandeza; confira tabela oficial).

**Calendário:** a partir de 1º/10/2026 a Meta passa a cobrar também algumas mensagens de serviço dentro da 24h na API.

---

## O que já está no código

| Peça | Status |
|------|--------|
| `MetaWhatsAppProvider` (`packages/whatsapp`) | Pronto — chama Graph API quando `WHATSAPP_ENABLED=true` |
| Webhook `/api/whatsapp/webhook` | Pronto — verificação + ACK (persistência completa na FASE 3.1) |
| Envio assistido `/reminders` | Ativo — não usa WABA |
| `notification_events` | Registra envios assistidos; mesma tabela servirá a API |
| Digest + anti-spam | No `packages/core` |

---

## Ordem recomendada para você agora

1. **Hoje:** continuar com `/reminders` (wa.me) — zero custo.
2. **Esta semana:** iniciar verificação do MEI no Business Manager (Fase A).
3. **Paralelo:** comprar chip dedicado; listar WhatsApp de cada responsável.
4. **Quando verificado:** criar app, preencher `.env`, testar webhook com ngrok.
5. **Submeter templates** e aguardar `APPROVED`.
6. **Só então:** `WHATSAPP_ENABLED=true` e primeiro envio de teste.

---

## Perguntas frequentes

**Preciso pagar algo só para configurar?**  
Não. Business Manager, app Developer e número de teste da Meta são gratuitos. Você só paga quando enviar templates entregues em produção (e o DAS do MEI se mantiver o MEI).

**Posso usar meu WhatsApp pessoal?**  
Não recomendado. Use chip dedicado. O número do grupo dos chefes deve continuar humano (Q4).

**E se eu não quiser manter o MEI?**  
O envio assistido (`wa.me`) funciona para sempre sem MEI. WABA exige CNPJ.

**BSP (Zenvia, Twilio) é obrigatório?**  
Não. Dá para ir direto na Meta (Opção B do runbook `whatsapp-waba-brasil.md`). BSP só se quiser alguém gerenciando burocracia por mensalidade extra.
