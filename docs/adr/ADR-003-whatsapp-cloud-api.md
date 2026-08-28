# ADR-003 — Meta WhatsApp Cloud API oficial e provider abstrato

Status: Aceito (FASE 0)

## Contexto

Acompanhamento de demandas precisa sair do Word e chegar no bolso do responsável: lembrete, atraso, pergunta de bloqueio, pedido de atualização (PROMPT §14–17). A Meta impõe opt-in, templates, janela de atendimento, qualidade da conta e webhooks assinados. Bibliotecas “unofficial” (WhatsApp Web, Baileys, Puppeteer, Selenium, whatsapp-web.js) prometem velocidade e quebram em banimento, instabilidade e risco jurídico/operacional inaceitável para um sistema interno que guarda nomes, telefones e histórico (LGPD, PROMPT §31).

O PROMPT proíbe unofficial como arquitetura principal e pede a interface `WhatsAppProvider`. Grupos de WhatsApp podem não estar disponíveis (A24). FASE 1 **não** inclui WhatsApp (A33); o DoD completo (seção 48) inclui. A conta WABA pode ainda não existir (Q2) — isso não pode contaminar o desenho.

## Decisão

1. **Único provedor de transporte no MVP: Meta WhatsApp Business Platform / Cloud API** (HTTP oficial + webhooks oficiais).
2. **Porta `WhatsAppProvider` em `packages/whatsapp`**, com pelo menos:
   - `sendTemplate(...)`
   - `sendText(...)`
   - `receiveWebhook(...)` (parse + verificação de assinatura)
   - `getMessageStatus(...)`
3. **Implementação inicial `MetaWhatsAppProvider`.** Testes usam um `FakeWhatsAppProvider` in-process — não um clone de WhatsApp Web.
4. **Nada de unofficial** na árvore de produção (ADR-007): sem Puppeteer, sem Baileys, sem Evolution/WAHA, sem sessão de QR no número do dono.
5. **Grupos não são dependência.** NotificationTargets enviam para pessoas configuradas; se grupo não estiver autorizado, fallback é envio individual + mensagem pronta para copiar + in-app (A24).
6. **Persistir webhook bruto antes de processar**, com UNIQUE em `provider_message_id` (idempotência). Verificar assinatura com o `WHATSAPP_APP_SECRET` atual da documentação oficial — não hardcodar regras de janela/template sem conferir o doc da versão vigente (PROMPT §14, §41).
7. **Envio nunca ocorre dentro da transação de domínio.** Sempre outbox → worker → adapter (ADR-005). Templates renderizados **por destinatário** (`{{nome}}` no singular, I5, A20).
8. **Faseamento:** código da porta pode existir cedo; credenciais e túnel só na FASE 3. Produção usa URL HTTPS do servidor, não túnel do laptop (ADR-001).

## Consequências

- Opt-in, templates aprovados e qualidade da WABA viram pré-requisito operacional da FASE 3, não da FASE 1.
- Há atrito com a Meta (aprovação de template, limite, 24h window). O tom das mensagens (humano, curto) vive nos templates, não num chatbot livre.
- Trocar de provedor no futuro (outro BSP) é um novo adapter, não um rewrite do `core`.
- Anti-spam, digest e “não cobrar bloqueada” são regra de `packages/core`, não do SDK da Meta (A25–A26).
- Números ficam em E.164 na tabela `responsibles`; logs mascaram telefone (A35).
- Q2 (WABA vs greenfield vs unofficial) foi fechado: sem WABA agora; unofficial rejeitada (ADR-007); Cloud API só se empresa futura assumir.

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| WhatsApp Web / Puppeteer / Selenium / Baileys / whatsapp-web.js | Unofficial; frágil; risco de bloqueio; incompatível com §14 e §47. |
| SMS ou só e-mail no MVP | Fora do processo real do usuário; e-mail fica como `NotificationTarget` futuro. |
| Chatbot conversacional contínuo (Flows + LLM a cada turno) | Viola o princípio de automação (PROMPT §3, ADR-004). |
| Depender de WhatsApp Group para avisar sócios | A24: a conta pode não ter grupo. Fallback obrigatório. |
| Envio síncrono no Server Action | Perde mensagem em crash; acopla latência da Meta ao clique (PROMPT §30). |
| Dois provedores em paralelo “por resiliência” | Complexidade e opt-in duplicado sem operação. Um adapter oficial. |
| Implementar Cloud API só em produção, local com unofficial | Dois comportamentos. Local usa Fake provider +, se necessário, o perfil de túnel contra a API real de teste. |
