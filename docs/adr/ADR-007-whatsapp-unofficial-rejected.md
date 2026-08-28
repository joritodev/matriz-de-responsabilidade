# ADR-007 — Sem WhatsApp Web / Baileys / Evolution / WAHA como transporte

Status: Aceito (FASE 0, 28/08/2026)

## Contexto

O dono não tem WABA nem CNPJ. O volume previsto é baixo (único ADMIN; bem abaixo de 1.000 mensagens/mês). Ele perguntou se Evolution API (Baileys, QR Code) ou WAHA seriam o caminho certo agora, deixando Cloud API/CNPJ para um futuro empresarial distante.

O `PROMPT.md` §14 proíbe WhatsApp Web, Selenium, Puppeteer e bibliotecas não oficiais **como arquitetura principal**. A interface `WhatsAppProvider` (ADR-003) existe justamente para trocar o transporte depois.

A pergunta real não é “a tarifa da Meta é cara nesse volume?”. Nesse volume, **não é**. A pergunta é: vale colocar o **número que o dono já usa com chefes e responsáveis** atrás de um cliente que finge ser o WhatsApp Web?

## Decisão

1. **Não** adotar Evolution API, WAHA, Baileys, whatsapp-web.js, WPPConnect, Z-API ou equivalente como transporte deste produto.
2. **Não** conectar o WhatsApp pessoal/do trabalho do dono via QR Code a um servidor.
3. Continua valendo a **Opção A**: app gera texto copiável; o dono cola no grupo dos chefes e fala com responsáveis no app oficial. `WHATSAPP_ENABLED=false` até existir Cloud API de uma empresa.
4. `WhatsAppProvider` permanece. Implementações previstas: `FakeWhatsAppProvider` (testes) e, no futuro distante, `MetaWhatsAppProvider`. Sem adapter Baileys na árvore.
5. Se, no futuro, alguém insistir em unofficial: número **dedicado** (chip descartável), flag explícita, nunca o número do grupo dos chefes, e um ADR novo. Não é o MVP.

## Por que o volume baixo não salva a unofficial

- Evolution e WAHA, no modo QR, são a **mesma classe**: engenharia reversa do WhatsApp Web (em geral Baileys). “Ilimitado e de graça” viola os termos da Meta; a Meta detecta fingerprint de QR em servidor.
- Relatos de 2025–2026: restrição de 24–48h evoluindo para **banimento do número**. Número banido pode ficar inutilizável inclusive numa Cloud API futura.
- O processo Q4 **depende** desse número continuar vivo no grupo dos chefes. Banimento = o acompanhamento inteiro cai, não só o bot.
- Unofficial exige processo **ligado 24/7**. Laptop dormindo = fila morta. Isso contradiz ADR-001 (produção não depende da máquina do dono). VPS barato resolve o “ligado”, não o ban nem o QR caindo.
- Grupo dos chefes **já está coberto** sem API (texto para copiar). O único ganho da unofficial seria lembrete automático a poucos responsáveis — exatamente o trabalho que o produto quis tirar, mas o custo de falha é o número pessoal.

## Alternativas rejeitadas

| Alternativa | Por que não |
|---|---|
| Evolution API (Baileys, QR) como transporte do MVP | Mesmo risco de Baileys; sessão frágil; ToS; banimento do número operacional. |
| WAHA | Mesma classe (HTTP em cima de Baileys/whatsmeow). |
| Unofficial “só enquanto não tem CNPJ” | Dois comportamentos; vira dívida; o número pode morrer antes do CNPJ. |
| Unofficial no número pessoal porque o volume é baixo | Volume baixo reduz tarifa oficial, **não** o impacto de um ban. |
| Cloud API agora sem CNPJ | Inviável na prática (Q2). Não é o que este ADR discute. |

## Consequências

- FASE 1–2 e o fluxo dos chefes não esperam WhatsApp automático.
- FASE 3 (envio) fica para Cloud API **se e quando** uma empresa assumir CNPJ/custo (futuro distante, como o dono definiu).
- Custo Meta por mensagem é irrelevante neste horizonte.
- Avaliação detalhada: `docs/runbooks/whatsapp-waba-brasil.md` §5.
