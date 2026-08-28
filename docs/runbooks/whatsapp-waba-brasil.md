# WhatsApp oficial (WABA) no Brasil — o que é, o que custa, o que fazer agora

**Público:** o dono (único ADMIN).  
**Status:** FASE 0. Não bloqueia FASE 1–2.  
**Lei:** `PROMPT.md` §14 — só API oficial; sem WhatsApp Web / Puppeteer / Baileys.

Sua leitura está certa no essencial: **para automação de verdade (Cloud API) a Meta trata isso como produto de empresa**. No Brasil isso quase sempre passa por **CNPJ + Meta Business Manager verificado**. Não é um “plano gratuito de API para pessoa física”.

Isso **não** impede o sistema. Lembretes automáticos são FASE 3. O core (FASE 1–2) e o fluxo dos chefes (texto para copiar no grupo) funcionam sem WABA.

---

## 1. Três produtos diferentes (não misturar)

| Produto | O que é | Serve para este app? |
|---------|---------|----------------------|
| **WhatsApp pessoal** | App azul, conta sua | Você já usa. Dá para **colar** mensagens geradas pelo sistema no grupo dos chefes e falar com responsáveis. Sem API. |
| **WhatsApp Business App** | App verde no celular, grátis | Igual ao pessoal, com catálogo/etiqueta. **Não é API.** Não dá para o servidor enviar lembrete D-3 sozinho. |
| **WhatsApp Business Platform / Cloud API (WABA)** | API oficial da Meta | Único caminho que o `PROMPT.md` autoriza para automação. Exige negócio verificado, número **dedicado**, templates, webhook HTTPS. |

WABA = WhatsApp Business Account. É a conta **da empresa** na plataforma, não o app verde.

A Cloud API em si **não tem mensalidade da Meta**. O que é pago:

1. **Tarifa da Meta por mensagem de template entregue** (utility / marketing / auth), por país. Lembrete de prazo é típico `UTILITY` **fora** da janela de 24h — então **é cobrado**.
2. A partir de **1º de outubro de 2026**, a Meta passa a cobrar também mensagens de serviço que hoje são grátis dentro da janela de 24h, para quem usa a **API** (não o app do celular). Tarifas por país a Meta publica perto dessa data; trate valores em reais de blogs como **ordem de grandeza**, não tabela oficial.
3. Se você contratar um **BSP** (Zenvia, Take, Twilio, 360dialog, etc.), soma **mensalidade da plataforma**.

Documentação oficial para acompanhar: [Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started), [Pricing](https://developers.facebook.com/docs/whatsapp/pricing/).

---

## 2. Por que pedem CNPJ

A Meta verifica o **Business Manager** como empresa: razão social, documento, presença online, número que **não** está no app WhatsApp comum.

No Brasil isso se traduz, na prática, em:

- CNPJ ativo;
- Business Manager no nome da empresa;
- site/e-mail corporativo ajudam (atrasos vêm da verificação);
- **número dedicado**: se o número já está no WhatsApp do celular, precisa sair de lá (perde o histórico daquele app).

**MEI** é CNPJ, mas políticas de BSP variam (alguns recusam). Não planeje o MVP em cima de MEI sem confirmar no provedor.

Pessoa física **sem** CNPJ: a Cloud API oficial **não** é o caminho realista. Não use API não oficial para contornar isso (`PROMPT.md` §14 e §47).

---

## 3. Opções (escolha de produto, não de gambiarra)

### Opção A — Recomendada agora: operar sem Cloud API

**Quando:** você ainda não tem CNPJ/WABA (situação atual).

O que o sistema faz:

- gera **texto pronto para copiar** (grupo dos chefes no pedido de prorrogação; responsável na resposta);
- inbox e prazos no app;
- FASE 1–2 completas.

O que você faz no WhatsApp que já usa:

- cola no grupo dos chefes;
- avisa o responsável.

**Custo:** zero Meta. **CNPJ:** não. **Risco:** você continua sendo o “carteiro” — mas só nas exceções, que é o desenho do produto.

`WHATSAPP_ENABLED=false`. O `WhatsAppProvider` existe no código a partir da FASE 3, atrás da flag.

### Opção B — Cloud API direto na Meta (quando houver empresa)

**Quando:** a escola/holding/CNPJ puder verificar o Business Manager.

- Sem mensalidade de BSP.
- Você (ou o DevOps) cadastra app, número, templates `UTILITY`, webhook.
- Custo = tarifas Meta por lembrete entregue. Volume interno (dezenas de responsáveis) tende a ser baixo.

**Pré-requisitos:** CNPJ, número livre, cartão no Business Manager, HTTPS público na FASE 3+.

### Opção C — Cloud API via BSP brasileiro

**Quando:** quiser que alguém cuide de número, templates e compliance, e aceitar mensalidade.

Ainda **quase sempre exige CNPJ**. Não elimina a Meta; só empacota. O código continua falando com um `WhatsAppProvider` — o BSP vira outra implementação da mesma interface, se um dia fizer sentido.

### Opção D — Esperar o CNPJ e só então ligar a FASE 3

Idem à A, com data. Arquitetura já está pronta para isso. Não compre ferramenta agora “para não perder tempo”.

### Explicitamente fora

| Ideia | Por quê não |
|-------|-------------|
| Baileys / WhatsApp Web / Puppeteer | Banimento, instabilidade, fora da lei do `PROMPT.md` |
| Mandar o servidor no **seu** WhatsApp pessoal via API não oficial | Mesmo problema |
| Depender da Groups API da Meta para o grupo dos chefes | Exige conta especial (OBA), limite baixo de participantes; o seu processo já é humano no grupo. Texto copiável é o encaixe certo |

---

## 4. Recomendação para este projeto

1. **Agora:** Opção A. FASE 1–2 sem Meta. Fluxo Q4 100% copy-ready.
2. **Quando existir CNPJ da operação:** Opção B (Cloud API direta), templates `REMINDER_DUE_SOON` e `OVERDUE` em `pt_BR` categoria UTILITY.
3. **Grupo dos chefes:** permanece humano para sempre no MVP. Mesmo com WABA, o pedido de prorrogação **não** precisa (e não deve) ser um bot falando no grupo. Você cola o texto, negocia, e registra a decisão no app.
4. **Lembretes aos responsáveis:** aí sim a Cloud API tira trabalho (FASE 3), quando a conta existir.

Nada disso precisa ser decidido para aprovar a FASE 1. Precisa de CNPJ só para **automação de envio**.
