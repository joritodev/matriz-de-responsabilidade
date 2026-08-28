# ADR-008 — Envio assistido por click-to-chat como transporte da FASE 3

Status: Aceito (28/08/2026)

Substitui operacionalmente a Opção A do `docs/runbooks/whatsapp-waba-brasil.md` (copiar/colar manual). Não revoga o [ADR-007](ADR-007-whatsapp-unofficial-rejected.md) nem o [ADR-003](ADR-003-whatsapp-cloud-api.md).

## Contexto

O dono perguntou se existiria caminho automático, seguro e gratuito — citando explicitamente deixar uma IA local operando o navegador no `web.whatsapp.com` e enviando as mensagens por ele.

Automação de navegador **não é uma brecha**. O sinal que a Meta detecta é o dispositivo vinculado por QR numa máquina sempre ligada disparando mensagens em padrão robótico; Playwright/Puppeteer produzem esse sinal e ainda somam os artefatos de automação do próprio navegador (`navigator.webdriver`, CDP). Levantamento de 2026: janela típica de 2–8 semanas até restrição, banimento permanente e sem recurso, que também inviabiliza uma Cloud API futura no mesmo número. É a mesma classe do Baileys, com pior confiabilidade (seletores de DOM quebram a cada atualização do WhatsApp Web).

O dono não tem CNPJ além de um MEI que pretende talvez encerrar. Portanto a Cloud API não pode ser pré-requisito para o produto funcionar.

## Decisão

1. O transporte da FASE 3 é **envio assistido** via *click-to-chat* oficial (`https://wa.me/<e164>?text=<urlencoded>`), documentado pela própria Meta.
2. O sistema decide **quem**, **quando** e **o que** dizer. O ato de enviar continua humano — um clique, com o texto já preenchido.
3. **Não** adotar automação de navegador (Playwright, Puppeteer, Selenium, "IA local no navegador") em nenhuma variação. Fica coberto pela mesma proibição do ADR-007 e do `PROMPT.md` §14.
4. O copy dos lembretes vive em `packages/core/src/notification/reminder-message.ts` — camada pura, sem dependência de transporte. Quando existir WABA, o mesmo texto vira template `UTILITY` sem reescrita.
5. `WHATSAPP_ENABLED` continua `false`. A flag governa envio **automático**; click-to-chat não é envio automático e por isso não depende dela.

## Rotina operacional

O processo pedido ao dono é **olhar a tabela e mandar as mensagens no fim da manhã ou início da tarde**; a máquina fica ligada das 9h30 às 22h30. Isso elimina a única objeção séria ao envio assistido — não existe lembrete devido às 8h que se perca. O `notification_send_hour` default (09:00) é irrelevante aqui: a janela é a passada humana, não um cron.

Consequência de desenho: a tela `/reminders` é **uma passada por dia**, não um feed. Por isso o digest (A25) deixa de ser otimização e passa a ser o formato principal — uma mensagem por pessoa, com todas as demandas dela, em vez de uma mensagem por tarefa.

## Consequências

- Custo zero, risco de banimento zero, sem CNPJ, sem processo 24/7, sem sessão para cair.
- O dono continua no circuito, mas com ~1 clique por **pessoa** (não por tarefa), uma vez ao dia.
- `notification_events` registra cada envio com `dedupe_key` por tarefa/pessoa/dia. Quem já foi lembrado hoje sai da lista — sem cobrança dupla.
- Não há confirmação de entrega nem de leitura. Lembrete enviado é registrado como `SENT` pela afirmação do admin, não pelo provider.
- As regras de §6.2 (não cobrar concluída, bloqueada, aguardando gatilho, opt-out, inativo, matriz arquivada) são aplicadas em `packages/core/src/notification/digest.ts` — mesma camada que a Cloud API vai usar.
- `WhatsAppProvider` (ADR-003) permanece intocado para o `MetaWhatsAppProvider` futuro.

## Caminho para automação real

Continua sendo a Cloud API, e só ela. Pré-requisitos: CNPJ (o MEI serve — a Meta aceita o CCMEI na verificação), Business Manager verificado (**gratuito**; não confundir com Meta Verified, que é assinatura paga e não é exigida) e um chip dedicado. No volume deste produto (~25 lembretes/mês) a tarifa fica na casa de R$10/mês.

Atenção ao calendário: a partir de 1º/10/2026 a Meta passa a cobrar também mensagens de serviço dentro da janela de 24h para quem usa API.
